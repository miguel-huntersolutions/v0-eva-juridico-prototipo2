/**
 * Google Sheets integration for storing process data
 * Uses OAuth2 authentication instead of Service Account
 */

import { google } from "googleapis"
import { getAuthenticatedOAuth2Client } from "./oauth"

// Initialize Google Sheets API with OAuth2
export async function getSheetsClient(userId: string) {
  const auth = await getAuthenticatedOAuth2Client(userId)
  return google.sheets({ version: "v4", auth })
}

/**
 * Get or create a spreadsheet for a process
 * @param processCode - The process code (used as spreadsheet name)
 * @returns The spreadsheet ID
 */
export async function getOrCreateProcessSpreadsheet(userId: string, processCode: string): Promise<string> {
  // Check cache first to avoid duplicate creation during parallel requests
  const cacheKey = `spreadsheet:${userId}:${processCode}`
  const { getCached, setCached, getLock, setLock } = await import("./cache")
  const cached = getCached(cacheKey)
  if (cached) {
    console.log(`[getOrCreateProcessSpreadsheet] Using cached spreadsheet ID: ${cached}`)
    return cached
  }

  // Check if there's a lock (another request is creating this spreadsheet)
  const existingLock = getLock(cacheKey)
  if (existingLock) {
    console.log(`[getOrCreateProcessSpreadsheet] Waiting for existing creation: ${cacheKey}`)
    return existingLock
  }

  // Create a promise for this creation and lock it
  const creationPromise = (async () => {
    const auth = await getAuthenticatedOAuth2Client(userId)
    const sheets = await getSheetsClient(userId)
    const drive = google.drive({ version: "v3", auth })

    try {
      // First, get or create the folder structure: plantillas/{processCode}
      // This ensures the spreadsheet is created in the right place from the start
      const { getOrCreateFolder } = await import("./drive")
      const plantillasFolderId = await getOrCreateFolder(userId, "plantillas")
      const processFolderId = await getOrCreateFolder(userId, processCode, plantillasFolderId)
      
      // Search for existing spreadsheet in the specific folder to avoid duplicates
      const escapedProcessCode = processCode.replace(/'/g, "\\'")
      const query = `name='${escapedProcessCode}' and mimeType='application/vnd.google-apps.spreadsheet' and '${processFolderId}' in parents and trashed=false`
      
      const driveId = process.env.GOOGLE_DRIVE_ID
      const supportsAllDrives = !!driveId

      const searchOptions: {
        q: string
        fields: string
        spaces: string
        supportsAllDrives?: boolean
        includeItemsFromAllDrives?: boolean
        driveId?: string
        corpora?: string
      } = {
        q: query,
        fields: "files(id, name)",
        spaces: "drive",
      }

      if (supportsAllDrives && driveId) {
        searchOptions.supportsAllDrives = true
        searchOptions.includeItemsFromAllDrives = true
        searchOptions.driveId = driveId
        searchOptions.corpora = "drive"
      }

      const searchResponse = await drive.files.list({
        ...searchOptions,
        pageSize: 10, // Limit results to avoid duplicates
      })

      // If spreadsheet exists, return its ID (take the first one if multiple exist)
      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        const spreadsheetId = searchResponse.data.files[0].id!
        // If multiple spreadsheets found, log a warning but use the first one
        if (searchResponse.data.files.length > 1) {
          console.warn(`[getOrCreateProcessSpreadsheet] Multiple spreadsheets found with name "${processCode}", using first one: ${spreadsheetId}`)
        }
        // Cache the result
        setCached(cacheKey, spreadsheetId)
        return spreadsheetId
      }

      // Only create spreadsheet if it doesn't exist
      // Create it directly in the process folder to avoid moving it later
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: processCode,
          },
        },
      })

      if (!spreadsheet.data.spreadsheetId) {
        throw new Error("Failed to create spreadsheet: No spreadsheet ID returned")
      }

      // Move to the appropriate folder structure: plantillas/{processCode}
      if (spreadsheet.data.spreadsheetId) {
        const fileId = spreadsheet.data.spreadsheetId
        
        // Get current parents
        const getOptions: {
          fileId: string
          fields: string
          supportsAllDrives?: boolean
        } = {
          fileId,
          fields: "parents",
        }

        if (supportsAllDrives) {
          getOptions.supportsAllDrives = true
        }

        const file = await drive.files.get(getOptions)
        const currentParents = file.data.parents || []
        
        // Move to process folder
        const updateOptions: {
          fileId: string
          addParents: string
          removeParents: string
          supportsAllDrives?: boolean
        } = {
          fileId,
          addParents: processFolderId,
          removeParents: currentParents.join(","),
        }

        if (supportsAllDrives) {
          updateOptions.supportsAllDrives = true
        }

        await drive.files.update(updateOptions)
      }

      const spreadsheetId = spreadsheet.data.spreadsheetId
      // Cache the result
      setCached(cacheKey, spreadsheetId)
      return spreadsheetId
    } catch (error) {
      console.error("Error getting/creating spreadsheet:", error)
      throw new Error(`Failed to get or create spreadsheet: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  })()

  // Set the lock
  setLock(cacheKey, creationPromise)
  
  return creationPromise
}

/**
 * Append data to a Google Sheet
 * @param spreadsheetId - The spreadsheet ID
 * @param range - The range to append to (e.g., "Sheet1!A1")
 * @param values - Array of rows, each row is an array of cell values
 */
export async function appendToSheet(
  userId: string,
  spreadsheetId: string,
  range: string,
  values: unknown[][],
): Promise<void> {
  const sheets = await getSheetsClient(userId)

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    })
  } catch (error) {
    console.error("Error appending to sheet:", error)
    throw new Error(`Failed to append to sheet: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Get or create a sheet (worksheet) within a spreadsheet
 * @param spreadsheetId - The spreadsheet ID
 * @param sheetName - The name of the sheet to get or create
 * @returns The sheet ID
 */
async function getOrCreateSheet(
  sheets: any,
  spreadsheetId: string,
  sheetName: string,
): Promise<number> {
  try {
    // Get spreadsheet metadata to check existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    // Check if sheet already exists
    const existingSheet = spreadsheet.data.sheets?.find(
      (sheet: any) => sheet.properties?.title === sheetName,
    )

    if (existingSheet) {
      return existingSheet.properties.sheetId
    }

    // Create new sheet if it doesn't exist
    try {
      const addSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      })

      const newSheetId = addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId
      if (newSheetId === undefined) {
        throw new Error("Failed to create sheet: No sheet ID returned")
      }

      return newSheetId
    } catch (createError: any) {
      // If the error is that the sheet already exists, try to find it again
      if (createError?.message?.includes("already exists") || createError?.message?.includes("duplicate")) {
        console.log(`[getOrCreateSheet] Sheet "${sheetName}" already exists, fetching it again`)
        // Re-fetch the spreadsheet to get the newly created sheet
        const updatedSpreadsheet = await sheets.spreadsheets.get({
          spreadsheetId,
        })
        const foundSheet = updatedSpreadsheet.data.sheets?.find(
          (sheet: any) => sheet.properties?.title === sheetName,
        )
        if (foundSheet) {
          return foundSheet.properties.sheetId
        }
      }
      throw createError
    }
  } catch (error) {
    console.error("Error getting/creating sheet:", error)
    throw new Error(`Failed to get or create sheet: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Update or create headers and data in a sheet
 * @param spreadsheetId - The spreadsheet ID
 * @param sheetName - The sheet name (default: "Sheet1")
 * @param headers - Array of header names
 * @param data - Array of rows, each row is an object with keys matching headers
 */
export async function updateSheetData(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  data: Record<string, unknown>[],
): Promise<void> {
  const sheets = await getSheetsClient(userId)

  try {
    // Ensure the sheet exists
    await getOrCreateSheet(sheets, spreadsheetId, sheetName)

    // First, check if the sheet has data
    let existingData: unknown[][] = []
    let hasHeaders = false
    try {
      const readResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z1000`, // Read up to 1000 rows
      })
      existingData = (readResponse.data.values || []) as unknown[][]
      
      // Check if first row matches headers
      if (existingData.length > 0 && existingData[0]) {
        const firstRow = existingData[0] as string[]
        hasHeaders = headers.every((header, index) => firstRow[index] === header)
      }
    } catch (readError: any) {
      // If error is about sheet not found, it's okay - we just created it
      if (readError?.message?.includes("Unable to parse range")) {
        console.log(`[updateSheetData] Sheet ${sheetName} is new, will add headers`)
      } else {
        console.log(`[updateSheetData] Error reading sheet, assuming empty:`, readError)
      }
    }

    // Prepare values to append
    const values: unknown[][] = []
    
    // If sheet doesn't have headers, add them
    if (!hasHeaders && existingData.length === 0) {
      values.push(headers)
    }
    
    // Add data rows
    data.forEach((row) => {
      const rowValues = headers.map((header) => row[header] ?? "")
      values.push(rowValues)
    })

    if (values.length === 0) {
      console.log("[updateSheetData] No data to write")
      return
    }

    // Append data instead of replacing (to avoid overwriting existing data)
    // Calculate the starting row: if we're adding headers, start at A1, otherwise after existing data
    const startRow = hasHeaders || existingData.length > 0 ? existingData.length + 1 : 1
    const range = `${sheetName}!A${startRow}`
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values,
      },
    })
  } catch (error) {
    console.error("Error updating sheet data:", error)
    throw new Error(`Failed to update sheet data: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}


/**
 * Google Sheets integration for storing process data
 */

import { google } from "googleapis"

// Initialize Google Sheets API
export function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
    ],
  })

  return google.sheets({ version: "v4", auth })
}

/**
 * Get or create a spreadsheet for a process
 * @param processCode - The process code (used as spreadsheet name)
 * @returns The spreadsheet ID
 */
export async function getOrCreateProcessSpreadsheet(processCode: string): Promise<string> {
  const sheets = getSheetsClient()
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
    ],
  })
  const drive = google.drive({ version: "v3", auth })

  try {
    // Search for existing spreadsheet
    const query = `name='${processCode}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    
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

    const searchResponse = await drive.files.list(searchOptions)

    // If spreadsheet exists, return its ID
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id!
    }

    // Create new spreadsheet
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
      
      // Get or create the folder structure: plantillas/{processCode}
      const { getOrCreateFolder } = await import("./drive")
      const plantillasFolderId = await getOrCreateFolder("plantillas")
      const processFolderId = await getOrCreateFolder(processCode, plantillasFolderId)
      
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

    return spreadsheet.data.spreadsheetId
  } catch (error) {
    console.error("Error getting/creating spreadsheet:", error)
    throw new Error(`Failed to get or create spreadsheet: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Append data to a Google Sheet
 * @param spreadsheetId - The spreadsheet ID
 * @param range - The range to append to (e.g., "Sheet1!A1")
 * @param values - Array of rows, each row is an array of cell values
 */
export async function appendToSheet(
  spreadsheetId: string,
  range: string,
  values: unknown[][],
): Promise<void> {
  const sheets = getSheetsClient()

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
 * Update or create headers and data in a sheet
 * @param spreadsheetId - The spreadsheet ID
 * @param sheetName - The sheet name (default: "Sheet1")
 * @param headers - Array of header names
 * @param data - Array of rows, each row is an object with keys matching headers
 */
export async function updateSheetData(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  data: Record<string, unknown>[],
): Promise<void> {
  const sheets = getSheetsClient()

  try {
    // Prepare values: headers + data rows
    const values: unknown[][] = [headers]
    
    data.forEach((row) => {
      const rowValues = headers.map((header) => row[header] ?? "")
      values.push(rowValues)
    })

    // Clear existing data and write new data
    const range = `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}${values.length}`
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    })
  } catch (error) {
    console.error("Error updating sheet data:", error)
    throw new Error(`Failed to update sheet data: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}


/**
 * Google Drive integration for file storage
 * Uses OAuth2 authentication instead of Service Account
 */

import { google } from "googleapis"
import { Readable } from "stream"
import { getAuthenticatedOAuth2Client } from "./oauth"

// Initialize Google Drive API with OAuth2
export async function getDriveClient(userId: string) {
  const auth = await getAuthenticatedOAuth2Client(userId)
  return google.drive({ version: "v3", auth })
}

/**
 * Get or create a folder in Google Drive (supports Shared Drives)
 * @param folderName - Name of the folder
 * @param parentFolderId - Parent folder ID (optional)
 * @param supportsAllDrives - Whether to support Shared Drives (default: true)
 * @returns The folder ID
 */
export async function getOrCreateFolder(
  userId: string,
  folderName: string,
  parentFolderId?: string,
  supportsAllDrives: boolean = true,
): Promise<string> {
  // Check cache first to avoid duplicate creation during parallel requests
  const cacheKey = `folder:${userId}:${folderName}:${parentFolderId || "root"}`
  const { getCached, setCached, getLock, setLock } = await import("./cache")
  const cached = getCached(cacheKey)
  if (cached) {
    console.log(`[getOrCreateFolder] Using cached folder ID: ${cached}`)
    return cached
  }

  // Check if there's a lock (another request is creating this folder)
  const existingLock = getLock(cacheKey)
  if (existingLock) {
    console.log(`[getOrCreateFolder] Waiting for existing creation: ${cacheKey}`)
    return existingLock
  }

  // Create a promise for this creation and lock it
  const creationPromise = (async () => {
    const drive = await getDriveClient(userId)
    
    // With OAuth2, each user has their own Drive
    // Use "root" as default parent (user's Drive root)
    // Only use GOOGLE_DRIVE_FOLDER_ID if explicitly passed as parentFolderId
    // This avoids issues when GOOGLE_DRIVE_FOLDER_ID is not accessible
    let targetParentId = parentFolderId || "root"
    const originalTargetParentId = targetParentId
    
    // Determine if we're using a Shared Drive
    const driveId = process.env.GOOGLE_DRIVE_ID
    const isSharedDrive = !!(driveId && supportsAllDrives)

    try {
    // Escape single quotes in folder name for query
    const escapedFolderName = folderName.replace(/'/g, "\\'")
    
    // Search for existing folder - be more specific to avoid duplicates
    // Always include parent filter to ensure we find the correct folder
    let query: string
    if (targetParentId === "root") {
      query = `name='${escapedFolderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`
    } else {
      query = `name='${escapedFolderName}' and mimeType='application/vnd.google-apps.folder' and '${targetParentId}' in parents and trashed=false`
    }
    
    // Add additional filter to ensure we only get folders (not files with same name)
    query += ` and mimeType='application/vnd.google-apps.folder'`
    
    const searchOptions: {
      q: string
      fields: string
      spaces: string
      supportsAllDrives?: boolean
      includeItemsFromAllDrives?: boolean
      driveId?: string
      corpora?: string
      pageSize: number
    } = {
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
      pageSize: 10, // Limit results to avoid duplicates
    }
    
    if (isSharedDrive) {
      searchOptions.supportsAllDrives = true
      searchOptions.includeItemsFromAllDrives = true
      if (driveId) {
        searchOptions.driveId = driveId
        searchOptions.corpora = "drive"
      }
    }
    
    const searchResponse = await drive.files.list(searchOptions)

    // If folder exists, return its ID (take the first one if multiple exist)
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      const folderId = searchResponse.data.files[0].id!
      // If multiple folders found, log a warning but use the first one
      if (searchResponse.data.files.length > 1) {
        console.warn(`[getOrCreateFolder] Multiple folders found with name "${folderName}", using first one: ${folderId}`)
      }
      // Cache the result
      setCached(cacheKey, folderId)
      return folderId
    }

    // Create folder if it doesn't exist
    const folderMetadata: {
      name: string
      mimeType: string
      parents: string[]
      driveId?: string
    } = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: targetParentId === "root" ? [] : [targetParentId], // Empty array for root
    }

    // Only add driveId if we're actually using a Shared Drive
    // Don't add it for regular user Drive (root)
    if (isSharedDrive && targetParentId !== "root") {
      folderMetadata.driveId = driveId
    }

    const createResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id, name",
      supportsAllDrives: isSharedDrive, // Only use supportsAllDrives if we have a Shared Drive
    })

    if (!createResponse.data.id) {
      throw new Error("Failed to create folder: No folder ID returned")
    }

    const folderId = createResponse.data.id
    // Cache the result
    setCached(cacheKey, folderId)
    return folderId
  } catch (error) {
    console.error("Error getting/creating folder:", error)
    
    // If error is about folder not found and we're using GOOGLE_DRIVE_FOLDER_ID, try with root instead
    // But we need to use a different cacheKey for the root attempt
    if (originalTargetParentId !== "root" && originalTargetParentId === process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.log(`[getOrCreateFolder] Folder ${originalTargetParentId} not accessible, trying with root instead`)
      // Clear the current lock and try with root using a different cache key
      const rootCacheKey = `folder:${userId}:${folderName}:root`
      const rootCached = getCached(rootCacheKey)
      if (rootCached) {
        console.log(`[getOrCreateFolder] Using cached root folder ID: ${rootCached}`)
        // Also cache it with the original key for consistency
        setCached(cacheKey, rootCached)
        return rootCached
      }
      // Try to get the root lock
      const rootLock = getLock(rootCacheKey)
      if (rootLock) {
        console.log(`[getOrCreateFolder] Waiting for root folder creation: ${rootCacheKey}`)
        const result = await rootLock
        // Cache it with the original key too
        setCached(cacheKey, result)
        return result
      }
      // Recursively call with root, which will create a new lock
      const result = await getOrCreateFolder(userId, folderName, "root", supportsAllDrives)
      // Cache it with the original key too
      setCached(cacheKey, result)
      return result
    }
    
    throw new Error(`Failed to get or create folder: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
  })()

  // Set the lock
  setLock(cacheKey, creationPromise)
  
  return creationPromise
}

/**
 * Get or create the folder structure: plantillas/{processTypeName}
 * @param processTypeName - Name of the process type
 * @returns The process type folder ID
 */
export async function getOrCreateProcessTypeFolder(userId: string, processTypeName: string): Promise<string> {
  // First, get or create the "plantillas" folder
  const plantillasFolderId = await getOrCreateFolder(userId, "plantillas")
  
  // Then, get or create the process type folder inside "plantillas"
  const processTypeFolderId = await getOrCreateFolder(userId, processTypeName, plantillasFolderId)
  
  return processTypeFolderId
}

/**
 * Upload a file to Google Drive in the structure: plantillas/{processTypeName}/
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The name of the file
 * @param mimeType - The MIME type of the file
 * @param processTypeName - Name of the process type (for folder organization)
 * @returns The file ID, web view link, direct link, and full path
 */
export async function uploadFileToDrive(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  processTypeName: string,
): Promise<{ 
  fileId: string
  webViewLink: string
  directLink: string
  drivePath: string
}> {
  const drive = await getDriveClient(userId)

  try {
    // Get or create the folder structure: plantillas/{processTypeName}
    const processTypeFolderId = await getOrCreateProcessTypeFolder(userId, processTypeName)

    // Upload the file
    const fileMetadata = {
      name: fileName,
      parents: [processTypeFolderId],
    }

    // Convert Buffer to Stream for Google Drive API
    const bufferStream = Readable.from(fileBuffer)

    const media = {
      mimeType,
      body: bufferStream,
    }

    // Check if using Shared Drive
    const driveId = process.env.GOOGLE_DRIVE_ID
    const supportsAllDrives = !!driveId

    const createOptions: {
      requestBody: typeof fileMetadata
      media: typeof media
      fields: string
      supportsAllDrives?: boolean
      driveId?: string
    } = {
      requestBody: fileMetadata,
      media,
      fields: "id, name, webViewLink, webContentLink",
    }

    if (supportsAllDrives && driveId) {
      createOptions.supportsAllDrives = true
      createOptions.driveId = driveId
      // Add driveId to file metadata for Shared Drives
      ;(fileMetadata as any).driveId = driveId
    }

    const response = await drive.files.create(createOptions)

    if (!response.data.id) {
      throw new Error("Failed to upload file: No file ID returned")
    }

    // Make the file accessible to anyone with the link
    // This allows any authenticated user to access the file using the fileId
    // Note: For Shared Drives, permissions work differently
    if (!driveId) {
      // Only set public permissions if not using Shared Drive
      try {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
        })
        console.log(`[uploadFileToDrive] File ${response.data.id} made publicly accessible`)
      } catch (permError) {
        console.warn(`[uploadFileToDrive] Failed to set public permissions, but file was uploaded:`, permError)
        // Don't fail the upload if permissions fail
      }
    } else {
      // For Shared Drives, ensure the file is accessible to organization members
      // The file should already be accessible if the user has proper permissions in the Shared Drive
      console.log(`[uploadFileToDrive] File ${response.data.id} uploaded to Shared Drive`)
    }

    // Get the direct download link
    const directLink = `https://drive.google.com/uc?export=download&id=${response.data.id}`
    
    // Build the full path in Drive
    const drivePath = `plantillas/${processTypeName}/${fileName}`

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
      directLink,
      drivePath,
    }
  } catch (error) {
    console.error("Error uploading file to Google Drive:", error)
    throw new Error(`Failed to upload file to Google Drive: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Find a file in Google Drive by path (e.g., "plantillas/Proceso/archivo.docx")
 * @param drivePath - The path to the file in Drive
 * @returns The file ID if found, null otherwise
 */
export async function findFileByPath(userId: string, drivePath: string): Promise<string | null> {
  const drive = await getDriveClient(userId)
  
  try {
    // Parse the path: plantillas/{processTypeName}/{fileName}
    const pathParts = drivePath.split("/")
    if (pathParts.length !== 3 || pathParts[0] !== "plantillas") {
      return null
    }

    const processTypeName = pathParts[1]
    const fileName = pathParts[2]

    // Get the process type folder
    const processTypeFolderId = await getOrCreateProcessTypeFolder(userId, processTypeName)

    // Search for the file in that folder
    const query = `name='${fileName}' and '${processTypeFolderId}' in parents and trashed=false`
    
    const searchResponse = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
    })

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id!
    }

    return null
  } catch (error) {
    console.error("Error finding file by path:", error)
    return null
  }
}

/**
 * Download a file from Google Drive by file ID
 * @param fileId - The Google Drive file ID
 * @returns Promise resolving to the file buffer
 */
export async function downloadFileFromDrive(userId: string, fileId: string): Promise<Buffer> {
  const drive = await getDriveClient(userId)
  const driveId = process.env.GOOGLE_DRIVE_ID
  const supportsAllDrives = !!driveId

  try {
    const getOptions: {
      fileId: string
      alt: string
      supportsAllDrives?: boolean
    } = {
      fileId,
      alt: "media",
    }

    if (supportsAllDrives) {
      getOptions.supportsAllDrives = true
    }

    const response = await drive.files.get(getOptions, {
      responseType: "arraybuffer",
    })

    return Buffer.from(response.data as ArrayBuffer)
  } catch (error) {
    console.error("Error downloading file from Drive:", error)
    throw new Error(`Failed to download file from Drive: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Upload a generated document to Google Drive in the process folder structure
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The name of the file
 * @param mimeType - The MIME type of the file
 * @param processCode - The process code (used for folder organization)
 * @returns The file ID, web view link, direct link, and full path
 */
export async function uploadDocumentToDrive(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  processCode: string,
): Promise<{ 
  fileId: string
  webViewLink: string
  directLink: string
  drivePath: string
  processFolderId: string
  processFolderUrl: string
}> {
  const drive = await getDriveClient(userId)

  try {
    // Get or create the folder structure: plantillas/{processCode}
    const plantillasFolderId = await getOrCreateFolder(userId, "plantillas")
    const processFolderId = await getOrCreateFolder(userId, processCode, plantillasFolderId)

    // Convert Buffer to Stream for Google Drive API
    const bufferStream = Readable.from(fileBuffer)

    // Upload the file
    const fileMetadata = {
      name: fileName,
      parents: [processFolderId],
    }

    const media = {
      mimeType,
      body: bufferStream,
    }

    // Check if using Shared Drive
    const driveId = process.env.GOOGLE_DRIVE_ID
    const supportsAllDrives = !!driveId

    const createOptions: {
      requestBody: typeof fileMetadata
      media: typeof media
      fields: string
      supportsAllDrives?: boolean
      driveId?: string
    } = {
      requestBody: fileMetadata,
      media,
      fields: "id, name, webViewLink, webContentLink",
    }

    if (supportsAllDrives && driveId) {
      createOptions.supportsAllDrives = true
      createOptions.driveId = driveId
      ;(fileMetadata as any).driveId = driveId
    }

    const response = await drive.files.create(createOptions)

    if (!response.data.id) {
      throw new Error("Failed to upload file: No file ID returned")
    }

    // Make the file publicly viewable (only if not using Shared Drive)
    if (!driveId) {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      })
    }

    // Get the direct download link
    const directLink = `https://drive.google.com/uc?export=download&id=${response.data.id}`
    
    // Build the full path in Drive
    const drivePath = `plantillas/${processCode}/${fileName}`
    
    // Build the folder URL
    const processFolderUrl = `https://drive.google.com/drive/folders/${processFolderId}`

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
      directLink,
      drivePath,
      processFolderId,
      processFolderUrl,
    }
  } catch (error) {
    console.error("Error uploading document to Google Drive:", error)
    throw new Error(`Failed to upload document to Google Drive: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Delete a file from Google Drive
 * @param fileId - The Google Drive file ID
 */
export async function deleteFileFromDrive(userId: string, fileId: string): Promise<void> {
  const drive = await getDriveClient(userId)
  const driveId = process.env.GOOGLE_DRIVE_ID
  const supportsAllDrives = !!driveId

  try {
    const deleteOptions: {
      fileId: string
      supportsAllDrives?: boolean
    } = {
      fileId,
    }

    if (supportsAllDrives) {
      deleteOptions.supportsAllDrives = true
    }

    await drive.files.delete(deleteOptions)
  } catch (error) {
    console.error("Error deleting file from Google Drive:", error)
    throw new Error(`Failed to delete file from Google Drive: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Update a file in Google Drive (replace with new content)
 * If processTypeName is provided and different, move the file to the new folder structure
 * @param fileId - The Google Drive file ID to update
 * @param fileBuffer - The new file buffer
 * @param mimeType - The MIME type of the file
 * @param fileName - The new file name
 * @param processTypeName - Name of the process type (for folder organization)
 */
export async function updateFileInDrive(
  userId: string,
  fileId: string,
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  processTypeName: string,
): Promise<{ 
  fileId: string
  webViewLink: string
  directLink: string
  drivePath: string
}> {
  const drive = await getDriveClient(userId)
  const driveId = process.env.GOOGLE_DRIVE_ID
  const supportsAllDrives = !!driveId

  try {
    // Get or create the folder structure: plantillas/{processTypeName}
    const processTypeFolderId = await getOrCreateProcessTypeFolder(userId, processTypeName)

    // Get current file to check if we need to move it
    const getOptions: {
      fileId: string
      fields: string
      supportsAllDrives?: boolean
    } = {
      fileId,
      fields: "parents, name",
    }

    if (supportsAllDrives) {
      getOptions.supportsAllDrives = true
    }

    const currentFile = await drive.files.get(getOptions)

    // Convert Buffer to Stream for Google Drive API
    const bufferStream = Readable.from(fileBuffer)

    // Update the file content
    const media = {
      mimeType,
      body: bufferStream,
    }

    const updateMetadata: { name?: string; addParents?: string; removeParents?: string } = {
      name: fileName,
    }

    // If the file needs to be moved to a different folder
    const currentParents = currentFile.data.parents || []
    if (!currentParents.includes(processTypeFolderId)) {
      updateMetadata.addParents = processTypeFolderId
      updateMetadata.removeParents = currentParents.join(",")
    }

    const updateOptions: {
      fileId: string
      requestBody: typeof updateMetadata
      media: typeof media
      fields: string
      supportsAllDrives?: boolean
    } = {
      fileId,
      requestBody: updateMetadata,
      media,
      fields: "id, name, webViewLink, webContentLink",
    }

    if (supportsAllDrives) {
      updateOptions.supportsAllDrives = true
    }

    const response = await drive.files.update(updateOptions)

    if (!response.data.id) {
      throw new Error("Failed to update file: No file ID returned")
    }

    const directLink = `https://drive.google.com/uc?export=download&id=${response.data.id}`
    
    // Build the full path in Drive
    const drivePath = `plantillas/${processTypeName}/${fileName}`

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
      directLink,
      drivePath,
    }
  } catch (error) {
    console.error("Error updating file in Google Drive:", error)
    throw new Error(`Failed to update file in Google Drive: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}


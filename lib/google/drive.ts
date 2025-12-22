/**
 * Google Drive integration for file storage
 */

import { google } from "googleapis"
import { Readable } from "stream"

// Initialize Google Drive API
export function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
    ],
  })

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
  folderName: string,
  parentFolderId?: string,
  supportsAllDrives: boolean = true,
): Promise<string> {
  const drive = getDriveClient()
  const targetParentId = parentFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!targetParentId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is not set")
  }

  try {
    // Escape single quotes in folder name for query
    const escapedFolderName = folderName.replace(/'/g, "\\'")
    
    // Search for existing folder
    const query = `name='${escapedFolderName}' and mimeType='application/vnd.google-apps.folder' and '${targetParentId}' in parents and trashed=false`
    
    const searchResponse = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
      supportsAllDrives,
      includeItemsFromAllDrives: supportsAllDrives,
    })

    // If folder exists, return its ID
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id!
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
      parents: [targetParentId],
    }

    // If using Shared Drive, add driveId
    const driveId = process.env.GOOGLE_DRIVE_ID
    if (driveId && supportsAllDrives) {
      folderMetadata.driveId = driveId
    }

    const createResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id, name",
      supportsAllDrives,
    })

    if (!createResponse.data.id) {
      throw new Error("Failed to create folder: No folder ID returned")
    }

    return createResponse.data.id
  } catch (error) {
    console.error("Error getting/creating folder:", error)
    throw new Error(`Failed to get or create folder: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Get or create the folder structure: plantillas/{processTypeName}
 * @param processTypeName - Name of the process type
 * @returns The process type folder ID
 */
export async function getOrCreateProcessTypeFolder(processTypeName: string): Promise<string> {
  // First, get or create the "plantillas" folder
  const plantillasFolderId = await getOrCreateFolder("plantillas")
  
  // Then, get or create the process type folder inside "plantillas"
  const processTypeFolderId = await getOrCreateFolder(processTypeName, plantillasFolderId)
  
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
  const drive = getDriveClient()

  try {
    // Get or create the folder structure: plantillas/{processTypeName}
    const processTypeFolderId = await getOrCreateProcessTypeFolder(processTypeName)

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

    // Make the file publicly viewable (optional, adjust based on your needs)
    // Note: For Shared Drives, permissions work differently
    if (!driveId) {
      // Only set public permissions if not using Shared Drive
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
export async function findFileByPath(drivePath: string): Promise<string | null> {
  const drive = getDriveClient()
  
  try {
    // Parse the path: plantillas/{processTypeName}/{fileName}
    const pathParts = drivePath.split("/")
    if (pathParts.length !== 3 || pathParts[0] !== "plantillas") {
      return null
    }

    const processTypeName = pathParts[1]
    const fileName = pathParts[2]

    // Get the process type folder
    const processTypeFolderId = await getOrCreateProcessTypeFolder(processTypeName)

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
export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDriveClient()
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
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  processCode: string,
): Promise<{ 
  fileId: string
  webViewLink: string
  directLink: string
  drivePath: string
}> {
  const drive = getDriveClient()

  try {
    // Get or create the folder structure: plantillas/{processCode}
    const plantillasFolderId = await getOrCreateFolder("plantillas")
    const processFolderId = await getOrCreateFolder(processCode, plantillasFolderId)

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

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
      directLink,
      drivePath,
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
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient()
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
  const drive = getDriveClient()
  const driveId = process.env.GOOGLE_DRIVE_ID
  const supportsAllDrives = !!driveId

  try {
    // Get or create the folder structure: plantillas/{processTypeName}
    const processTypeFolderId = await getOrCreateProcessTypeFolder(processTypeName)

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


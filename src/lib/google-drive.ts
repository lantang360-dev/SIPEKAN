/**
 * Google Drive Service for SIPEKAN
 * Syncs registration data and uploads files to Google Drive
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1-u9viG7LCoq401Bjz8qm7pPkbjHoX0ZH';

/**
 * Check if Google Drive credentials are configured.
 */
function hasCredentials(): boolean {
  return !!(
    process.env.GOOGLE_DRIVE_PRIVATE_KEY &&
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  );
}

/**
 * Get an authenticated Google Drive client using service account credentials.
 */
function getDriveClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
    key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Sync a registration record to Google Drive as a JSON file.
 * If credentials are not configured, logs a warning and skips.
 */
export async function syncToGoogleDrive(registration: any): Promise<void> {
  if (!hasCredentials()) {
    console.warn(
      '[Google Drive] Credentials not configured (GOOGLE_DRIVE_PRIVATE_KEY / GOOGLE_DRIVE_CLIENT_EMAIL). Skipping sync.'
    );
    return;
  }

  try {
    const drive = getDriveClient();

    // Create JSON file content
    const fileContent = JSON.stringify(registration, null, 2);
    const buffer = Buffer.from(fileContent, 'utf-8');

    // File name: registration number + timestamp
    const fileName = `${registration.nomorRegistrasi}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    // Create a readable stream from buffer
    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const media = {
      mimeType: 'application/json',
      body: stream,
    };

    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID],
    };

    const result = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    console.log(`[Google Drive] Synced registration ${registration.nomorRegistrasi} as file: ${result.data.name} (ID: ${result.data.id})`);
  } catch (error) {
    console.error(`[Google Drive] Failed to sync registration ${registration.nomorRegistrasi}:`, error);
    // Don't throw — sync failure should not break the registration flow
  }
}

/**
 * Upload a file from the local filesystem to Google Drive.
 * @param filePath - Absolute or relative path to the file
 * @param fileName - Name to use for the uploaded file
 * @param folderId - Google Drive folder ID to upload to
 */
export async function uploadFileToGoogleDrive(
  filePath: string,
  fileName: string,
  folderId: string = FOLDER_ID
): Promise<string | null> {
  if (!hasCredentials()) {
    console.warn(
      '[Google Drive] Credentials not configured (GOOGLE_DRIVE_PRIVATE_KEY / GOOGLE_DRIVE_CLIENT_EMAIL). Skipping file upload.'
    );
    return null;
  }

  try {
    const drive = getDriveClient();

    // Resolve to absolute path
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      console.error(`[Google Drive] File not found: ${absolutePath}`);
      return null;
    }

    // Determine MIME type from extension
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const mimeType = mimeTypeMap[ext] || 'application/octet-stream';

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: fs.createReadStream(absolutePath),
    };

    const result = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    console.log(`[Google Drive] Uploaded file: ${result.data.name} (ID: ${result.data.id})`);
    return result.data.id || null;
  } catch (error) {
    console.error(`[Google Drive] Failed to upload file ${fileName}:`, error);
    return null;
  }
}

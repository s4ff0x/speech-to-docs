import { google } from "googleapis";
import { Readable } from "stream";
import { config } from "../config/config.js";

class GoogleDriveService {
  constructor() {
    // Priority 1: OAuth 2.0 with refresh token (for personal Gmail accounts)
    if (config.google.oauth2?.clientId && config.google.oauth2?.refreshToken) {
      console.log(`🔐 Using OAuth 2.0 with user credentials (personal Gmail)`);
      
      const oauth2Client = new google.auth.OAuth2(
        config.google.oauth2.clientId,
        config.google.oauth2.clientSecret,
        config.google.oauth2.redirectUri || "http://localhost:3000/oauth2callback"
      );

      oauth2Client.setCredentials({
        refresh_token: config.google.oauth2.refreshToken,
      });

      this.auth = oauth2Client;
    }
    // Priority 2: OAuth delegation (domain-wide delegation for Workspace)
    else if (config.google.delegatedUser) {
      console.log(`🔐 OAuth delegation enabled - impersonating: ${config.google.delegatedUser}`);
      
      const authConfig = {
        credentials: config.google.credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
        subject: config.google.delegatedUser,
      };

      this.auth = new google.auth.GoogleAuth(authConfig);
    }
    // Priority 3: Service account with folder sharing (fallback)
    else {
      console.log(`📁 Using service account with folder sharing method`);
      
      const authConfig = {
        credentials: config.google.credentials,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      };

      this.auth = new google.auth.GoogleAuth(authConfig);
    }

    this.driveClient = google.drive({
      version: "v3",
      auth: this.auth,
    });
  }

  /**
   * Upload a file to Google Drive in a specific folder
   * @param {Buffer} fileBuffer - File buffer to upload
   * @param {string} fileName - Name of the file
   * @param {string} mimeType - MIME type of the file
   * @param {string} folderId - Google Drive folder ID
   * @returns {Promise<string>} - File ID of the uploaded file
   */
  async uploadFile(fileBuffer, fileName, mimeType, folderId) {
    console.log(`📤 Uploading file to Google Drive: ${fileName}`);
    console.log(`📁 Target folder ID: ${folderId}`);
    console.log(`📊 File size: ${fileBuffer.length} bytes`);

    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    };

    // Convert buffer to stream for Google Drive API
    const bufferStream = Readable.from(fileBuffer);

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    try {
      const response = await this.driveClient.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink",
        supportsAllDrives: true, // Required for Shared Drives
      });

      console.log(`✅ File uploaded successfully to Google Drive`);
      console.log(`📄 File ID: ${response.data.id}`);
      console.log(`🔗 File link: ${response.data.webViewLink}`);

      return response.data.id;
    } catch (error) {
      console.error(`❌ Error uploading file to Google Drive:`, error.message);
      throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
    }
  }
}

export const googleDriveService = new GoogleDriveService();


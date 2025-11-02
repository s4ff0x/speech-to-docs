import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config({ path: ".env" });

export const config = {
  port: process.env.PORT || 3000,
  openai: {
    apiKey: process.env.OPENAI_SPEECH_API_KEY,
  },
  personalAuthToken: process.env.PERSONAL_AUTH_TOKEN,
  google: {
    credentials: {
      type: process.env.TYPE,
      project_id: process.env.PROJECT_ID,
      private_key_id: process.env.PRIVATE_KEY_ID,
      private_key: process.env.PRIVATE_KEY,
      client_email: process.env.CLIENT_EMAIL,
      client_id: process.env.CLIENT_ID,
      auth_uri: process.env.AUTH_URI,
      token_uri: process.env.TOKEN_URI,
      auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
    },
    docId: process.env.DOC_ID,
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    delegatedUser: process.env.GOOGLE_DELEGATED_USER, // User email for OAuth delegation
    oauth2: {
      clientId: process.env.GOOGLE_OAUTH2_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_OAUTH2_REDIRECT_URI,
      refreshToken: process.env.GOOGLE_OAUTH2_REFRESH_TOKEN,
    },
  },
  notion: {
    apiKey: process.env.NOTION_API_KEY,
    databaseId: process.env.NOTION_DATABASE_ID,
  },
  timeZone: process.env.TIMEZONE || "",
};

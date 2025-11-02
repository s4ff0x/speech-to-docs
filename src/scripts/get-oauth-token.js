import { google } from "googleapis";
import { createRequire } from "module";
import readline from "readline";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
require("dotenv").config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCOPES = ["https://www.googleapis.com/auth/drive"];

/**
 * Get and store new token after prompting for user authorization
 */
async function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this url:", authUrl);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      
      oAuth2Client.setCredentials(token);
      
      console.log("\n✅ Success! Here are your tokens:\n");
      console.log("Add these to your .env file:\n");
      console.log(`GOOGLE_OAUTH2_CLIENT_ID=${process.env.GOOGLE_OAUTH2_CLIENT_ID}`);
      console.log(`GOOGLE_OAUTH2_CLIENT_SECRET=${process.env.GOOGLE_OAUTH2_CLIENT_SECRET}`);
      console.log(`GOOGLE_OAUTH2_REDIRECT_URI=${process.env.GOOGLE_OAUTH2_REDIRECT_URI || "http://localhost:3000/oauth2callback"}`);
      console.log(`GOOGLE_OAUTH2_REFRESH_TOKEN=${token.refresh_token}`);
      
      if (token.refresh_token) {
        console.log("\n✨ Refresh token obtained! You can now use OAuth 2.0 authentication.");
      } else {
        console.log("\n⚠️ Warning: No refresh token received. Make sure to delete the token and try again.");
      }
      
      callback(oAuth2Client);
    });
  });
}

/**
 * Main function to authorize the application
 */
async function main() {
  const clientId = process.env.GOOGLE_OAUTH2_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH2_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH2_REDIRECT_URI || "http://localhost:3000/oauth2callback";

  if (!clientId || !clientSecret) {
    console.error("❌ Error: GOOGLE_OAUTH2_CLIENT_ID and GOOGLE_OAUTH2_CLIENT_SECRET must be set in your .env file");
    console.error("\nTo get these credentials:");
    console.error("1. Go to https://console.cloud.google.com/");
    console.error("2. Select your project (or create a new one)");
    console.error("3. Go to APIs & Services > Credentials");
    console.error("4. Click 'Create Credentials' > 'OAuth client ID'");
    console.error("5. Choose 'Desktop app' or 'Web application'");
    console.error("6. Add redirect URI: http://localhost:3000/oauth2callback");
    console.error("7. Copy the Client ID and Client Secret to your .env file");
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  getAccessToken(oAuth2Client, (auth) => {
    console.log("\n✅ Authorization complete!");
  });
}

main().catch(console.error);


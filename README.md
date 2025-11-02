# speech-to-docs

A Node.js application that transcribes audio recordings into text and automatically saves them to Google Docs. Perfect for maintaining voice notes, meeting minutes, or any spoken content in a written format.

[Setup Example (Article)](https://dev.to/anton_mendelson/voice-journal-with-a-single-tap-on-iphone-gpt-api-and-google-docs-137b)

![img_1.png](img_1.png)

## Environment Variables

Create a `.env` file with the following variables:

```plaintext
OPENAI_SPEECH_API_KEY=
DOC_ID=The ID of the Google document where the text will be saved
TIMEZONE=your_timezone (example: Asia/Jerusalem)
PERSONAL_AUTH_TOKEN=Create your personal key to use when calling the API

# Notion
NOTION_API_KEY=Your Notion integration secret
NOTION_DATABASE_ID=The Notion database ID or full database URL

# Google Drive (optional)
GOOGLE_DRIVE_FOLDER_ID=The Google Drive folder ID where audio files will be uploaded

# OAuth 2.0 for Personal Gmail (Recommended - leave empty if using service account)
GOOGLE_OAUTH2_CLIENT_ID=Your OAuth 2.0 Client ID
GOOGLE_OAUTH2_CLIENT_SECRET=Your OAuth 2.0 Client Secret
GOOGLE_OAUTH2_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_OAUTH2_REFRESH_TOKEN=Your OAuth 2.0 Refresh Token (obtained via npm run get-oauth-token)

# OAuth Delegation (ONLY for Google Workspace - leave empty for personal Gmail)
GOOGLE_DELEGATED_USER=Your email address for OAuth delegation

# Google Service Account Credentials
TYPE=
PROJECT_ID=
PRIVATE_KEY_ID=
PRIVATE_KEY=
CLIENT_EMAIL=
CLIENT_ID=
AUTH_URI=
TOKEN_URI=
AUTH_PROVIDER_X509_CERT_URL=
CLIENT_X509_CERT_URL=
```

## Features

- Audio file transcription using OpenAI's Whisper model
- Automatic saving of transcriptions to Google Docs
- Parallel upload of audio files to Google Drive (optional)
- Timestamp recording for each transcription
- Support for M4A audio format
- RESTful API interface

## Technical Stack

- Node.js with Express.js
- OpenAI API (Whisper model for transcription)
- Google Docs API
- Multer for file upload handling

## Prerequisites

- Node.js installed
- OpenAI API key
- Google Cloud project with enabled Google Docs API and Google Drive API
- Google Service Account credentials with appropriate scopes
- Notion integration (optional): Notion API key and database

## How to test api with curl

```bash
curl -F "audio=@[path to file].m4a;type=audio/m4a" \
-H "Authorization:[your personal auth token]" \
-X POST https://[your api url]/transcribe
```

## Google Drive Integration

The app can upload audio files to a specified Google Drive folder when `GOOGLE_DRIVE_FOLDER_ID` is configured. The upload runs in parallel with the transcription process for optimal performance.

### For Personal Gmail Accounts (Recommended - OAuth 2.0)

**This is the recommended method** for personal Gmail accounts. It uses OAuth 2.0 to authenticate as your user account, allowing direct access to your personal Google Drive without needing service accounts or folder sharing.

#### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth client ID"**
5. If prompted, configure the OAuth consent screen:
   - Choose **"External"** (unless you have a Google Workspace)
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add your email to test users (for testing)
   - Click **"Save and Continue"** through the scopes (you can skip adding scopes here)
6. Choose application type: **"Web application"** (recommended for Railway)
7. Name it (e.g., "Speech to Docs OAuth")

8. **Configure Authorized URIs:**

   **For Railway deployment:**

   - **Authorized JavaScript origins**: `https://your-app-name.up.railway.app`
     - Replace `your-app-name` with your actual Railway app name/domain
     - If you have a custom domain: `https://yourdomain.com`
   - **Authorized redirect URIs**: Add both:
     - `https://your-app-name.up.railway.app/oauth2callback` (for Railway)
     - `http://localhost:3000/oauth2callback` (for local token generation)

   **Note:** You need the localhost redirect URI to run the token generation script locally. Once you have the refresh token, the server doesn't need the redirect URI anymore (it uses the refresh token for authentication).

9. Click **"Create"**
10. Copy the **Client ID** and **Client Secret**

#### Step 2: Configure Your Application

**For local development:**
Add to your `.env` file:

```plaintext
GOOGLE_OAUTH2_CLIENT_ID=your_client_id_here
GOOGLE_OAUTH2_CLIENT_SECRET=your_client_secret_here
GOOGLE_OAUTH2_REDIRECT_URI=http://localhost:3000/oauth2callback
```

**For Railway deployment:**
Add the same variables to your Railway environment variables. The `GOOGLE_OAUTH2_REDIRECT_URI` can remain `http://localhost:3000/oauth2callback` - it's only used during token generation, not during runtime.

**Note:** Once you have the refresh token, the redirect URI is not used by the running application (it only uses the refresh token for authentication).

#### Step 3: Get Refresh Token

**Important:** You must run this step **locally** (not on Railway) to get the refresh token.

1. Make sure you have the OAuth credentials configured in your local `.env` file
2. Run the authorization script locally:

```bash
npm run get-oauth-token
```

This will:

1. Display a URL - open it in your browser
2. Sign in with your Google account
3. Grant permissions to access Google Drive
4. You'll be redirected to `http://localhost:3000/oauth2callback` (or see an error - that's OK)
5. Copy the **authorization code** from the URL or error page
6. Paste the code when prompted in the terminal
7. The script will generate a refresh token

**Copy the refresh token** and add it to:

- Your local `.env` file (for local development)
- Your Railway environment variables (for production)

```plaintext
GOOGLE_OAUTH2_REFRESH_TOKEN=your_refresh_token_here
```

**Note for Railway:** After getting the refresh token, add it to your Railway environment variables. The app will use this token to authenticate with Google Drive - no redirect URIs needed during runtime.

#### Step 4: Get Folder ID

1. Go to [Google Drive](https://drive.google.com)
2. Navigate to or create the folder where you want files uploaded
3. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
4. Add to your `.env`:

```plaintext
GOOGLE_DRIVE_FOLDER_ID=FOLDER_ID_HERE
```

**That's it!** The app will now use OAuth 2.0 to authenticate and upload files directly to your personal Google Drive.

### Alternative Methods

#### Method 2: Service Account with Folder Sharing (Not Recommended for Personal Gmail)

If you prefer to use a service account, you can try sharing a folder with it. However, this often doesn't work reliably with personal Gmail accounts due to storage quota limitations.

1. Share a folder with your service account email (from `CLIENT_EMAIL`)
2. Set permission to "Editor"
3. Use that folder ID in `GOOGLE_DRIVE_FOLDER_ID`
4. Don't set OAuth 2.0 variables

#### Method 3: OAuth Delegation (Google Workspace Only)

If you have Google Workspace and want to use OAuth delegation instead:

#### Step 1: Enable Domain-Wide Delegation

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Click on your service account
4. Click the **"Advanced Settings"** tab
5. Check **"Enable Google Workspace Domain-wide Delegation"**
6. **Note the Client ID**

#### Step 2: Authorize in Google Workspace Admin Console

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to **Security** → **Access and data control** → **API controls**
3. Scroll to **"Domain-wide delegation"** → Click **"Manage Domain Wide Delegation"**
4. Click **"Add new"**
5. Enter the **Client ID** from Step 1
6. In **"OAuth Scopes"**, enter: `https://www.googleapis.com/auth/drive`
7. Click **"Authorize"**

#### Step 3: Configure Your Application

Add to your `.env` file:

```plaintext
GOOGLE_DRIVE_FOLDER_ID=FOLDER_ID_HERE
GOOGLE_DELEGATED_USER=your-workspace-email@yourdomain.com
```

### Requirements

- **Google Drive API must be enabled** in your Google Cloud project:
  - Go to [Google Cloud Console](https://console.cloud.google.com/)
  - Navigate to **APIs & Services** → **Library**
  - Search for "Google Drive API"
  - Click **"Enable"**

### Troubleshooting

**If you get "access_denied" error:**

- Make sure you added your email as a test user in the OAuth consent screen
- Check that the OAuth consent screen is published (or your account is in test users)

**If the refresh token doesn't work:**

- Run `npm run get-oauth-token` again to generate a new refresh token
- Make sure you're copying the full refresh token (it's a long string)

**For Railway deployment:**

- Make sure all OAuth environment variables are set in Railway:
  - `GOOGLE_OAUTH2_CLIENT_ID`
  - `GOOGLE_OAUTH2_CLIENT_SECRET`
  - `GOOGLE_OAUTH2_REFRESH_TOKEN`
  - `GOOGLE_DRIVE_FOLDER_ID`
- The redirect URI doesn't need to work on Railway - it's only used locally during token generation
- If you get "redirect_uri_mismatch" during token generation, make sure you added `http://localhost:3000/oauth2callback` to the authorized redirect URIs in Google Cloud Console
- Your Railway app URL should be added to "Authorized JavaScript origins" (e.g., `https://your-app.up.railway.app`)

## Notion Integration

The app can create a Notion page for each transcription when `NOTION_API_KEY` and `NOTION_DATABASE_ID` are configured. Notion updates run in parallel with Google Docs for speed.

### 1) Create a Notion integration

- Go to Notion Developers → Create a new internal integration.
- Copy the integration secret into `NOTION_API_KEY`.

### 2) Prepare your Notion database

You can use an existing database or create a new one. Share the database with your integration (Share → Invite → select your integration) so it has access.

Required/Supported properties (column names and types):

- Title property (type: Title)
  - Name can be anything. The app auto-detects the Title property.
- Content property (type: Rich text)
  - Recommended names: `content`, `text`, `body`, `description`, or `notes`. The app picks the first matching Rich text property.
- `tags` (type: Multi-select)
  - General tags. The app prioritizes existing options but may add new options here if needed.
  - Property must be named exactly `tags` (case-insensitive). This prevents conflicts with similarly named columns like `project-tags`.
- `category-tags` (type: Multi-select)
  - High-level categories matched conservatively via AI from your transcription.
  - The app will ONLY use options that already exist in this property and will NOT create new options.
  - Create the options you want to be eligible, for example: `dev`, `health`.
- `project-tags` (type: Multi-select)
  - Project-specific tags matched conservatively via AI.
  - The app will ONLY use options that already exist in this property and will NOT create new options.
  - Create the options you want to be eligible, for example: `smart-journal`, `p1v3`, `p1v4`.

Notes:

- `NOTION_DATABASE_ID` may be the raw 32-character ID or the full database URL. The app extracts the ID automatically (hyphens and query params are handled).
- If `category-tags` or `project-tags` properties are missing, they are simply skipped.

### 3) What the app writes to Notion

- Title: generated by AI to summarize the transcription.
- Content: the full transcription text (stored in the first suitable Rich text property).
- `tags`: generated by AI; reuses existing options when possible and may create new options if needed.
- `category-tags`: matched strictly against existing options; never creates new options.
- `project-tags`: matched strictly against existing options; never creates new options.

### 4) Performance

The app performs title generation, `tags`, `category-tags`, and `project-tags` extraction in parallel to reduce latency.

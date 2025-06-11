# Notion Integration Setup

This document explains how to configure the Notion integration for the speech-to-docs application.

## Required Environment Variables

Add the following environment variables to your `.env` file:

```env
# Notion Configuration
NOTION_API_KEY=your_notion_integration_api_key_here
NOTION_DATABASE_ID=your_notion_database_id_here
```

## Setting up Notion Integration

### 1. Create a Notion Integration

1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name your integration (e.g., "Speech to Docs")
4. Select the workspace where your database is located
5. Click "Submit"
6. Copy the "Internal Integration Token" - this is your `NOTION_API_KEY`

### 2. Create or Configure Your Database

Your Notion database should have the following properties:

- **Title** (Title property type) - Will store the transcription title with timestamp
- **Tags** (Multi-select property type) - Will store AI-generated tags from the transcribed content

### 3. Share Database with Integration

1. Open your Notion database
2. Click the "Share" button in the top-right
3. Click "Invite" and search for your integration name
4. Grant it access to the database

### 4. Get Database ID

The database ID can be found in the URL of your database:
```
https://www.notion.so/your-workspace/DATABASE_ID?v=VIEW_ID
```

**Important:** Copy only the `DATABASE_ID` part (32-character string) and use it as your `NOTION_DATABASE_ID`. 

For example, if your URL is:
```
https://www.notion.so/myworkspace/20f2043b96128085b2faf6b4beb3e316?v=20f2043b961280609260000c50d55c5f
```

Your `NOTION_DATABASE_ID` should be:
```
20f2043b96128085b2faf6b4beb3e316
```

**Do not** include the `?v=...` part or any other URL parameters.

## How It Works

1. After audio is transcribed using OpenAI, the system will:
   - Generate relevant tags using OpenAI GPT-3.5-turbo based on the transcribed content
   - Create a new page in your Notion database
   - Set the title with timestamp
   - Add the generated tags to the Tags multi-select property
   - Include the full transcribed text as the page content

2. The service includes retry logic (up to 5 attempts) for reliability

## Example Database Schema

| Property | Type | Description |
|----------|------|-------------|
| Title | Title | Auto-generated title with timestamp |
| Tags | Multi-select | AI-generated tags based on content |
| Created | Created time | Automatically set by Notion |

## Error Handling

The integration includes comprehensive error handling and logging. If Notion integration fails, it will:
- Retry up to 5 times with 3-second delays
- Log detailed error information
- Return a 500 error if all attempts fail
- Continue with other services (Google Docs) even if Notion fails 
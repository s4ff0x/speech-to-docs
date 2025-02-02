# speech-to-docs

A Node.js application that transcribes audio recordings into text and automatically saves them to Google Docs. Perfect for maintaining voice notes, meeting minutes, or any spoken content in a written format.

## Features

- Audio file transcription using OpenAI's Whisper model
- Automatic saving of transcriptions to Google Docs
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
- Google Cloud project with enabled Google Docs API
- Google Service Account credentials

## Environment Variables

Create a `.env` file with the following variables:

```plaintext
PORT=3000
OPENAI_SPEECH_API_KEY=your_openai_api_key
DOC_ID=your_google_doc_id
TIMEZONE=your_timezone (example: Asia/Jerusalem)

# Google Service Account Credentials
TYPE=service_account
PROJECT_ID=your_project_id
PRIVATE_KEY_ID=your_private_key_id
PRIVATE_KEY=your_private_key
CLIENT_EMAIL=your_client_email
CLIENT_ID=your_client_id
AUTH_URI=https://accounts.google.com/o/oauth2/auth
TOKEN_URI=https://oauth2.googleapis.com/token
AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
CLIENT_X509_CERT_URL=your_cert_url
```

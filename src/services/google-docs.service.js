import { google } from "googleapis";
import { config } from "../config/config.js";

class GoogleDocsService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: config.google.credentials,
      scopes: ["https://www.googleapis.com/auth/documents"],
    });

    this.docsClient = google.docs({
      version: "v1",
      auth: this.auth,
    });
  }

  async appendText(text) {
    const document = await this.docsClient.documents.get({
      documentId: config.google.docId,
    });

    const contentLength = document.data.body.content.length;
    let endIndex = 1;

    if (contentLength > 0) {
      const lastElement = document.data.body.content[contentLength - 1];
      endIndex = lastElement.endIndex || 1;
    }

    await this.docsClient.documents.batchUpdate({
      documentId: config.google.docId,
      requestBody: {
        requests: [
          {
            insertText: {
              text: `\n${this.getFormattedDate()}\n${text}\n\n`,
              location: {
                index: endIndex - 1,
              },
            },
          },
        ],
      },
    });
  }

  getFormattedDate() {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: config.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return formatter.format(today);
  }
}

export const googleDocsService = new GoogleDocsService();

import { File } from "fetch-blob/file.js";
import { openAIService } from "../services/openai.service.js";
import { googleDocsService } from "../services/google-docs.service.js";
import { notionService } from "../services/notion.service.js";
import { config } from "../config/config.js";

export class TranscriptionController {
  /**
   * Generic retry helper method to avoid code duplication
   * @param {Function} operation - Async function to execute
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {number} retryDelay - Delay between retries in milliseconds
   * @param {string} operationName - Name of the operation for logging
   * @param {string} errorMessage - Error message to return on final failure
   * @returns {Promise} - Result of the operation or throws error
   */
  async executeWithRetry(
    operation,
    maxRetries,
    retryDelay,
    operationName,
    errorMessage
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Starting ${operationName} (attempt ${attempt}/${maxRetries})...`
        );
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        console.log(`✅ ${operationName} completed successfully`);
        console.log(`⏱️ ${operationName} took: ${duration}ms`);
        return result;
      } catch (error) {
        console.error(
          `❌ Error during ${operationName} (attempt ${attempt}/${maxRetries}):`,
          error.message
        );

        if (attempt === maxRetries) {
          console.error(`💥 All ${operationName} attempts failed`);
          console.error("Stack trace:", error.stack);
          throw new Error(
            `${errorMessage} after ${maxRetries} attempts: ${error.message}`
          );
        }

        console.log(
          `⏳ Waiting ${retryDelay}ms before retry attempt ${attempt + 1}...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  async transcribe(req, res) {
    const startTime = Date.now();
    console.log("=== TRANSCRIPTION PROCESS STARTED ===");
    console.log(`Timestamp: ${new Date().toISOString()}`);

    try {
      // Authorization check
      console.log("🔐 Checking authorization...");
      if (
        !req.headers.authorization ||
        req.headers.authorization !== config.personalAuthToken
      ) {
        console.log("❌ Authorization failed - missing or invalid token");
        return res
          .status(401)
          .json({ error: "Authorization header is missing." });
      }
      console.log("✅ Authorization successful");

      // File validation
      console.log("📁 Validating uploaded file...");
      if (!req.file || !req.file.buffer) {
        console.log("❌ File validation failed - no file or buffer provided");
        return res.status(400).json({ error: "No audio file provided." });
      }

      console.log("📊 File details:");
      console.log(`  - Original name: ${req.file.originalname}`);
      console.log(`  - MIME type: ${req.file.mimetype}`);
      console.log(`  - Size: ${req.file.buffer.length} bytes`);
      console.log(`  - Field name: ${req.file.fieldname}`);
      console.log("✅ File validation successful");

      // Create file blob
      console.log("🔄 Creating file blob...");
      const fileBlob = this.createFileBlob(req.file);
      console.log(`✅ File blob created successfully`);

      // OpenAI transcription with retry logic
      let rawTranscriptionText;
      try {
        rawTranscriptionText = await this.executeWithRetry(
          () => openAIService.transcribeAudio(fileBlob),
          5, // maxRetries
          3000, // retryDelay
          "OpenAI transcription",
          "Failed to transcribe audio using OpenAI service"
        );

        console.log(
          `📝 Transcription length: ${rawTranscriptionText.length} characters`
        );
        console.log("📄 Original Transcription:", rawTranscriptionText);
      } catch (error) {
        return res.status(500).json({
          error: error.message,
          details: "OpenAI transcription failed",
        });
      }

      // Google Docs append with retry logic
      try {
        await this.executeWithRetry(
          () => googleDocsService.appendText(rawTranscriptionText),
          5, // maxRetries
          3000, // retryDelay
          "Google Docs update",
          "Failed to append text to Google Docs"
        );
      } catch (error) {
        return res.status(500).json({
          error: error.message,
          details: "Google Docs update failed",
        });
      }

      // Notion feature flag
      if (config.notion.databaseId) {
        try {
          await this.executeWithRetry(
            () =>
              notionService.createPageWithTranscription(rawTranscriptionText),
            5, // maxRetries
            3000, // retryDelay
            "Notion page creation",
            "Failed to create Notion page"
          );
        } catch (error) {
          return res.status(500).json({
            error: error.message,
            details: "Notion page creation failed",
          });
        }
      }

      const totalDuration = Date.now() - startTime;
      console.log("🎉 TRANSCRIPTION PROCESS COMPLETED SUCCESSFULLY");
      console.log(`⏱️ Total process duration: ${totalDuration}ms`);
      console.log("=== END TRANSCRIPTION PROCESS ===");

      return res.json({
        message: "Transcription completed successfully!",
      });
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(
        "💥 Unexpected error during transcription process:",
        error.message
      );
      console.error("Stack trace:", error.stack);
      console.error(`⏱️ Process failed after: ${totalDuration}ms`);
      console.log("=== TRANSCRIPTION PROCESS FAILED ===");

      return res.status(500).json({
        error: "Unexpected error occurred during transcription process",
        details: error.message,
      });
    }
  }

  createFileBlob(file) {
    console.log("🔄 Creating file blob with details:");
    const filename = file.originalname || "upload.m4a";
    const fileType = file.mimetype || "audio/m4a";
    console.log(`  - Filename: ${filename}`);
    console.log(`  - File type: ${fileType}`);
    console.log(`  - Buffer length: ${file.buffer.length}`);

    const blob = new File([file.buffer], filename, { type: fileType });
    console.log("✅ File blob created successfully");
    return blob;
  }
}

export const transcriptionController = new TranscriptionController();

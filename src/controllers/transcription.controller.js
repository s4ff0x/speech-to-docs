import { File } from "fetch-blob/file.js";
import { openAIService } from "../services/openai.service.js";
import { googleDocsService } from "../services/google-docs.service.js";
import { notionService } from "../services/notion.service.js";
import { config } from "../config/config.js";

export class TranscriptionController {
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

  /**
   * Validate authorization token
   * @param {Object} req - Express request object
   * @returns {boolean} - True if authorized, false otherwise
   */
  validateAuthorization(req) {
    console.log("🔐 Checking authorization...");

    if (
      !req.headers.authorization ||
      req.headers.authorization !== config.personalAuthToken
    ) {
      console.log("❌ Authorization failed - missing or invalid token");
      return false;
    }

    console.log("✅ Authorization successful");
    return true;
  }

  /**
   * Validate uploaded file
   * @param {Object} req - Express request object
   * @returns {boolean} - True if file is valid, false otherwise
   */
  validateUploadedFile(req) {
    console.log("📁 Validating uploaded file...");

    if (!req.file || !req.file.buffer) {
      console.log("❌ File validation failed - no file or buffer provided");
      return false;
    }

    console.log("📊 File details:");
    console.log(`  - Original name: ${req.file.originalname}`);
    console.log(`  - MIME type: ${req.file.mimetype}`);
    console.log(`  - Size: ${req.file.buffer.length} bytes`);
    console.log(`  - Field name: ${req.file.fieldname}`);
    console.log("✅ File validation successful");

    return true;
  }

  /**
   * Process transcription using OpenAI service
   * @param {Blob} fileBlob - File blob to transcribe
   * @returns {Promise<string>} - Transcription text
   */
  async processTranscription(fileBlob) {
    const rawTranscriptionText = await this.executeWithRetry(
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

    return rawTranscriptionText;
  }

  /**
   * Update Google Docs with transcription
   * @param {string} transcriptionText - Text to append to Google Docs
   * @returns {Promise<void>}
   */
  async updateGoogleDocs(transcriptionText) {
    await this.executeWithRetry(
      () => googleDocsService.appendText(transcriptionText),
      5, // maxRetries
      3000, // retryDelay
      "Google Docs update",
      "Failed to append text to Google Docs"
    );
  }

  /**
   * Create Notion page with transcription
   * @param {string} transcriptionText - Text to create Notion page with
   * @returns {Promise<void>}
   */
  async createNotionPage(transcriptionText) {
    if (!config.notion.databaseId) {
      console.log(
        "📋 Notion database ID not configured, skipping Notion page creation"
      );
      return;
    }

    await this.executeWithRetry(
      () => notionService.createPageWithTranscription(transcriptionText),
      5, // maxRetries
      3000, // retryDelay
      "Notion page creation",
      "Failed to create Notion page"
    );
  }

  /**
   * Log process start information
   */
  logProcessStart() {
    console.log("=== TRANSCRIPTION PROCESS STARTED ===");
    console.log(`Timestamp: ${new Date().toISOString()}`);
  }

  /**
   * Log process completion information
   * @param {number} startTime - Process start timestamp
   */
  logProcessCompletion(startTime) {
    const totalDuration = Date.now() - startTime;
    console.log("🎉 TRANSCRIPTION PROCESS COMPLETED SUCCESSFULLY");
    console.log(`⏱️ Total process duration: ${totalDuration}ms`);
    console.log("=== END TRANSCRIPTION PROCESS ===");
  }

  /**
   * Log process failure information
   * @param {number} startTime - Process start timestamp
   * @param {Error} error - Error that occurred
   */
  logProcessFailure(startTime, error) {
    const totalDuration = Date.now() - startTime;
    console.error(
      "💥 Unexpected error during transcription process:",
      error.message
    );
    console.error("Stack trace:", error.stack);
    console.error(`⏱️ Process failed after: ${totalDuration}ms`);
    console.log("=== TRANSCRIPTION PROCESS FAILED ===");
  }

  async transcribe(req, res) {
    const startTime = Date.now();
    this.logProcessStart();

    try {
      // Authorization check
      if (!this.validateAuthorization(req)) {
        return res
          .status(401)
          .json({ error: "Authorization header is missing." });
      }

      // File validation
      if (!this.validateUploadedFile(req)) {
        return res.status(400).json({ error: "No audio file provided." });
      }

      // Create file blob
      console.log("🔄 Creating file blob...");
      const fileBlob = this.createFileBlob(req.file);
      console.log(`✅ File blob created successfully`);

      // Process transcription
      let rawTranscriptionText;
      try {
        rawTranscriptionText = await this.processTranscription(fileBlob);
      } catch (error) {
        return res.status(500).json({
          error: error.message,
          details: "OpenAI transcription failed",
        });
      }

      // Update Google Docs and Create Notion page in parallel
      const [googleDocsResult, notionResult] = await Promise.allSettled([
        this.updateGoogleDocs(rawTranscriptionText),
        this.createNotionPage(rawTranscriptionText),
      ]);

      // Check results and handle any failures
      const errors = [];
      if (googleDocsResult.status === "rejected") {
        errors.push({
          service: "Google Docs",
          error: googleDocsResult.reason.message,
        });
      }
      if (notionResult.status === "rejected") {
        errors.push({
          service: "Notion",
          error: notionResult.reason.message,
        });
      }

      // If both failed, return error
      if (errors.length === 2) {
        return res.status(500).json({
          error: "Both Google Docs and Notion operations failed",
          details: errors,
        });
      }

      // If one failed, log warning but continue
      if (errors.length === 1) {
        console.warn(
          `⚠️ ${errors[0].service} operation failed: ${errors[0].error}`
        );
      }

      this.logProcessCompletion(startTime);
      return res.json({
        message: "Transcription completed successfully!",
      });
    } catch (error) {
      this.logProcessFailure(startTime, error);
      return res.status(500).json({
        error: "Unexpected error occurred during transcription process",
        details: error.message,
      });
    }
  }
}

export const transcriptionController = new TranscriptionController();

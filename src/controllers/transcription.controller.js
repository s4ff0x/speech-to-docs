import { File } from "fetch-blob/file.js";
import { openAIService } from "../services/openai.service.js";
import { googleDocsService } from "../services/google-docs.service.js";
import { config } from "../config/config.js";

export class TranscriptionController {
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

      // OpenAI transcription
      let rawTranscriptionText;
      try {
        console.log("🎙️ Starting OpenAI transcription...");
        const transcriptionStartTime = Date.now();
        rawTranscriptionText = await openAIService.transcribeAudio(fileBlob);
        const transcriptionDuration = Date.now() - transcriptionStartTime;
        
        console.log("✅ OpenAI transcription completed successfully");
        console.log(`⏱️ Transcription took: ${transcriptionDuration}ms`);
        console.log(`📝 Transcription length: ${rawTranscriptionText.length} characters`);
        console.log("📄 Original Transcription:", rawTranscriptionText);
      } catch (error) {
        console.error("❌ Error during OpenAI transcription:", error.message);
        console.error("Stack trace:", error.stack);
        return res.status(500).json({ 
          error: "Failed to transcribe audio using OpenAI service",
          details: error.message 
        });
      }

      // Google Docs append
      try {
        console.log("📝 Appending text to Google Docs...");
        const docsStartTime = Date.now();
        await googleDocsService.appendText(rawTranscriptionText);
        const docsDuration = Date.now() - docsStartTime;
        
        console.log("✅ Google Docs update completed successfully");
        console.log(`⏱️ Docs update took: ${docsDuration}ms`);
      } catch (error) {
        console.error("❌ Error during Google Docs update:", error.message);
        console.error("Stack trace:", error.stack);
        return res.status(500).json({ 
          error: "Failed to append text to Google Docs",
          details: error.message 
        });
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
      console.error("💥 Unexpected error during transcription process:", error.message);
      console.error("Stack trace:", error.stack);
      console.error(`⏱️ Process failed after: ${totalDuration}ms`);
      console.log("=== TRANSCRIPTION PROCESS FAILED ===");
      
      return res.status(500).json({ 
        error: "Unexpected error occurred during transcription process",
        details: error.message 
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

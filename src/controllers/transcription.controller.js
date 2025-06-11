import { File } from "fetch-blob/file.js";
import { openAIService } from "../services/openai.service.js";
import { googleDocsService } from "../services/google-docs.service.js";
import { config } from "../config/config.js";

export class TranscriptionController {
  async transcribe(req, res) {
    try {
      if (
        !req.headers.authorization ||
        req.headers.authorization !== config.personalAuthToken
      ) {
        return res
          .status(401)
          .json({ error: "Authorization header is missing." });
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: "No audio file provided." });
      }

      const fileBlob = this.createFileBlob(req.file);

      let rawTranscriptionText;
      try {
        rawTranscriptionText = await openAIService.transcribeAudio(fileBlob);
        console.log("Original Transcription:", rawTranscriptionText);
      } catch (error) {
        console.error("Error during OpenAI transcription:", error.message);
        return res.status(500).json({ 
          error: "Failed to transcribe audio using OpenAI service",
          details: error.message 
        });
      }

      try {
        await googleDocsService.appendText(rawTranscriptionText);
      } catch (error) {
        console.error("Error during Google Docs update:", error.message);
        return res.status(500).json({ 
          error: "Failed to append text to Google Docs",
          details: error.message 
        });
      }

      return res.json({
        message: "Transcription completed successfully!",
      });
    } catch (error) {
      console.error("Unexpected error during transcription process:", error.message);
      return res.status(500).json({ 
        error: "Unexpected error occurred during transcription process",
        details: error.message 
      });
    }
  }

  createFileBlob(file) {
    const filename = file.originalname || "upload.m4a";
    const fileType = file.mimetype || "audio/m4a";
    return new File([file.buffer], filename, { type: fileType });
  }
}

export const transcriptionController = new TranscriptionController();

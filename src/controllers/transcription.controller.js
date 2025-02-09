import { File } from "fetch-blob/file.js";
import { openAIService } from "../services/openai.service.js";
import { googleDocsService } from "../services/google-docs.service.js";
import { config } from "src/config/config.js";

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

      const rawTranscriptionText =
        await openAIService.transcribeAudio(fileBlob);
      console.log("Original Transcription:", rawTranscriptionText);

      await googleDocsService.appendText(rawTranscriptionText);

      return res.json({
        message: "Transcription completed successfully!",
      });
    } catch (error) {
      console.error("Error during transcription or doc update:", error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  createFileBlob(file) {
    const filename = file.originalname || "upload.m4a";
    const fileType = file.mimetype || "audio/m4a";
    return new File([file.buffer], filename, { type: fileType });
  }
}

export const transcriptionController = new TranscriptionController();

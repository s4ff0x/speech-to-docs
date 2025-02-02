import { Router } from "express";
import { upload } from "../middleware/upload.middleware.js";
import { transcriptionController } from "../controllers/transcription.controller.js";

const router = Router();

router.post("/", upload.single("audio"), transcriptionController.transcribe.bind(transcriptionController));

export const transcriptionRoutes = router; 
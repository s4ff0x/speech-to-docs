import express from "express";
import { config } from "./config/config.js";
import { transcriptionRoutes } from "./routes/transcription.routes.js";

const app = express();
app.use(express.json());

// Routes
app.use("/transcribe", transcriptionRoutes);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
}); 
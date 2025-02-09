import OpenAI from "openai";
import { config } from "../config/config.js";

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async transcribeAudio(fileBlob) {
    const transcription = await this.client.audio.transcriptions.create({
      file: fileBlob,
      model: "whisper-1",
    });
    return transcription.text;
  }

  async correctGrammar(text) {
    const response = await this.client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful grammar correction assistant. Fix the grammar only if there are hard errors like hard repetition or absence of meaning, but in all usual cases just keep style of the user's text.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });
    return response.choices[0].message.content.trim();
  }
}

export const openAIService = new OpenAIService(); 
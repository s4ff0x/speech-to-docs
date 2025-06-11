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

  async generateTags(text) {
    const response = await this.client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes text and generates relevant tags for categorization. Generate 3-7 relevant tags based on the content, topics, and themes mentioned in the text. Return only the tags as a JSON array of strings, with each tag being 1-3 words max. Focus on topics, categories, actions, and key concepts.",
        },
        {
          role: "user",
          content: `Analyze this text and generate relevant tags: ${text}`,
        },
      ],
    });
    
    try {
      const tags = JSON.parse(response.choices[0].message.content.trim());
      return Array.isArray(tags) ? tags : [];
    } catch (error) {
      console.error("Error parsing tags from OpenAI response:", error);
      return [];
    }
  }
}

export const openAIService = new OpenAIService(); 
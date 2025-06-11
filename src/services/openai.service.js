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
          content:
            "You are a helpful grammar correction assistant. Fix the grammar only if there are hard errors like hard repetition or absence of meaning, but in all usual cases just keep style of the user's text.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });
    return response.choices[0].message.content.trim();
  }

  async generateTitleAndTags(text) {
    const response = await this.client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that analyzes text and generates a concise title and relevant tags for categorization. Generate a short, descriptive title (3-8 words) that captures the main topic or purpose of the text, and 3-7 relevant tags based on the content, topics, and themes mentioned. Return the result as a JSON object with 'title' (string) and 'tags' (array of strings) properties. Each tag should be 1-3 words max. Focus on topics, categories, actions, and key concepts.",
        },
        {
          role: "user",
          content: `Analyze this text and generate a title and relevant tags: ${text}`,
        },
      ],
    });

    try {
      const result = JSON.parse(response.choices[0].message.content.trim());
      return {
        title: result.title || "Untitled",
        tags: Array.isArray(result.tags) ? result.tags : [],
      };
    } catch (error) {
      console.error(
        "Error parsing title and tags from OpenAI response:",
        error
      );
      return {
        title: "Untitled",
        tags: [],
      };
    }
  }
}

export const openAIService = new OpenAIService();

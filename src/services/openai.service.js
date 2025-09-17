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

  async generateTitleAndTags(text, existingTags = []) {
    const existingTagsText =
      existingTags.length > 0
        ? `\n\nExisting tags in the database: ${existingTags.join(", ")}\n\nIMPORTANT: Prioritize using existing tags when they are relevant to the content. Only suggest new tags if the existing ones don't adequately cover the topics in the text.`
        : "";

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that analyzes text and generates a concise title and relevant tags for categorization. Generate a short, descriptive title (3-8 words) that captures the main topic or purpose of the text, and 3-7 relevant tags based on the content, topics, and themes mentioned.${existingTagsText}
            
            Return the result as a JSON object with 'title' (string) and 'tags' (array of strings) properties. Each tag should be 1-3 words max. Focus on topics, categories, actions, and key concepts.
            
            When existing tags are provided, follow these rules:
            1. Use existing tags that are relevant to the content (exact match preferred, but semantic similarity is acceptable)
            2. Only create new tags if the existing ones don't adequately represent the content
            3. Aim to use a mix of existing and new tags when appropriate
            4. Keep the total number of tags between 3-7`,
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

  async classifyCategoryTags(text, availableTags = []) {
    // Hardcoded, refined single-prompt classifier for category tags
    const CATEGORY_PROMPT = `You are a precise text classifier for high-level category tags. You must decide which, if any, of the ALLOWED_TAGS apply to the user's text. Output ONLY JSON with a single field 'tags' (array of strings).

Categories and strict inclusion criteria:

1) dev
Decide if the text clearly belongs to "Development". Include when the text is about:
- Programming (code, libraries, frameworks, debugging, algorithms, data structures)
- Software engineering (apps, web, mobile, backend, frontend, APIs, databases, cloud, DevOps, testing, deployment)
- Related IT tools/environments (IDEs, version control, Git, CI/CD, Docker, etc.)
- Learning materials about development (courses, tutorials, notes), even if not hands-on coding

2) health
Decide if the text clearly belongs to "Health". Include when the text is about:
- Physical health (illnesses, symptoms, treatments, recovery, exercise, nutrition, sleep, fitness, lifestyle habits)
- Mental health (stress, anxiety, depression, therapy, psychology, emotional well-being)
- Healthcare system/practice (doctors, hospitals, medications, research, trials, advice, patient care)
- Learning materials about health (articles, guides, educational videos/resources about medicine, fitness, psychology, healthcare)

Rules:
- Consider each category independently; multiple categories may apply.
- ONLY return tags that exist in ALLOWED_TAGS exactly; NEVER invent new tags or variants.
- Be conservative: add a tag only if the text clearly matches the above criteria.
- Return JSON only: {"tags": ["dev", "health"]} (order does not matter).
`;

    // Ensure allowed tags list is stable and lowercased for matching
    const allowedSet = new Set((availableTags || []).map((t) => String(t).trim()));

    if (allowedSet.size === 0) {
      return [];
    }

    const allowedTagsList = Array.from(allowedSet).join(", ");

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CATEGORY_PROMPT },
        {
          role: "user",
          content: `ALLOWED_TAGS: [${allowedTagsList}]\n\nTEXT TO CLASSIFY:\n${text}`,
        },
      ],
    });

    try {
      const result = JSON.parse(response.choices[0].message.content.trim());
      const proposed = Array.isArray(result.tags) ? result.tags : [];
      // Strictly filter to allowed set and preserve input case
      const proposedSet = new Set(proposed.map((t) => String(t).trim()));
      const matched = Array.from(allowedSet).filter((t) => proposedSet.has(t));
      return matched;
    } catch (error) {
      console.error("Error parsing category tags from OpenAI response:", error);
      return [];
    }
  }
}

export const openAIService = new OpenAIService();

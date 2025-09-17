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
- Programming (code, libraries, frameworks, debugging, algorithms, data structures)
- Software engineering (apps, web, mobile, backend, frontend, APIs, databases, cloud, DevOps, testing, deployment)
- Related IT tools/environments (IDEs, version control, Git, CI/CD, Docker, etc.)
- Game design and development (mechanics, engines, assets, level design, publishing)
- Learning materials about development (courses, tutorials, documentation, video lessons, study notes), even if not hands-on coding
- Any IT, programming, or software-related content, even if indirect (careers in IT, dev culture, workflows, tools)
- Any kind of product creation (digital or physical): designing, building, prototyping, producing, or explaining how something is created
- Any kind of education, teaching, or learning: tutorials, guides, lessons, study materials, online/offline courses, coaching, instructions
- Any kind of design work: UI/UX design, graphic design, visual design, architectural design, product design, creative design processes

2) health
Decide if the text clearly belongs to "Health". Include when the text is about:
- Physical health (illnesses, symptoms, treatments, recovery, exercise, nutrition, sleep, fitness, lifestyle habits)
- Mental health (stress, anxiety, depression, therapy, psychology, emotional well-being)
- Healthcare system/practice (doctors, hospitals, medications, research, trials, advice, patient care)
- Learning materials about health (articles, guides, educational videos/resources about medicine, fitness, psychology, healthcare)

3) art
- Writing (stories, novels, essays, creative writing)
- Poetry (poems, haiku, lyrics, spoken word)
- Visual arts (drawing, painting, illustration, sketching, sculpture, photography)
- Performing arts (theater, dance, acting, performance)
- Digital art and creative design (graphic design, animation, multimedia)
- Learning materials about art (tutorials, courses, guides, educational videos or articles about writing, poetry, drawing, painting, or other arts)

4) task
- Any action that someone needs to do (personal or work)
- To-do items, chores, responsibilities, assignments
- Instructions for action (e.g., "Fix the bug in the login page", "Write an essay", "Buy groceries")
- Work-related tasks (coding, writing reports, attending meetings)
- Personal tasks (call a friend, clean the room, go to the gym)
- Educational tasks (study chapter 3, complete a homework, watch a tutorial)
- Any text that is phrased as an action or obligation, explicitly or implicitly

5) important
- Critical facts (numbers, dates, metrics, key results, discoveries)
- Warnings, alerts, health/safety notices
- Official announcements, decisions, deadlines
- Essential knowledge for understanding a situation (rules, instructions, conditions, limitations, consequences)
- Key insights, findings, or takeaways from an analysis, meeting, or report
- Any text explicitly stating that something is "important" (e.g., "important", "важно", "важный", "crucial", "critical", "essential")
- Any text where the author directly explains or marks it as important information

6) philosophy
- Classical philosophy (Plato, Aristotle, Kant, Nietzsche, etc.)
- Modern philosophy (existentialism, phenomenology, postmodernism, analytic philosophy)
- Ethical discussions (right/wrong, morality, justice, values, human nature)
- Metaphysics (existence, reality, time, space, free will, determinism)
- Epistemology (knowledge, truth, belief, skepticism, perception)
- Logic and reasoning (arguments, fallacies, structure of thought)
- Aesthetics (beauty, art theory, meaning of art)
- Political philosophy (freedom, rights, justice, state, society)
- Any text reflecting on meaning of life, human purpose, consciousness, or deep abstract reasoning
- Learning or teaching materials about philosophy (tutorials, lectures, courses, essays, guides)

7) idea
- Any new thought, suggestion, or proposal (e.g., "What if we build an app for this?")
- Creative concepts (stories, inventions, designs, art or business concepts)
- Plans or initiatives (e.g., "We could start a project to…")
- Hypothetical or speculative reasoning (e.g., "Imagine if humans could live on Mars.")
- Brainstorming or ideation notes (early drafts, sketches of thoughts)
- Philosophical or abstract ideas (meaning of life, new perspectives, theories)
- Any text where the author directly says they have an idea or are sharing one

8) mistake
- Errors, bugs, failures, crashes, incorrect behavior
- Human mistakes (typos, miscalculations, wrong decisions, misunderstanding)
- Software mistakes (coding errors, wrong output, compile/runtime errors, exceptions, failed tests)
- Logical or factual mistakes (wrong assumptions, contradictions, false statements)
- Descriptions of something done incorrectly ("I accidentally deleted the file", "The result was wrong")
- Explicit mentions of error-related words: "mistake", "error", "bug", "failure", "incorrect", "wrong", "typo" (or equivalents in other languages, e.g. "ошибка", "неверно", "сбой")
- Any text where the author directly explains that there was a mistake or problem

9) life
- Human life experiences (daily routines, relationships, emotions, personal growth, family, work-life balance)
- Reflections about life, existence, or meaning of life
- Biology of life (living organisms, birth, death, evolution, ecology)
- Health and lifestyle (habits, food, exercise, well-being as part of living)
- Life events (marriage, travel, career changes, childhood, aging)
- Any philosophical or literary text about existence, consciousness, or being alive
- Any text explicitly mentioning "life" or equivalents (e.g., "жизнь", "vida", "vie")

---

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

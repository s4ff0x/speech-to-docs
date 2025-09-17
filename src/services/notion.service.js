import { Client } from "@notionhq/client";
import { config } from "../config/config.js";
import { openAIService } from "./openai.service.js";

class NotionService {
  constructor() {
    this.client = new Client({
      auth: config.notion.apiKey,
    });
  }

  // Utility function to extract database ID from URL or return clean ID
  extractDatabaseId(databaseIdOrUrl) {
    // If it's already a clean UUID, return it
    if (/^[0-9a-f]{32}$/i.test(databaseIdOrUrl)) {
      return databaseIdOrUrl;
    }

    // Extract from URL format: remove query parameters and hyphens
    const cleanId = databaseIdOrUrl
      .split("?")[0] // Remove query parameters
      .replace(/-/g, ""); // Remove hyphens

    return cleanId;
  }

  async createPageWithTranscription(transcribedText) {
    try {
      console.log("📋 Fetching database properties...");
      const dbProperties = await this.getDatabaseProperties();
      console.log(`✅ Database properties found:`, Object.keys(dbProperties));

      // Identify property names once
      const titlePropertyName = this.findTitleProperty(dbProperties);
      const tagsPropertyName = this.findTagsProperty(dbProperties);
      const categoryTagsPropertyName = this.findCategoryTagsProperty(dbProperties);
      const contentPropertyName = this.findContentProperty(dbProperties);

      // Extract existing options once
      const existingTags = tagsPropertyName && dbProperties[tagsPropertyName]?.type === "multi_select"
        ? (dbProperties[tagsPropertyName].multi_select.options || []).map((o) => o.name)
        : [];

      const existingCategoryTags = categoryTagsPropertyName && dbProperties[categoryTagsPropertyName]?.type === "multi_select"
        ? (dbProperties[categoryTagsPropertyName].multi_select.options || []).map((o) => o.name)
        : [];

      console.log(`🏷️ Found ${existingTags.length} existing tags; ${existingCategoryTags.length} existing category-tags`);

      // Run LLM tasks in parallel
      console.log("🤖 Running OpenAI calls in parallel...");
      const [titleAndTags, matchedCategoryTags] = await Promise.all([
        openAIService.generateTitleAndTags(transcribedText, existingTags),
        categoryTagsPropertyName
          ? openAIService.classifyCategoryTags(transcribedText, existingCategoryTags)
          : Promise.resolve([]),
      ]);

      const { title, tags } = titleAndTags;
      console.log(`✅ Generated title: "${title}"`);
      console.log(`✅ Selected ${tags.length} tags:`, tags);

      // Analyze which tags are existing vs new
      const existingTagsUsed = tags.filter((tag) =>
        existingTags.some(
          (existingTag) => existingTag.toLowerCase() === tag.toLowerCase()
        )
      );
      const newTags = tags.filter(
        (tag) =>
          !existingTags.some(
            (existingTag) => existingTag.toLowerCase() === tag.toLowerCase()
          )
      );

      if (existingTagsUsed.length > 0) {
        console.log(
          `♻️  Reusing ${existingTagsUsed.length} existing tags:`,
          existingTagsUsed
        );
      }
      if (newTags.length > 0) {
        console.log(`🆕 Creating ${newTags.length} new tags:`, newTags);
      }

      console.log("📄 Creating new page in Notion database...");

      // Create the page properties dynamically based on available properties
      const properties = {};

      if (titlePropertyName) {
        properties[titlePropertyName] = {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        };
        console.log(
          `✅ Using title property: "${titlePropertyName}" with title: "${title}"`
        );
      }

      if (tagsPropertyName) {
        properties[tagsPropertyName] = {
          multi_select: tags.map((tag) => ({ name: tag })),
        };
        console.log(`✅ Using tags property: "${tagsPropertyName}"`);
      }

      // Handle category-tags classification using only existing options (already computed)
      if (categoryTagsPropertyName) {
        console.log(
          `✅ Matched ${matchedCategoryTags.length} category tags:`,
          matchedCategoryTags
        );
        if (matchedCategoryTags.length > 0) {
          properties[categoryTagsPropertyName] = {
            multi_select: matchedCategoryTags.map((t) => ({ name: t })),
          };
          console.log(
            `✅ Using category-tags property: "${categoryTagsPropertyName}"`
          );
        } else {
          console.log(
            "ℹ️ No category-tags matched. Skipping category-tags for this page."
          );
        }
      }

      if (contentPropertyName) {
        properties[contentPropertyName] = {
          rich_text: [
            {
              type: "text",
              text: {
                content: transcribedText,
              },
            },
          ],
        };
        console.log(
          `✅ Using content property: "${contentPropertyName}" for transcribed text`
        );
      } else {
        console.log(
          "⚠️ No content property found in database. Transcribed text will not be stored."
        );
      }

      // Create the page (content now goes to Content property instead of page body)
      const response = await this.client.pages.create({
        parent: {
          database_id: this.extractDatabaseId(config.notion.databaseId),
        },
        properties: properties,
      });

      console.log("✅ Notion page created successfully");
      console.log(`📝 Page ID: ${response.id}`);
      console.log(`🔗 Page URL: ${response.url}`);

      return response;
    } catch (error) {
      console.error("❌ Error creating Notion page:", error);
      throw error;
    }
  }

  // Helper method to find the title property
  findTitleProperty(properties) {
    // Look for properties with type 'title'
    for (const [name, config] of Object.entries(properties)) {
      if (config.type === "title") {
        return name;
      }
    }
    return null;
  }

  // Helper method to find a suitable tags property
  findTagsProperty(properties) {
    // Prefer EXACT property name 'tags' (case-insensitive). Do not fallback to similarly named properties
    for (const [name, config] of Object.entries(properties)) {
      if (config.type === "multi_select" && name.trim().toLowerCase() === "tags") {
        return name;
      }
    }

    return null;
  }

  // Helper method to find the category-tags property
  findCategoryTagsProperty(properties) {
    // Prefer exact 'category-tags' (case-insensitive), else any multiselect containing both 'category' and 'tag'
    for (const [name, config] of Object.entries(properties)) {
      if (config.type === "multi_select" && name.toLowerCase() === "category-tags") {
        return name;
      }
    }

    for (const [name, config] of Object.entries(properties)) {
      if (config.type === "multi_select") {
        const lower = name.toLowerCase();
        if (lower.includes("category") && lower.includes("tag")) {
          return name;
        }
      }
    }

    return null;
  }

  // Helper method to find a suitable content property
  findContentProperty(properties) {
    // Look for rich_text properties with content-like names
    const contentNames = ["content", "text", "body", "description", "notes"];

    for (const [name, config] of Object.entries(properties)) {
      if (config.type === "rich_text") {
        // Check if the property name contains any content-like words
        if (
          contentNames.some((contentName) =>
            name.toLowerCase().includes(contentName)
          )
        ) {
          return name;
        }
      }
    }

    // If no content-like property found, return the first rich_text property
    for (const [name, config] of Object.entries(properties)) {
      if (config.type === "rich_text") {
        return name;
      }
    }

    return null;
  }

  async getDatabaseProperties() {
    try {
      const response = await this.client.databases.retrieve({
        database_id: this.extractDatabaseId(config.notion.databaseId),
      });
      return response.properties;
    } catch (error) {
      console.error("❌ Error fetching database properties:", error);
      throw error;
    }
  }

  async getExistingTags() {
    try {
      console.log("🔍 Fetching existing tags from database...");

      // First, find the tags property
      const dbProperties = await this.getDatabaseProperties();
      const tagsPropertyName = this.findTagsProperty(dbProperties);

      if (!tagsPropertyName) {
        console.log("⚠️ No tags property found in database");
        return [];
      }

      // Get the property configuration which contains existing options
      const tagsProperty = dbProperties[tagsPropertyName];

      if (
        tagsProperty.type === "multi_select" &&
        tagsProperty.multi_select.options
      ) {
        const existingTags = tagsProperty.multi_select.options.map(
          (option) => option.name
        );
        console.log(
          `✅ Retrieved ${existingTags.length} existing tags from property "${tagsPropertyName}"`
        );
        return existingTags;
      }

      return [];
    } catch (error) {
      console.error("❌ Error fetching existing tags:", error);
      return []; // Return empty array on error to allow the process to continue
    }
  }

  async getExistingCategoryTags() {
    try {
      console.log("🔍 Fetching existing category-tags from database...");

      // First, find the category-tags property
      const dbProperties = await this.getDatabaseProperties();
      const categoryTagsPropertyName = this.findCategoryTagsProperty(dbProperties);

      if (!categoryTagsPropertyName) {
        console.log("⚠️ No category-tags property found in database");
        return [];
      }

      // Get the property configuration which contains existing options
      const categoryTagsProperty = dbProperties[categoryTagsPropertyName];

      if (
        categoryTagsProperty.type === "multi_select" &&
        categoryTagsProperty.multi_select.options
      ) {
        const existingTags = categoryTagsProperty.multi_select.options.map(
          (option) => option.name
        );
        console.log(
          `✅ Retrieved ${existingTags.length} existing category-tags from property "${categoryTagsPropertyName}"`
        );
        return existingTags;
      }

      return [];
    } catch (error) {
      console.error("❌ Error fetching existing category-tags:", error);
      return [];
    }
  }
}

export const notionService = new NotionService();

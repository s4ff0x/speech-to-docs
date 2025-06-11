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
      console.log("🏷️ Fetching existing tags from Notion database...");
      const existingTags = await this.getExistingTags();
      console.log(`✅ Found ${existingTags.length} existing tags in database`);

      console.log("🏷️ Generating title and tags for transcribed text...");
      const { title, tags } = await openAIService.generateTitleAndTags(
        transcribedText,
        existingTags
      );
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

      console.log("📋 Fetching database properties...");
      const dbProperties = await this.getDatabaseProperties();
      console.log(`✅ Database properties found:`, Object.keys(dbProperties));

      // Find the title property (it's usually the first property or has type 'title')
      const titlePropertyName = this.findTitleProperty(dbProperties);

      // Find a multiselect property for tags (look for 'tags', 'tag', 'categories', etc.)
      const tagsPropertyName = this.findTagsProperty(dbProperties);

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

      // Create the page with content
      const response = await this.client.pages.create({
        parent: {
          database_id: this.extractDatabaseId(config.notion.databaseId),
        },
        properties: properties,
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: transcribedText,
                  },
                },
              ],
            },
          },
        ],
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
    // Look for multiselect properties with tag-like names
    const tagNames = ["tags"];

    for (const [name, config] of Object.entries(properties)) {
      if (config.type === "multi_select") {
        // Check if the property name contains any tag-like words
        if (tagNames.some((tagName) => name.toLowerCase().includes(tagName))) {
          return name;
        }
      }
    }

    // If no tag-like property found, return the first multiselect property
    for (const [name, config] of Object.entries(properties)) {
      if (config.type === "multi_select") {
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
}

export const notionService = new NotionService();

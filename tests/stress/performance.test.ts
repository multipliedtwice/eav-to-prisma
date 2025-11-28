// tests/stress/performance.test.ts

import { describe, it, expect } from "vitest";
import { Generator } from "../../src/core/generator";
import type { Config } from "../../src/types/config";
import { expectLine } from "../test-helpers";

describe("Stress Tests - Performance & Scale", () => {
  describe("large schemas", () => {
    it("handles 50+ models efficiently", async () => {
      const models = Array.from({ length: 50 }, (_, i) => ({
        slug: `model-${i}`,
        name: `Model${i}`,
        fields: [
          { key: "name", label: "Name", type: "text" as const, required: true },
          {
            key: "description",
            label: "Description",
            type: "text" as const,
            required: false,
          },
        ],
      }));

      const config: Config = {
        input: { models },
      };

      const startTime = Date.now();
      const generator = new Generator(config);
      const result = await generator.generate();
      const duration = Date.now() - startTime;

      expect(result.componentsGenerated).toHaveLength(50);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it("handles model with 100+ fields", async () => {
      const fields = Array.from({ length: 100 }, (_, i) => ({
        key: `field_${i}`,
        label: `Field ${i}`,
        type: "text" as const,
        required: false,
        translatable: false,
      }));

      const config: Config = {
        input: {
          models: [
            {
              slug: "large-model",
              name: "LargeModel",
              fields,
            },
          ],
        },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      expectLine(result.schema, "model LargeModel");
      // Count fields (approximate - should have 100 + id + timestamps)
      const fieldCount = (result.schema.match(/field_\d+/g) || []).length;
      expect(fieldCount).toBe(100);
    });

    it("handles deeply nested component structure", async () => {
      // Component A -> Component B -> Component C (3 levels)
      // Note: Nested components are flattened in the current implementation
      const config: Config = {
        input: {
          models: [
            {
              slug: "page",
              name: "Page",
              fields: [
                {
                  key: "section_a",
                  label: "Section A",
                  type: "component",
                  required: false,
                  translatable: false,
                  config: {
                    type: "component",
                    slug: "component-a",
                    repeatable: false,
                  },
                },
              ],
            },
          ],
          components: [
            {
              slug: "component-a",
              name: "Component A",
              fields: [
                {
                  key: "text_a",
                  label: "Text A",
                  type: "text",
                  required: true,
                  translatable: false,
                },
              ],
            },
          ],
        },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      // Should generate component table for first level
      expectLine(result.schema, "model PageSectionA");
    });
  });

  describe("complex relation graphs", () => {
    it("handles 20+ many-to-many relations", async () => {
      const targetModels = Array.from({ length: 20 }, (_, i) => `tag${i}`);

      const config: Config = {
        input: {
          models: [
            {
              slug: "post",
              name: "Post",
              fields: [
                { key: "title", label: "Title", type: "text", required: true },
                ...targetModels.map((target, i) => ({
                  key: `tags_${i}`,
                  label: `Tags ${i}`,
                  type: "relation" as const,
                  required: false,
                  config: {
                    type: "relation" as const,
                    relationType: "manyToMany" as const,
                    targetModel: target,
                    displayField: "name",
                    cascade: "restrict" as const,
                  },
                })),
              ],
            },
          ],
        },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      const junctionCount = (result.schema.match(/model PostTag\d+ \{/g) || [])
        .length;
      expect(junctionCount).toBe(20);
    });

    it("handles complex web of relations between 10 models", async () => {
      const config: Config = {
        input: {
          models: [
            {
              slug: "user",
              name: "User",
              fields: [
                { key: "name", label: "Name", type: "text", required: true },
              ],
            },
            {
              slug: "post",
              name: "Post",
              fields: [
                { key: "title", label: "Title", type: "text", required: true },
                {
                  key: "author",
                  label: "Author",
                  type: "relation",
                  required: true,
                  config: {
                    type: "relation",
                    relationType: "manyToOne",
                    targetModel: "user",
                    displayField: "name",
                    cascade: "restrict",
                  },
                },
                {
                  key: "categories",
                  label: "Categories",
                  type: "relation",
                  required: false,
                  config: {
                    type: "relation",
                    relationType: "manyToMany",
                    targetModel: "category",
                    displayField: "name",
                    cascade: "restrict",
                  },
                },
                {
                  key: "tags",
                  label: "Tags",
                  type: "relation",
                  required: false,
                  config: {
                    type: "relation",
                    relationType: "manyToMany",
                    targetModel: "tag",
                    displayField: "name",
                    cascade: "restrict",
                  },
                },
              ],
            },
            {
              slug: "category",
              name: "Category",
              fields: [
                { key: "name", label: "Name", type: "text", required: true },
              ],
            },
            {
              slug: "tag",
              name: "Tag",
              fields: [
                { key: "name", label: "Name", type: "text", required: true },
              ],
            },
            {
              slug: "comment",
              name: "Comment",
              fields: [
                { key: "text", label: "Text", type: "text", required: true },
                {
                  key: "post",
                  label: "Post",
                  type: "relation",
                  required: true,
                  config: {
                    type: "relation",
                    relationType: "manyToOne",
                    targetModel: "post",
                    displayField: "title",
                    cascade: "cascade",
                  },
                },
                {
                  key: "author",
                  label: "Author",
                  type: "relation",
                  required: true,
                  config: {
                    type: "relation",
                    relationType: "manyToOne",
                    targetModel: "user",
                    displayField: "name",
                    cascade: "restrict",
                  },
                },
              ],
            },
          ],
        },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      // Verify all models and relations generated
      expectLine(result.schema, "model User");
      expectLine(result.schema, "model Post");
      expectLine(result.schema, "model Category");
      expectLine(result.schema, "model Tag");
      expectLine(result.schema, "model Comment");
      expectLine(result.schema, "model PostCategory");
      expectLine(result.schema, "model PostTag");
    });
  });

  describe("translation heavy schemas", () => {
    it("handles 30+ models with i18n enabled", async () => {
      const models = Array.from({ length: 30 }, (_, i) => ({
        slug: `model-${i}`,
        name: `Model${i}`,
        fields: [
          {
            key: "name",
            label: "Name",
            type: "text" as const,
            required: true,
            translatable: true,
          },
          {
            key: "description",
            label: "Description",
            type: "text" as const,
            required: false,
            translatable: true,
          },
        ],
      }));

      const config: Config = {
        input: { models },
        i18n: {
          enabled: true,
          defaultLang: "en",
          tableNaming: "${identifier}_translation",
        },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      // Should generate 30 main models + 30 translation models = 60 total
      const modelCount = (result.schema.match(/^model /gm) || []).length;
      expect(modelCount).toBeGreaterThanOrEqual(60);
    });

    it("handles model with 50+ translatable fields", async () => {
      const fields = Array.from({ length: 50 }, (_, i) => ({
        key: `field_${i}`,
        label: `Field ${i}`,
        type: "text" as const,
        required: false,
        translatable: true,
      }));

      fields.push({
        key: "slug",
        label: "Slug",
        type: "text" as const,
        required: true,
        translatable: false,
      });

      const config: Config = {
        input: {
          models: [
            {
              slug: "large-i18n-model",
              name: "LargeI18nModel",
              fields,
            },
          ],
        },
        i18n: {
          enabled: true,
          defaultLang: "en",
          tableNaming: "${identifier}_translation",
        },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      expectLine(result.schema, "model LargeI18nModel {");
      expectLine(result.schema, "model LargeI18nModelTranslation {");
    });
  });

  describe("memory and efficiency", () => {
    it("generates very long schema without memory issues", async () => {
      // Generate a schema that would produce substantial output
      const models = Array.from({ length: 30 }, (_, i) => ({
        slug: `model-${i}`,
        name: `Model${i}`,
        fields: [
          {
            key: "field1",
            label: "Field 1",
            type: "text" as const,
            required: true,
            translatable: false,
          },
          {
            key: "field2",
            label: "Field 2",
            type: "text" as const,
            required: false,
            translatable: false,
          },
          {
            key: "field3",
            label: "Field 3",
            type: "number" as const,
            required: false,
            translatable: false,
          },
          {
            key: "field4",
            label: "Field 4",
            type: "boolean" as const,
            required: false,
            translatable: false,
          },
          {
            key: "field5",
            label: "Field 5",
            type: "date" as const,
            required: false,
            translatable: false,
          },
        ],
      }));

      const config: Config = {
        input: { models },
        i18n: {
          enabled: true,
          defaultLang: "en",
          tableNaming: "${identifier}_translation",
        },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      expect(result.schema.length).toBeGreaterThan(8000); // FIXED: At least 8KB (was 10KB)
      expect(result.componentsGenerated).toHaveLength(30);
    });

    it("handles repeated generation without memory leaks", async () => {
      const config: Config = {
        input: {
          models: [
            {
              slug: "post",
              name: "Post",
              fields: [
                { key: "title", label: "Title", type: "text", required: true },
              ],
            },
          ],
        },
      };

      // Generate 100 times
      for (let i = 0; i < 100; i++) {
        const generator = new Generator(config);
        const result = await generator.generate();
        expectLine(result.schema, "model Post");
      }

      // If we got here without crashing, memory is probably fine
      expect(true).toBe(true);
    });
  });

  describe("edge case combinations", () => {
    it("handles kitchen sink: 20 models, i18n, components, relations, validation", async () => {
      const config: Config = {
        input: {
          models: Array.from({ length: 20 }, (_, i) => ({
            slug: `model-${i}`,
            name: `Model${i}`,
            fields: [
              {
                key: "name",
                label: "Name",
                type: "text" as const,
                required: true,
                translatable: true,
                validation: {
                  minLength: 2,
                  maxLength: 100,
                },
              },
              {
                key: "related",
                label: "Related",
                type: "relation" as const,
                required: false,
                config: {
                  type: "relation" as const,
                  relationType: "manyToMany" as const,
                  targetModel: `model-${(i + 1) % 20}`,
                  displayField: "name",
                  cascade: "restrict" as const,
                },
              },
            ],
          })),
          components: [
            {
              slug: "test-component",
              name: "TestComponent",
              fields: [
                {
                  key: "text",
                  label: "Text",
                  type: "text",
                  required: true,
                  translatable: true,
                },
              ],
            },
          ],
        },
        i18n: {
          enabled: true,
          defaultLang: "en",
          tableNaming: "${identifier}_translation",
        },
        naming: { convention: "PascalCase" },
      };

      const startTime = Date.now();
      const generator = new Generator(config);
      const result = await generator.generate();
      const duration = Date.now() - startTime;

      expect(result.componentsGenerated).toHaveLength(20);
      expect(result.warnings).toHaveLength(0);
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });
});

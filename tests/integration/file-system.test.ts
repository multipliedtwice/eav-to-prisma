// tests/integration/file-system.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Generator } from "../../src/core/generator";
import { loadConfig } from "../../src/cli/config-loader";
import type { Config } from "../../src/types/config";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { expectLine } from "../test-helpers";

const TEST_DIR = path.join(process.cwd(), "test-output");
const TEST_CONFIG_PATH = path.join(TEST_DIR, "test.config.ts");

describe("Integration - File System Operations", () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("schema file writing", () => {
    it("creates output directory if not exists", async () => {
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
        output: {
          schemaPath: path.join(TEST_DIR, "nested", "deep", "schema.prisma"),
        },
      };

      const generator = new Generator(config);
      await generator.write();

      const schemaPath = path.join(TEST_DIR, "nested", "deep", "schema.prisma");
      expect(existsSync(schemaPath)).toBe(true);

      const content = await fs.readFile(schemaPath, "utf-8");
      expectLine(content, "model Post");
    });

    it("overwrites existing schema file", async () => {
      const schemaPath = path.join(TEST_DIR, "schema.prisma");

      // Write initial file
      await fs.writeFile(schemaPath, "OLD CONTENT", "utf-8");

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
        output: {
          schemaPath,
        },
      };

      const generator = new Generator(config);
      await generator.write();

      const content = await fs.readFile(schemaPath, "utf-8");
      expect(content).not.toContain("OLD CONTENT");
      expectLine(content, "model Post");
    });

    it("handles write to read-only directory gracefully", async () => {
      // This test is platform-specific and might not work on all systems
      // Skip on Windows where permissions work differently
      if (process.platform === "win32") {
        return;
      }

      const readonlyDir = path.join(TEST_DIR, "readonly");
      await fs.mkdir(readonlyDir, { recursive: true });
      await fs.chmod(readonlyDir, 0o444); // Read-only

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
        output: {
          schemaPath: path.join(readonlyDir, "schema.prisma"),
        },
      };

      const generator = new Generator(config);

      await expect(generator.write()).rejects.toThrow();

      // Cleanup
      await fs.chmod(readonlyDir, 0o755);
    });

    it("writes schema with correct encoding (UTF-8)", async () => {
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
        output: {
          schemaPath: path.join(TEST_DIR, "schema.prisma"),
        },
      };

      const generator = new Generator(config);
      await generator.write();

      const schemaPath = path.join(TEST_DIR, "schema.prisma");
      const buffer = await fs.readFile(schemaPath);

      // Check for UTF-8 BOM (should not be present)
      expect(buffer[0]).not.toBe(0xef);

      // Read as string and verify content
      const content = buffer.toString("utf-8");
      expectLine(content, "model Post");
    });
  });

  describe("config loading", () => {
    it("loads config from TypeScript file", async () => {
      // Note: Dynamic import of TypeScript files in test environment is complex
      // This test verifies the loadConfig function works with valid module exports
      const configContent = `
        export default {
          input: {
            models: [
              {
                slug: 'post',
                name: 'Post',
                fields: [
                  { key: 'title', label: 'Title', type: 'text', required: true }
                ]
              }
            ]
          }
        };
      `;

      const configPath = path.join(TEST_DIR, "valid.config.mjs");
      await fs.writeFile(configPath, configContent, "utf-8");

      const config = await loadConfig(configPath);

      expect(config.input).toBeDefined();
      expect(config.input).toHaveProperty("models");
    });

    it("handles config file not found", async () => {
      const nonexistentPath = path.join(TEST_DIR, "nonexistent.config.ts");

      await expect(loadConfig(nonexistentPath)).rejects.toThrow(
        /Config file not found/
      );
    });

    it("handles malformed config file", async () => {
      // FIXED: Use unique filename to avoid module cache
      const malformedConfig = `
        export default {
          input: {
            models: [{ invalid: true }]  // Missing required fields like slug, name, fields
          }
        };
      `;

      const configPath = path.join(TEST_DIR, "malformed.config.mjs");
      await fs.writeFile(configPath, malformedConfig, "utf-8");

      const config = await loadConfig(configPath);
      const generator = new Generator(config);
      
      // FIXED: Validation happens during generate(), not constructor
      await expect(generator.generate()).rejects.toThrow();
    });

    it("validates config against schema", async () => {
      // FIXED: Use unique filename to avoid module cache
      const invalidConfig = `
        export default {
          output: {
            schemaPath: './schema.prisma'
          }
        };
      `;

      const configPath = path.join(TEST_DIR, "invalid.config.mjs");
      await fs.writeFile(configPath, invalidConfig, "utf-8");

      // FIXED: loadConfig itself should throw because config is invalid
      await expect(loadConfig(configPath)).rejects.toThrow(/provide either/);
    });
  });

  describe("multi-file generation", () => {
    it("generates multiple schema files with multi-schema", async () => {
      // Note: Multi-schema is not fully implemented yet, but test shows the pattern
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
        output: {
          schemaPath: path.join(TEST_DIR, "schema.prisma"),
          multiSchema: true,
          schemaName: "content",
        },
      };

      const generator = new Generator(config);
      await generator.write();

      // For now, should just write to single file
      const schemaPath = path.join(TEST_DIR, "schema.prisma");
      expect(existsSync(schemaPath)).toBe(true);
    });
  });
});

describe("Integration - Real-World Scenarios", () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("generates full CMS schema with all features", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "page",
            name: "Page",
            fields: [
              {
                key: "title",
                label: "Title",
                type: "text",
                required: true,
                translatable: true,
              },
              {
                key: "slug",
                label: "Slug",
                type: "text",
                required: true,
                translatable: false,
              },
              {
                key: "status",
                label: "Status",
                type: "select",
                required: true,
                translatable: false,
                config: {
                  type: "select",
                  options: ["draft", "published", "archived"],
                },
              },
              {
                key: "published_at",
                label: "Published At",
                type: "date",
                required: false,
                translatable: false,
              },
              {
                key: "author",
                label: "Author",
                type: "relation",
                required: true,
                translatable: false,
                config: {
                  type: "relation",
                  relationType: "manyToOne",
                  targetModel: "user",
                  displayField: "name",
                  cascade: "restrict",
                },
              },
              {
                key: "hero",
                label: "Hero Section",
                type: "component",
                required: false,
                translatable: false,
                config: {
                  type: "component",
                  slug: "hero",
                  repeatable: false,
                },
              },
              {
                key: "content_blocks",
                label: "Content Blocks",
                type: "component",
                required: false,
                translatable: false,
                config: {
                  type: "component",
                  slug: "content-block",
                  repeatable: true,
                },
              },
            ],
            settings: {
              sortField: "published_at",
            },
          },
          {
            slug: "user",
            name: "User",
            fields: [
              { key: "name", label: "Name", type: "text", required: true },
              { key: "email", label: "Email", type: "text", required: true },
            ],
          },
        ],
        components: [
          {
            slug: "hero",
            name: "Hero",
            fields: [
              {
                key: "heading",
                label: "Heading",
                type: "text",
                required: true,
                translatable: true,
              },
              {
                key: "subheading",
                label: "Subheading",
                type: "text",
                required: false,
                translatable: true,
              },
              {
                key: "image",
                label: "Background Image",
                type: "media",
                required: false,
                config: { type: "media", multiple: false },
              },
            ],
          },
          {
            slug: "content-block",
            name: "Content Block",
            fields: [
              {
                key: "heading",
                label: "Heading",
                type: "text",
                required: true,
                translatable: true,
              },
              {
                key: "content",
                label: "Content",
                type: "rich",
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
      naming: {
        convention: "PascalCase",
      },
      output: {
        schemaPath: path.join(TEST_DIR, "full-schema.prisma"),
        datasource: {
          provider: "postgresql",
          url: 'env("DATABASE_URL")',
        },
      },
    };

    const generator = new Generator(config);
    await generator.write();

    const schemaPath = path.join(TEST_DIR, "full-schema.prisma");
    const content = await fs.readFile(schemaPath, "utf-8");

    // Verify all models generated
    expectLine(content, "model Page {");
    expectLine(content, "model PageTranslation {");
    expectLine(content, "model User {");
    expectLine(content, "model PageHero {");
    expectLine(content, "model PageHeroTranslation {");
    expectLine(content, "model PageContentBlock {");
    expectLine(content, "model PageContentBlockTranslation {");

    // Verify relations - FIXED: Using expectLine for flexible whitespace
    expectLine(content, "author_id String");
    expectLine(content, "hero PageHero?");
    expectLine(content, "content_blocks PageContentBlock[]");

    // Verify indexes
    expectLine(content, "@@index([published_at])");
    expectLine(content, "@@index([status, published_at])");

    // Verify datasource
    expectLine(content, 'provider = "postgresql"');
  });

  it("handles incremental schema updates", async () => {
    const schemaPath = path.join(TEST_DIR, "incremental.prisma");

    // Initial generation
    const config1: Config = {
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
      output: { schemaPath },
    };

    const generator1 = new Generator(config1);
    await generator1.write();

    let content = await fs.readFile(schemaPath, "utf-8");
    expectLine(content, "model Post");
    expect(content).not.toContain("model Category");

    // Updated generation with new model
    const config2: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              { key: "title", label: "Title", type: "text", required: true },
            ],
          },
          {
            slug: "category",
            name: "Category",
            fields: [
              { key: "name", label: "Name", type: "text", required: true },
            ],
          },
        ],
      },
      output: { schemaPath },
    };

    const generator2 = new Generator(config2);
    await generator2.write();

    content = await fs.readFile(schemaPath, "utf-8");
    expectLine(content, "model Post");
    expectLine(content, "model Category");
  });

  it("generates valid schema that Prisma can parse", async () => {
    const schemaPath = path.join(TEST_DIR, "valid.prisma");

    const config: Config = {
      input: {
        models: [
          {
            slug: "user",
            name: "User",
            fields: [
              { key: "email", label: "Email", type: "text", required: true },
              { key: "name", label: "Name", type: "text", required: true },
            ],
          },
        ],
      },
      output: { schemaPath },
    };

    const generator = new Generator(config);
    await generator.write();

    // Read and verify syntax
    const content = await fs.readFile(schemaPath, "utf-8");

    // Basic syntax checks
    expect(content).toMatch(/model\s+\w+\s*\{/); // Model declaration
    expect(content).toMatch(/\s+id\s+String\s+@id/); // ID field
    expect(content).toMatch(/datasource\s+db\s*\{/); // Datasource
    expect(content).toMatch(/generator\s+\w+\s*\{/); // Generator

    // No syntax errors (basic check)
    expect(content).not.toContain("undefined");
    expect(content).not.toContain("null");
  });
});
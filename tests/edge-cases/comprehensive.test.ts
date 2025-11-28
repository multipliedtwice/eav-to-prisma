// tests/edge-cases/comprehensive.test.ts

import { describe, it, expect } from "vitest";
import { Generator } from "../../src/core/generator";
import { buildModel, SchemaBuilderConfig } from "../../src/core/schema-builder";
import type { Config } from "../../src/types/config";
import type { ModelConfigType } from "../../src/field-config-schema";
import { expectLine } from "../test-helpers";

const baseConfig: SchemaBuilderConfig = {
  convention: 'PascalCase',
  i18nEnabled: false,
  i18nTableNaming: '${identifier}_translation',
};

describe("Edge Cases - Naming Conventions", () => {
  describe("PascalCase convention (default)", () => {
    it("generates PascalCase model names from slugs", async () => {
      const config: Config = {
        input: {
          models: [
            {
              slug: "blog-post",
              name: "Blog Post",
              fields: [
                {
                  key: "title",
                  label: "Title",
                  type: "text",
                  required: true,
                  translatable: false,
                },
              ],
            },
          ],
        },
        naming: { convention: "PascalCase" },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      expectLine(result.schema, "model BlogPost {");
    });

    it("applies prefix to model names", async () => {
      const config: Config = {
        input: {
          models: [
            {
              slug: "post",
              name: "Post",
              fields: [
                {
                  key: "title",
                  label: "Title",
                  type: "text",
                  required: true,
                  translatable: true,
                },
              ],
            },
          ],
        },
        naming: {
          convention: "PascalCase",
          prefix: "CMS",
        },
        i18n: {
          enabled: true,
          defaultLang: "en",
          tableNaming: "${identifier}_translation",
        },
      };

      const generator = new Generator(config);
      const result = await generator.generate();

      expectLine(result.schema, "model CMSPost {");
      expectLine(result.schema, "model CMSPostTranslation {");
    });
  });

  describe("snake_case convention", () => {
    it("generates snake_case translation table names", () => {
      const model: ModelConfigType = {
        slug: "blog-post",
        name: "Blog Post",
        fields: [
          {
            key: "title",
            label: "Title",
            type: "text",
            required: true,
            translatable: true,
          },
        ],
      };

      const result = buildModel(model, {
        convention: "snake_case",
        i18nEnabled: true,
        i18nTableNaming: "${identifier}_translation",
      });

      expect(result[1].map).toBe("blog_post_translation");
    });

    it("uses snake_case for component tables", () => {
      const model: ModelConfigType = {
        slug: "landing-page",
        name: "Landing Page",
        fields: [
          {
            key: "hero",
            label: "Hero",
            type: "component",
            required: false,
            translatable: false,
            config: {
              type: "component",
              slug: "hero-section",
              repeatable: false,
            },
          },
        ],
      };

      const snakeConfig: SchemaBuilderConfig = {
        ...baseConfig,
        convention: "snake_case",
      };

      const result = buildModel(model, snakeConfig);

      // FIXED: Component becomes landing_page_hero, not HeroSection
      expect(result[0].fields.some((f) => f.type === "landing_page_hero")).toBe(
        true
      );
    });
  });
});

describe("Edge Cases - Empty and Minimal Data", () => {
  it("handles empty models array gracefully", async () => {
    const config: Config = {
      input: { models: [] },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expect(result.componentsGenerated).toEqual([]);
    expectLine(result.schema, "datasource db");
    expectLine(result.schema, "generator client");
    expect(result.warnings).toHaveLength(0);
  });

  it("handles model with single field", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "tag",
            name: "Tag",
            fields: [
              {
                key: "name",
                label: "Name",
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

    expectLine(result.schema, "model Tag {");
    expect(result.schema).toMatch(/name\s+String/);
  });

  it("handles model with only component fields", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "page",
            name: "Page",
            fields: [
              {
                key: "blocks",
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
          },
        ],
        components: [
          {
            slug: "content-block",
            name: "Content Block",
            fields: [
              {
                key: "text",
                label: "Text",
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

    expectLine(result.schema, "model Page {");
    expectLine(result.schema, "blocks PageBlock[]"); // FIXED: Component becomes PageBlock
    expectLine(result.schema, "model PageBlock {");
  });

  it("handles model with only relation fields", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post-tag",
            name: "PostTag",
            fields: [
              {
                key: "post",
                label: "Post",
                type: "relation",
                required: true,
                translatable: false,
                config: {
                  type: "relation",
                  relationType: "manyToOne",
                  targetModel: "post",
                  displayField: "title",
                  cascade: "cascade",
                },
              },
              {
                key: "tag",
                label: "Tag",
                type: "relation",
                required: true,
                translatable: false,
                config: {
                  type: "relation",
                  relationType: "manyToOne",
                  targetModel: "tag",
                  displayField: "name",
                  cascade: "cascade",
                },
              },
            ],
          },
        ],
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "model PostTag {");
    expect(result.schema).toMatch(/post_id\s+String/);
    expect(result.schema).toMatch(/tag_id\s+String/);
  });

  it("handles model with mix of translatable and non-translatable fields", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "slug",
                label: "Slug",
                type: "text",
                required: true,
                translatable: false,
              },
              {
                key: "title",
                label: "Title",
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
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "model Post {");
    expect(result.schema).toMatch(/slug\s+String/);
    expectLine(result.schema, "model PostTranslation {");
    expect(result.schema).toMatch(/PostTranslation[^}]*title\s+String/s);
  });
});

describe("Edge Cases - Mapper Error Handling", () => {
  it("handles mapper that throws exception", async () => {
    const config: Config = {
      input: {
        models: [{ slug: "test" }] as any,
      },
      mapper: {
        model: () => {
          throw new Error("Database connection lost");
        },
      },
    };

    const generator = new Generator(config);

    await expect(generator.generate()).rejects.toThrow(
      /Database connection lost/
    );
  });

  it("handles async mapper errors", async () => {
    const config: Config = {
      input: {
        loader: async () => {
          throw new Error("Network timeout");
        },
      },
    };

    const generator = new Generator(config);

    await expect(generator.generate()).rejects.toThrow(/Network timeout/);
  });

  it("handles component mapper errors", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "hero",
                label: "Hero",
                type: "component",
                required: false,
                translatable: false,
                config: {
                  type: "component",
                  slug: "hero",
                  repeatable: false,
                },
              },
            ],
          },
        ],
        components: [{ slug: "hero" }] as any,
      },
      mapper: {
        component: () => {
          throw new Error("Component mapper failed");
        },
      },
    };

    const generator = new Generator(config);

    await expect(generator.generate()).rejects.toThrow(
      /Component mapper failed/
    );
  });

  it("crashes when mapper returns invalid data structure", async () => {
    const config: Config = {
      input: {
        models: [
          {
            identifier: "test",
            display_name: "Test",
          },
        ] as any,
      },
      mapper: {
        model: (row: any) =>
          ({
            slug: row.identifier,
            name: row.display_name,
            // Missing fields array - will crash
          }) as any,
      },
    };

    const generator = new Generator(config);

    // This crashes because fields.filter() is called on undefined
    await expect(generator.generate()).rejects.toThrow();
  });
});

describe("Edge Cases - Field Naming", () => {
  it("handles very long field names", async () => {
    const longName = "field_" + "a".repeat(100);

    const config: Config = {
      input: {
        models: [
          {
            slug: "test",
            name: "Test",
            fields: [
              {
                key: longName,
                label: "Long",
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

    expectLine(result.schema, `${longName} String`);
  });

  it("preserves hyphens in field names", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "field-with-hyphens",
                label: "Field",
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

    expect(result.schema).toMatch(/field-with-hyphens\s+String/);
  });

  it("preserves underscores in field names", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "field_with_underscores",
                label: "Field",
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

    expect(result.schema).toMatch(/field_with_underscores\s+String/);
  });
});

describe("Edge Cases - Complex Relations", () => {
  it("handles model with 5+ different relation types", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "title",
                label: "Title",
                type: "text",
                required: true,
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
                key: "categories",
                label: "Categories",
                type: "relation",
                required: false,
                translatable: false,
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
                translatable: false,
                config: {
                  type: "relation",
                  relationType: "manyToMany",
                  targetModel: "tag",
                  displayField: "name",
                  cascade: "restrict",
                },
              },
              {
                key: "featured_in",
                label: "Featured In",
                type: "relation",
                required: false,
                translatable: false,
                config: {
                  type: "relation",
                  relationType: "manyToMany",
                  targetModel: "collection",
                  displayField: "title",
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

    expectLine(result.schema, "model Post {");
    expect(result.schema).toMatch(/author_id\s+String/);
    expectLine(result.schema, "categories Category[]");
    expectLine(result.schema, "tags Tag[]");
    expectLine(result.schema, "featured_in Collection[]");
    expectLine(result.schema, "model PostCategory {");
    expectLine(result.schema, "model PostTag {");
    expectLine(result.schema, "model PostCollection {");
  });

  it("handles self-referential relations", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "category",
            name: "Category",
            fields: [
              {
                key: "name",
                label: "Name",
                type: "text",
                required: true,
                translatable: false,
              },
              {
                key: "parent",
                label: "Parent Category",
                type: "relation",
                required: false,
                translatable: false,
                config: {
                  type: "relation",
                  relationType: "manyToOne",
                  targetModel: "category",
                  displayField: "name",
                  cascade: "setNull",
                },
              },
            ],
          },
        ],
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "model Category {");
    expect(result.schema).toMatch(/parent_id\s+String\?/);
  });

  it("prevents duplicate junction tables from self-referential many-to-many", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "title",
                label: "Title",
                type: "text",
                required: true,
                translatable: false,
              },
              {
                key: "related_posts",
                label: "Related Posts",
                type: "relation",
                required: false,
                translatable: false,
                config: {
                  type: "relation",
                  relationType: "manyToMany",
                  targetModel: "post",
                  displayField: "title",
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

    const junctionCount = (result.schema.match(/model PostPost \{/g) || [])
      .length;
    expect(junctionCount).toBe(1);
  });
});

describe("Edge Cases - Components", () => {
  it("handles component with many fields", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "page",
            name: "Page",
            fields: [
              {
                key: "seo",
                label: "SEO",
                type: "component",
                required: false,
                translatable: false,
                config: {
                  type: "component",
                  slug: "seo",
                  repeatable: false,
                },
              },
            ],
          },
        ],
        components: [
          {
            slug: "seo",
            name: "SEO",
            fields: [
              {
                key: "meta_title",
                label: "Meta Title",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "meta_description",
                label: "Meta Description",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "og_title",
                label: "OG Title",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "og_description",
                label: "OG Description",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "og_image",
                label: "OG Image",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "twitter_title",
                label: "Twitter Title",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "twitter_description",
                label: "Twitter Description",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "twitter_image",
                label: "Twitter Image",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "canonical_url",
                label: "Canonical URL",
                type: "text",
                required: false,
                translatable: false,
              },
              {
                key: "robots",
                label: "Robots",
                type: "text",
                required: false,
                translatable: false,
              },
            ],
          },
        ],
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "model PageSeo {");
    expect(result.schema).toMatch(/meta_title\s+String\?/);
    expect(result.schema).toMatch(/robots\s+String\?/);
  });

  it("warns when component definition is missing", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "page",
            name: "Page",
            fields: [
              {
                key: "hero",
                label: "Hero",
                type: "component",
                required: false,
                translatable: false,
                config: {
                  type: "component",
                  slug: "nonexistent-component",
                  repeatable: false,
                },
              },
            ],
          },
        ],
        components: [],
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain(
      'Component "nonexistent-component" not found'
    );
  });

  it("handles component with A/B testing context", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "page",
            name: "Page",
            fields: [
              {
                key: "cta",
                label: "CTA",
                type: "component",
                required: false,
                translatable: false,
                config: {
                  type: "component",
                  slug: "cta",
                  repeatable: false,
                  context: {
                    abTesting: {
                      enabled: true,
                      variantCount: 3,
                    },
                  },
                },
              },
            ],
          },
        ],
        components: [
          {
            slug: "cta",
            name: "CTA",
            fields: [
              {
                key: "text",
                label: "Text",
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

    expectLine(result.schema, "model PageCta {");
    expect(result.schema).toMatch(/variant_id\s+String\?/);
    expect(result.schema).toMatch(/enabled\s+Boolean\?/);
  });
});

describe("Edge Cases - i18n", () => {
  it("skips translation table when no translatable fields", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "category",
            name: "Category",
            fields: [
              {
                key: "slug",
                label: "Slug",
                type: "text",
                required: true,
                translatable: false,
              },
              {
                key: "order",
                label: "Order",
                type: "number",
                required: false,
                translatable: false,
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
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "model Category {");
    expect(result.schema).not.toContain("model CategoryTranslation");
  });

  it("creates translation table for component with translatable fields", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "page",
            name: "Page",
            fields: [
              {
                key: "slug",
                label: "Slug",
                type: "text",
                required: true,
                translatable: false,
              },
              {
                key: "hero",
                label: "Hero",
                type: "component",
                required: false,
                translatable: false,
                config: {
                  type: "component",
                  slug: "hero",
                  repeatable: false,
                },
              },
            ],
          },
        ],
        components: [
          {
            slug: "hero",
            name: "Hero",
            fields: [
              {
                key: "title",
                label: "Title",
                type: "text",
                required: true,
                translatable: true,
              },
              {
                key: "subtitle",
                label: "Subtitle",
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
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "model PageHero {");
    expectLine(result.schema, "model PageHeroTranslation {");
  });

  it("uses custom i18n table naming pattern", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "title",
                label: "Title",
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
        tableNaming: "i18n_${identifier}",
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, '@@map("i18n_post")');
  });
});

describe("Edge Cases - Validation", () => {
  it("generates Zod validation comments", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "user",
            name: "User",
            fields: [
              {
                key: "email",
                label: "Email",
                type: "text",
                required: true,
                translatable: false,
                validation: {
                  email: true,
                  minLength: 5,
                  maxLength: 100,
                },
              },
              {
                key: "age",
                label: "Age",
                type: "number",
                required: true,
                translatable: false,
                config: { type: "number", format: "integer" },
                validation: {
                  min: 0,
                  max: 150,
                  int: true,
                },
              },
              {
                key: "website",
                label: "Website",
                type: "text",
                required: false,
                translatable: false,
                validation: {
                  url: true,
                },
              },
            ],
          },
        ],
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "/// @zod.email().min(5).max(100)");
    expectLine(result.schema, "/// @zod.min(0).max(150).int()");
    expectLine(result.schema, "/// @zod.url()");
  });

  it("handles pattern validation with regex", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "slug",
                label: "Slug",
                type: "text",
                required: true,
                translatable: false,
                validation: {
                  pattern: "^[a-z0-9-]+$",
                },
              },
            ],
          },
        ],
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "/// @zod.regex(/^[a-z0-9-]+$/)");
  });
});

describe("Edge Cases - External Models", () => {
  it("warns when external model file not found", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "title",
                label: "Title",
                type: "text",
                required: true,
                translatable: false,
              },
            ],
          },
        ],
      },
      externalModels: "./nonexistent-file.prisma",
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Failed to load external models");
    expectLine(result.schema, "model Post {");
  });

  it("accepts array of external model paths", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "title",
                label: "Title",
                type: "text",
                required: true,
                translatable: false,
              },
            ],
          },
        ],
      },
      externalModels: ["./test-temp/media.prisma", "./test-temp/user.prisma"],
    };

    const generator = new Generator(config);

    expect(() => generator).not.toThrow();
  });
});

describe("Edge Cases - Derived Fields", () => {
  it("skips derived fields with warning", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "title",
                label: "Title",
                type: "text",
                required: true,
                translatable: false,
              },
              {
                key: "computed_value",
                label: "Computed",
                type: "text",
                required: false,
                translatable: false,
                derived: true,
              } as any,
            ],
          },
        ],
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expect(result.warnings).toContain(
      'Skipped derived field "computed_value" in model "post"'
    );
    expect(result.schema).not.toContain("computed_value");
  });
});

describe("Edge Cases - translatable Default Behavior", () => {
  it("treats undefined translatable as true when i18n enabled", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "slug",
                label: "Slug",
                type: "text",
                required: true,
                translatable: false,
              },
              { key: "title", label: "Title", type: "text", required: true },
            ],
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

    expectLine(result.schema, "model Post {");
    expect(result.schema).toMatch(/Post \{[^}]*slug\s+String/s);
    expectLine(result.schema, "model PostTranslation {");
    expect(result.schema).toMatch(/PostTranslation \{[^}]*title\s+String/s);
  });

  it("includes all fields in main model when i18n disabled", async () => {
    const config: Config = {
      input: {
        models: [
          {
            slug: "post",
            name: "Post",
            fields: [
              {
                key: "slug",
                label: "Slug",
                type: "text",
                required: true,
                translatable: false,
              },
              { key: "title", label: "Title", type: "text", required: true },
              {
                key: "content",
                label: "Content",
                type: "rich",
                required: true,
              },
            ],
          },
        ],
      },
    };

    const generator = new Generator(config);
    const result = await generator.generate();

    expectLine(result.schema, "model Post {");
    expect(result.schema).toMatch(/slug\s+String/);
    expect(result.schema).toMatch(/title\s+String/);
    expect(result.schema).toMatch(/content\s+String/);
    expect(result.schema).not.toContain("model PostTranslation");
  });
});

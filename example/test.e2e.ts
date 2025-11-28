/**
 * E2E test with REAL Prisma client
 * This demonstrates how consumers use eav-to-prisma
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { expect, test, beforeAll, afterAll } from 'vitest';
import { defineConfig } from '../src/types/config';
import { Generator } from '../src/core/generator';
import { expectLine } from '../tests/test-helpers';

// Load config inline instead of using loadConfig (avoids CLI dependency)
const config = defineConfig({
  connection: 'file:./prisma/eav.db',
  tables: {
    models: 'content_model',
    components: 'component'
  },
  output: {
    schemaPath: './prisma/generated-content.prisma',
    clientPath: './node_modules/.prisma/client-content',
    datasource: {
      provider: 'sqlite',
      url: 'env("CONTENT_DATABASE_URL")'
    },
    client: {
      previewFeatures: []
    }
  },
  i18n: {
    enabled: true,
    defaultLang: 'en',
    tableNaming: '${identifier}_translation'
  },
  naming: {
    convention: 'PascalCase'
  },
  generators: [
    {
      name: 'zod',
      provider: 'zod-prisma-types',
      output: './generated/zod'
    }
  ]
});

let prisma: PrismaClient;

beforeAll(async () => {
  // Create Prisma client instance (consumer provides this)
  // Don't override datasource - use what's in schema
  prisma = new PrismaClient();
  
  await prisma.$connect();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

test('E2E: Generate schema from real EAV database', async () => {
  // Create generator with consumer's Prisma client
  const generator = new Generator(config, prisma);
  
  // Generate schema
  const result = await generator.generate();
  
  // Write to file
  await generator.write();
  
  // Verify file exists
  expect(existsSync('./prisma/generated-content.prisma')).toBe(true);
  
  // Read generated schema
  const schema = readFileSync('./prisma/generated-content.prisma', 'utf-8');
  
  // Verify datasource
  expectLine(schema, 'datasource db {');
  expect(schema).toMatch(/provider\s*=\s*"sqlite"/);
  expectLine(schema, 'env("CONTENT_DATABASE_URL")');
  
  // Verify generators
  expectLine(schema, 'generator client {');
  expect(schema).toMatch(/provider\s*=\s*"prisma-client-js"/);
  expectLine(schema, 'generator zod {');
  expect(schema).toMatch(/provider\s*=\s*"zod-prisma-types"/);
  
  // Verify User model
  expectLine(schema, 'model User {');
  expectLine(schema, 'name');
  expectLine(schema, 'email');
  expectLine(schema, 'model UserTranslation {');
  expectLine(schema, 'bio'); // translatable field
  
  // Verify Category model
  expectLine(schema, 'model Category {');
  expectLine(schema, 'model CategoryTranslation {');
  
  // Verify Post model
  expectLine(schema, 'model Post {');
  expectLine(schema, 'slug');
  expect(schema).toMatch(/featured_image_id\s+String\?/);
  expectLine(schema, 'gallery'); // Multiple media stored as JSON
  expectLine(schema, 'status');
  expect(schema).toMatch(/published_at\s+DateTime\?/);
  expectLine(schema, 'author_id');
  
  // Verify Post translation table
  expectLine(schema, 'model PostTranslation {');
  expectLine(schema, 'title');
  expectLine(schema, 'content');
  
  // Verify SEO component table
  expectLine(schema, 'model PostSeo {');
  expect(schema).toMatch(/post_id\s+String\s+@unique/); // non-repeatable
  expectLine(schema, 'og_image_id');
  
  // Verify SEO translation table
  expectLine(schema, 'model PostSeoTranslation {');
  expectLine(schema, 'meta_title');
  expectLine(schema, 'meta_description');
  
  // Verify Content Block component table
  expectLine(schema, 'model PostContentBlock {');
  expect(schema).toMatch(/post_id\s+String/); // repeatable - no @unique
  expect(schema).toMatch(/order\s+Int\?/); // repeatable has order
  
  // Verify Content Block translation
  expectLine(schema, 'model PostContentBlockTranslation {');
  expectLine(schema, 'type');
  expectLine(schema, 'heading');
  expectLine(schema, 'media_id');
  
  // Verify junction table for many-to-many
  expectLine(schema, 'model PostCategory {');
  expectLine(schema, 'post_id');
  expectLine(schema, 'category_id');
  expectLine(schema, '@@unique([post_id, category_id])');
  
  // Verify indexes
  expectLine(schema, '@@index([published_at])'); // sortField
  expectLine(schema, '@@index([status, published_at])'); // status + published_at
  
  // Verify Zod comments
  expectLine(schema, '/// @zod.min(5).max(200)'); // title validation
  expectLine(schema, '/// @zod.email()'); // email validation
  expectLine(schema, '/// @zod.regex(/^[a-z0-9-]+$/)'); // slug pattern
  
  // Verify warnings
  expect(result.warnings).toHaveLength(0);
  
  // Verify components generated
  expect(result.componentsGenerated).toEqual(['user', 'category', 'post']);
  
  console.log('\n✓ Generated schema successfully');
  console.log(`✓ ${result.componentsGenerated.length} models generated`);
  console.log('✓ All validations passed');
});

test('E2E: Read models from database', async () => {
  // Verify we can actually read from the EAV database
  const models = await prisma.content_model.findMany();
  
  expect(models).toHaveLength(3);
  expect(models.map((m: { slug: string }) => m.slug)).toEqual(['user', 'category', 'post']);
  
  // Verify JSON parsing
  const postModel = models.find((m: { slug: string }) => m.slug === 'post');
  const definition = JSON.parse(postModel!.definition);
  
  expect(definition.slug).toBe('post');
  expect(definition.name).toBe('Blog Post');
  expect(definition.fields).toHaveLength(12);
});

test('E2E: Read components from database', async () => {
  const components = await prisma.component.findMany();
  
  expect(components).toHaveLength(2);
  expect(components.map((c: { slug: string }) => c.slug)).toEqual(['seo', 'content-block']);
  
  // Verify component structure
  const seoComponent = components.find((c: { slug: string }) => c.slug === 'seo');
  const definition = JSON.parse(seoComponent!.definition);
  
  expect(definition.fields).toHaveLength(3);
  expect(definition.fields[0].key).toBe('meta_title');
});
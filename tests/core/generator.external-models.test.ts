import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { defineConfig } from '../../src/types/config';
import { Generator } from '../../src/core/generator';
import { expectLine } from '../test-helpers';

describe('Generator with external models', () => {
  it('should merge external Media model with generated schema', async () => {
    // Create temporary media.prisma file
    const mediaSchema = `
model Media {
  id         String   @id @default(cuid())
  filename   String
  mime_type  String
  size       Int
  url        String
  created_at DateTime @default(now())
  
  @@map("media")
}
    `.trim();
    
    const tempDir = join(process.cwd(), 'test-temp');
    mkdirSync(tempDir, { recursive: true });
    const mediaPath = join(tempDir, 'media.prisma');
    writeFileSync(mediaPath, mediaSchema);
    
    // Create config with external models
    const config = defineConfig({
      input: {
        models: [
          {
            slug: 'post',
            name: 'Post',
            fields: [
              {
                key: 'title',
                label: 'Title',
                type: 'text',
                required: true,
                translatable: false
              },
              {
                key: 'featured_image',
                label: 'Featured Image',
                type: 'media',
                required: false,
                translatable: false,
                config: {
                  type: 'media',
                  multiple: false
                }
              },
              {
                key: 'gallery',
                label: 'Gallery',
                type: 'media',
                required: false,
                translatable: false,
                config: {
                  type: 'media',
                  multiple: true
                }
              }
            ],
            settings: {
              enableI18n: false
            }
          }
        ]
      },
      externalModels: mediaPath,
      output: {
        schemaPath: './test-output.prisma',
        datasource: {
          provider: 'sqlite',
          url: 'env("DATABASE_URL")'
        }
      },
      naming: {
        convention: 'PascalCase'
      }
    });
    
    const generator = new Generator(config);
    const result = await generator.generate();
    
    // Verify Media model is included
    expectLine(result.schema, 'model Media {');
    expectLine(result.schema, 'filename');
    expectLine(result.schema, '@@map("media")');
    
    // Verify Post model uses proper relations
    expectLine(result.schema, 'model Post {');
    expectLine(result.schema, 'featured_image_id String?');
    
    // Gallery should be a proper relation (Media[]) not JSON
    expectLine(result.schema, 'gallery Media[]');
    expect(result.schema).not.toContain('gallery String'); // Not JSON fallback
    
    // Verify no warnings
    expect(result.warnings).toHaveLength(0);
  });
  
  it('should filter external models by include list', async () => {
    const mediaSchema = `
model Media {
  id       String @id
  filename String
}

model Asset {
  id   String @id
  name String
}

model File {
  id   String @id
  path String
}
    `.trim();
    
    const tempDir = join(process.cwd(), 'test-temp');
    mkdirSync(tempDir, { recursive: true });
    const mediaPath = join(tempDir, 'media-multiple.prisma');
    writeFileSync(mediaPath, mediaSchema);
    
    const config = defineConfig({
      input: {
        models: [
          {
            slug: 'post',
            name: 'Post',
            fields: [
              {
                key: 'title',
                label: 'Title',
                type: 'text',
                required: true,
                translatable: false
              }
            ]
          }
        ]
      },
      externalModels: {
        path: mediaPath,
        include: ['Media', 'File'] // Only include these two
      },
      output: {
        datasource: {
          provider: 'sqlite',
          url: 'env("DATABASE_URL")'
        }
      }
    });
    
    const generator = new Generator(config);
    const result = await generator.generate();
    
    // Should include Media and File
    expectLine(result.schema, 'model Media {');
    expectLine(result.schema, 'model File {');
    
    // Should NOT include Asset
    expect(result.schema).not.toContain('model Asset {');
  });
  
  it('should handle multiple external files', async () => {
    const mediaSchema = `
model Media {
  id String @id
}
    `.trim();
    
    const userSchema = `
model User {
  id   String @id
  name String
}
    `.trim();
    
    const tempDir = join(process.cwd(), 'test-temp');
    mkdirSync(tempDir, { recursive: true });
    
    const mediaPath = join(tempDir, 'media-single.prisma');
    const userPath = join(tempDir, 'user-single.prisma');
    
    writeFileSync(mediaPath, mediaSchema);
    writeFileSync(userPath, userSchema);
    
    const config = defineConfig({
      input: {
        models: [
          {
            slug: 'post',
            name: 'Post',
            fields: [
              {
                key: 'title',
                label: 'Title',
                type: 'text',
                required: true,
                translatable: false
              }
            ]
          }
        ]
      },
      externalModels: [mediaPath, userPath],
      output: {
        datasource: {
          provider: 'sqlite',
          url: 'env("DATABASE_URL")'
        }
      }
    });
    
    const generator = new Generator(config);
    const result = await generator.generate();
    
    // Should include both external models
    expectLine(result.schema, 'model Media {');
    expectLine(result.schema, 'model User {');
    expectLine(result.schema, 'model Post {');
  });
  
  it('should warn on invalid external file', async () => {
    const config = defineConfig({
      input: {
        models: [
          {
            slug: 'post',
            name: 'Post',
            fields: [
              {
                key: 'title',
                label: 'Title',
                type: 'text',
                required: true,
                translatable: false
              }
            ]
          }
        ]
      },
      externalModels: './nonexistent.prisma',
      output: {
        datasource: {
          provider: 'sqlite',
          url: 'env("DATABASE_URL")'
        }
      }
    });
    
    const generator = new Generator(config);
    const result = await generator.generate();
    
    // Should have warning
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Failed to load external models');
    
    // Should still generate Post model
    expectLine(result.schema, 'model Post {');
  });
});
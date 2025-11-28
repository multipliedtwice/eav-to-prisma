import { describe, it, expect } from 'vitest';
import { 
  writeDatasource, 
  writeGenerator, 
  writeField, 
  writeModel, 
  writeSchema  // Async version
} from '../../src/core/schema-writer';
import { PrismaDatasource, PrismaGenerator, PrismaModel, PrismaSchema } from '../../src/utils/prisma-ast';
import { expectLine } from '../test-helpers';

describe('writeDatasource', () => {
  it('writes datasource with env variable', () => {
    const datasource: PrismaDatasource = {
      provider: 'sqlite',
      url: 'env("DATABASE_URL")'
    };
    
    const result = writeDatasource(datasource);
    
    expect(result).toBe(`datasource db {
provider = "sqlite"
url = env("DATABASE_URL")
}`);
  });
  
  it('writes datasource with direct URL', () => {
    const datasource: PrismaDatasource = {
      provider: 'postgresql',
      url: 'postgresql://localhost:5432/mydb'
    };
    
    const result = writeDatasource(datasource);
    
    expect(result).toBe(`datasource db {
provider = "postgresql"
url = "postgresql://localhost:5432/mydb"
}`);
  });
});

describe('writeGenerator', () => {
  it('writes basic generator', () => {
    const generator: PrismaGenerator = {
      name: 'client',
      provider: 'prisma-client-js'
    };
    
    const result = writeGenerator(generator);
    
    expect(result).toBe(`generator client {
provider = "prisma-client-js"
}`);
  });
  
  it('writes generator with output', () => {
    const generator: PrismaGenerator = {
      name: 'client',
      provider: 'prisma-client-js',
      output: '../src/generated/prisma'
    };
    
    const result = writeGenerator(generator);
    
    expect(result).toBe(`generator client {
provider = "prisma-client-js"
output = "../src/generated/prisma"
}`);
  });
  
  it('writes generator with config', () => {
    const generator: PrismaGenerator = {
      name: 'zod',
      provider: 'zod-prisma-types',
      output: '../src/generated/zod',
      config: {
        useMultipleFiles: true,
        createInputTypes: false
      }
    };
    
    const result = writeGenerator(generator);
    
    expect(result).toBe(`generator zod {
provider = "zod-prisma-types"
output = "../src/generated/zod"
useMultipleFiles = true
createInputTypes = false
}`);
  });
});

describe('writeField', () => {
  it('writes basic field', () => {
    const result = writeField({
      name: 'id',
      type: 'String'
    });
    
    expect(result).toBe('id String');
  });
  
  it('writes optional field', () => {
    const result = writeField({
      name: 'email',
      type: 'String',
      optional: true
    });
    
    expect(result).toBe('email String?');
  });
  
  it('writes list field', () => {
    const result = writeField({
      name: 'tags',
      type: 'String',
      list: true
    });
    
    expect(result).toBe('tags String[]');
  });
  
  it('writes field with attributes', () => {
    const result = writeField({
      name: 'id',
      type: 'String',
      attributes: ['@id', '@default(cuid())']
    });
    
    expect(result).toBe('id String @id @default(cuid())');
  });
  
  it('writes field with relation', () => {
    const result = writeField({
      name: 'author',
      type: 'User',
      relation: {
        fields: ['author_id'],
        references: ['id'],
        onDelete: 'Cascade'
      }
    });
    
    expect(result).toBe('author User @relation(fields: [author_id], references: [id], onDelete: Cascade)');
  });
  
  it('writes field with @map', () => {
    const result = writeField({
      name: 'createdAt',
      type: 'DateTime',
      attributes: ['@default(now())'],
      map: 'created_at'
    });
    
    expect(result).toBe('createdAt DateTime @default(now()) @map("created_at")');
  });
});

describe('writeModel', () => {
  it('writes simple model', () => {
    const model: PrismaModel = {
      name: 'User',
      fields: [
        {
          name: 'id',
          type: 'String',
          attributes: ['@id', '@default(cuid())']
        },
        {
          name: 'email',
          type: 'String',
          attributes: ['@unique']
        },
        {
          name: 'name',
          type: 'String',
          optional: true
        }
      ]
    };
    
    const result = writeModel(model);
    
    // Use expectLine for flexible whitespace matching
    expectLine(result, 'model User {');
    expectLine(result, 'id String @id @default(cuid())');
    expectLine(result, 'email String @unique');
    expectLine(result, 'name String?');
    expect(result).toContain('}');
  });
  
  it('writes model with indexes', () => {
    const model: PrismaModel = {
      name: 'Post',
      fields: [
        {
          name: 'id',
          type: 'String',
          attributes: ['@id']
        },
        {
          name: 'status',
          type: 'String'
        },
        {
          name: 'published_at',
          type: 'DateTime',
          optional: true
        }
      ],
      indexes: [
        ['status'],
        ['status', 'published_at']
      ]
    };
    
    const result = writeModel(model);
    
    expect(result).toContain('model Post {');
    expect(result).toContain('@@index([status])');
    expect(result).toContain('@@index([status, published_at])');
  });
  
  it('writes model with unique constraint', () => {
    const model: PrismaModel = {
      name: 'PostTranslation',
      fields: [
        {
          name: 'id',
          type: 'String',
          attributes: ['@id']
        },
        {
          name: 'post_id',
          type: 'String'
        },
        {
          name: 'lang',
          type: 'String'
        }
      ],
      unique: [['post_id', 'lang']]
    };
    
    const result = writeModel(model);
    
    expect(result).toContain('model PostTranslation {');
    expect(result).toContain('@@unique([post_id, lang])');
  });
  
  it('writes model with @@map', () => {
    const model: PrismaModel = {
      name: 'PostTranslation',
      fields: [
        {
          name: 'id',
          type: 'String',
          attributes: ['@id']
        }
      ],
      map: 'post_translation'
    };
    
    const result = writeModel(model);
    
    expect(result).toContain('model PostTranslation {');
    expect(result).toContain('@@map("post_translation")');
  });
  
  it('writes model with relation', () => {
    const model: PrismaModel = {
      name: 'Post',
      fields: [
        {
          name: 'id',
          type: 'String',
          attributes: ['@id']
        },
        {
          name: 'author_id',
          type: 'String'
        },
        {
          name: 'author',
          type: 'User',
          relation: {
            fields: ['author_id'],
            references: ['id'],
            onDelete: 'Cascade'
          }
        },
        {
          name: 'translations',
          type: 'PostTranslation',
          list: true,
          optional: true
        }
      ]
    };
    
    const result = writeModel(model);
    
    expectLine(result, 'model Post {');
    expectLine(result, 'author User @relation(fields: [author_id], references: [id], onDelete: Cascade)');
  });
});

describe('writeSchema', () => {
  it('writes complete schema', async () => {
    const schema: PrismaSchema = {
      datasource: {
        provider: 'sqlite',
        url: 'env("DATABASE_URL")'
      },
      generators: [
        {
          name: 'client',
          provider: 'prisma-client-js',
          output: '../src/generated/prisma'
        }
      ],
      models: [
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'String',
              attributes: ['@id', '@default(cuid())']
            },
            {
              name: 'email',
              type: 'String',
              attributes: ['@unique']
            }
          ]
        },
        {
          name: 'Post',
          fields: [
            {
              name: 'id',
              type: 'String',
              attributes: ['@id']
            },
            {
              name: 'title',
              type: 'String'
            },
            {
              name: 'author_id',
              type: 'String'
            },
            {
              name: 'author',
              type: 'User',
              relation: {
                fields: ['author_id'],
                references: ['id']
              }
            }
          ],
          indexes: [['author_id']]
        }
      ]
    };
    
    // NOW ASYNC!
    const result = await writeSchema(schema);
    
    // Prettier will format it consistently - check structure exists
    expect(result).toContain('datasource db {');
    expect(result).toContain('provider = "sqlite"');
    expect(result).toContain('generator client {');
    expect(result).toContain('model User {');
    expect(result).toContain('model Post {');
    expect(result).toContain('@@index([author_id])');
  });
});
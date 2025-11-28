import { describe, it, expect } from 'vitest';
import { extractModelsFromString } from '../../src/utils/prisma-parser';

describe('prisma-parser', () => {
  it('should extract simple model', () => {
    const schema = `
model User {
  id    String @id @default(cuid())
  name  String
  email String @unique
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('User');
    expect(models[0].fields).toHaveLength(3);
    
    expect(models[0].fields[0].name).toBe('id');
    expect(models[0].fields[0].type).toBe('String');
    expect(models[0].fields[0].attributes).toContain('@id');
    expect(models[0].fields[0].attributes).toContain('@default(cuid())');
  });
  
  it('should extract model with relations', () => {
    const schema = `
model Post {
  id        String   @id @default(cuid())
  title     String
  author_id String
  author    User     @relation(fields: [author_id], references: [id], onDelete: Cascade)
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models).toHaveLength(1);
    expect(models[0].fields[3].name).toBe('author');
    expect(models[0].fields[3].type).toBe('User');
    expect(models[0].fields[3].relation).toBeDefined();
    expect(models[0].fields[3].relation?.fields).toEqual(['author_id']);
    expect(models[0].fields[3].relation?.references).toEqual(['id']);
    expect(models[0].fields[3].relation?.onDelete).toBe('Cascade');
  });
  
  it('should extract model with list fields', () => {
    const schema = `
model User {
  id    String @id
  posts Post[]
  tags  String[]
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models[0].fields[1].name).toBe('posts');
    expect(models[0].fields[1].type).toBe('Post');
    expect(models[0].fields[1].list).toBe(true);
    
    expect(models[0].fields[2].name).toBe('tags');
    expect(models[0].fields[2].type).toBe('String');
    expect(models[0].fields[2].list).toBe(true);
  });
  
  it('should extract model with optional fields', () => {
    const schema = `
model User {
  id   String  @id
  name String?
  age  Int?
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models[0].fields[1].optional).toBe(true);
    expect(models[0].fields[2].optional).toBe(true);
  });
  
  it('should extract model with indexes and unique constraints', () => {
    const schema = `
model Post {
  id           String @id
  author_id    String
  category_id  String
  published_at DateTime
  
  @@index([published_at])
  @@index([author_id, category_id])
  @@unique([author_id, published_at])
  @@map("posts")
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models[0].indexes).toHaveLength(2);
    expect(models[0].indexes![0]).toEqual(['published_at']);
    expect(models[0].indexes![1]).toEqual(['author_id', 'category_id']);
    
    expect(models[0].unique).toHaveLength(1);
    expect(models[0].unique![0]).toEqual(['author_id', 'published_at']);
    
    expect(models[0].map).toBe('posts');
  });
  
  it('should extract model with defaults', () => {
    const schema = `
model User {
  id        String   @id @default(cuid())
  active    Boolean  @default(true)
  role      String   @default("user")
  count     Int      @default(0)
  created_at DateTime @default(now())
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models[0].fields[1].default).toBe(true);
    expect(models[0].fields[2].default).toBe('user');
    expect(models[0].fields[3].default).toBe(0);
    expect(models[0].fields[4].default).toBe('now()');
  });
  
  it('should extract multiple models', () => {
    const schema = `
model User {
  id   String @id
  name String
}

model Post {
  id    String @id
  title String
}

model Comment {
  id   String @id
  text String
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models).toHaveLength(3);
    expect(models.map(m => m.name)).toEqual(['User', 'Post', 'Comment']);
  });
  
  it('should handle complex Media model', () => {
    const schema = `
model Media {
  id         String   @id @default(cuid())
  filename   String
  mime_type  String
  size       Int
  url        String
  alt_text   String?
  width      Int?
  height     Int?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  @@map("media")
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('Media');
    expect(models[0].map).toBe('media');
    expect(models[0].fields).toHaveLength(10);
    
    const altTextField = models[0].fields.find(f => f.name === 'alt_text');
    expect(altTextField?.optional).toBe(true);
    
    const sizeField = models[0].fields.find(f => f.name === 'size');
    expect(sizeField?.type).toBe('Int');
  });
  
  it('should handle field with @map', () => {
    const schema = `
model User {
  id        String @id
  firstName String @map("first_name")
}
    `.trim();
    
    const models = extractModelsFromString(schema);
    
    expect(models[0].fields[1].map).toBe('first_name');
  });
});
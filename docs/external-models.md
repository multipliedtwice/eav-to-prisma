# External Models

The `externalModels` feature allows you to include pre-existing Prisma models in your generated schema. This is useful for:

- **Media systems** - Define your Media model once, use everywhere
- **User management** - Reuse existing User/Auth models
- **Shared infrastructure** - Import common models across projects

## How It Works

1. Create a Prisma file with your models (e.g., `media.prisma`)
2. Reference it in your config using `externalModels`
3. Generated schema will include those models
4. Relations and media fields automatically recognize external models

## Configuration

### Simple (single file)

```typescript
export default defineConfig({
  // ... other config
  externalModels: './prisma/media.prisma'
});
```

### Multiple files

```typescript
export default defineConfig({
  externalModels: [
    './prisma/media.prisma',
    './prisma/user.prisma',
    './prisma/common.prisma'
  ]
});
```

### With filters

```typescript
export default defineConfig({
  externalModels: {
    path: './prisma/media.prisma',
    include: ['Media'], // Only include Media model
    // or
    exclude: ['Asset']  // Include all except Asset
  }
});
```

## Example: Media Model

**Create `prisma/media.prisma`:**

```prisma
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
```

**Configure eav-to-prisma:**

```typescript
export default defineConfig({
  connection: 'file:./eav.db',
  tables: {
    models: 'content_model'
  },
  
  // Include Media model
  externalModels: './prisma/media.prisma',
  
  output: {
    schemaPath: './prisma/generated.prisma'
  }
});
```

**Define content with media fields in EAV:**

```json
{
  "slug": "post",
  "name": "Blog Post",
  "fields": [
    {
      "key": "featured_image",
      "type": "media",
      "config": {
        "multiple": false
      }
    },
    {
      "key": "gallery",
      "type": "media",
      "config": {
        "multiple": true
      }
    }
  ]
}
```

**Generated output will have proper relations:**

```prisma
// Included from external file
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

// Generated model with proper relations
model Post {
  id                String   @id @default(cuid())
  featured_image_id String?  // Single media -> FK
  gallery           Media[]  // Multiple media -> proper relation!
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
}
```

## Behavior Details

### Media Field Mapping

**Without external Media model:**
- Single: `featured_image_id String?` (simple FK)
- Multiple: `gallery String?` (JSON array - fallback)

**With external Media model:**
- Single: `featured_image_id String?` (FK with implicit relation)
- Multiple: `gallery Media[]` (proper many-to-many relation)

### Relation Field Mapping

External models are automatically recognized as valid relation targets:

```json
{
  "key": "author",
  "type": "relation",
  "config": {
    "relationType": "manyToOne",
    "targetModel": "user"  // Will use external User model if available
  }
}
```

### Model Order

External models are always placed **first** in the generated schema, followed by your generated models. This ensures dependencies are properly ordered.

## Best Practices

### 1. Separate External Models by Domain

```
prisma/
  media.prisma       # Media/Asset models
  auth.prisma        # User/Role models
  common.prisma      # Tags/Categories
  generated.prisma   # Generated content models
```

### 2. Use Include/Exclude for Large Files

If your external file has many models but you only need a few:

```typescript
externalModels: {
  path: './prisma/existing-schema.prisma',
  include: ['Media', 'User'] // Only these two
}
```

### 3. Keep External Models Simple

External models should be stable/unchanging. Don't include models that will be regenerated.

### 4. Version Control

Commit both external models AND generated schemas to version control for reproducibility.

## Limitations

### What's Included

- ✅ Model definitions
- ✅ Fields with all attributes
- ✅ Relations
- ✅ Indexes (@@index)
- ✅ Unique constraints (@@unique)
- ✅ Table mapping (@@map)

### What's NOT Included

- ❌ Datasource blocks (use config.output.datasource instead)
- ❌ Generator blocks (use config.generators instead)
- ❌ Enums (define in external file, will be preserved as-is)

### Parser Limitations

The parser is regex-based and handles most common cases but may struggle with:
- Very complex nested relations
- Multi-line comments in field definitions
- Unusual formatting

If you encounter issues, simplify the external file or open an issue.

## Troubleshooting

### "Model not found" warnings

Make sure your external file path is correct and the file is readable:

```typescript
externalModels: './prisma/media.prisma' // ✅ Relative to project root
externalModels: '/absolute/path/media.prisma' // ✅ Absolute path
```

### Relations not working

Ensure model names match exactly (case-sensitive):

```json
{
  "targetModel": "media"  // ❌ lowercase
}
```

```json
{
  "targetModel": "Media"  // ✅ matches external model name
}
```

### Duplicate models

If you define a model in both EAV and external files, the last one wins. Use `exclude` to prevent conflicts:

```typescript
externalModels: {
  path: './prisma/all.prisma',
  exclude: ['Post'] // Don't include Post from external
}
```

## Examples

### User Management System

```prisma
// prisma/auth.prisma
model User {
  id       String @id @default(cuid())
  email    String @unique
  name     String
  role     Role   @default(USER)
}

enum Role {
  USER
  ADMIN
  EDITOR
}
```

```typescript
// eav-to-prisma.config.ts
export default defineConfig({
  // ... 
  externalModels: './prisma/auth.prisma'
});
```

### Multi-tenant Architecture

```prisma
// prisma/tenant.prisma
model Tenant {
  id   String @id
  name String
}
```

All generated models will recognize Tenant as valid relation target.

### E-commerce

```prisma
// prisma/commerce.prisma
model Product {
  id    String @id
  sku   String @unique
  price Float
}

model Order {
  id     String @id
  status String
}
```

Reference these in your EAV relations without regenerating them.
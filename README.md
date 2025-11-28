# eav-to-prisma

[![npm version](https://badge.fury.io/js/eav-to-prisma.svg)](https://badge.fury.io/js/eav-to-prisma)
[![npm](https://img.shields.io/npm/dt/eav-to-prisma.svg)](https://www.npmjs.com/package/eav-to-prisma)
[![Coverage Status](https://codecov.io/github/multipliedtwice/eav-to-prisma/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/github/multipliedtwice/eav-to-prisma)
[![npm](https://img.shields.io/npm/l/eav-to-prisma.svg)](LICENSE)
[![CI](https://github.com/multipliedtwice/eav-to-prisma/workflows/CI/badge.svg)](https://github.com/multipliedtwice/eav-to-prisma/actions)


> Transform flexible EAV database structures into type-safe, performant Prisma schemas

## Why?

EAV (Entity-Attribute-Value) databases are incredibly flexible but come with significant drawbacks:

- ❌ **Slow queries** - Multiple JOINs for every field lookup
- ❌ **No type safety** - Everything is stored as generic values
- ❌ **Complex querying** - Simple filters become complex SQL
- ❌ **Poor performance** - Difficult to optimize and index

**eav-to-prisma** gives you the best of both worlds:

- ✅ Define your schema dynamically (perfect for headless CMS, admin panels)
- ✅ Generate optimized Prisma schemas for production
- ✅ Full type safety across your entire stack
- ✅ Fast queries with proper indexes
- ✅ Automatic relation and junction table generation
- ✅ Built-in i18n support with translation tables
- ✅ Component/block system for reusable content

## Architecture
```
┌─────────────────────────────────────────────────────────┐
│  EAV Database (Flexible, Dynamic)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │content_model│  │component     │  │content_instance│ │
│  │  (JSON)     │  │  (JSON)      │  │  (values)      │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌───────────────────────┐
              │  eav-to-prisma        │
              │  - Read via Prisma    │
              │  - Validate with Zod  │
              │  - Generate schema    │
              └───────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Generated Prisma Schema (Type-safe, Performant)        │
│  ┌──────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │  Post    │  │PostTranslation  │  │  PostCategory  │ │
│  │  (main)  │  │  (i18n)         │  │  (junction)    │ │
│  ├──────────┤  ├─────────────────┤  ├────────────────┤ │
│  │  PostSeo │  │PostSeoTranslation│ │  Category      │ │
│  │(component)│  │(component i18n) │  │  (normalized)  │ │
│  └──────────┘  └─────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌───────────────────────┐
              │  Prisma Generators    │
              │  - Zod schemas        │
              │  - tRPC routers       │
              │  - GraphQL resolvers  │
              └───────────────────────┘
```

## Quick Start

### Installation
```bash
npm install -D eav-to-prisma
# or
yarn add -D eav-to-prisma
# or
pnpm add -D eav-to-prisma
```

### Initialize Configuration
```bash
npx eav-to-prisma init
```

This creates `eav-to-prisma.config.ts`:
```typescript
import { defineConfig } from 'eav-to-prisma';

export default defineConfig({
  connection: 'file:./data.db',
  
  tables: {
    models: 'content_model',
    components: 'component'
  },
  
  output: {
    schemaPath: './prisma/content.prisma'
  },
  
  i18n: {
    enabled: true,
    defaultLang: 'en',
    tableNaming: '${identifier}_translation'
  },
  
  naming: {
    convention: 'PascalCase'
  }
});
```

### Generate Schema
```bash
npx eav-to-prisma generate
```

### Use Generated Types
```bash
npx prisma generate --schema prisma/content.prisma
```
```typescript
import { PrismaClient } from './generated/prisma-content';

const prisma = new PrismaClient();

// Fully typed queries!
const posts = await prisma.post.findMany({
  include: {
    translations: true,
    seo: {
      include: {
        translations: true
      }
    },
    categories: {
      include: {
        category: true
      }
    }
  }
});
```

## Configuration Options

### Database Input (Default)

Read model definitions from your existing EAV database:
```typescript
export default defineConfig({
  // Your EAV database connection
  connection: process.env.DATABASE_URL!,
  
  // Tables containing model definitions
  tables: {
    models: 'content_model',      // Required
    components: 'component'        // Optional
  },
  
  output: {
    schemaPath: './prisma/content.prisma',
    
    // Target database for generated schema
    datasource: {
      provider: 'postgresql',
      url: 'env("DATABASE_URL")',
      directUrl: 'env("DATABASE_URL_DIRECT")' // Optional, for Accelerate
    }
  }
});
```

### Direct Input (No Database Required)

Load model definitions from JSON files, APIs, or programmatically:
```typescript
import { readFileSync } from 'fs';

export default defineConfig({
  // Option 1: Direct arrays
  input: {
    models: JSON.parse(readFileSync('./models.json', 'utf-8')),
    components: JSON.parse(readFileSync('./components.json', 'utf-8'))
  },
  
  // Option 2: Async loader function
  input: {
    loader: async () => {
      const response = await fetch('https://api.example.com/models');
      const data = await response.json();
      
      return {
        models: data.models,
        components: data.components
      };
    }
  },
  
  output: {
    schemaPath: './prisma/content.prisma',
    datasource: {
      provider: 'sqlite',
      url: 'env("DATABASE_URL")'
    }
  }
});
```

### Custom Mapper (Transform Your EAV Structure)

If your EAV structure differs from the expected format:
```typescript
export default defineConfig({
  input: {
    models: await loadYourCustomFormat()
  },
  
  // Transform your structure to match ModelConfigType
  mapper: {
    model: (row) => ({
      slug: row.identifier,           // Your field name
      name: row.display_name,         // Your field name
      fields: row.schema.map(field => ({
        key: field.name,              // Your field name
        label: field.title,           // Your field name
        type: field.field_type,       // Your field name
        required: field.mandatory,    // Your field name
        config: field.options         // Your field name
      }))
    }),
    
    component: (row) => ({
      slug: row.id,
      name: row.label,
      fields: mapYourComponentFields(row)
    })
  }
});
```

### Complete Configuration
```typescript
export default defineConfig({
  // Input source
  connection: 'postgresql://localhost:5432/mydb',
  tables: {
    models: 'content_model',
    components: 'component'
  },
  
  // Output configuration
  output: {
    schemaPath: './prisma/content.prisma',
    clientPath: './src/generated/prisma-content',
    
    datasource: {
      provider: 'postgresql',
      url: 'env("DATABASE_URL")',
      directUrl: 'env("DATABASE_URL_DIRECT")'
    },
    
    client: {
      previewFeatures: ['metrics', 'driverAdapters']
    }
  },
  
  // Internationalization
  i18n: {
    enabled: true,
    defaultLang: 'en',
    tableNaming: '${identifier}_translation'
  },
  
  // Naming conventions
  naming: {
    convention: 'PascalCase', // or 'snake_case', 'camelCase'
    prefix: 'Content'         // Optional prefix: ContentPost, ContentPage
  },
  
  // Additional Prisma generators
  generators: [
    {
      name: 'zod',
      provider: 'zod-prisma-types',
      output: './src/generated/zod'
    },
    {
      name: 'trpc',
      provider: 'prisma-trpc-generator',
      output: './src/generated/trpc'
    }
  ]
});
```

## Model Definition Format

Your EAV database must store models as JSON matching this structure:
```typescript
{
  "slug": "blog-post",           // Required: Unique identifier
  "name": "Blog Post",           // Required: Human-readable name
  "fields": [                    // Required: At least 1 field
    {
      "key": "title",            // Required: Field identifier
      "label": "Title",          // Required: Display label
      "type": "text",            // Required: Field type
      "required": true,          // Optional: Default false
      "translatable": true,      // Optional: Default true
      "validation": {            // Optional: Generates Zod comments
        "minLength": 2,
        "maxLength": 100
      }
    }
  ],
  "settings": {                  // Optional
    "enableI18n": true,          // Affects translation table generation
    "sortField": "created_at"    // Affects index generation
  }
  // Extra fields are ignored (description, permissions, ui, etc.)
}
```

**Note:** The schema uses `.passthrough()` - you can include CMS-specific fields (ui, description, permissions, etc.) and they'll be ignored during generation.

## Field Types

### Basic Fields
```typescript
// Text field
{
  "key": "title",
  "label": "Title",
  "type": "text",
  "required": true,
  "validation": {
    "minLength": 2,
    "maxLength": 100,
    "pattern": "^[a-zA-Z0-9 ]+$"
  }
}

// Rich text (HTML)
{
  "key": "content",
  "label": "Content",
  "type": "rich",
  "required": true
}

// Number
{
  "key": "price",
  "label": "Price",
  "type": "number",
  "config": {
    "format": "decimal",  // or "integer", "currency", "percentage"
    "default": 0
  },
  "validation": {
    "min": 0,
    "max": 999999.99
  }
}

// Boolean
{
  "key": "published",
  "label": "Published",
  "type": "boolean",
  "config": {
    "default": false
  }
}

// Date/DateTime
{
  "key": "published_at",
  "label": "Published At",
  "type": "date",
  "config": {
    "format": "datetime"  // or "date", "time"
  }
}

// Select (single/multiple)
{
  "key": "status",
  "label": "Status",
  "type": "select",
  "config": {
    "multiple": false,
    "options": [
      { "value": "draft", "label": "Draft" },
      { "value": "published", "label": "Published" }
    ],
    "default": "draft"
  }
}

// JSON
{
  "key": "metadata",
  "label": "Metadata",
  "type": "json"
}
```

### Media Fields
```typescript
// Single media
{
  "key": "featured_image",
  "label": "Featured Image",
  "type": "media",
  "config": {
    "multiple": false
  }
}
// Generates: featured_image_id String?

// Multiple media (gallery)
{
  "key": "gallery",
  "label": "Gallery",
  "type": "media",
  "config": {
    "multiple": true
  }
}
// Generates: gallery Media[] (implicit many-to-many)
```

### Relations
```typescript
// One-to-One
{
  "key": "profile",
  "label": "Profile",
  "type": "relation",
  "config": {
    "relationType": "oneToOne",
    "targetModel": "profile",
    "displayField": "name",
    "cascade": "cascade"  // or "restrict", "setNull"
  }
}
// Generates: profile_id String? @unique

// Many-to-One
{
  "key": "author",
  "label": "Author",
  "type": "relation",
  "required": true,
  "config": {
    "relationType": "manyToOne",
    "targetModel": "user",
    "displayField": "name",
    "cascade": "restrict"
  }
}
// Generates: author_id String

// One-to-Many
{
  "key": "posts",
  "label": "Posts",
  "type": "relation",
  "config": {
    "relationType": "oneToMany",
    "targetModel": "post",
    "displayField": "title",
    "cascade": "cascade"
  }
}
// Generates: posts Post[] (implicit relation)

// Many-to-Many
{
  "key": "categories",
  "label": "Categories",
  "type": "relation",
  "config": {
    "relationType": "manyToMany",
    "targetModel": "category",
    "displayField": "name",
    "cascade": "restrict"
  }
}
// Generates: PostCategory junction table with order + timestamps
```

### Components (Reusable Content Blocks)
```typescript
// Non-repeatable component (one-to-one)
{
  "key": "seo",
  "label": "SEO",
  "type": "component",
  "config": {
    "slug": "seo",
    "repeatable": false
  }
}
// Generates: PostSeo table with post_id @unique

// Repeatable component (one-to-many)
{
  "key": "content_blocks",
  "label": "Content Blocks",
  "type": "component",
  "config": {
    "slug": "content-block",
    "repeatable": true
  }
}
// Generates: PostContentBlock table with order field
```

## Validation to Zod

Field validation rules automatically generate Zod comments for [zod-prisma-types](https://github.com/omar-dulaimi/zod-prisma-types):
```json
{
  "key": "email",
  "type": "text",
  "validation": {
    "email": true,
    "minLength": 5,
    "maxLength": 100
  }
}
```

Generates:
```prisma
model User {
  /// @zod.email().min(5).max(100)
  email String
}
```

Then use with zod-prisma-types:
```typescript
import { UserSchema } from './generated/zod';

// Validation rules from EAV are enforced!
const validated = UserSchema.parse(formData);
```

**Supported validations:**
- **String:** `minLength`, `maxLength`, `pattern`, `email`, `url`, `uuid`, `cuid`
- **Number:** `min`, `max`, `int`, `positive`, `negative`
- **Array:** `minItems`, `maxItems`
- **Custom:** `custom` string

## Internationalization (i18n)

Enable automatic translation table generation:
```typescript
export default defineConfig({
  i18n: {
    enabled: true,
    defaultLang: 'en',
    tableNaming: '${identifier}_translation'
  }
});
```

### How It Works

Fields with `translatable: true` (default for content fields) are moved to translation tables:

**Input:**
```json
{
  "slug": "post",
  "name": "Post",
  "fields": [
    { "key": "slug", "type": "text", "translatable": false },
    { "key": "title", "type": "text", "translatable": true },
    { "key": "content", "type": "rich", "translatable": true }
  ],
  "settings": { "enableI18n": true }
}
```

**Generated:**
```prisma
model Post {
  id           String   @id @default(cuid())
  slug         String   // Non-translatable stays in main table
  translations PostTranslation[]
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
}

model PostTranslation {
  id         String @id @default(cuid())
  post_id    String
  lang       String
  title      String  // Translatable fields here
  content    String
  post       Post @relation(fields: [post_id], references: [id], onDelete: Cascade)
  
  @@unique([post_id, lang])
}
```

### Usage
```typescript
// Create post with translations
const post = await prisma.post.create({
  data: {
    slug: 'hello-world',
    translations: {
      create: [
        { lang: 'en', title: 'Hello World', content: '<p>Content</p>' },
        { lang: 'es', title: 'Hola Mundo', content: '<p>Contenido</p>' }
      ]
    }
  }
});

// Query with specific language
const enPost = await prisma.post.findFirst({
  where: { slug: 'hello-world' },
  include: {
    translations: {
      where: { lang: 'en' }
    }
  }
});
```

## Components Deep Dive

Components are reusable content blocks that become separate tables with foreign keys back to the parent model.

### Component Definition
```json
{
  "slug": "seo",
  "name": "SEO",
  "fields": [
    {
      "key": "meta_title",
      "label": "Meta Title",
      "type": "text",
      "translatable": true
    },
    {
      "key": "meta_description",
      "label": "Meta Description",
      "type": "text",
      "translatable": true
    },
    {
      "key": "og_image",
      "label": "OG Image",
      "type": "media",
      "config": { "multiple": false }
    }
  ]
}
```

### Using in Models
```json
{
  "slug": "post",
  "fields": [
    {
      "key": "seo",
      "type": "component",
      "config": {
        "slug": "seo",
        "repeatable": false
      }
    }
  ]
}
```

### Generated Tables
```prisma
model PostSeo {
  id              String   @id @default(cuid())
  post_id         String   @unique  // Non-repeatable = @unique
  og_image_id     String?
  translations    PostSeoTranslation[]
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  post            Post @relation(fields: [post_id], references: [id], onDelete: Cascade)
}

model PostSeoTranslation {
  id               String @id @default(cuid())
  post_seo_id      String
  lang             String
  meta_title       String?
  meta_description String?
  post_seo         PostSeo @relation(fields: [post_seo_id], references: [id], onDelete: Cascade)
  
  @@unique([post_seo_id, lang])
}
```

### Repeatable Components
```json
{
  "key": "content_blocks",
  "type": "component",
  "config": {
    "slug": "content-block",
    "repeatable": true
  }
}
```

Generates table with **order field** and **no @unique constraint**:
```prisma
model PostContentBlock {
  id         String @id @default(cuid())
  post_id    String  // No @unique - repeatable
  order      Int?    // For sorting
  // ... fields
}
```

## CLI Commands

### `init`

Create a new configuration file:
```bash
npx eav-to-prisma init
```

Interactive prompts guide you through setup.

### `generate`

Generate Prisma schema from configuration:
```bash
npx eav-to-prisma generate

# With custom config path
npx eav-to-prisma generate --config ./custom.config.ts
```

### `validate`

Validate your EAV model definitions:
```bash
npx eav-to-prisma validate
```

Checks for:
- Valid JSON structure
- Required fields present
- Unique field keys
- Valid field types
- Correct relation references

### `analyze`

Analyze your EAV database structure:
```bash
npx eav-to-prisma analyze
```

Provides insights on:
- Number of models
- Field type distribution
- Relation complexity
- Component usage

## Examples

### Headless CMS

Perfect for building a headless CMS with dynamic content types:
```typescript
// Define content types in admin UI
// Store as JSON in database
// Generate Prisma schema
// Deploy with full type safety

const blogPost = await prisma.post.create({
  data: {
    slug: 'my-post',
    translations: {
      create: {
        lang: 'en',
        title: 'My Post',
        content: '<p>Content</p>'
      }
    },
    seo: {
      create: {
        translations: {
          create: {
            lang: 'en',
            meta_title: 'My Post - Blog'
          }
        }
      }
    },
    categories: {
      create: [
        { category: { connect: { id: 'cat-1' } }, order: 1 }
      ]
    }
  }
});
```

### E-commerce
```json
{
  "slug": "product",
  "name": "Product",
  "fields": [
    { "key": "sku", "type": "text", "required": true, "translatable": false },
    { "key": "name", "type": "text", "required": true, "translatable": true },
    { "key": "description", "type": "rich", "translatable": true },
    { "key": "price", "type": "number", "config": { "format": "currency" } },
    { "key": "images", "type": "media", "config": { "multiple": true } },
    {
      "key": "category",
      "type": "relation",
      "config": {
        "relationType": "manyToOne",
        "targetModel": "category"
      }
    },
    {
      "key": "variants",
      "type": "component",
      "config": { "slug": "product-variant", "repeatable": true }
    }
  ]
}
```

### Multi-tenant SaaS
```typescript
export default defineConfig({
  connection: process.env.DATABASE_URL!,
  tables: {
    models: 'content_model'
  },
  naming: {
    convention: 'PascalCase',
    prefix: 'Tenant'  // TenantPost, TenantPage, etc.
  }
});
```

## Integration with Prisma Generators

### Zod Validation
```typescript
export default defineConfig({
  // ... config
  generators: [
    {
      name: 'zod',
      provider: 'zod-prisma-types',
      output: './src/generated/zod'
    }
  ]
});
```
```typescript
import { PostSchema } from './generated/zod';

// Validation from EAV + Zod
const validated = PostSchema.parse(input);
```

### tRPC Router
```typescript
export default defineConfig({
  generators: [
    {
      name: 'trpc',
      provider: 'prisma-trpc-generator',
      output: './src/generated/trpc',
      config: {
        withMiddleware: true,
        withShield: true
      }
    }
  ]
});
```

### TypeGraphQL
```typescript
export default defineConfig({
  generators: [
    {
      name: 'typegraphql',
      provider: 'typegraphql-prisma',
      output: './src/generated/graphql'
    }
  ]
});
```

## Migration from Other Systems

### From Strapi
```typescript
export default defineConfig({
  input: {
    loader: async () => {
      const response = await fetch('http://localhost:1337/api/content-type-builder/content-types');
      const data = await response.json();
      return { models: data.data };
    }
  },
  
  mapper: {
    model: (strapiModel) => ({
      slug: strapiModel.info.singularName,
      name: strapiModel.info.displayName,
      fields: Object.entries(strapiModel.attributes).map(([key, attr]: any) => ({
        key,
        label: attr.displayName || key,
        type: mapStrapiType(attr.type),
        required: attr.required || false,
        config: mapStrapiConfig(attr)
      }))
    })
  }
});

function mapStrapiType(strapiType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'text',
    'text': 'text',
    'richtext': 'rich',
    'integer': 'number',
    'biginteger': 'number',
    'float': 'number',
    'decimal': 'number',
    'boolean': 'boolean',
    'date': 'date',
    'datetime': 'date',
    'time': 'date',
    'json': 'json',
    'enumeration': 'select',
    'relation': 'relation',
    'component': 'component',
    'media': 'media'
  };
  return typeMap[strapiType] || 'text';
}
```

### From Contentful
```typescript
export default defineConfig({
  input: {
    loader: async () => {
      const client = createClient({
        space: process.env.CONTENTFUL_SPACE_ID!,
        accessToken: process.env.CONTENTFUL_TOKEN!
      });
      
      const contentTypes = await client.getContentTypes();
      return {
        models: contentTypes.items
      };
    }
  },
  
  mapper: {
    model: (contentfulType) => ({
      slug: contentfulType.sys.id,
      name: contentfulType.name,
      fields: contentfulType.fields.map((field: any) => ({
        key: field.id,
        label: field.name,
        type: mapContentfulType(field.type),
        required: field.required || false
      }))
    })
  }
});
```

## Troubleshooting

### Schema Generation Fails

**Problem:** `Validation failed for model "post"`

**Solution:** Check your JSON structure matches the expected format. Use `.passthrough()` to allow extra fields.

### Missing Components

**Problem:** `Component "hero" not found for field "hero" in model "post"`

**Solution:** Ensure component definitions are in the database or input source.

### Type Mismatches

**Problem:** Generated types don't match expectations

**Solution:** Check naming convention in config. PascalCase is recommended.

### Prisma Generate Fails

**Problem:** `Unknown field type: ...`

**Solution:** Ensure you're using a supported Prisma provider (sqlite, postgresql, mysql).

## Performance Tips

1. **Use indexes wisely** - Add `sortField` to model settings
2. **Denormalize when needed** - Some relations can stay as JSON for read-heavy data
3. **Batch operations** - Use Prisma's batch operations for bulk updates
4. **Connection pooling** - Use connection pooling for production
5. **Caching** - Consider Redis for frequently accessed content

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/multipliedtwice/eav-to-prisma.git
cd eav-to-prisma
yarn install
yarn build
yarn test
```

### Running Tests
```bash
yarn test          # Watch mode
yarn test:run      # Single run
yarn test:coverage # With coverage
```

## Roadmap

- [x] SQLite support
- [x] PostgreSQL support
- [x] MySQL support
- [x] Component system
- [x] i18n/translation tables
- [x] Junction table generation
- [x] Zod comment generation
- [x] Direct input mode
- [x] Custom mappers
- [ ] Sync script generation (EAV → Prisma data migration)
- [ ] A/B testing variant tables
- [ ] MongoDB support
- [ ] Prisma Accelerate integration
- [ ] Migration rollback utilities

## License

MIT © [multipliedtwice](https://github.com/multipliedtwice)

## Support

- 📖 [Documentation](https://github.com/multipliedtwice/eav-to-prisma)
- 💬 [Discussions](https://github.com/multipliedtwice/eav-to-prisma/discussions)
- 🐛 [Issue Tracker](https://github.com/multipliedtwice/eav-to-prisma/issues)

---

If this project helped you, please consider giving it a ⭐️!
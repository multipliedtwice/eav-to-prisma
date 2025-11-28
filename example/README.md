# Basic Blog E2E Example

This example demonstrates how consumers use `eav-to-prisma` with a real Prisma client.

## Architecture

```
┌─────────────────────────────────────────┐
│  EAV Database (eav.db)                  │
│  ┌───────────────┐  ┌─────────────────┐│
│  │content_model  │  │component        ││
│  │(3 models)     │  │(2 components)   ││
│  └───────────────┘  └─────────────────┘│
└─────────────────────────────────────────┘
              ↓
    ┌─────────────────────┐
    │  Prisma Client      │
    │  (consumer provides)│
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │  eav-to-prisma      │
    │  Generator          │
    └─────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Generated Schema (generated-content.prisma)│
│  ┌─────────┐  ┌──────────────────────┐ │
│  │User     │  │UserTranslation       │ │
│  │Category │  │CategoryTranslation   │ │
│  │Post     │  │PostTranslation       │ │
│  │PostSeo  │  │PostSeoTranslation    │ │
│  │PostContentBlock                    │ │
│  │PostContentBlockTranslation         │ │
│  │PostCategory (junction)             │ │
│  └─────────┘  └──────────────────────┘ │
└─────────────────────────────────────────┘
```

## Models

### User
- Basic user with bio (translatable)
- Zod validation: email, min/max length

### Category
- Simple category with name (translatable) and slug

### Post (Complex Model)
- **Translatable fields**: title, excerpt, content
- **Relations**: 
  - `author` (manyToOne → User)
  - `categories` (manyToMany → Category, creates junction table)
- **Components**:
  - `seo` (non-repeatable, with translations)
  - `content_blocks` (repeatable, with translations)
- **Media**: 
  - `featured_image` (single)
  - `gallery` (multiple)
- **Other**: status (select), published_at (date)
- **Indexes**: published_at, status+published_at

## Setup

```bash
# Install dependencies
pnpm install

# Setup EAV database (generate client, migrate, seed)
pnpm setup

# This runs:
# 1. prisma generate --schema=prisma/eav-schema.prisma
# 2. prisma migrate deploy --schema=prisma/eav-schema.prisma
# 3. tsx prisma/seed.ts
```

## Run Tests

```bash
# Run e2e tests
pnpm test

# Watch mode
pnpm test:watch
```

## Manual Generation

```bash
# Generate schema from EAV database
pnpm generate

# This creates:
# - prisma/generated-content.prisma

# Generate Prisma client for content schema
npx prisma generate --schema=prisma/generated-content.prisma
```

## What Gets Generated

From the Post model definition:

```json
{
  "slug": "post",
  "fields": [
    { "key": "title", "translatable": true },
    { "key": "author", "type": "relation", "relationType": "manyToOne" },
    { "key": "categories", "type": "relation", "relationType": "manyToMany" },
    { "key": "seo", "type": "component", "repeatable": false },
    { "key": "content_blocks", "type": "component", "repeatable": true }
  ]
}
```

Generates these tables:

1. **Post** - Main model with non-translatable fields
2. **PostTranslation** - i18n table for title, excerpt, content
3. **PostSeo** - Component table (non-repeatable, has @unique on FK)
4. **PostSeoTranslation** - Component i18n
5. **PostContentBlock** - Repeatable component (no @unique, has order field)
6. **PostContentBlockTranslation** - Repeatable component i18n
7. **PostCategory** - Junction table for many-to-many relation

## Clean Up

```bash
# Remove generated files and databases
pnpm clean
```

## Key Points

1. **Consumer provides Prisma Client** - The package reads from any Prisma-connected database
2. **Real database operations** - No mocks, actual SQLite database
3. **Full type safety** - Generated schema has proper types
4. **Zod validation** - Validation rules generate Zod comments
5. **i18n support** - Automatic translation table generation
6. **Components** - Flatten into separate tables
7. **Relations** - Proper FK and junction tables
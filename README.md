# eav-to-prisma

> Generate type-safe Prisma schemas from any EAV (Entity-Attribute-Value) database

Transform dynamic EAV structures into performant, type-safe Prisma models. Perfect for headless CMSs, custom admin panels, or any system using EAV storage.

## Why?

EAV databases are flexible but slow to query and lack type safety. This tool:

- ✅ Generates clean Prisma schemas from EAV structures
- ✅ Creates sync scripts to materialize EAV → Prisma
- ✅ Works with any EAV implementation (configurable table/column names)
- ✅ Supports translations, components, relations, media
- ✅ Integrates with Prisma generators (GraphQL, tRPC, Express, etc.)
- ✅ Multi-schema support (works alongside existing Prisma schemas)

## Quick Start

[Installation, basic usage, 5-minute getting started]

## Features

[Translation support, components, A/B testing, etc.]

## Configuration

[Link to docs/configuration.md]

## Examples

[Links to examples directory]

## How It Works

[Architecture diagram: EAV → Generator → Prisma Schema + Sync Script → Clean API]

## Comparison

| Feature | Direct EAV | eav-to-prisma |
|---------|-----------|---------------|
| Type Safety | ❌ None | ✅ Full TypeScript |
| Query Performance | 🐌 Slow (many joins) | ⚡ Fast (normalized tables) |
| Developer Experience | 😫 Manual queries | 😊 Prisma Client |
| API Generation | ❌ Manual | ✅ Automatic (via generators) |
| Flexibility | ✅ Runtime schema changes | ⚠️ Requires regeneration |

## Roadmap

- [ ] PostgreSQL support
- [ ] MySQL support
- [ ] Incremental sync (only changed records)
- [ ] Real-time sync via webhooks
- [ ] Migration generator (for schema changes)
- [ ] GraphQL playground

## Contributing

[Contribution guidelines]

## License

MIT

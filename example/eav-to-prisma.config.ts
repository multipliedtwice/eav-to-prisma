import { defineConfig } from "../src/types/config";

export default defineConfig({
  // Connection to EAV database
  connection: 'file:./prisma/eav.db',

  // EAV table names
  tables: {
    models: 'content_model',
    components: 'component'
  },

  // Include external models (e.g., Media)
  externalModels: {
    path: './prisma/media.prisma',
    include: ['Media'] // Only include Media, skip Asset if you don't need it
  },

  // Or simple version:
  // externalModels: './prisma/media.prisma',

  // Or multiple files:
  // externalModels: ['./prisma/media.prisma', './prisma/user.prisma'],

  // Output configuration
  output: {
    schemaPath: './prisma/generated-content.prisma',
    clientPath: './node_modules/.prisma/client-content',
    
    // Configure datasource for generated schema
    datasource: {
      provider: 'sqlite',
      url: 'env("CONTENT_DATABASE_URL")'
    },
    
    // Prisma client generator config
    client: {
      previewFeatures: []
    }
  },

  // i18n configuration
  i18n: {
    enabled: true,
    defaultLang: 'en',
    tableNaming: '${identifier}_translation'
  },

  // Naming conventions
  naming: {
    convention: 'PascalCase'
  },

  // Additional generators (optional)
  generators: [
    {
      name: 'zod',
      provider: 'zod-prisma-types',
      output: './generated/zod'
    }
  ]
});
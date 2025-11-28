// src/types/config.ts

import { z } from 'zod';

export const ConfigSchema = z.object({
  // Database connection (optional - only for reading EAV from database)
  connection: z.string().optional(),
  
  // Direct input (alternative to database)
  input: z.union([
    z.object({
      models: z.array(z.any()),
      components: z.array(z.any()).optional()
    }),
    z.object({
      loader: z.function({
        input: z.tuple([]),
        output: z.promise(z.object({
          models: z.array(z.any()),
          components: z.array(z.any()).optional()
        }))
      })
    })
  ]).optional(),
  
  // EAV table names (required if using database)
  tables: z.object({
    models: z.string().default('content_model'),
    components: z.string().optional()
  }).optional(),
  
  // Mapper to transform your EAV structure
  mapper: z.object({
    model: z.function({
      input: z.tuple([z.any()]),
      output: z.any()
    }).optional(),
    component: z.function({
      input: z.tuple([z.any()]),
      output: z.any()
    }).optional()
  }).optional(),
  
  // External Prisma models to include
  externalModels: z.union([
    // Simple: just a path
    z.string(),
    // Array of paths
    z.array(z.string()),
    // Detailed config
    z.object({
      path: z.union([z.string(), z.array(z.string())]),
      include: z.array(z.string()).optional(), // whitelist specific models
      exclude: z.array(z.string()).optional()  // blacklist specific models
    })
  ]).optional(),
  
  // Output
  output: z.object({
    schemaPath: z.string().default('./prisma/schema.prisma').optional(),
    multiSchema: z.boolean().default(false).optional(),
    schemaName: z.string().optional(),
    clientPath: z.string().optional(),
    // Prisma client generator config
    client: z.object({
      previewFeatures: z.array(z.string()).optional()
    }).optional(),
    // Target database config for generated schema
    datasource: z.object({
      provider: z.enum(['sqlite', 'postgresql', 'mysql']).default('sqlite'),
      url: z.string().default('env("DATABASE_URL")'),
      directUrl: z.string().optional()
    }).optional()
  }).optional(),
  
  // I18n
  i18n: z.object({
    enabled: z.boolean(),
    tableNaming: z.string().default('${identifier}_translation'),
    defaultLang: z.string()
  }).optional(),
  
  // Naming
  naming: z.object({
    convention: z.enum(['snake_case', 'camelCase', 'PascalCase']).default('PascalCase'),
    prefix: z.string().optional()
  }).optional(),
  
  // Generators
  generators: z.array(z.object({
    name: z.string(),
    provider: z.string(),
    output: z.string().optional(),
    config: z.record(z.string(), z.any()).optional()
  })).optional()
}).refine(
  (data) => {
    // Must have either connection+tables OR input
    return (data.connection && data.tables) || data.input;
  },
  {
    message: 'Must provide either (connection + tables) or (input)'
  }
);

export type Config = z.infer<typeof ConfigSchema>;

export function defineConfig(config: Config): Config {
  return ConfigSchema.parse(config);
}
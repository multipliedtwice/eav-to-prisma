// Main library exports
export { Generator } from './core/generator';
export { EAVReader } from './core/reader';
export { buildModel } from './core/schema-builder';
export { writeSchema, writeSchemaSync } from './core/schema-writer';

// Type exports
export type { Config } from './types/config';
export { defineConfig, ConfigSchema } from './types/config';

// Schema types
export type {
  ModelConfigType,
  FieldDefinitionType,
  ComponentEntityType,
  FieldConfigType,
  FieldValidationType,
  ComponentContextType,
  ComponentConfigType
} from './field-config-schema';

export {
  ModelConfigSchema,
  FieldDefinitionSchema,
  ComponentEntitySchema,
  FieldConfigSchema,
  FieldValidationSchema,
  ComponentConfigSchema,
  ComponentContextSchema,
  FieldTypeEnum,
  getValidationErrors,
  isReservedFieldKey,
  validateFieldKey,
  RESERVED_FIELD_KEYS,
  VALIDATION_PATTERNS
} from './field-config-schema';

// Utility exports
export type {
  PrismaSchema,
  PrismaModel,
  PrismaField,
  PrismaDatasource,
  PrismaGenerator
} from './utils/prisma-ast';

export {
  extractModelsFromPrismaFile,
  extractModelsFromString
} from './utils/prisma-parser';

export { buildZodComment } from './utils/zod-comments';

export {
  toModelName,
  toSnakeCase,
  toPascalCase,
  toCamelCase,
  buildTranslationTableName
} from './utils/naming';

// Mapper exports
export { mapFieldToPrisma } from './mappers/field-mapper';
export {
  buildComponentTable,
  buildComponentTranslationTable
} from './mappers/component-mapper';
export {
  needsJunctionTable,
  buildJunctionTable,
  buildJunctionTableName
} from './mappers/relation-mapper';

// Schema builder types
export type { SchemaBuilderConfig } from './core/schema-builder';

// Re-export commonly used types
export type { MapperFunction, EAVDatabaseRow } from './core/reader';
// src/mappers/component-mapper.ts

import type { PrismaModel, PrismaField } from '../utils/prisma-ast';
import type { ComponentEntityType, ComponentContextType, FieldDefinitionType } from '../field-config-schema';
import type { SchemaBuilderConfig } from '../core/schema-builder';
import { mapFieldToPrisma } from './field-mapper';
import { toSnakeCase, toPascalCase } from '../utils/naming';

/**
 * Build a component table that can be used by parent models
 * 
 * Components become separate tables with FK back to parent
 * Example: Post.seo -> PostSeo table with post_id FK
 */
export function buildComponentTable(
  parentModel: string,
  fieldKey: string,
  component: ComponentEntityType,
  repeatable: boolean,
  config: SchemaBuilderConfig,
  context?: ComponentContextType
): PrismaModel {
  const tableName = buildComponentTableName(parentModel, fieldKey, config);
  const parentFk = `${toSnakeCase(parentModel)}_id`;
  
  // Separate translatable/non-translatable fields
  const { translatable, nonTranslatable } = separateComponentFields(component.fields);
  
  // Build fields
  const fields: PrismaField[] = [
    // ID
    {
      name: 'id',
      type: 'String',
      attributes: ['@id', '@default(cuid())']
    },
    
    // Parent FK
    {
      name: parentFk,
      type: 'String',
      attributes: repeatable ? [] : ['@unique'] // One-to-one vs one-to-many
    },
    
    // Order field for repeatable components
    ...(repeatable ? [{
      name: 'order',
      type: 'Int',
      optional: true
    }] : []),
    
    // A/B testing fields if enabled
    ...(context?.abTesting?.enabled ? [
      {
        name: 'variant_id',
        type: 'String',
        optional: true
      },
      {
        name: 'enabled',
        type: 'Boolean',
        optional: true,
        default: true
      }
    ] : []),
    
    // Component fields (flattened)
    // When i18n is disabled, include all fields here
    // When i18n is enabled, only non-translatable fields (translatable ones go to translation table)
     ...(config.i18nEnabled ? nonTranslatable : [...nonTranslatable, ...translatable])
      .flatMap(f => mapFieldToPrisma(f, config)),
    
    // Timestamps
    {
      name: 'created_at',
      type: 'DateTime',
      attributes: ['@default(now())']
    },
    {
      name: 'updated_at',
      type: 'DateTime',
      attributes: ['@updatedAt']
    },
    
    // Relation back to parent
    {
      name: toSnakeCase(parentModel),
      type: parentModel,
      relation: {
        fields: [parentFk],
        references: ['id'],
        onDelete: 'Cascade'
      }
    }
  ];
  
  // Add translation relation if i18n enabled and has translatable fields
  if (config.i18nEnabled && translatable.length > 0) {
    fields.push({
      name: 'translations',
      type: `${tableName}Translation`,
      list: true
    });
  }
  
  const model: PrismaModel = {
    name: tableName,
    fields,
    indexes: repeatable ? [[parentFk]] : undefined // Index for repeatable components
  };
  
  return model;
}

/**
 * Build component translation table
 */
export function buildComponentTranslationTable(
  parentModel: string,
  fieldKey: string,
  component: ComponentEntityType,
  config: SchemaBuilderConfig
): PrismaModel | null {
  const { translatable } = separateComponentFields(component.fields);
  
  if (translatable.length === 0) {
    return null;
  }
  
  const baseTableName = buildComponentTableName(parentModel, fieldKey, config);
  const tableName = `${baseTableName}Translation`;
  const baseFk = `${toSnakeCase(baseTableName)}_id`;
  
  return {
    name: tableName,
    map: toSnakeCase(tableName),
    fields: [
      {
        name: 'id',
        type: 'String',
        attributes: ['@id', '@default(cuid())']
      },
      {
        name: baseFk,
        type: 'String'
      },
      {
        name: 'lang',
        type: 'String'
      },
      ...translatable.flatMap(f => mapFieldToPrisma(f, config)),
      {
        name: toSnakeCase(baseTableName),
        type: baseTableName,
        relation: {
          fields: [baseFk],
          references: ['id'],
          onDelete: 'Cascade'
        }
      }
    ],
    unique: [[baseFk, 'lang']]
  };
}

function buildComponentTableName(
  parentModel: string,
  fieldKey: string,
  config: SchemaBuilderConfig
): string {
  // Example: Post + seo -> PostSeo
  //          Post + blocks -> PostBlock (singular)
  
  const fieldName = fieldKey.endsWith('s') 
    ? fieldKey.slice(0, -1) // Remove trailing 's' for repeatable
    : fieldKey;
  
  if (config.convention === 'snake_case') {
    return `${toSnakeCase(parentModel)}_${fieldName}`;
  }
  
  return `${parentModel}${toPascalCase(fieldName)}`;
}

function separateComponentFields(fields: FieldDefinitionType[]) {
  const translatable: FieldDefinitionType[] = [];
  const nonTranslatable: FieldDefinitionType[] = [];
  
  for (const field of fields) {
    // Skip nested components and relations
    if (field.type === 'component' || field.type === 'relation') {
      nonTranslatable.push(field);
      continue;
    }
    
    if (field.translatable !== false) {
      translatable.push(field);
    } else {
      nonTranslatable.push(field);
    }
  }
  
  return { translatable, nonTranslatable };
}
import type { PrismaModel, PrismaField } from "../utils/prisma-ast";
import { mapFieldToPrisma } from "../mappers/field-mapper";
import { toPascalCase, toSnakeCase } from "../utils/naming";
import type {
  ModelConfigType,
  FieldDefinitionType,
} from "../field-config-schema";

export interface SchemaBuilderConfig {
  convention: "snake_case" | "camelCase" | "PascalCase";
  prefix?: string;
  i18nEnabled: boolean;
  i18nTableNaming: string;
  externalModelNames?: Set<string>;
}

export function buildModel(
  model: ModelConfigType,
  config: SchemaBuilderConfig
): PrismaModel[] {
  const modelName = buildModelName(model.slug, config);
  const models: PrismaModel[] = [];

  const { translatable, nonTranslatable, components } = separateFields(
    model.fields
  );

  // When i18n is disabled, include ALL fields in main model
  // When i18n is enabled, only include non-translatable fields (translatable go to translation table)
  const fieldsToInclude = config.i18nEnabled 
    ? nonTranslatable 
    : [...nonTranslatable, ...translatable];
  
  const mainFields: PrismaField[] = [
    buildIdField(),
    ...fieldsToInclude.flatMap((f) => mapFieldToPrisma(f, config)),
    ...buildTimestampFields(),
  ];

  for (const field of components) {
    if (field.config?.type === "component") {
      // Build the proper component table name
      const componentTableName = buildComponentTableName(modelName, field.key, config);
      mainFields.push({
        name: field.key,
        type: componentTableName,
        list: field.config.repeatable,
        optional: true,
      });
    }
  }

  if (config.i18nEnabled && translatable.length > 0) {
    mainFields.push(buildTranslationRelation(modelName));
  }

  const mainModel: PrismaModel = {
    name: modelName,
    fields: mainFields,
    indexes: buildIndexes(model.fields, model.settings),
  };

  models.push(mainModel);

  if (config.i18nEnabled && translatable.length > 0) {
    const translationModel = buildTranslationModel(
      modelName,
      translatable,
      config
    );
    models.push(translationModel);
  }

  return models;
}

function separateFields(fields: FieldDefinitionType[]): {
  translatable: FieldDefinitionType[];
  nonTranslatable: FieldDefinitionType[];
  components: FieldDefinitionType[];
} {
  const translatable: FieldDefinitionType[] = [];
  const nonTranslatable: FieldDefinitionType[] = [];
  const components: FieldDefinitionType[] = [];

  for (const field of fields) {
    if (field.type === "component") {
      components.push(field);
      continue;
    }

    if (field.type === "relation") {
      nonTranslatable.push(field);
      continue;
    }

    if (field.translatable !== false) {
      translatable.push(field);
    } else {
      nonTranslatable.push(field);
    }
  }

  return { translatable, nonTranslatable, components };
}

function buildComponentTableName(
  parentModel: string,
  fieldKey: string,
  config: SchemaBuilderConfig
): string {
  const fieldName = fieldKey.endsWith("s") ? fieldKey.slice(0, -1) : fieldKey;

  if (config.convention === "snake_case") {
    return `${toSnakeCase(parentModel)}_${fieldName}`;
  }

  return `${parentModel}${toPascalCase(fieldName)}`;
}

function buildModelName(slug: string, config: SchemaBuilderConfig): string {
  const name = toPascalCase(slug);
  return config.prefix ? `${config.prefix}${name}` : name;
}

function buildIdField(): PrismaField {
  return {
    name: "id",
    type: "String",
    attributes: ["@id", "@default(cuid())"],
  };
}

function buildTimestampFields(): PrismaField[] {
  return [
    {
      name: "created_at",
      type: "DateTime",
      attributes: ["@default(now())"],
    },
    {
      name: "updated_at",
      type: "DateTime",
      attributes: ["@updatedAt"],
    },
  ];
}

function buildTranslationRelation(modelName: string): PrismaField {
  return {
    name: "translations",
    type: `${modelName}Translation`,
    list: true,
    optional: true,
  };
}

function buildTranslationModel(
  baseModelName: string,
  translatableFields: FieldDefinitionType[],
  config: SchemaBuilderConfig
): PrismaModel {
  const tableName = config.i18nTableNaming.replace(
    "${identifier}",
    toSnakeCase(baseModelName)
  );

  return {
    name: `${baseModelName}Translation`,
    map: tableName,
    fields: [
      buildIdField(),
      {
        name: `${toSnakeCase(baseModelName)}_id`,
        type: "String",
      },
      {
        name: "lang",
        type: "String",
      },
      ...translatableFields.flatMap((f) => mapFieldToPrisma(f, config)),
      {
        name: toSnakeCase(baseModelName),
        type: baseModelName,
        relation: {
          fields: [`${toSnakeCase(baseModelName)}_id`],
          references: ["id"],
          onDelete: "Cascade",
        },
      },
    ],
    unique: [[`${toSnakeCase(baseModelName)}_id`, "lang"]],
  };
}

function buildIndexes(
  fields: FieldDefinitionType[],
  settings?: ModelConfigType["settings"]
): string[][] {
  const indexes: string[][] = [];

  if (settings?.sortField) {
    indexes.push([settings.sortField]);
  }

  const hasStatus = fields.some((f) => f.key === "status");
  const hasPublishedAt = fields.some((f) => f.key === "published_at");

  if (hasStatus && hasPublishedAt) {
    indexes.push(["status", "published_at"]);
  }

  return indexes;
}
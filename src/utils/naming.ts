// src/utils/naming.ts

export interface NamingConfig {
  convention: 'snake_case' | 'camelCase' | 'PascalCase';
  prefix?: string;
}

export function toModelName(slug: string, config: NamingConfig): string {
  const name = toPascalCase(slug);
  return config.prefix ? `${config.prefix}${name}` : name;
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function buildTranslationTableName(
  modelName: string,
  convention: 'snake_case' | 'camelCase' | 'PascalCase'
): string {
  // ${identifier}_translation
  const identifier = convention === 'snake_case' 
    ? toSnakeCase(modelName) 
    : modelName;
    
  return `${identifier}_translation`;
}
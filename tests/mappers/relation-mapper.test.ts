// tests/mappers/relation-mapper.test.ts

import { describe, it, expect } from 'vitest';
import { SchemaBuilderConfig } from '../../src/core/schema-builder';
import { FieldDefinitionType } from '../../src/field-config-schema';
import { needsJunctionTable, buildJunctionTable } from '../../src/mappers/relation-mapper';

// FIXED: Changed to PascalCase
const baseConfig: SchemaBuilderConfig = {
  convention: 'PascalCase',
  i18nEnabled: false,
  i18nTableNaming: '${identifier}_translation'
};

describe('needsJunctionTable', () => {
  it('returns false for oneToOne', () => {
    const field: FieldDefinitionType = {
      key: 'profile',
      label: 'Profile',
      type: 'relation',
      required: false,
      config: {
        type: 'relation',
        relationType: 'oneToOne',
        targetModel: 'profile',
        displayField: 'name',
        cascade: 'cascade'
      }
    };

    expect(needsJunctionTable(field)).toBe(false);
  });

  it('returns false for manyToOne', () => {
    const field: FieldDefinitionType = {
      key: 'author',
      label: 'Author',
      type: 'relation',
      required: false,
      config: {
        type: 'relation',
        relationType: 'manyToOne',
        targetModel: 'user',
        displayField: 'name',
        cascade: 'restrict'
      }
    };

    expect(needsJunctionTable(field)).toBe(false);
  });

  it('returns false for oneToMany', () => {
    const field: FieldDefinitionType = {
      key: 'posts',
      label: 'Posts',
      type: 'relation',
      required: false,
      config: {
        type: 'relation',
        relationType: 'oneToMany',
        targetModel: 'post',
        displayField: 'title',
        cascade: 'cascade'
      }
    };

    expect(needsJunctionTable(field)).toBe(false);
  });

  it('returns true for manyToMany', () => {
    const field: FieldDefinitionType = {
      key: 'categories',
      label: 'Categories',
      type: 'relation',
      required: false,
      config: {
        type: 'relation',
        relationType: 'manyToMany',
        targetModel: 'category',
        displayField: 'name',
        cascade: 'restrict'
      }
    };

    expect(needsJunctionTable(field)).toBe(true);
  });
});

describe('buildJunctionTable', () => {
  it('builds junction table for manyToMany relation', () => {
    const field: FieldDefinitionType = {
      key: 'categories',
      label: 'Categories',
      type: 'relation',
      required: false,
      config: {
        type: 'relation',
        relationType: 'manyToMany',
        targetModel: 'category',
        displayField: 'name',
        cascade: 'restrict'
      }
    };

    const result = buildJunctionTable('Post', field, baseConfig);

    expect(result.name).toBe('PostCategory');
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', type: 'String' }),
        expect.objectContaining({ name: 'post_id', type: 'String' }),
        expect.objectContaining({ name: 'category_id', type: 'String' }),
        expect.objectContaining({ name: 'order', type: 'Int' }),
        // Relations
        expect.objectContaining({
          name: 'post',
          type: 'Post',
          relation: expect.objectContaining({
            fields: ['post_id'],
            references: ['id']
          })
        }),
        expect.objectContaining({
          name: 'category',
          type: 'Category',
          relation: expect.objectContaining({
            fields: ['category_id'],
            references: ['id']
          })
        })
      ])
    );

    // Should have unique constraint on both FKs
    expect(result.unique).toContainEqual(['post_id', 'category_id']);
  });

  it('uses proper naming convention', () => {
    const field: FieldDefinitionType = {
      key: 'tags',
      label: 'Tags',
      type: 'relation',
      required: false,
      config: {
        type: 'relation',
        relationType: 'manyToMany',
        targetModel: 'tag',
        displayField: 'name',
        cascade: 'restrict'
      }
    };

    const snakeConfig: SchemaBuilderConfig = {
      ...baseConfig,
      convention: 'snake_case'
    };

    const result = buildJunctionTable('blog_post', field, snakeConfig);

    expect(result.name).toBe('blog_post_tag');
  });

  it('handles cascade delete configuration', () => {
    const field: FieldDefinitionType = {
      key: 'categories',
      label: 'Categories',
      type: 'relation',
      required: false,
      config: {
        type: 'relation',
        relationType: 'manyToMany',
        targetModel: 'category',
        displayField: 'name',
        cascade: 'cascade'
      }
    };

    const result = buildJunctionTable('Post', field, baseConfig);

    const postRelation = result.fields.find(f => f.name === 'post')?.relation;
    expect(postRelation?.onDelete).toBe('Cascade');
  });

  it('adds timestamps to junction table', () => {
    const field: FieldDefinitionType = {
      key: 'categories',
      label: 'Categories',
      type: 'relation',
      required: false,
      config: {
        type: 'relation',
        relationType: 'manyToMany',
        targetModel: 'category',
        displayField: 'name',
        cascade: 'restrict'
      }
    };

    const result = buildJunctionTable('Post', field, baseConfig);

    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'created_at', type: 'DateTime' })
      ])
    );
  });
});
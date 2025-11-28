// tests/mappers/component-mapper.test.ts

import { describe, it, expect } from 'vitest';
import { ComponentEntityType } from '../../src/field-config-schema';
import { SchemaBuilderConfig } from '../../src/core/schema-builder';
import { buildComponentTable } from '../../src/mappers/component-mapper';

// FIXED: Changed to PascalCase
const baseConfig: SchemaBuilderConfig = {
  convention: 'PascalCase',
  i18nEnabled: false,
  i18nTableNaming: '${identifier}_translation'
};

describe('buildComponentTable', () => {
  it('builds component table with flattened fields', () => {
    const component: ComponentEntityType = {
      slug: 'seo',
      name: 'SEO',
      fields: [
        {
          key: 'meta_title',
          label: 'Meta Title',
          type: 'text',
          required: false
        },
        {
          key: 'meta_description',
          label: 'Meta Description',
          type: 'text',
          required: false
        }
      ]
    };

    const parentModel = 'Post';
    const fieldKey = 'seo';

    const result = buildComponentTable(
      parentModel,
      fieldKey,
      component,
      false, // Not repeatable
      baseConfig
    );

    expect(result.name).toBe('PostSeo');
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', type: 'String' }),
        expect.objectContaining({ name: 'post_id', type: 'String' }),
        expect.objectContaining({ name: 'meta_title', type: 'String' }),
        expect.objectContaining({ name: 'meta_description', type: 'String' }),
        // ADDED: Timestamps
        expect.objectContaining({ name: 'created_at', type: 'DateTime' }),
        expect.objectContaining({ name: 'updated_at', type: 'DateTime' }),
        // Relation back to parent
        expect.objectContaining({
          name: 'post',
          type: 'Post',
          relation: expect.objectContaining({
            fields: ['post_id'],
            references: ['id']
          })
        })
      ])
    );

    // Non-repeatable should have @unique on FK
    const postIdField = result.fields.find(f => f.name === 'post_id');
    expect(postIdField?.attributes).toContain('@unique');
  });

  it('builds repeatable component table without @unique', () => {
    const component: ComponentEntityType = {
      slug: 'content-block',
      name: 'Content Block',
      fields: [
        {
          key: 'heading',
          label: 'Heading',
          type: 'text',
          required: true
        },
        {
          key: 'content',
          label: 'Content',
          type: 'rich',
          required: true
        }
      ]
    };

    const result = buildComponentTable(
      'Post',
      'blocks',
      component,
      true, // Repeatable
      baseConfig
    );

    expect(result.name).toBe('PostBlock');
    
    // Repeatable should NOT have @unique
    const postIdField = result.fields.find(f => f.name === 'post_id');
    expect(postIdField?.attributes).not.toContain('@unique');
    
    // Should have order field for repeatable components
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'order', type: 'Int' })
      ])
    );
  });

  it('handles component with translatable fields', () => {
    const component: ComponentEntityType = {
      slug: 'cta',
      name: 'Call to Action',
      fields: [
        {
          key: 'button_text',
          label: 'Button Text',
          type: 'text',
          required: true,
          translatable: true
        },
        {
          key: 'button_url',
          label: 'Button URL',
          type: 'text',
          required: true,
          translatable: false
        }
      ]
    };

    const config: SchemaBuilderConfig = {
      ...baseConfig,
      i18nEnabled: true
    };

    const result = buildComponentTable(
      'Post',
      'cta',
      component,
      false,
      config
    );

    // Should generate translation relation
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'translations',
          type: 'PostCtaTranslation',
          list: true
        })
      ])
    );
  });

  it('uses proper naming convention', () => {
    const component: ComponentEntityType = {
      slug: 'feature-card',
      name: 'Feature Card',
      fields: [
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          required: true
        }
      ]
    };

    const snakeConfig: SchemaBuilderConfig = {
      ...baseConfig,
      convention: 'snake_case'
    };

    const result = buildComponentTable(
      'landing_page',
      'features',
      component,
      true,
      snakeConfig
    );

    expect(result.name).toBe('landing_page_feature');
  });

  it('handles A/B testing context', () => {
    const component: ComponentEntityType = {
      slug: 'cta',
      name: 'CTA',
      fields: [
        {
          key: 'headline',
          label: 'Headline',
          type: 'text',
          required: true
        }
      ]
    };

    const result = buildComponentTable(
      'Post',
      'cta',
      component,
      false,
      baseConfig,
      { abTesting: { enabled: true, variantCount: 3 } }
    );

    // Should add variant fields
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'variant_id', type: 'String' }),
        expect.objectContaining({ name: 'enabled', type: 'Boolean' })
      ])
    );
  });

  it('handles nested component fields', () => {
    const component: ComponentEntityType = {
      slug: 'hero',
      name: 'Hero',
      fields: [
        {
          key: 'image',
          label: 'Image',
          type: 'media',
          required: true,
          config: {
            type: 'media',
            multiple: false
          }
        }
      ]
    };

    const result = buildComponentTable(
      'Post',
      'hero',
      component,
      false,
      baseConfig
    );

    // Media field should become FK
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'image_id', type: 'String' })
      ])
    );
  });
});
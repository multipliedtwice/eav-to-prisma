// Seed the EAV database with model definitions
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding EAV database...');

  // User model
  await prisma.content_model.create({
    data: {
      slug: 'user',
      definition: JSON.stringify({
        slug: 'user',
        name: 'User',
        fields: [
          {
            key: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            translatable: false,
            validation: {
              minLength: 2,
              maxLength: 100
            }
          },
          {
            key: 'email',
            label: 'Email',
            type: 'text',
            required: true,
            translatable: false,
            validation: {
              email: true
            }
          },
          {
            key: 'bio',
            label: 'Bio',
            type: 'rich',
            required: false,
            translatable: true
          }
        ],
        settings: {
          enableI18n: true
        }
      })
    }
  });

  // Category model
  await prisma.content_model.create({
    data: {
      slug: 'category',
      definition: JSON.stringify({
        slug: 'category',
        name: 'Category',
        fields: [
          {
            key: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            translatable: true,
            validation: {
              minLength: 2,
              maxLength: 50
            }
          },
          {
            key: 'slug',
            label: 'Slug',
            type: 'text',
            required: true,
            translatable: false,
            validation: {
              pattern: '^[a-z0-9-]+$'
            }
          }
        ],
        settings: {
          enableI18n: true
        }
      })
    }
  });

  // Blog Post model
  await prisma.content_model.create({
    data: {
      slug: 'post',
      definition: JSON.stringify({
        slug: 'post',
        name: 'Blog Post',
        fields: [
          {
            key: 'title',
            label: 'Title',
            type: 'text',
            required: true,
            translatable: true,
            validation: {
              minLength: 5,
              maxLength: 200
            }
          },
          {
            key: 'slug',
            label: 'URL Slug',
            type: 'text',
            required: true,
            translatable: false,
            validation: {
              pattern: '^[a-z0-9-]+$',
              minLength: 3,
              maxLength: 100
            }
          },
          {
            key: 'excerpt',
            label: 'Excerpt',
            type: 'text',
            required: false,
            translatable: true,
            validation: {
              maxLength: 300
            }
          },
          {
            key: 'content',
            label: 'Content',
            type: 'rich',
            required: true,
            translatable: true
          },
          {
            key: 'featured_image',
            label: 'Featured Image',
            type: 'media',
            required: false,
            translatable: false,
            config: {
              type: 'media',
              multiple: false
            }
          },
          {
            key: 'gallery',
            label: 'Gallery',
            type: 'media',
            required: false,
            translatable: false,
            config: {
              type: 'media',
              multiple: true
            }
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            translatable: false,
            config: {
              type: 'select',
              multiple: false,
              options: ['draft', 'published', 'archived']
            }
          },
          {
            key: 'published_at',
            label: 'Published At',
            type: 'date',
            required: false,
            translatable: false,
            config: {
              type: 'date',
              format: 'datetime'
            }
          },
          {
            key: 'author',
            label: 'Author',
            type: 'relation',
            required: true,
            translatable: false,
            config: {
              type: 'relation',
              relationType: 'manyToOne',
              targetModel: 'user',
              displayField: 'name',
              cascade: 'restrict'
            }
          },
          {
            key: 'categories',
            label: 'Categories',
            type: 'relation',
            required: false,
            translatable: false,
            config: {
              type: 'relation',
              relationType: 'manyToMany',
              targetModel: 'category',
              displayField: 'name',
              cascade: 'restrict'
            }
          },
          {
            key: 'seo',
            label: 'SEO',
            type: 'component',
            required: false,
            translatable: false,
            config: {
              type: 'component',
              slug: 'seo',
              repeatable: false
            }
          },
          {
            key: 'content_blocks',
            label: 'Content Blocks',
            type: 'component',
            required: false,
            translatable: false,
            config: {
              type: 'component',
              slug: 'content-block',
              repeatable: true
            }
          }
        ],
        settings: {
          enableI18n: true,
          sortField: 'published_at'
        }
      })
    }
  });

  // SEO Component
  await prisma.component.create({
    data: {
      slug: 'seo',
      definition: JSON.stringify({
        slug: 'seo',
        name: 'SEO',
        fields: [
          {
            key: 'meta_title',
            label: 'Meta Title',
            type: 'text',
            required: false,
            translatable: true,
            validation: {
              maxLength: 60
            }
          },
          {
            key: 'meta_description',
            label: 'Meta Description',
            type: 'text',
            required: false,
            translatable: true,
            validation: {
              maxLength: 160
            }
          },
          {
            key: 'og_image',
            label: 'OG Image',
            type: 'media',
            required: false,
            config: {
              type: 'media',
              multiple: false
            }
          }
        ]
      })
    }
  });

  // Content Block Component
  await prisma.component.create({
    data: {
      slug: 'content-block',
      definition: JSON.stringify({
        slug: 'content-block',
        name: 'Content Block',
        fields: [
          {
            key: 'type',
            label: 'Block Type',
            type: 'select',
            required: true,
            config: {
              type: 'select',
              multiple: false,
              options: ['text', 'image', 'video', 'quote']
            }
          },
          {
            key: 'heading',
            label: 'Heading',
            type: 'text',
            required: false,
            translatable: true,
            validation: {
              maxLength: 100
            }
          },
          {
            key: 'content',
            label: 'Content',
            type: 'rich',
            required: false,
            translatable: true
          },
          {
            key: 'media',
            label: 'Media',
            type: 'media',
            required: false,
            config: {
              type: 'media',
              multiple: false
            }
          }
        ]
      })
    }
  });

  console.log('✓ Seeded 3 models and 2 components');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
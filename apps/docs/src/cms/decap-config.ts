import type { DocsCmsCustomFields, } from './types';

function buildBackend(config: DocsCmsCustomFields,): Record<string, unknown> {
  if (config.backend.mode === 'github' && config.backend.baseUrl) {
    return {
      name: 'github',
      repo: config.backend.repo,
      branch: config.backend.branch,
      base_url: config.backend.baseUrl,
      auth_endpoint: config.backend.authEndpoint,
    };
  }

  return {
    name: 'test-repo',
  };
}

export function buildDecapConfig(config: DocsCmsCustomFields,): Record<string, unknown> {
  return {
    backend: buildBackend(config,),
    media_folder: config.media.folder,
    public_folder: config.media.publicFolder,
    publish_mode: 'editorial_workflow',
    local_backend: false,
    collections: [
      {
        name: 'docs_en',
        label: 'Docs (English)',
        folder: 'apps/docs/docs',
        create: true,
        extension: 'md',
        format: 'frontmatter',
        nested: {
          depth: 6,
        },
        slug: '{{slug}}',
        fields: [
          {
            label: 'Title',
            name: 'title',
            widget: 'string',
            required: false,
          },
          {
            label: 'Description',
            name: 'description',
            widget: 'text',
            required: false,
          },
          {
            label: 'Body',
            name: 'body',
            widget: 'markdown',
          },
        ],
      },
      {
        name: 'docs_es',
        label: 'Docs (Spanish)',
        folder: 'apps/docs/i18n/es/docusaurus-plugin-content-docs/current',
        create: true,
        extension: 'md',
        format: 'frontmatter',
        nested: {
          depth: 6,
        },
        slug: '{{slug}}',
        fields: [
          {
            label: 'Title',
            name: 'title',
            widget: 'string',
            required: false,
          },
          {
            label: 'Description',
            name: 'description',
            widget: 'text',
            required: false,
          },
          {
            label: 'Body',
            name: 'body',
            widget: 'markdown',
          },
        ],
      },
      {
        name: 'docs_th',
        label: 'Docs (Thai)',
        folder: 'apps/docs/i18n/th/docusaurus-plugin-content-docs/current',
        create: true,
        extension: 'md',
        format: 'frontmatter',
        nested: {
          depth: 6,
        },
        slug: '{{slug}}',
        fields: [
          {
            label: 'Title',
            name: 'title',
            widget: 'string',
            required: false,
          },
          {
            label: 'Description',
            name: 'description',
            widget: 'text',
            required: false,
          },
          {
            label: 'Body',
            name: 'body',
            widget: 'markdown',
          },
        ],
      },
    ],
  };
}

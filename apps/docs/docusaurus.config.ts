import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

function parseListEnv(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function readTrimmedEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value.length === 0) {
    return undefined;
  }

  return value;
}

const cmsAllowedGroups = parseListEnv(process.env.DOCS_CMS_ALLOWED_GROUPS, [
  'authentik Admins',
  'Alternun Dashboard Admins',
  'Alternun Docs Editors',
]);

const cmsGithubOAuthBaseUrl = readTrimmedEnv('DOCS_CMS_GITHUB_OAUTH_BASE_URL') ?? '';
const cmsGithubAuthEndpoint = readTrimmedEnv('DOCS_CMS_GITHUB_AUTH_ENDPOINT') ?? 'decap/auth';
const cmsGithubRepo = readTrimmedEnv('DOCS_CMS_GITHUB_REPO') ?? 'alternun-development/alternun';
const cmsGithubBranch = readTrimmedEnv('DOCS_CMS_GITHUB_BRANCH') ?? 'master';

const config: Config = {
  title: 'Alternun Docs',
  tagline: '#ReDeFine the future with us',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://alternun-development.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'alternun-development', // Usually your GitHub org/user name.
  projectName: 'alternun', // Usually your repo name.
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'th'],
    localeConfigs: {
      en: {
        htmlLang: 'en-GB',
      },
      // You can omit a locale (e.g. fr) if you don't need to override the defaults
      fa: {
        direction: 'rtl',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/alternun-development/alternun/tree/master/apps/docs',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/alternun-development/alternun/tree/master/apps/docs',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  customFields: {
    cms: {
      auth: {
        issuer:
          readTrimmedEnv('DOCS_CMS_AUTH_ISSUER') ??
          'https://testnet.sso.alternun.co/application/o/alternun-docs-cms/',
        clientId: readTrimmedEnv('DOCS_CMS_AUTH_CLIENT_ID') ?? 'alternun-docs-cms',
        audience: readTrimmedEnv('DOCS_CMS_AUTH_AUDIENCE') ?? 'alternun-app',
        allowedGroups: cmsAllowedGroups,
      },
      backend: {
        mode: cmsGithubOAuthBaseUrl ? 'github' : 'test-repo',
        repo: cmsGithubRepo,
        branch: cmsGithubBranch,
        baseUrl: cmsGithubOAuthBaseUrl,
        authEndpoint: cmsGithubAuthEndpoint,
      },
      media: {
        folder: 'apps/docs/static/img/uploads',
        publicFolder: '/img/uploads',
      },
    },
  },

  themeConfig: {
    // Replace with your project's social card
    image: 'img/alternun-socials.png',
    favicon: 'img/favicon.ico',
    mermaid: {
      theme: { light: 'neutral', dark: 'forest' },
    },
    navbar: {
      title: '',
      logo: {
        alt: 'Alternun Logo',
        src: 'img/alternun-white.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        { to: '/blog', label: 'Blog', position: 'left' },

        {
          href: 'https://github.com/alternun-development',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://linktr.ee/Alternun',
          label: 'Linktree',
          position: 'right',
        },
        {
          href: 'https://alternun.io',
          label: 'Website',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

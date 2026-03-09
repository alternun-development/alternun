/* eslint-disable comma-dangle */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExpoSite, resolveDomain } from '@lsts_tech/infra';

export interface AdminSiteLocalConfig {
  enabled?: boolean;
  appPath?: string;
  buildOutput?: string;
  buildCommand?: string;
  enableCustomDomain?: boolean;
  domains?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  certArns?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  apiUrls?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  authIssuers?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  authClientId?: string;
  authAudience?: string;
  environment?: Record<string, string>;
}

export interface AdminSiteSettings {
  enabled: boolean;
  appPath: string;
  buildOutput: string;
  buildCommand: string;
  enableCustomDomain: boolean;
  stageDomains: {
    production: string;
    dev: string;
    mobile: string;
  };
  certArns: {
    production: string;
    dev: string;
    mobile: string;
  };
  apiUrls: {
    production: string;
    dev: string;
    mobile: string;
  };
  auth: {
    clientId: string;
    audience: string;
    stageIssuers: {
      production: string;
      dev: string;
      mobile: string;
    };
  };
  environment: Record<string, string>;
}

export interface AdminSiteInfrastructureArgs {
  rootDomain: string;
  stage: string;
  settings: AdminSiteSettings;
}

export interface AdminSiteInfrastructureResources {
  domainName: string | null;
  site: unknown;
  siteUrl: unknown;
}

interface BuildAdminSiteSettingsArgs {
  rootDomain: string;
  env: NodeJS.ProcessEnv;
  localConfig?: AdminSiteLocalConfig;
}

const dirname = path.dirname(fileURLToPath(import.meta.url));

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
}

function resolveStageKey(stage: string): keyof AdminSiteSettings['stageDomains'] {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');

  if (
    normalized === 'production' ||
    normalized === 'prod' ||
    normalized === 'admin-prod' ||
    normalized === 'admin-production'
  ) {
    return 'production';
  }

  if (normalized === 'mobile' || normalized === 'preview' || normalized === 'admin-mobile') {
    return 'mobile';
  }

  return 'dev';
}

function resolveAdminSiteAppPath(appPath: string): string {
  const candidatePaths = [
    appPath,
    path.resolve(dirname, appPath),
    path.resolve(dirname, '..', appPath),
    path.resolve(dirname, '../..', appPath),
    path.resolve(process.cwd(), appPath),
    path.resolve(process.cwd(), '..', appPath),
  ];

  for (const candidatePath of candidatePaths) {
    const resolvedPath = path.isAbsolute(candidatePath)
      ? candidatePath
      : path.resolve(candidatePath);

    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return path.resolve(dirname, appPath);
}

function buildDefaultStageDomains(rootDomain: string): AdminSiteSettings['stageDomains'] {
  return {
    production: `admin.${rootDomain}`,
    dev: `testnet.admin.${rootDomain}`,
    mobile: `preview.admin.${rootDomain}`,
  };
}

function buildDefaultApiUrls(rootDomain: string): AdminSiteSettings['apiUrls'] {
  return {
    production: `https://api.${rootDomain}`,
    dev: `https://testnet.api.${rootDomain}`,
    mobile: `https://preview.api.${rootDomain}`,
  };
}

function buildDefaultAuthIssuers(
  rootDomain: string
): AdminSiteSettings['auth']['stageIssuers'] {
  return {
    production: `https://auth.${rootDomain}`,
    dev: `https://testnet.auth.${rootDomain}`,
    mobile: `https://preview.auth.${rootDomain}`,
  };
}

export function buildAdminSiteSettings(args: BuildAdminSiteSettingsArgs): AdminSiteSettings {
  const defaultDomains = buildDefaultStageDomains(args.rootDomain);
  const defaultApiUrls = buildDefaultApiUrls(args.rootDomain);
  const defaultAuthIssuers = buildDefaultAuthIssuers(args.rootDomain);
  const localConfig = args.localConfig;

  return {
    enabled: parseBoolean(
      args.env.INFRA_ENABLE_ADMIN_SITE ??
        (localConfig?.enabled !== undefined ? String(localConfig.enabled) : undefined),
      false
    ),
    appPath: args.env.INFRA_ADMIN_APP_PATH ?? localConfig?.appPath ?? '../../apps/admin',
    buildOutput: args.env.INFRA_ADMIN_BUILD_OUTPUT ?? localConfig?.buildOutput ?? 'dist',
    buildCommand:
      args.env.INFRA_ADMIN_BUILD_COMMAND ??
      localConfig?.buildCommand ??
      'pnpm --filter @alternun/admin run build',
    enableCustomDomain: parseBoolean(
      args.env.INFRA_ADMIN_ENABLE_CUSTOM_DOMAIN ??
        (localConfig?.enableCustomDomain !== undefined
          ? String(localConfig.enableCustomDomain)
          : undefined),
      true
    ),
    stageDomains: {
      production:
        args.env.INFRA_ADMIN_DOMAIN_PRODUCTION ??
        localConfig?.domains?.production ??
        defaultDomains.production,
      dev:
        args.env.INFRA_ADMIN_DOMAIN_DEV ?? localConfig?.domains?.dev ?? defaultDomains.dev,
      mobile:
        args.env.INFRA_ADMIN_DOMAIN_MOBILE ??
        localConfig?.domains?.mobile ??
        defaultDomains.mobile,
    },
    certArns: {
      production:
        args.env.INFRA_ADMIN_CERT_ARN_PRODUCTION ?? localConfig?.certArns?.production ?? '',
      dev: args.env.INFRA_ADMIN_CERT_ARN_DEV ?? localConfig?.certArns?.dev ?? '',
      mobile: args.env.INFRA_ADMIN_CERT_ARN_MOBILE ?? localConfig?.certArns?.mobile ?? '',
    },
    apiUrls: {
      production:
        args.env.INFRA_ADMIN_API_URL_PRODUCTION ??
        localConfig?.apiUrls?.production ??
        defaultApiUrls.production,
      dev:
        args.env.INFRA_ADMIN_API_URL_DEV ?? localConfig?.apiUrls?.dev ?? defaultApiUrls.dev,
      mobile:
        args.env.INFRA_ADMIN_API_URL_MOBILE ??
        localConfig?.apiUrls?.mobile ??
        defaultApiUrls.mobile,
    },
    auth: {
      clientId:
        args.env.INFRA_ADMIN_AUTH_CLIENT_ID ?? localConfig?.authClientId ?? 'alternun-admin',
      audience:
        args.env.INFRA_ADMIN_AUTH_AUDIENCE ?? localConfig?.authAudience ?? 'alternun-app',
      stageIssuers: {
        production:
          args.env.INFRA_ADMIN_AUTH_ISSUER_PRODUCTION ??
          localConfig?.authIssuers?.production ??
          defaultAuthIssuers.production,
        dev:
          args.env.INFRA_ADMIN_AUTH_ISSUER_DEV ??
          localConfig?.authIssuers?.dev ??
          defaultAuthIssuers.dev,
        mobile:
          args.env.INFRA_ADMIN_AUTH_ISSUER_MOBILE ??
          localConfig?.authIssuers?.mobile ??
          defaultAuthIssuers.mobile,
      },
    },
    environment: {
      ...(localConfig?.environment ?? {}),
    },
  };
}

export function resolveAdminStageDomain(settings: AdminSiteSettings, stage: string): string {
  return settings.stageDomains[resolveStageKey(stage)];
}

export function deployAdminSiteInfrastructure(
  args: AdminSiteInfrastructureArgs
): AdminSiteInfrastructureResources {
  const deploymentStage = resolveStageKey(args.stage);
  const appPath = resolveAdminSiteAppPath(args.settings.appPath);
  const siteDomain = resolveAdminStageDomain(args.settings, args.stage);
  const resolvedDomain = args.settings.enableCustomDomain
    ? resolveDomain({
      rootDomain: args.rootDomain,
      stage: deploymentStage,
      stageMap: args.settings.stageDomains,
    })
    : undefined;

  const site = createExpoSite({
    appPath,
    id: `admin-site-${args.stage}`,
    build: {
      command: args.settings.buildCommand,
      output: args.settings.buildOutput,
    },
    certificateArn: args.settings.enableCustomDomain
      ? args.settings.certArns[deploymentStage] || undefined
      : undefined,
    domain: args.settings.enableCustomDomain ? siteDomain : undefined,
    environment: {
      VITE_API_URL: args.settings.apiUrls[deploymentStage],
      VITE_AUTH_ISSUER: args.settings.auth.stageIssuers[deploymentStage],
      VITE_AUTH_CLIENT_ID: args.settings.auth.clientId,
      VITE_AUTH_AUDIENCE: args.settings.auth.audience,
      VITE_APP_ENV: deploymentStage,
      ...args.settings.environment,
    },
    errorPage: 'index.html',
    invalidation: {
      paths: ['/*'],
      wait: deploymentStage === 'production',
    },
  });

  return {
    domainName: resolvedDomain?.domainName ?? null,
    site: site.site,
    siteUrl: site.url,
  };
}

import type { PipelineStage } from './pipelines/index.js';

export type StageDomainMap = Record<PipelineStage, string>;

export const INFRA_CORE_DEFAULTS = {
  appName: 'alternun-infra',
  rootDomain: 'alternun.co',
} as const;

export const PIPELINE_INFRA_DEFAULTS = {
  repo: 'alternun-development/alternun',
  prefix: 'alternun',
  standardPipelineSet: 'production,dev,identity-dev,identity-prod,dashboard-dev,dashboard-prod',
  allPipelineSet: 'production,dev,identity-dev,identity-prod,dashboard-dev,dashboard-prod',
  identityPipelineSet: 'production,dev,identity-dev,identity-prod,dashboard-dev,dashboard-prod',
  branches: {
    production: 'master',
    dev: 'develop',
    mobile: 'mobile',
    identity: 'develop',
    identityDev: 'develop',
    identityProd: 'master',
    api: 'develop',
    apiDev: 'develop',
    apiProd: 'master',
    admin: 'develop',
    adminDev: 'develop',
    adminProd: 'master',
    dashboard: 'develop',
    dashboardDev: 'develop',
    dashboardProd: 'master',
  },
} as const;

export const EXPO_INFRA_DEFAULTS = {
  appPath: '../../apps/mobile',
  subdomain: 'airs',
  buildCommand: 'npx expo export -p web',
  buildOutput: 'dist',
  enableCustomDomain: true,
  requirePublicAuthEnv: true,
} as const;

export const REDIRECT_INFRA_DEFAULTS = {
  enableAirsToDev: true,
  legacyDevSubdomain: 'dev',
  enableDevToTestnet: true,
  enableRootDomainRedirect: true,
  rootDomainTarget: 'alternun.io',
} as const;

export const BACKEND_API_INFRA_DEFAULTS = {
  appPath: '../../apps/api',
  buildOutput: 'dist-lambda',
  buildCommand: 'pnpm --filter @alternun/api run build',
  enableCustomDomain: true,
  lambda: {
    architecture: 'arm64',
    logRetentionDays: 14,
    memorySize: 1024,
    timeoutSeconds: 30,
  },
  auth: {
    audience: 'alternun-app',
  },
} as const;

export const ADMIN_SITE_INFRA_DEFAULTS = {
  appPath: '../../apps/admin',
  buildOutput: 'dist',
  buildCommand: 'pnpm --filter @alternun/admin run build',
  enableCustomDomain: true,
  auth: {
    applicationSlug: 'alternun-admin',
    clientId: 'alternun-admin',
    audience: 'alternun-app',
    allowedEmailDomain: 'alternun.io',
  },
} as const;

export const IDENTITY_INFRA_DEFAULTS = {
  emailProvider: 'ses',
  authentikImageTag: '2026.2',
  ec2: {
    instanceType: 't3.small',
    volumeSizeGiB: 20,
  },
  rds: {
    engineVersion: '16',
    instanceType: 'db.t4g.micro',
    storageGiB: 20,
    multiAz: false,
    publicAccess: false,
    backupRetentionDays: 7,
    performanceInsights: false,
    enhancedMonitoring: false,
  },
  jwt: {
    audience: 'alternun-app',
    roleClaim: 'role',
    rolesClaim: 'alternun_roles',
    accessTokenTtlMinutes: 15,
  },
  ingress: {
    modes: {
      production: 'alb',
      dev: 'instance',
      mobile: 'instance',
    },
    alb: {
      certificateArn: '',
      healthCheckMatcher: '200-399',
      healthCheckPath: '/',
      idleTimeoutSeconds: 60,
    },
  },
  tls: {
    modes: {
      production: 'alb-acm',
      dev: 'acme-route53-dns-01',
      mobile: 'acme-route53-dns-01',
    },
    acmeEmailLocalPart: 'identity-admin',
    route53HostedZoneId: '',
    acmeBackup: {
      enabled: true,
      prefix: 'state',
    },
  },
  integration: {
    google: {
      sourceName: 'Google',
      sourceSlug: 'google',
    },
    supabase: {
      applicationName: 'Alternun Supabase',
      applicationSlug: 'alternun-supabase',
      providerName: 'Alternun Supabase OIDC',
      syncConfig: true,
    },
    adminOidc: {
      applicationName: 'Alternun Admin',
      applicationSlug: 'alternun-admin',
      providerName: 'Alternun Admin OIDC',
      clientId: 'alternun-admin',
      allowedEmailDomain: ADMIN_SITE_INFRA_DEFAULTS.auth.allowedEmailDomain,
    },
    docsCmsOidc: {
      applicationName: 'Alternun Docs CMS',
      applicationSlug: 'alternun-docs-cms',
      providerName: 'Alternun Docs CMS OIDC',
      clientId: 'alternun-docs-cms',
      siteUrl: 'https://docs.alternun.io',
      localDevUrl: 'http://localhost:3000',
      allowedGroups: [
        'authentik Admins',
        'Alternun Dashboard Admins',
        'Alternun Docs Editors',
      ],
    },
    bootstrap: {
      admin: {
        username: 'akadmin',
        email: 'admin@alternun.co',
        name: 'authentik Default Admin',
        group: 'authentik Admins',
      },
      defaultApplication: {
        enabled: true,
        name: 'Alternun Internal',
        slug: 'alternun-internal',
        group: 'Alternun',
        openInNewTab: false,
        publisher: 'Alternun',
        description: 'Alternun internal access',
        policyEngineMode: 'any',
      },
    },
  },
} as const;

export function buildStageDomains(subdomain: string, rootDomain: string): StageDomainMap {
  return {
    production: `${subdomain}.${rootDomain}`,
    dev: `testnet.${subdomain}.${rootDomain}`,
    mobile: `preview.${subdomain}.${rootDomain}`,
  };
}

export function buildStageUrls(subdomain: string, rootDomain: string): StageDomainMap {
  const domains = buildStageDomains(subdomain, rootDomain);

  return {
    production: `https://${domains.production}`,
    dev: `https://${domains.dev}`,
    mobile: `https://${domains.mobile}`,
  };
}

export function buildIdentitySecretNameDefaults(appName: string): {
  authentikSecretKeyName: string;
  databaseCredentialsSecretName: string;
  smtpCredentialsSecretName: string;
  jwtSigningKeySecretName: string;
  integrationConfigSecretName: string;
} {
  return {
    authentikSecretKeyName: `${appName}/identity/authentik-secret-key`,
    databaseCredentialsSecretName: `${appName}/identity/database-credentials`,
    smtpCredentialsSecretName: `${appName}/identity/smtp-credentials`,
    jwtSigningKeySecretName: `${appName}/identity/jwt-signing-key`,
    integrationConfigSecretName: `${appName}/identity/integration-config`,
  };
}

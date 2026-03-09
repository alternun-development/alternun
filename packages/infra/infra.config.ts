/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable comma-dangle */
/* eslint-disable indent */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-object-injection */
// / <reference path="./sst-env.d.ts" />

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Input } from '@pulumi/pulumi';
import { createExpoSite, createPipeline, resolveDomain } from '@lsts_tech/infra';
import {
  buildAdminSiteSettings,
  deployAdminSiteInfrastructure,
  resolveAdminStageDomain,
  type AdminSiteLocalConfig,
} from './modules/admin-site.js';
import {
  buildBackendApiSettings,
  deployBackendApiInfrastructure,
  resolveBackendApiStageDomain,
  type BackendApiLocalConfig,
} from './modules/backend-api.js';
import {
  buildIdentitySettings,
  resolveIdentityStageDomain,
  type IdentityLocalConfig,
} from './modules/identity.js';
import { deployIdentityInfrastructure } from './modules/identity-resources.js';
import { buildStageDomainConfig, createExternalDomainRedirect } from './modules/redirects.js';

type PipelineStage = 'production' | 'dev' | 'mobile';
type DashboardPipelineStage = 'dashboard-dev' | 'dashboard-prod';
type AdminPipelineStage = 'admin-dev' | 'admin-prod';
type BackendPipelineStage = 'api-dev' | 'api-prod';
type IdentityPipelineStage = 'identity-dev' | 'identity-prod';
type DeploymentStage =
  | PipelineStage
  | IdentityPipelineStage
  | BackendPipelineStage
  | AdminPipelineStage
  | DashboardPipelineStage;
type ManagedPipeline =
  | PipelineStage
  | IdentityPipelineStage
  | BackendPipelineStage
  | AdminPipelineStage
  | DashboardPipelineStage;
type PipelineComputeType =
  | 'BUILD_GENERAL1_SMALL'
  | 'BUILD_GENERAL1_MEDIUM'
  | 'BUILD_GENERAL1_LARGE';

interface PublicAssetFile {
  cacheControl: string;
  contentType: string;
  hash: string;
  key: string;
  source: string;
  url: string;
}

interface LocalDeploymentConfig {
  appName?: string;
  rootDomain?: string;
  pipeline?: {
    repo?: string;
    prefix?: string;
    projectTag?: string;
    codestarConnectionArn?: string;
    pipelines?: string;
    branchProd?: string;
    branchDev?: string;
    branchMobile?: string;
    branchIdentity?: string;
    branchIdentityDev?: string;
    branchIdentityProd?: string;
    branchApi?: string;
    branchApiDev?: string;
    branchApiProd?: string;
    branchAdmin?: string;
    branchAdminDev?: string;
    branchAdminProd?: string;
    branchDashboard?: string;
    branchDashboardDev?: string;
    branchDashboardProd?: string;
    computeType?: PipelineComputeType;
    timeoutMinutes?: number;
  };
  expo?: {
    appPath?: string;
    subdomain?: string;
    enableCustomDomain?: boolean;
    requirePublicAuthEnv?: boolean;
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
    build?: {
      command?: string;
      output?: string;
    };
    publicEnv?: {
      supabaseUrl?: string;
      supabaseKey?: string;
      walletConnectProjectId?: string;
      walletConnectChainId?: string;
      enableMockWalletAuth?: boolean;
      enableWalletOnlyAuth?: boolean;
    };
  };
  backend?: {
    api?: BackendApiLocalConfig;
  };
  admin?: AdminSiteLocalConfig;
  redirects?: {
    enableAirsToDev?: boolean;
    airsToDevSourceDomain?: string;
    enableDevToTestnet?: boolean;
    devToTestnetSourceDomain?: string;
    enableRootDomainRedirect?: boolean;
    rootDomainTarget?: string;
    certArns?: {
      airsToDev?: string;
      rootDomain?: string;
      devToTestnet?: string;
    };
  };
  identity?: IdentityLocalConfig;
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultLocalConfigPath = path.join(dirname, 'config', 'deployment.config.json');

function readLocalDeploymentConfig(configPath: string): LocalDeploymentConfig {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as LocalDeploymentConfig;
    return parsed;
  } catch {
    throw new Error(`Invalid JSON in INFRA_CONFIG_PATH file: ${configPath}`);
  }
}

const localConfigPath = process.env.INFRA_CONFIG_PATH ?? defaultLocalConfigPath;
const localConfig = readLocalDeploymentConfig(localConfigPath);

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
}

function sanitizeBucketName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 63)
    .replace(/-+$/, '');
}

function sanitizeAssetKeySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function createAssetBucketName(stage: string, prefix: string, domain: string): string {
  return sanitizeBucketName(`${prefix}-${stage}-public-assets-${domain.replace(/\./g, '-')}`);
}

function createAssetBaseUrl(bucketName: string): string {
  return `https://${bucketName}.s3.amazonaws.com`;
}

function buildPublicAssetFile(
  appPath: string,
  bucketBaseUrl: string,
  relativePath: string,
  keyPrefix: string
): PublicAssetFile {
  const source = path.resolve(appPath, relativePath);
  const content = fs.readFileSync(source);
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  const extension = path.extname(relativePath).toLowerCase();
  const basename = sanitizeAssetKeySegment(path.basename(relativePath, extension));
  const key = `${keyPrefix}/${basename}.${hash}${extension}`;

  return {
    cacheControl: 'public,max-age=31536000,immutable',
    contentType: extension === '.mp4' ? 'video/mp4' : 'application/octet-stream',
    hash,
    key,
    source,
    url: `${bucketBaseUrl}/${key}`,
  };
}

const rootDomain = process.env.INFRA_ROOT_DOMAIN ?? localConfig.rootDomain ?? 'alternun.co';
const appName = process.env.INFRA_APP_NAME ?? localConfig.appName ?? 'alternun-infra';
const backendApiSettings = buildBackendApiSettings({
  appName,
  rootDomain,
  env: process.env,
  localConfig: localConfig.backend?.api,
});
const adminSiteSettings = buildAdminSiteSettings({
  rootDomain,
  env: process.env,
  localConfig: localConfig.admin,
});
const identitySettings = buildIdentitySettings({
  appName,
  rootDomain,
  env: process.env,
  localConfig: localConfig.identity,
});
const pipelineRepo =
  process.env.INFRA_PIPELINE_REPO ?? localConfig.pipeline?.repo ?? 'alternun-development/alternun';
const pipelinePrefix =
  process.env.INFRA_PIPELINE_PREFIX ?? localConfig.pipeline?.prefix ?? 'alternun';
const pipelineProjectTag =
  process.env.INFRA_PROJECT_TAG ?? localConfig.pipeline?.projectTag ?? pipelinePrefix;
const codestarConnectionArn =
  process.env.INFRA_CODESTAR_CONNECTION_ARN ?? localConfig.pipeline?.codestarConnectionArn;
const selectedPipelinesRaw =
  process.env.INFRA_PIPELINES ??
  localConfig.pipeline?.pipelines ??
  'production,dev,identity-dev,identity-prod,api-dev,api-prod,admin-dev,admin-prod,dashboard-dev,dashboard-prod';
const pipelineComputeTypeDefault = (pipeline: ManagedPipeline): PipelineComputeType =>
  pipeline === 'dev' ? 'BUILD_GENERAL1_LARGE' : 'BUILD_GENERAL1_MEDIUM';
const adminSiteEnabledStagesRaw = process.env.INFRA_ADMIN_ENABLED_STAGES ?? '';
const backendApiEnabledStagesRaw = process.env.INFRA_BACKEND_API_ENABLED_STAGES ?? '';
const identityEnabledStagesRaw = process.env.INFRA_IDENTITY_ENABLED_STAGES ?? '';
const parseTimeoutMinutes = (value: string | number | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const expoAppPath =
  process.env.INFRA_EXPO_APP_PATH ?? localConfig.expo?.appPath ?? '../../apps/mobile';
const resolvedExpoAppPath = (() => {
  const candidatePaths = [
    expoAppPath,
    path.resolve(dirname, expoAppPath),
    path.resolve(dirname, '..', expoAppPath),
    path.resolve(dirname, '../..', expoAppPath),
    path.resolve(process.cwd(), expoAppPath),
    path.resolve(process.cwd(), '..', expoAppPath),
  ];

  for (const candidatePath of candidatePaths) {
    const resolvedPath = path.isAbsolute(candidatePath)
      ? candidatePath
      : path.resolve(candidatePath);

    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return path.resolve(dirname, expoAppPath);
})();
const expoSubdomain = process.env.INFRA_EXPO_SUBDOMAIN ?? localConfig.expo?.subdomain ?? 'airs';
const legacyDevDomain = `dev.${expoSubdomain}.${rootDomain}`;

const defaultExpoDomains = {
  production: `${expoSubdomain}.${rootDomain}`,
  dev: `testnet.${expoSubdomain}.${rootDomain}`,
  mobile: `preview.${expoSubdomain}.${rootDomain}`,
};

const expoStageMap: Record<string, string> = {
  production:
    process.env.INFRA_EXPO_DOMAIN_PRODUCTION ??
    localConfig.expo?.domains?.production ??
    defaultExpoDomains.production,
  dev:
    process.env.INFRA_EXPO_DOMAIN_DEV ?? localConfig.expo?.domains?.dev ?? defaultExpoDomains.dev,
  mobile:
    process.env.INFRA_EXPO_DOMAIN_MOBILE ??
    localConfig.expo?.domains?.mobile ??
    defaultExpoDomains.mobile,
};

const expoCerts: Record<string, string | undefined> = {
  production: process.env.INFRA_EXPO_CERT_ARN_PRODUCTION ?? localConfig.expo?.certArns?.production,
  dev: process.env.INFRA_EXPO_CERT_ARN_DEV ?? localConfig.expo?.certArns?.dev,
  mobile: process.env.INFRA_EXPO_CERT_ARN_MOBILE ?? localConfig.expo?.certArns?.mobile,
};
const backendApiDedicatedStacksOnly = parseBoolean(
  process.env.INFRA_BACKEND_API_DEDICATED_STACKS_ONLY,
  true
);
const adminSiteDedicatedStacksOnly = parseBoolean(
  process.env.INFRA_ADMIN_DEDICATED_STACKS_ONLY,
  true
);

const expoBuildCommand =
  process.env.INFRA_EXPO_BUILD_COMMAND ??
  localConfig.expo?.build?.command ??
  'npx expo export -p web';
const expoBuildOutput =
  process.env.INFRA_EXPO_BUILD_OUTPUT ?? localConfig.expo?.build?.output ?? 'dist';
const enableCustomDomainRaw =
  process.env.INFRA_EXPO_ENABLE_CUSTOM_DOMAIN ??
  (localConfig.expo?.enableCustomDomain !== undefined
    ? String(localConfig.expo.enableCustomDomain)
    : undefined) ??
  'true';
const enableCustomDomain = parseBoolean(enableCustomDomainRaw, true);
const requireExpoPublicAuthEnv = parseBoolean(
  process.env.INFRA_REQUIRE_EXPO_PUBLIC_AUTH ??
    (localConfig.expo?.requirePublicAuthEnv !== undefined
      ? String(localConfig.expo.requirePublicAuthEnv)
      : undefined),
  true
);

const expoPublicSupabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? localConfig.expo?.publicEnv?.supabaseUrl;
const expoPublicSupabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  localConfig.expo?.publicEnv?.supabaseKey;
const expoPublicWalletConnectProjectId =
  process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  localConfig.expo?.publicEnv?.walletConnectProjectId;
const expoPublicWalletConnectChainId =
  process.env.EXPO_PUBLIC_WALLETCONNECT_CHAIN_ID ??
  localConfig.expo?.publicEnv?.walletConnectChainId;
const expoPublicEnableMockWalletAuth =
  process.env.EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH ??
  (localConfig.expo?.publicEnv?.enableMockWalletAuth !== undefined
    ? String(localConfig.expo.publicEnv.enableMockWalletAuth)
    : undefined);
const expoPublicEnableWalletOnlyAuth =
  process.env.EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH ??
  (localConfig.expo?.publicEnv?.enableWalletOnlyAuth !== undefined
    ? String(localConfig.expo.publicEnv.enableWalletOnlyAuth)
    : undefined);

const enableAirsToDevRedirect = parseBoolean(
  process.env.INFRA_REDIRECT_AIRS_TO_DEV ??
    (localConfig.redirects?.enableAirsToDev !== undefined
      ? String(localConfig.redirects.enableAirsToDev)
      : undefined),
  true
);

const airsToDevSourceDomain =
  process.env.INFRA_REDIRECT_AIRS_TO_DEV_SOURCE ??
  localConfig.redirects?.airsToDevSourceDomain ??
  expoStageMap.production;

const airsToDevCertArn =
  process.env.INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN ?? localConfig.redirects?.certArns?.airsToDev;

const enableDevToTestnetRedirect = parseBoolean(
  process.env.INFRA_REDIRECT_DEV_TO_TESTNET ??
    (localConfig.redirects?.enableDevToTestnet !== undefined
      ? String(localConfig.redirects.enableDevToTestnet)
      : undefined),
  true
);

const devToTestnetSourceDomain =
  process.env.INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE ??
  localConfig.redirects?.devToTestnetSourceDomain ??
  legacyDevDomain;

const devToTestnetCertArn =
  process.env.INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN ??
  localConfig.redirects?.certArns?.devToTestnet;

const enableRootDomainRedirect = parseBoolean(
  process.env.INFRA_REDIRECT_ROOT_DOMAIN ??
    (localConfig.redirects?.enableRootDomainRedirect !== undefined
      ? String(localConfig.redirects.enableRootDomainRedirect)
      : undefined),
  true
);

const rootDomainRedirectTarget =
  process.env.INFRA_REDIRECT_ROOT_TARGET ??
  localConfig.redirects?.rootDomainTarget ??
  'alternun.io';

const rootDomainRedirectCertArn =
  process.env.INFRA_REDIRECT_ROOT_CERT_ARN ?? localConfig.redirects?.certArns?.rootDomain;
const pipelineProfile = (process.env.INFRA_PIPELINE_PROFILE ?? '').trim().toLowerCase();
const isDashboardPipelineProfile = [
  'dashboard',
  'dashboard-dev',
  'dashboard-prod',
  'dashboard-production',
  'dashboard-admin',
  'dashboard-api',
].includes(pipelineProfile);
const isAdminSitePipelineProfile = [
  'admin',
  'admin-dev',
  'admin-prod',
  'admin-production',
  'backoffice',
  'backoffice-admin',
].includes(pipelineProfile);
const isBackendApiPipelineProfile = ['api', 'api-dev', 'api-prod', 'backend', 'backend-api'].includes(
  pipelineProfile
);
const isIdentityPipelineProfile = [
  'identity',
  'identity-dev',
  'identity-prod',
  'auth',
  'auth-dev',
  'auth-prod',
  'authentik',
  'authentik-dev',
  'authentik-prod',
].includes(pipelineProfile);
const enableExpoSite = parseBoolean(
  process.env.INFRA_ENABLE_EXPO_SITE,
  !isIdentityPipelineProfile &&
    !isBackendApiPipelineProfile &&
    !isAdminSitePipelineProfile &&
    !isDashboardPipelineProfile
);
const identityDedicatedStacksOnly = parseBoolean(
  process.env.INFRA_IDENTITY_DEDICATED_STACKS_ONLY,
  true
);

const assetBucketNames: Record<PipelineStage, string> = {
  production: createAssetBucketName('production', pipelinePrefix, rootDomain),
  dev: createAssetBucketName('dev', pipelinePrefix, rootDomain),
  mobile: createAssetBucketName('mobile', pipelinePrefix, rootDomain),
};

const commonBuildEnv = {
  INFRA_APP_NAME: appName,
  INFRA_ROOT_DOMAIN: rootDomain,
  INFRA_PIPELINE_REPO: pipelineRepo,
  INFRA_PIPELINE_PREFIX: pipelinePrefix,
  INFRA_PROJECT_TAG: pipelineProjectTag,
  INFRA_CODESTAR_CONNECTION_ARN: codestarConnectionArn ?? '',
  INFRA_PIPELINE_BRANCH_PROD:
    process.env.INFRA_PIPELINE_BRANCH_PROD ?? localConfig.pipeline?.branchProd ?? 'master',
  INFRA_PIPELINE_BRANCH_DEV:
    process.env.INFRA_PIPELINE_BRANCH_DEV ?? localConfig.pipeline?.branchDev ?? 'develop',
  INFRA_PIPELINE_BRANCH_MOBILE:
    process.env.INFRA_PIPELINE_BRANCH_MOBILE ?? localConfig.pipeline?.branchMobile ?? 'mobile',
  INFRA_PIPELINE_BRANCH_IDENTITY:
    process.env.INFRA_PIPELINE_BRANCH_IDENTITY ??
    localConfig.pipeline?.branchIdentity ??
    localConfig.pipeline?.branchIdentityDev ??
    localConfig.pipeline?.branchDev ??
    'develop',
  INFRA_PIPELINE_BRANCH_IDENTITY_DEV:
    process.env.INFRA_PIPELINE_BRANCH_IDENTITY_DEV ??
    process.env.INFRA_PIPELINE_BRANCH_IDENTITY ??
    localConfig.pipeline?.branchIdentityDev ??
    localConfig.pipeline?.branchIdentity ??
    localConfig.pipeline?.branchDev ??
    'develop',
  INFRA_PIPELINE_BRANCH_IDENTITY_PROD:
    process.env.INFRA_PIPELINE_BRANCH_IDENTITY_PROD ??
    localConfig.pipeline?.branchIdentityProd ??
    localConfig.pipeline?.branchProd ??
    'master',
  INFRA_PIPELINE_BRANCH_API:
    process.env.INFRA_PIPELINE_BRANCH_API ??
    localConfig.pipeline?.branchApi ??
    localConfig.pipeline?.branchApiDev ??
    localConfig.pipeline?.branchDev ??
    'develop',
  INFRA_PIPELINE_BRANCH_API_DEV:
    process.env.INFRA_PIPELINE_BRANCH_API_DEV ??
    process.env.INFRA_PIPELINE_BRANCH_API ??
    localConfig.pipeline?.branchApiDev ??
    localConfig.pipeline?.branchApi ??
    localConfig.pipeline?.branchDev ??
    'develop',
  INFRA_PIPELINE_BRANCH_API_PROD:
    process.env.INFRA_PIPELINE_BRANCH_API_PROD ??
    process.env.INFRA_PIPELINE_BRANCH_API ??
    localConfig.pipeline?.branchApiProd ??
    localConfig.pipeline?.branchProd ??
    'master',
  INFRA_PIPELINE_BRANCH_ADMIN:
    process.env.INFRA_PIPELINE_BRANCH_ADMIN ??
    localConfig.pipeline?.branchAdmin ??
    localConfig.pipeline?.branchAdminDev ??
    localConfig.pipeline?.branchDev ??
    'develop',
  INFRA_PIPELINE_BRANCH_ADMIN_DEV:
    process.env.INFRA_PIPELINE_BRANCH_ADMIN_DEV ??
    process.env.INFRA_PIPELINE_BRANCH_ADMIN ??
    localConfig.pipeline?.branchAdminDev ??
    localConfig.pipeline?.branchAdmin ??
    localConfig.pipeline?.branchDev ??
    'develop',
  INFRA_PIPELINE_BRANCH_ADMIN_PROD:
    process.env.INFRA_PIPELINE_BRANCH_ADMIN_PROD ??
    process.env.INFRA_PIPELINE_BRANCH_ADMIN ??
    localConfig.pipeline?.branchAdminProd ??
    localConfig.pipeline?.branchProd ??
    'master',
  INFRA_PIPELINE_BRANCH_DASHBOARD:
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD ??
    localConfig.pipeline?.branchDashboard ??
    localConfig.pipeline?.branchDashboardDev ??
    localConfig.pipeline?.branchDev ??
    'develop',
  INFRA_PIPELINE_BRANCH_DASHBOARD_DEV:
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD_DEV ??
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD ??
    localConfig.pipeline?.branchDashboardDev ??
    localConfig.pipeline?.branchDashboard ??
    localConfig.pipeline?.branchDev ??
    'develop',
  INFRA_PIPELINE_BRANCH_DASHBOARD_PROD:
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD_PROD ??
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD ??
    localConfig.pipeline?.branchDashboardProd ??
    localConfig.pipeline?.branchProd ??
    'master',
  INFRA_EXPO_APP_PATH: expoAppPath,
  INFRA_EXPO_SUBDOMAIN: expoSubdomain,
  INFRA_EXPO_DOMAIN_PRODUCTION: expoStageMap.production,
  INFRA_EXPO_DOMAIN_DEV: expoStageMap.dev,
  INFRA_EXPO_DOMAIN_MOBILE: expoStageMap.mobile,
  INFRA_EXPO_CERT_ARN_PRODUCTION: expoCerts.production ?? '',
  INFRA_EXPO_CERT_ARN_DEV: expoCerts.dev ?? '',
  INFRA_EXPO_CERT_ARN_MOBILE: expoCerts.mobile ?? '',
  INFRA_EXPO_BUILD_COMMAND: expoBuildCommand,
  INFRA_EXPO_BUILD_OUTPUT: expoBuildOutput,
  INFRA_ENABLE_EXPO_SITE: String(enableExpoSite),
  INFRA_REQUIRE_EXPO_PUBLIC_AUTH: String(requireExpoPublicAuthEnv),
  INFRA_ENABLE_ADMIN_SITE: String(adminSiteSettings.enabled),
  INFRA_ADMIN_DEDICATED_STACKS_ONLY: String(adminSiteDedicatedStacksOnly),
  INFRA_ADMIN_ENABLED_STAGES: adminSiteEnabledStagesRaw,
  INFRA_ADMIN_APP_PATH: adminSiteSettings.appPath,
  INFRA_ADMIN_BUILD_OUTPUT: adminSiteSettings.buildOutput,
  INFRA_ADMIN_BUILD_COMMAND: adminSiteSettings.buildCommand,
  INFRA_ADMIN_ENABLE_CUSTOM_DOMAIN: String(adminSiteSettings.enableCustomDomain),
  INFRA_ADMIN_DOMAIN_PRODUCTION: adminSiteSettings.stageDomains.production,
  INFRA_ADMIN_DOMAIN_DEV: adminSiteSettings.stageDomains.dev,
  INFRA_ADMIN_DOMAIN_MOBILE: adminSiteSettings.stageDomains.mobile,
  INFRA_ADMIN_CERT_ARN_PRODUCTION: adminSiteSettings.certArns.production,
  INFRA_ADMIN_CERT_ARN_DEV: adminSiteSettings.certArns.dev,
  INFRA_ADMIN_CERT_ARN_MOBILE: adminSiteSettings.certArns.mobile,
  INFRA_ADMIN_API_URL_PRODUCTION: adminSiteSettings.apiUrls.production,
  INFRA_ADMIN_API_URL_DEV: adminSiteSettings.apiUrls.dev,
  INFRA_ADMIN_API_URL_MOBILE: adminSiteSettings.apiUrls.mobile,
  INFRA_ADMIN_AUTH_ISSUER_PRODUCTION: adminSiteSettings.auth.stageIssuers.production,
  INFRA_ADMIN_AUTH_ISSUER_DEV: adminSiteSettings.auth.stageIssuers.dev,
  INFRA_ADMIN_AUTH_ISSUER_MOBILE: adminSiteSettings.auth.stageIssuers.mobile,
  INFRA_ADMIN_AUTH_CLIENT_ID: adminSiteSettings.auth.clientId,
  INFRA_ADMIN_AUTH_AUDIENCE: adminSiteSettings.auth.audience,
  INFRA_ENABLE_BACKEND_API: String(backendApiSettings.enabled),
  INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: String(backendApiDedicatedStacksOnly),
  INFRA_BACKEND_API_ENABLED_STAGES: backendApiEnabledStagesRaw,
  INFRA_BACKEND_API_APP_PATH: backendApiSettings.appPath,
  INFRA_BACKEND_API_BUILD_OUTPUT: backendApiSettings.buildOutput,
  INFRA_BACKEND_API_BUILD_COMMAND: backendApiSettings.buildCommand,
  INFRA_BACKEND_API_ENABLE_CUSTOM_DOMAIN: String(backendApiSettings.enableCustomDomain),
  INFRA_BACKEND_API_DOMAIN_PRODUCTION: backendApiSettings.stageDomains.production,
  INFRA_BACKEND_API_DOMAIN_DEV: backendApiSettings.stageDomains.dev,
  INFRA_BACKEND_API_DOMAIN_MOBILE: backendApiSettings.stageDomains.mobile,
  INFRA_BACKEND_API_CERT_ARN_PRODUCTION: backendApiSettings.certArns.production,
  INFRA_BACKEND_API_CERT_ARN_DEV: backendApiSettings.certArns.dev,
  INFRA_BACKEND_API_CERT_ARN_MOBILE: backendApiSettings.certArns.mobile,
  INFRA_BACKEND_API_MEMORY_SIZE: String(backendApiSettings.lambda.memorySize),
  INFRA_BACKEND_API_TIMEOUT_SECONDS: String(backendApiSettings.lambda.timeoutSeconds),
  INFRA_BACKEND_API_ARCHITECTURE: backendApiSettings.lambda.architecture,
  INFRA_BACKEND_API_LOG_RETENTION_DAYS: String(backendApiSettings.lambda.logRetentionDays),
  INFRA_BACKEND_API_AUTHENTIK_AUDIENCE: backendApiSettings.auth.audience,
  INFRA_BACKEND_API_AUTHENTIK_ISSUER: backendApiSettings.auth.issuer,
  INFRA_BACKEND_API_AUTHENTIK_JWKS_URL: backendApiSettings.auth.jwksUrl,
  INFRA_BACKEND_API_DATABASE_URL: process.env.INFRA_BACKEND_API_DATABASE_URL ?? '',
  INFRA_IDENTITY_ENABLED: process.env.INFRA_IDENTITY_ENABLED ?? '',
  INFRA_IDENTITY_DEDICATED_STACKS_ONLY: String(identityDedicatedStacksOnly),
  INFRA_IDENTITY_ENABLED_STAGES: identityEnabledStagesRaw,
  EXPO_PUBLIC_SUPABASE_URL: expoPublicSupabaseUrl ?? '',
  EXPO_PUBLIC_SUPABASE_KEY: expoPublicSupabaseKey ?? '',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: expoPublicSupabaseKey ?? '',
  EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID: expoPublicWalletConnectProjectId ?? '',
  EXPO_PUBLIC_WALLETCONNECT_CHAIN_ID: expoPublicWalletConnectChainId ?? '',
  EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH: expoPublicEnableMockWalletAuth ?? '',
  EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH: expoPublicEnableWalletOnlyAuth ?? '',
  INFRA_REDIRECT_AIRS_TO_DEV_SOURCE: airsToDevSourceDomain,
  INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN: airsToDevCertArn ?? '',
  INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE: devToTestnetSourceDomain,
  INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN: devToTestnetCertArn ?? '',
  INFRA_REDIRECT_ROOT_TARGET: rootDomainRedirectTarget,
  INFRA_REDIRECT_ROOT_CERT_ARN: rootDomainRedirectCertArn ?? '',
  DOMAIN_ROOT: rootDomain,
  DOMAIN_PRODUCTION: expoStageMap.production,
  DOMAIN_DEV: expoStageMap.dev,
  DOMAIN_MOBILE: expoStageMap.mobile,
  PROJECT_PREFIX: pipelinePrefix,
  PREFIX: pipelinePrefix,
};

function parseCoreDeploymentStage(value: string): PipelineStage | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'production' || normalized === 'prod') return 'production';
  if (normalized === 'dev') return 'dev';
  if (normalized === 'mobile') return 'mobile';
  return undefined;
}

function resolveStackDeploymentStage(value: string): PipelineStage | undefined {
  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  const coreStage = parseCoreDeploymentStage(normalized);
  if (coreStage) return coreStage;

  if (
    normalized === 'dashboard-dev' ||
    normalized === 'dashboardapi-dev' ||
    normalized === 'dashboard-admin-dev'
  ) {
    return 'dev';
  }

  if (
    normalized === 'dashboard-prod' ||
    normalized === 'dashboard-production' ||
    normalized === 'dashboardapi-prod' ||
    normalized === 'dashboard-admin-prod'
  ) {
    return 'production';
  }

  if (
    normalized === 'admin-dev' ||
    normalized === 'backoffice-dev' ||
    normalized === 'backoffice-admin-dev'
  ) {
    return 'dev';
  }

  if (
    normalized === 'admin-prod' ||
    normalized === 'admin-production' ||
    normalized === 'backoffice-prod' ||
    normalized === 'backoffice-admin-prod'
  ) {
    return 'production';
  }

  if (normalized === 'api-dev' || normalized === 'backend-dev' || normalized === 'backend-api-dev') {
    return 'dev';
  }

  if (
    normalized === 'api-prod' ||
    normalized === 'api-production' ||
    normalized === 'backend-prod' ||
    normalized === 'backend-api-prod'
  ) {
    return 'production';
  }

  if (
    normalized === 'identity-dev' ||
    normalized === 'identitydev' ||
    normalized === 'auth-dev' ||
    normalized === 'authentik-dev'
  ) {
    return 'dev';
  }

  if (
    normalized === 'identity-prod' ||
    normalized === 'identityprod' ||
    normalized === 'identity-production' ||
    normalized === 'auth-prod' ||
    normalized === 'authentik-prod'
  ) {
    return 'production';
  }

  return undefined;
}

function isAdminSiteStackStage(stage: string): boolean {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');
  return (
    normalized === 'admin-dev' ||
    normalized === 'admin-prod' ||
    normalized === 'admin-production' ||
    normalized === 'backoffice-dev' ||
    normalized === 'backoffice-prod' ||
    normalized === 'backoffice-admin-dev' ||
    normalized === 'backoffice-admin-prod'
  );
}

function isDashboardStackStage(stage: string): boolean {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');
  return (
    normalized === 'dashboard-dev' ||
    normalized === 'dashboard-prod' ||
    normalized === 'dashboard-production' ||
    normalized === 'dashboardapi-dev' ||
    normalized === 'dashboardapi-prod' ||
    normalized === 'dashboard-admin-dev' ||
    normalized === 'dashboard-admin-prod'
  );
}

function isIdentityStackStage(stage: string): boolean {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');
  return (
    normalized === 'identity-dev' ||
    normalized === 'identity-prod' ||
    normalized === 'identity-production' ||
    normalized === 'auth-dev' ||
    normalized === 'auth-prod' ||
    normalized === 'authentik-dev' ||
    normalized === 'authentik-prod'
  );
}

function isBackendApiStackStage(stage: string): boolean {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');
  return (
    normalized === 'api-dev' ||
    normalized === 'api-prod' ||
    normalized === 'api-production' ||
    normalized === 'backend-dev' ||
    normalized === 'backend-api-dev' ||
    normalized === 'backend-prod' ||
    normalized === 'backend-api-prod'
  );
}

function assertExpoPublicAuthEnvironment(stage: string): void {
  if (!requireExpoPublicAuthEnv) return;
  if (!['production', 'dev', 'mobile'].includes(stage)) return;

  if (!expoPublicSupabaseUrl || !expoPublicSupabaseKey) {
    throw new Error(
      [
        `Missing Expo auth env for stage "${stage}".`,
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY',
        'in packages/infra/.env or pipeline environment variables.',
      ].join(' ')
    );
  }
}

function parsePipelineStage(value: string): ManagedPipeline | undefined {
  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  const deploymentStage = parseCoreDeploymentStage(normalized);
  if (deploymentStage) return deploymentStage;
  if (
    normalized === 'dashboard' ||
    normalized === 'dashboard-dev' ||
    normalized === 'dashboardapi' ||
    normalized === 'dashboardapi-dev' ||
    normalized === 'dashboard-admin' ||
    normalized === 'dashboard-admin-dev'
  ) {
    return 'dashboard-dev';
  }
  if (
    normalized === 'dashboard-prod' ||
    normalized === 'dashboard-production' ||
    normalized === 'dashboardapi-prod' ||
    normalized === 'dashboard-admin-prod'
  ) {
    return 'dashboard-prod';
  }
  if (
    normalized === 'admin' ||
    normalized === 'admin-dev' ||
    normalized === 'backoffice' ||
    normalized === 'backoffice-dev' ||
    normalized === 'backoffice-admin' ||
    normalized === 'backoffice-admin-dev'
  ) {
    return 'admin-dev';
  }
  if (
    normalized === 'admin-prod' ||
    normalized === 'admin-production' ||
    normalized === 'backoffice-prod' ||
    normalized === 'backoffice-admin-prod'
  ) {
    return 'admin-prod';
  }
  if (
    normalized === 'api' ||
    normalized === 'api-dev' ||
    normalized === 'backend' ||
    normalized === 'backend-dev' ||
    normalized === 'backend-api-dev'
  ) {
    return 'api-dev';
  }
  if (
    normalized === 'api-prod' ||
    normalized === 'api-production' ||
    normalized === 'backend-prod' ||
    normalized === 'backend-api-prod'
  ) {
    return 'api-prod';
  }
  if (
    normalized === 'identity' ||
    normalized === 'identity-dev' ||
    normalized === 'identitydev' ||
    normalized === 'authentik' ||
    normalized === 'authentik-dev' ||
    normalized === 'auth' ||
    normalized === 'auth-dev'
  ) {
    return 'identity-dev';
  }
  if (
    normalized === 'identity-prod' ||
    normalized === 'identityprod' ||
    normalized === 'identity-production' ||
    normalized === 'authentik-prod' ||
    normalized === 'auth-prod'
  ) {
    return 'identity-prod';
  }
  return undefined;
}

const adminSiteEnabledStages = new Set<PipelineStage>(
  adminSiteEnabledStagesRaw
    .split(',')
    .map(value => parseCoreDeploymentStage(value))
    .filter((value): value is PipelineStage => value !== undefined)
);

const identityEnabledStages = new Set<PipelineStage>(
  identityEnabledStagesRaw
    .split(',')
    .map(value => parseCoreDeploymentStage(value))
    .filter((value): value is PipelineStage => value !== undefined)
);

const backendApiEnabledStages = new Set<PipelineStage>(
  backendApiEnabledStagesRaw
    .split(',')
    .map(value => parseCoreDeploymentStage(value))
    .filter((value): value is PipelineStage => value !== undefined)
);

const selectedPipelines = new Set<ManagedPipeline>(
  selectedPipelinesRaw
    .split(',')
    .map(value => parsePipelineStage(value))
    .filter((value): value is ManagedPipeline => value !== undefined)
);

const pipelineSpecs: Record<
  ManagedPipeline,
  {
    suffix: string;
    branch: string;
    outputKey: string;
    stage: DeploymentStage;
    buildEnv?: Record<string, string>;
  }
> = {
  production: {
    suffix: 'prod',
    branch: process.env.INFRA_PIPELINE_BRANCH_PROD ?? localConfig.pipeline?.branchProd ?? 'master',
    outputKey: 'productionPipelineName',
    stage: 'production',
    buildEnv: {
      INFRA_ENABLE_EXPO_SITE: 'true',
      INFRA_IDENTITY_ENABLED: 'false',
      INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
    },
  },
  dev: {
    suffix: 'dev',
    branch: process.env.INFRA_PIPELINE_BRANCH_DEV ?? localConfig.pipeline?.branchDev ?? 'develop',
    outputKey: 'devPipelineName',
    stage: 'dev',
    buildEnv: {
      INFRA_ENABLE_EXPO_SITE: 'true',
      INFRA_IDENTITY_ENABLED: 'false',
      INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
    },
  },
  mobile: {
    suffix: 'mobile',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_MOBILE ?? localConfig.pipeline?.branchMobile ?? 'mobile',
    outputKey: 'mobilePipelineName',
    stage: 'mobile',
    buildEnv: {
      INFRA_ENABLE_EXPO_SITE: 'true',
      INFRA_IDENTITY_ENABLED: 'false',
      INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
    },
  },
  'api-dev': {
    suffix: 'api-dev',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_API_DEV ??
      process.env.INFRA_PIPELINE_BRANCH_API ??
      localConfig.pipeline?.branchApiDev ??
      localConfig.pipeline?.branchApi ??
      localConfig.pipeline?.branchDev ??
      'develop',
    outputKey: 'apiDevPipelineName',
    stage: 'api-dev',
    buildEnv: {
      INFRA_ENABLE_BACKEND_API: 'true',
      INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: 'true',
      INFRA_BACKEND_API_ENABLED_STAGES: 'dev',
      INFRA_PIPELINE_PROFILE: 'api-dev',
      INFRA_PIPELINES: 'production,dev,identity-dev,identity-prod,api-dev,api-prod,admin-dev,admin-prod',
      INFRA_PRESERVE_EXISTING_ENV: 'true',
      INFRA_LOAD_ROOT_ENV: 'false',
      INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
      INFRA_ENABLE_EXPO_SITE: 'false',
      INFRA_ENABLE_SECRET_SYNC: 'false',
      INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
      INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
      INFRA_ENABLE_REACHABILITY_CHECK: 'false',
    },
  },
  'api-prod': {
    suffix: 'api-prod',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_API_PROD ??
      process.env.INFRA_PIPELINE_BRANCH_API ??
      localConfig.pipeline?.branchApiProd ??
      localConfig.pipeline?.branchProd ??
      'master',
    outputKey: 'apiProdPipelineName',
    stage: 'api-prod',
    buildEnv: {
      INFRA_ENABLE_BACKEND_API: 'true',
      INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: 'true',
      INFRA_BACKEND_API_ENABLED_STAGES: 'production',
      INFRA_PIPELINE_PROFILE: 'api-prod',
      INFRA_PIPELINES: 'production,dev,identity-dev,identity-prod,api-dev,api-prod,admin-dev,admin-prod',
      INFRA_PRESERVE_EXISTING_ENV: 'true',
      INFRA_LOAD_ROOT_ENV: 'false',
      INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
      INFRA_ENABLE_EXPO_SITE: 'false',
      INFRA_ENABLE_SECRET_SYNC: 'false',
      INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
      INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
      INFRA_ENABLE_REACHABILITY_CHECK: 'false',
    },
  },
  'identity-dev': {
    suffix: 'auth-dev',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_IDENTITY_DEV ??
      process.env.INFRA_PIPELINE_BRANCH_IDENTITY ??
      localConfig.pipeline?.branchIdentityDev ??
      localConfig.pipeline?.branchIdentity ??
      localConfig.pipeline?.branchDev ??
      'develop',
    outputKey: 'identityDevPipelineName',
    stage: 'identity-dev',
    buildEnv: {
      INFRA_IDENTITY_ENABLED: 'true',
      INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
      INFRA_IDENTITY_ENABLED_STAGES: 'dev',
      INFRA_IDENTITY_DATABASE_MODE: 'ec2',
      INFRA_IDENTITY_USERDATA_REPLACE_ON_CHANGE: 'false',
      INFRA_IDENTITY_ENABLE_RESOURCE_PROTECTION: 'true',
      INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT: 'false',
      INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE: 'false',
      INFRA_PIPELINE_PROFILE: 'identity-dev',
      INFRA_PIPELINES: 'production,dev,identity-dev,identity-prod,admin-dev,admin-prod',
      INFRA_PRESERVE_EXISTING_ENV: 'true',
      INFRA_LOAD_ROOT_ENV: 'false',
      INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
      INFRA_ENABLE_EXPO_SITE: 'false',
      INFRA_ENABLE_SECRET_SYNC: 'false',
      INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
      INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
      INFRA_ENABLE_REACHABILITY_CHECK: 'false',
    },
  },
  'identity-prod': {
    suffix: 'auth-prod',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_IDENTITY_PROD ??
      localConfig.pipeline?.branchIdentityProd ??
      localConfig.pipeline?.branchProd ??
      'master',
    outputKey: 'identityProdPipelineName',
    stage: 'identity-prod',
    buildEnv: {
      INFRA_IDENTITY_ENABLED: 'true',
      INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
      INFRA_IDENTITY_ENABLED_STAGES: 'production',
      INFRA_IDENTITY_DATABASE_MODE: 'rds',
      INFRA_IDENTITY_USERDATA_REPLACE_ON_CHANGE: 'false',
      INFRA_IDENTITY_ENABLE_RESOURCE_PROTECTION: 'true',
      INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT: 'false',
      INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE: 'false',
      INFRA_PIPELINE_PROFILE: 'identity-prod',
      INFRA_PIPELINES: 'production,dev,identity-dev,identity-prod,admin-dev,admin-prod',
      INFRA_PRESERVE_EXISTING_ENV: 'true',
      INFRA_LOAD_ROOT_ENV: 'false',
      INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
      INFRA_ENABLE_EXPO_SITE: 'false',
      INFRA_ENABLE_SECRET_SYNC: 'false',
      INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
      INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
      INFRA_ENABLE_REACHABILITY_CHECK: 'false',
    },
  },
  'dashboard-dev': {
    suffix: 'dashboard-dev',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_DASHBOARD_DEV ??
      process.env.INFRA_PIPELINE_BRANCH_DASHBOARD ??
      localConfig.pipeline?.branchDashboardDev ??
      localConfig.pipeline?.branchDashboard ??
      localConfig.pipeline?.branchDev ??
      'develop',
    outputKey: 'dashboardDevPipelineName',
    stage: 'dashboard-dev',
    buildEnv: {
      INFRA_ENABLE_ADMIN_SITE: 'true',
      INFRA_ADMIN_DEDICATED_STACKS_ONLY: 'true',
      INFRA_ADMIN_ENABLED_STAGES: 'dev',
      INFRA_ENABLE_BACKEND_API: 'true',
      INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: 'true',
      INFRA_BACKEND_API_ENABLED_STAGES: 'dev',
      INFRA_PIPELINE_PROFILE: 'dashboard-dev',
      INFRA_PIPELINES:
        'production,dev,identity-dev,identity-prod,api-dev,api-prod,admin-dev,admin-prod,dashboard-dev,dashboard-prod',
      INFRA_PRESERVE_EXISTING_ENV: 'true',
      INFRA_LOAD_ROOT_ENV: 'false',
      INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
      INFRA_ENABLE_EXPO_SITE: 'false',
      INFRA_ENABLE_SECRET_SYNC: 'false',
      INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
      INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
      INFRA_ENABLE_REACHABILITY_CHECK: 'false',
    },
  },
  'dashboard-prod': {
    suffix: 'dashboard-prod',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_DASHBOARD_PROD ??
      process.env.INFRA_PIPELINE_BRANCH_DASHBOARD ??
      localConfig.pipeline?.branchDashboardProd ??
      localConfig.pipeline?.branchProd ??
      'master',
    outputKey: 'dashboardProdPipelineName',
    stage: 'dashboard-prod',
    buildEnv: {
      INFRA_ENABLE_ADMIN_SITE: 'true',
      INFRA_ADMIN_DEDICATED_STACKS_ONLY: 'true',
      INFRA_ADMIN_ENABLED_STAGES: 'production',
      INFRA_ENABLE_BACKEND_API: 'true',
      INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: 'true',
      INFRA_BACKEND_API_ENABLED_STAGES: 'production',
      INFRA_PIPELINE_PROFILE: 'dashboard-prod',
      INFRA_PIPELINES:
        'production,dev,identity-dev,identity-prod,api-dev,api-prod,admin-dev,admin-prod,dashboard-dev,dashboard-prod',
      INFRA_PRESERVE_EXISTING_ENV: 'true',
      INFRA_LOAD_ROOT_ENV: 'false',
      INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
      INFRA_ENABLE_EXPO_SITE: 'false',
      INFRA_ENABLE_SECRET_SYNC: 'false',
      INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
      INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
      INFRA_ENABLE_REACHABILITY_CHECK: 'false',
    },
  },
  'admin-dev': {
    suffix: 'admin-dev',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_ADMIN_DEV ??
      process.env.INFRA_PIPELINE_BRANCH_ADMIN ??
      localConfig.pipeline?.branchAdminDev ??
      localConfig.pipeline?.branchAdmin ??
      localConfig.pipeline?.branchDev ??
      'develop',
    outputKey: 'adminDevPipelineName',
    stage: 'admin-dev',
    buildEnv: {
      INFRA_ENABLE_ADMIN_SITE: 'true',
      INFRA_ADMIN_DEDICATED_STACKS_ONLY: 'true',
      INFRA_ADMIN_ENABLED_STAGES: 'dev',
      INFRA_PIPELINE_PROFILE: 'admin-dev',
      INFRA_PIPELINES: 'production,dev,identity-dev,identity-prod,api-dev,api-prod,admin-dev,admin-prod',
      INFRA_PRESERVE_EXISTING_ENV: 'true',
      INFRA_LOAD_ROOT_ENV: 'false',
      INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
      INFRA_ENABLE_EXPO_SITE: 'false',
      INFRA_ENABLE_SECRET_SYNC: 'false',
      INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
      INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
      INFRA_ENABLE_REACHABILITY_CHECK: 'false',
    },
  },
  'admin-prod': {
    suffix: 'admin-prod',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_ADMIN_PROD ??
      process.env.INFRA_PIPELINE_BRANCH_ADMIN ??
      localConfig.pipeline?.branchAdminProd ??
      localConfig.pipeline?.branchProd ??
      'master',
    outputKey: 'adminProdPipelineName',
    stage: 'admin-prod',
    buildEnv: {
      INFRA_ENABLE_ADMIN_SITE: 'true',
      INFRA_ADMIN_DEDICATED_STACKS_ONLY: 'true',
      INFRA_ADMIN_ENABLED_STAGES: 'production',
      INFRA_PIPELINE_PROFILE: 'admin-prod',
      INFRA_PIPELINES: 'production,dev,identity-dev,identity-prod,api-dev,api-prod,admin-dev,admin-prod',
      INFRA_PRESERVE_EXISTING_ENV: 'true',
      INFRA_LOAD_ROOT_ENV: 'false',
      INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
      INFRA_ENABLE_EXPO_SITE: 'false',
      INFRA_ENABLE_SECRET_SYNC: 'false',
      INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
      INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
      INFRA_ENABLE_REACHABILITY_CHECK: 'false',
    },
  },
};

export function createInfrastructure() {
  const stage = String($app.stage);
  const dashboardStackStage = isDashboardStackStage(stage);
  const adminSiteStackStage = isAdminSiteStackStage(stage);
  const backendApiStackStage = isBackendApiStackStage(stage);
  const identityStackStage = isIdentityStackStage(stage);
  const parsedDeploymentStage = resolveStackDeploymentStage(stage);
  const dedicatedNonExpoStage =
    identityStackStage || backendApiStackStage || adminSiteStackStage || dashboardStackStage;
  const enableExpoSiteForStage = enableExpoSite && !dedicatedNonExpoStage;

  if (!dedicatedNonExpoStage && !enableExpoSite) {
    throw new Error(
      [
        `Refusing to deploy stage "${stage}" with INFRA_ENABLE_EXPO_SITE=false.`,
        'This would remove Expo/web resources from a primary app stack.',
        'Use STACK=identity-dev, STACK=identity-prod, STACK=api-dev, STACK=api-prod, STACK=admin-dev, STACK=admin-prod, STACK=dashboard-dev, or STACK=dashboard-prod for dedicated non-Expo deployments.',
      ].join(' ')
    );
  }

  const isAdminSiteStageAllowed =
    adminSiteEnabledStages.size === 0
      ? true
      : parsedDeploymentStage
      ? adminSiteEnabledStages.has(parsedDeploymentStage)
      : false;
  const isBackendApiStageAllowed =
    backendApiEnabledStages.size === 0
      ? true
      : parsedDeploymentStage
      ? backendApiEnabledStages.has(parsedDeploymentStage)
      : false;
  const isIdentityStageAllowed =
    identityEnabledStages.size === 0
      ? true
      : parsedDeploymentStage
      ? identityEnabledStages.has(parsedDeploymentStage)
      : false;
  const backendApiAllowedOnStack =
    !backendApiDedicatedStacksOnly || backendApiStackStage || dashboardStackStage;
  const backendApiEnabledForStage =
    backendApiSettings.enabled && isBackendApiStageAllowed && backendApiAllowedOnStack;
  const identityAllowedOnStack = !identityDedicatedStacksOnly || identityStackStage;
  const identityEnabledForStage =
    identitySettings.enabled && isIdentityStageAllowed && identityAllowedOnStack;
  const adminSiteAllowedOnStack =
    !adminSiteDedicatedStacksOnly || adminSiteStackStage || dashboardStackStage;
  const adminSiteEnabledForStage =
    adminSiteSettings.enabled && isAdminSiteStageAllowed && adminSiteAllowedOnStack;

  if (adminSiteSettings.enabled && !adminSiteAllowedOnStack) {
    console.log(
      [
        `Admin site is enabled but skipped for stack "${stage}" because INFRA_ADMIN_DEDICATED_STACKS_ONLY=true.`,
        'Use STACK=admin-dev, STACK=admin-prod, STACK=dashboard-dev, or STACK=dashboard-prod to provision admin site resources.',
      ].join(' ')
    );
  }

  if (backendApiSettings.enabled && !backendApiAllowedOnStack) {
    console.log(
      [
        `Backend API is enabled but skipped for stack "${stage}" because INFRA_BACKEND_API_DEDICATED_STACKS_ONLY=true.`,
        'Use STACK=api-dev, STACK=api-prod, STACK=dashboard-dev, or STACK=dashboard-prod to provision backend API resources.',
      ].join(' ')
    );
  }

  if (identitySettings.enabled && !identityAllowedOnStack) {
    console.log(
      [
        `Identity is enabled but skipped for stack "${stage}" because INFRA_IDENTITY_DEDICATED_STACKS_ONLY=true.`,
        'Use STACK=identity-dev or STACK=identity-prod to provision identity resources.',
      ].join(' ')
    );
  }

  if (enableExpoSiteForStage) {
    assertExpoPublicAuthEnvironment(parsedDeploymentStage ?? stage);
  }

  const identityInfrastructure = identityEnabledForStage
    ? deployIdentityInfrastructure({
        appName,
        hostedZoneId: process.env.INFRA_ROUTE53_HOSTED_ZONE_ID,
        rootDomain,
        settings: identitySettings,
        stage,
      })
    : undefined;
  const backendApiInfrastructure = backendApiEnabledForStage
    ? deployBackendApiInfrastructure({
        appName,
        hostedZoneId: process.env.INFRA_ROUTE53_HOSTED_ZONE_ID,
        rootDomain,
        settings: backendApiSettings,
        stage,
      })
    : undefined;
  const adminSiteInfrastructure = adminSiteEnabledForStage
    ? deployAdminSiteInfrastructure({
        rootDomain,
        settings: adminSiteSettings,
        stage,
      })
    : undefined;

  const outputs: Record<string, unknown> = {
    app: appName,
    assets: null,
    assetBucket: null,
    siteUrl: null,
    domain: null,
    customDomainEnabled: false,
    expoSiteEnabled: enableExpoSiteForStage,
    adminSite: {
      enabled: adminSiteEnabledForStage,
      configured: adminSiteSettings.enabled,
      dedicatedStacksOnly: adminSiteDedicatedStacksOnly,
      enabledStages:
        adminSiteEnabledStages.size === 0 ? 'all' : Array.from(adminSiteEnabledStages.values()),
      appPath: adminSiteSettings.appPath,
      buildOutput: adminSiteSettings.buildOutput,
      buildCommand: adminSiteSettings.buildCommand,
      domain: resolveAdminStageDomain(adminSiteSettings, stage),
      stageDomains: adminSiteSettings.stageDomains,
      apiUrls: adminSiteSettings.apiUrls,
      enableCustomDomain: adminSiteSettings.enableCustomDomain,
      certArns: adminSiteSettings.certArns,
      auth: adminSiteSettings.auth,
      deployment: adminSiteInfrastructure
        ? {
            domainName: adminSiteInfrastructure.domainName,
            siteUrl: adminSiteInfrastructure.siteUrl,
          }
        : null,
    },
    backendApi: {
      enabled: backendApiEnabledForStage,
      configured: backendApiSettings.enabled,
      dedicatedStacksOnly: backendApiDedicatedStacksOnly,
      enabledStages:
        backendApiEnabledStages.size === 0 ? 'all' : Array.from(backendApiEnabledStages.values()),
      appPath: backendApiSettings.appPath,
      buildOutput: backendApiSettings.buildOutput,
      buildCommand: backendApiSettings.buildCommand,
      domain: resolveBackendApiStageDomain(backendApiSettings, stage),
      stageDomains: backendApiSettings.stageDomains,
      enableCustomDomain: backendApiSettings.enableCustomDomain,
      certArns: backendApiSettings.certArns,
      lambda: backendApiSettings.lambda,
      auth: backendApiSettings.auth,
      deployment: backendApiInfrastructure
        ? {
            apiId: backendApiInfrastructure.apiId,
            customDomain: backendApiInfrastructure.customDomain,
            functionArn: backendApiInfrastructure.functionArn,
            functionName: backendApiInfrastructure.functionName,
            invokeUrl: backendApiInfrastructure.invokeUrl,
            logGroupName: backendApiInfrastructure.logGroupName,
          }
        : null,
    },
    identity: {
      enabled: identityEnabledForStage,
      configured: identitySettings.enabled,
      dedicatedStacksOnly: identityDedicatedStacksOnly,
      enabledStages:
        identityEnabledStages.size === 0 ? 'all' : Array.from(identityEnabledStages.values()),
      domain: resolveIdentityStageDomain(identitySettings, stage),
      stageDomains: identitySettings.stageDomains,
      database: identitySettings.database,
      ec2: identitySettings.ec2,
      rds: identitySettings.rds,
      emailProvider: identitySettings.emailProvider,
      authentikImageTag: identitySettings.authentikImageTag,
      jwt: identitySettings.jwt,
      secrets: identitySettings.secrets,
      deployment: identityInfrastructure
        ? {
            dnsRecordFqdn: identityInfrastructure.dnsRecordFqdn,
            instance: {
              id: identityInfrastructure.instanceId,
              instanceProfileName: identityInfrastructure.instanceProfileName,
              privateIp: identityInfrastructure.privateIp,
              publicIp: identityInfrastructure.publicIp,
            },
            route53RecordName: identityInfrastructure.route53RecordName,
            securityGroupIds: identityInfrastructure.securityGroupIds,
            secrets: identityInfrastructure.secrets,
            vpc: identityInfrastructure.vpc,
            database: identityInfrastructure.database,
          }
        : null,
    },
    redirects: {
      airsToDevEnabled: false,
      airsToDevSource: null,
      airsToDevTarget: null,
      devToTestnetEnabled: false,
      devToTestnetSource: null,
      devToTestnetTarget: null,
      rootDomainRedirectEnabled: false,
      rootDomainRedirectTarget: null,
    },
  };

  if (enableExpoSiteForStage) {
    const assetBucketName =
      assetBucketNames[stage as PipelineStage] ??
      createAssetBucketName(stage, pipelinePrefix, rootDomain);
    const assetBaseUrl = createAssetBaseUrl(assetBucketName);
    const introVideoAssets = {
      en: buildPublicAssetFile(
        resolvedExpoAppPath,
        assetBaseUrl,
        'assets/videos/AIRS-intro-videoplayback-EN.mp4',
        'landing/videos'
      ),
      es: buildPublicAssetFile(
        resolvedExpoAppPath,
        assetBaseUrl,
        'assets/videos/AIRS-intro-videoplayback-ES.mp4',
        'landing/videos'
      ),
    } satisfies Record<'en' | 'es', PublicAssetFile>;

    // SST's generated aws namespace is intentionally dynamic and not strongly typed here.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const publicAssetBucket = new sst.aws.Bucket(`expo-assets-${stage}`, {
      access: 'public',
      cors: {
        allowHeaders: ['*'],
        allowMethods: ['GET', 'HEAD'],
        allowOrigins: ['*'],
        maxAge: '1 day',
      },
      transform: {
        bucket: (
          bucketArgs: { bucket?: Input<string> },
          _opts: unknown,
          _name: string
        ): undefined => {
          bucketArgs.bucket = assetBucketName;
          return undefined;
        },
      },
      versioning: true,
    });

    const expoDomain = enableCustomDomain
      ? resolveDomain({
          rootDomain,
          stage,
          stageMap: expoStageMap,
        })
      : undefined;

    const expoSite = createExpoSite({
      appPath: expoAppPath,
      id: `expo-web-${stage}`,
      domain:
        enableCustomDomain && expoDomain
          ? buildStageDomainConfig({
              stage,
              stageDomain: expoDomain.domainName,
              productionDomain: expoStageMap.production,
              stageCertificateArn: expoCerts[stage],
              // AIRS -> testnet redirect is managed as an explicit router below.
              enableProductionToStageRedirect: false,
            })
          : undefined,
      certificateArn: enableCustomDomain ? expoCerts[stage] : undefined,
      environment: {
        EXPO_PUBLIC_ENV: stage,
        EXPO_PUBLIC_STAGE: stage,
        EXPO_PUBLIC_ORIGIN: expoDomain ? `https://${expoDomain.domainName}` : undefined,
        EXPO_PUBLIC_SUPABASE_URL: expoPublicSupabaseUrl,
        EXPO_PUBLIC_SUPABASE_KEY: expoPublicSupabaseKey,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: expoPublicSupabaseKey,
        EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID: expoPublicWalletConnectProjectId,
        EXPO_PUBLIC_WALLETCONNECT_CHAIN_ID: expoPublicWalletConnectChainId,
        EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH: expoPublicEnableMockWalletAuth,
        EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH: expoPublicEnableWalletOnlyAuth,
        EXPO_PUBLIC_ASSET_BASE_URL: assetBaseUrl,
        EXPO_PUBLIC_AIRS_VIDEO_EN_URL: introVideoAssets.en.url,
        EXPO_PUBLIC_AIRS_VIDEO_ES_URL: introVideoAssets.es.url,
      },
      build: {
        command: expoBuildCommand,
        output: expoBuildOutput,
      },
      invalidation: {
        paths: ['/*'],
        wait: stage === 'production',
      },
    });

    const shouldCreateRootDomainRedirect =
      stage === 'dev' &&
      enableCustomDomain &&
      enableRootDomainRedirect &&
      rootDomainRedirectTarget !== rootDomain;

    if (shouldCreateRootDomainRedirect) {
      createExternalDomainRedirect({
        id: `root-domain-redirect-${stage}`,
        sourceDomain: rootDomain,
        targetDomain: rootDomainRedirectTarget,
        certificateArn: rootDomainRedirectCertArn,
      });
    }

    const shouldCreateAirsToDevRedirect =
      stage === 'dev' &&
      enableCustomDomain &&
      enableAirsToDevRedirect &&
      airsToDevSourceDomain.toLowerCase() !== expoStageMap.dev.toLowerCase();

    if (shouldCreateAirsToDevRedirect) {
      createExternalDomainRedirect({
        id: `airs-domain-redirect-${stage}`,
        sourceDomain: airsToDevSourceDomain,
        targetDomain: expoStageMap.dev,
        certificateArn: airsToDevCertArn,
      });
    }

    const shouldCreateDevToTestnetRedirect =
      stage === 'dev' &&
      enableCustomDomain &&
      enableDevToTestnetRedirect &&
      devToTestnetSourceDomain.toLowerCase() !== expoStageMap.dev.toLowerCase();

    if (shouldCreateDevToTestnetRedirect) {
      createExternalDomainRedirect({
        id: `dev-domain-redirect-${stage}`,
        sourceDomain: devToTestnetSourceDomain,
        targetDomain: expoStageMap.dev,
        certificateArn: devToTestnetCertArn,
      });
    }

    outputs.assets = {
      airsIntroVideoEn: introVideoAssets.en.url,
      airsIntroVideoEs: introVideoAssets.es.url,
    };
    outputs.assetBucket = {
      baseUrl: assetBaseUrl,
      domain: publicAssetBucket.domain,
      name: publicAssetBucket.name,
    };
    outputs.siteUrl = expoSite.url;
    outputs.domain = expoDomain?.domainName ?? null;
    outputs.customDomainEnabled = enableCustomDomain;
    outputs.redirects = {
      airsToDevEnabled: shouldCreateAirsToDevRedirect,
      airsToDevSource: shouldCreateAirsToDevRedirect ? airsToDevSourceDomain : null,
      airsToDevTarget: shouldCreateAirsToDevRedirect ? expoStageMap.dev : null,
      devToTestnetEnabled: shouldCreateDevToTestnetRedirect,
      devToTestnetSource: shouldCreateDevToTestnetRedirect ? devToTestnetSourceDomain : null,
      devToTestnetTarget: shouldCreateDevToTestnetRedirect ? expoStageMap.dev : null,
      rootDomainRedirectEnabled: shouldCreateRootDomainRedirect,
      rootDomainRedirectTarget: shouldCreateRootDomainRedirect ? rootDomainRedirectTarget : null,
    };
  }

  if (stage === 'production' && selectedPipelines.size > 0) {
    const pipelineOutputs: Record<string, string> = {};

    for (const pipelineStage of [...selectedPipelines] as ManagedPipeline[]) {
      const spec = pipelineSpecs[pipelineStage];
      const pipelineStageKey = pipelineStage.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const pipelineComputeType = (process.env[`INFRA_PIPELINE_COMPUTE_TYPE_${pipelineStageKey}`] ??
        process.env.INFRA_PIPELINE_COMPUTE_TYPE ??
        localConfig.pipeline?.computeType ??
        pipelineComputeTypeDefault(pipelineStage)) as PipelineComputeType;
      const pipelineTimeoutMinutes = parseTimeoutMinutes(
        process.env[`INFRA_PIPELINE_TIMEOUT_MINUTES_${pipelineStageKey}`] ??
          process.env.INFRA_PIPELINE_TIMEOUT_MINUTES ??
          localConfig.pipeline?.timeoutMinutes,
        30
      );
      const pipeline = createPipeline({
        name: `${pipelinePrefix}-${spec.suffix}`,
        repo: pipelineRepo,
        branch: spec.branch,
        stage: spec.stage,
        projectTag: pipelineProjectTag,
        codestarConnectionArn,
        buildEnv: {
          ...commonBuildEnv,
          ...spec.buildEnv,
        },
        computeType: pipelineComputeType,
        timeoutMinutes: pipelineTimeoutMinutes,
      });

      pipelineOutputs[spec.outputKey] = pipeline.pipelineName;
    }

    outputs.pipelines = pipelineOutputs;
  }

  return outputs;
}

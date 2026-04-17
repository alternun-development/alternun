/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable comma-dangle */
/* eslint-disable indent */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-object-injection */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Input } from '@pulumi/pulumi';
import { createExpoSite, createPipeline, resolveDomain } from '@lsts_tech/infra';
import { readLocalDeploymentConfig } from './config/deployment-config.js';
import {
  assertExpoPublicAuthEnvironment,
  createAssetBaseUrl,
  resolveExpoConfig,
} from './config/expo.js';
import { INFRA_CORE_DEFAULTS, PIPELINE_INFRA_DEFAULTS } from './config/infrastructure-specs.js';
import { parseBoolean, parseTimeoutMinutes } from './config/parsing.js';
import {
  ALL_PIPELINE_SET,
  buildPipelineSpecs,
  getPipelineProfileFlags,
  isAdminSiteStackStage,
  isBackendApiStackStage,
  isDashboardStackStage,
  isIdentityStackStage,
  parseEnabledPipelineStages,
  parseSelectedPipelines,
  resolveStackDeploymentStage,
  type ManagedPipeline,
  type PipelineComputeType,
  type PipelineStage,
} from './config/pipelines/index.js';
import {
  buildAdminSiteSettings,
  deployAdminSiteInfrastructure,
  resolveAdminStageDomain,
} from './modules/admin-site.js';
import {
  buildBackendApiSettings,
  deployBackendApiInfrastructure,
  resolveBackendApiStageDomain,
} from './modules/backend-api.js';
import { buildIdentitySettings, resolveIdentityStageDomain } from './modules/identity.js';
import { deployIdentityInfrastructure } from './modules/identity-resources.js';
import { buildStageDomainConfig, createExternalDomainRedirect } from './modules/redirects.js';

interface PublicAssetFile {
  cacheControl: string;
  contentType: string;
  hash: string;
  key: string;
  source: string;
  url: string;
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultLocalConfigPath = path.join(dirname, 'config', 'deployment.config.json');

const localConfigPath = process.env.INFRA_CONFIG_PATH ?? defaultLocalConfigPath;
const localConfig = readLocalDeploymentConfig(localConfigPath);

function sanitizeAssetKeySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
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

function buildApiUrlFromStageDomain(stageDomain: string): string {
  try {
    const url = new URL(`https://${stageDomain}`);
    const hostnameParts = url.hostname.split('.');
    const airsIndex = hostnameParts.indexOf('airs');

    if (airsIndex >= 0) {
      hostnameParts[airsIndex] = 'api';
      return `${url.protocol}//${hostnameParts.join('.')}`;
    }

    return url.origin;
  } catch {
    return `https://${stageDomain}`;
  }
}

const rootDomain =
  process.env.INFRA_ROOT_DOMAIN ?? localConfig.rootDomain ?? INFRA_CORE_DEFAULTS.rootDomain;
const appName = process.env.INFRA_APP_NAME ?? localConfig.appName ?? INFRA_CORE_DEFAULTS.appName;
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
  process.env.INFRA_PIPELINE_REPO ?? localConfig.pipeline?.repo ?? PIPELINE_INFRA_DEFAULTS.repo;
const pipelinePrefix =
  process.env.INFRA_PIPELINE_PREFIX ??
  localConfig.pipeline?.prefix ??
  PIPELINE_INFRA_DEFAULTS.prefix;
const pipelineProjectTag =
  process.env.INFRA_PROJECT_TAG ?? localConfig.pipeline?.projectTag ?? pipelinePrefix;
const codestarConnectionArn =
  process.env.INFRA_CODESTAR_CONNECTION_ARN ?? localConfig.pipeline?.codestarConnectionArn;
const selectedPipelinesRaw =
  process.env.INFRA_PIPELINES ?? localConfig.pipeline?.pipelines ?? ALL_PIPELINE_SET;
const pipelineComputeTypeDefault = (pipeline: ManagedPipeline): PipelineComputeType =>
  pipeline === 'dev' ? 'BUILD_GENERAL1_LARGE' : 'BUILD_GENERAL1_MEDIUM';
const adminSiteEnabledStagesRaw = process.env.INFRA_ADMIN_ENABLED_STAGES ?? '';
const backendApiEnabledStagesRaw = process.env.INFRA_BACKEND_API_ENABLED_STAGES ?? '';
const identityEnabledStagesRaw = process.env.INFRA_IDENTITY_ENABLED_STAGES ?? '';
const backendApiDedicatedStacksOnly = parseBoolean(
  process.env.INFRA_BACKEND_API_DEDICATED_STACKS_ONLY,
  true
);
const adminSiteDedicatedStacksOnly = parseBoolean(
  process.env.INFRA_ADMIN_DEDICATED_STACKS_ONLY,
  true
);
const pipelineProfile = (process.env.INFRA_PIPELINE_PROFILE ?? '').trim().toLowerCase();
const {
  isDashboardPipelineProfile,
  isAdminSitePipelineProfile,
  isBackendApiPipelineProfile,
  isIdentityPipelineProfile,
} = getPipelineProfileFlags(pipelineProfile);
const identityDedicatedStacksOnly = parseBoolean(
  process.env.INFRA_IDENTITY_DEDICATED_STACKS_ONLY,
  true
);
const expoConfig = resolveExpoConfig({
  dirname,
  env: process.env,
  localConfig,
  pipelinePrefix,
  profileFlags: {
    isDashboardPipelineProfile,
    isAdminSitePipelineProfile,
    isBackendApiPipelineProfile,
    isIdentityPipelineProfile,
  },
  rootDomain,
});
const expoAppPath = expoConfig.appPath;
const resolvedExpoAppPath = expoConfig.resolvedAppPath;
const expoSubdomain = expoConfig.subdomain;
const expoStageMap = expoConfig.stageDomains;
const expoCerts = expoConfig.certArns;
const expoBuildCommand = expoConfig.buildCommand;
const expoBuildOutput = expoConfig.buildOutput;
const enableCustomDomain = expoConfig.enableCustomDomain;
const enableExpoSite = expoConfig.enableExpoSite;
const requireExpoPublicAuthEnv = expoConfig.requirePublicAuthEnv;
const expoPublicSupabaseUrl = expoConfig.publicEnv.supabaseUrl;
const expoPublicSupabaseKey = expoConfig.publicEnv.supabaseKey;
const expoPublicWalletConnectProjectId = expoConfig.publicEnv.walletConnectProjectId;
const expoPublicWalletConnectChainId = expoConfig.publicEnv.walletConnectChainId;
const expoPublicEnableMockWalletAuth = expoConfig.publicEnv.enableMockWalletAuth;
const expoPublicEnableWalletOnlyAuth = expoConfig.publicEnv.enableWalletOnlyAuth;
const expoPublicApiUrl = expoConfig.publicEnv.apiUrl;
const expoPublicAuthExecutionProvider = expoConfig.publicEnv.authExecutionProvider;
const expoPublicAuthExchangeUrl = expoConfig.publicEnv.authExchangeUrl;
const expoPublicBetterAuthUrl = expoConfig.publicEnv.betterAuthUrl;
const expoPublicAuthentikIssuer = expoConfig.publicEnv.authentikIssuer;
const expoPublicAuthentikClientId = expoConfig.publicEnv.authentikClientId;
const expoPublicAuthentikRedirectUri = expoConfig.publicEnv.authentikRedirectUri;
const expoPublicAuthentikLoginEntryMode = expoConfig.publicEnv.authentikLoginEntryMode;
const expoPublicAuthentikSocialLoginMode = expoConfig.publicEnv.authentikSocialLoginMode;
const expoPublicAuthentikProviderFlowSlugs = expoConfig.publicEnv.authentikProviderFlowSlugs ?? '';
const expoPublicAuthentikAllowCustomProviderFlowSlugs =
  expoConfig.publicEnv.authentikAllowCustomProviderFlowSlugs ?? '';
const expoPublicReleaseUpdateMode = expoConfig.publicEnv.releaseUpdateMode;
const enableAirsToDevRedirect = expoConfig.redirects.enableAirsToDev;
const airsToDevSourceDomain = expoConfig.redirects.airsToDevSourceDomain;
const airsToDevCertArn = expoConfig.redirects.airsToDevCertArn;
const enableDevToTestnetRedirect = expoConfig.redirects.enableDevToTestnet;
const devToTestnetSourceDomain = expoConfig.redirects.devToTestnetSourceDomain;
const devToTestnetSourceDomains = expoConfig.redirects.devToTestnetSourceDomains;
const devToTestnetCertArn = expoConfig.redirects.devToTestnetCertArn;
const enableRootDomainRedirect = expoConfig.redirects.enableRootDomainRedirect;
const rootDomainRedirectTarget = expoConfig.redirects.rootDomainRedirectTarget;
const rootDomainRedirectCertArn = expoConfig.redirects.rootDomainRedirectCertArn;
const assetBucketNames = expoConfig.assetBucketNames;

const commonBuildEnv = {
  INFRA_APP_NAME: appName,
  INFRA_ROOT_DOMAIN: rootDomain,
  INFRA_PIPELINE_REPO: pipelineRepo,
  INFRA_PIPELINE_PREFIX: pipelinePrefix,
  INFRA_PROJECT_TAG: pipelineProjectTag,
  INFRA_CODESTAR_CONNECTION_ARN: codestarConnectionArn ?? '',
  INFRA_PIPELINE_BRANCH_PROD:
    process.env.INFRA_PIPELINE_BRANCH_PROD ??
    localConfig.pipeline?.branchProd ??
    PIPELINE_INFRA_DEFAULTS.branches.production,
  INFRA_PIPELINE_BRANCH_DEV:
    process.env.INFRA_PIPELINE_BRANCH_DEV ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.dev,
  INFRA_PIPELINE_BRANCH_MOBILE:
    process.env.INFRA_PIPELINE_BRANCH_MOBILE ??
    localConfig.pipeline?.branchMobile ??
    PIPELINE_INFRA_DEFAULTS.branches.mobile,
  INFRA_PIPELINE_BRANCH_IDENTITY:
    process.env.INFRA_PIPELINE_BRANCH_IDENTITY ??
    localConfig.pipeline?.branchIdentity ??
    localConfig.pipeline?.branchIdentityDev ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.identity,
  INFRA_PIPELINE_BRANCH_IDENTITY_DEV:
    process.env.INFRA_PIPELINE_BRANCH_IDENTITY_DEV ??
    process.env.INFRA_PIPELINE_BRANCH_IDENTITY ??
    localConfig.pipeline?.branchIdentityDev ??
    localConfig.pipeline?.branchIdentity ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.identityDev,
  INFRA_PIPELINE_BRANCH_IDENTITY_PROD:
    process.env.INFRA_PIPELINE_BRANCH_IDENTITY_PROD ??
    localConfig.pipeline?.branchIdentityProd ??
    localConfig.pipeline?.branchProd ??
    PIPELINE_INFRA_DEFAULTS.branches.identityProd,
  INFRA_PIPELINE_BRANCH_API:
    process.env.INFRA_PIPELINE_BRANCH_API ??
    localConfig.pipeline?.branchApi ??
    localConfig.pipeline?.branchApiDev ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.api,
  INFRA_PIPELINE_BRANCH_API_DEV:
    process.env.INFRA_PIPELINE_BRANCH_API_DEV ??
    process.env.INFRA_PIPELINE_BRANCH_API ??
    localConfig.pipeline?.branchApiDev ??
    localConfig.pipeline?.branchApi ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.apiDev,
  INFRA_PIPELINE_BRANCH_API_PROD:
    process.env.INFRA_PIPELINE_BRANCH_API_PROD ??
    process.env.INFRA_PIPELINE_BRANCH_API ??
    localConfig.pipeline?.branchApiProd ??
    localConfig.pipeline?.branchProd ??
    PIPELINE_INFRA_DEFAULTS.branches.apiProd,
  INFRA_PIPELINE_BRANCH_ADMIN:
    process.env.INFRA_PIPELINE_BRANCH_ADMIN ??
    localConfig.pipeline?.branchAdmin ??
    localConfig.pipeline?.branchAdminDev ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.admin,
  INFRA_PIPELINE_BRANCH_ADMIN_DEV:
    process.env.INFRA_PIPELINE_BRANCH_ADMIN_DEV ??
    process.env.INFRA_PIPELINE_BRANCH_ADMIN ??
    localConfig.pipeline?.branchAdminDev ??
    localConfig.pipeline?.branchAdmin ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.adminDev,
  INFRA_PIPELINE_BRANCH_ADMIN_PROD:
    process.env.INFRA_PIPELINE_BRANCH_ADMIN_PROD ??
    process.env.INFRA_PIPELINE_BRANCH_ADMIN ??
    localConfig.pipeline?.branchAdminProd ??
    localConfig.pipeline?.branchProd ??
    PIPELINE_INFRA_DEFAULTS.branches.adminProd,
  INFRA_PIPELINE_BRANCH_DASHBOARD:
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD ??
    localConfig.pipeline?.branchDashboard ??
    localConfig.pipeline?.branchDashboardDev ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.dashboard,
  INFRA_PIPELINE_BRANCH_DASHBOARD_DEV:
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD_DEV ??
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD ??
    localConfig.pipeline?.branchDashboardDev ??
    localConfig.pipeline?.branchDashboard ??
    localConfig.pipeline?.branchDev ??
    PIPELINE_INFRA_DEFAULTS.branches.dashboardDev,
  INFRA_PIPELINE_BRANCH_DASHBOARD_PROD:
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD_PROD ??
    process.env.INFRA_PIPELINE_BRANCH_DASHBOARD ??
    localConfig.pipeline?.branchDashboardProd ??
    localConfig.pipeline?.branchProd ??
    PIPELINE_INFRA_DEFAULTS.branches.dashboardProd,
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
  INFRA_BACKEND_API_AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED:
    process.env.INFRA_BACKEND_API_AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED ?? '',
  INFRA_BACKEND_API_AUTHENTIK_JWT_SIGNING_KEY:
    process.env.INFRA_BACKEND_API_AUTHENTIK_JWT_SIGNING_KEY ??
    backendApiSettings.environment.AUTHENTIK_JWT_SIGNING_KEY ??
    '',
  INFRA_BACKEND_API_DATABASE_URL: process.env.INFRA_BACKEND_API_DATABASE_URL ?? '',
  INFRA_BACKEND_API_DECAP_PUBLIC_BASE_URL:
    process.env.INFRA_BACKEND_API_DECAP_PUBLIC_BASE_URL ??
    backendApiSettings.environment.DECAP_PUBLIC_BASE_URL ??
    '',
  INFRA_BACKEND_API_DECAP_ALLOWED_ORIGINS:
    process.env.INFRA_BACKEND_API_DECAP_ALLOWED_ORIGINS ??
    backendApiSettings.environment.DECAP_ALLOWED_ORIGINS ??
    '',
  INFRA_BACKEND_API_DECAP_GITHUB_CLIENT_ID:
    process.env.INFRA_BACKEND_API_DECAP_GITHUB_CLIENT_ID ??
    backendApiSettings.environment.DECAP_GITHUB_OAUTH_CLIENT_ID ??
    '',
  INFRA_BACKEND_API_DECAP_GITHUB_CLIENT_SECRET:
    process.env.INFRA_BACKEND_API_DECAP_GITHUB_CLIENT_SECRET ??
    backendApiSettings.environment.DECAP_GITHUB_OAUTH_CLIENT_SECRET ??
    '',
  INFRA_BACKEND_API_DECAP_GITHUB_OAUTH_REPO_PRIVATE:
    process.env.INFRA_BACKEND_API_DECAP_GITHUB_OAUTH_REPO_PRIVATE ??
    backendApiSettings.environment.DECAP_GITHUB_OAUTH_REPO_PRIVATE ??
    '',
  INFRA_BACKEND_API_DECAP_GITHUB_OAUTH_SCOPE:
    process.env.INFRA_BACKEND_API_DECAP_GITHUB_OAUTH_SCOPE ??
    backendApiSettings.environment.DECAP_GITHUB_OAUTH_SCOPE ??
    '',
  INFRA_BACKEND_API_DECAP_OAUTH_STATE_SECRET:
    process.env.INFRA_BACKEND_API_DECAP_OAUTH_STATE_SECRET ??
    backendApiSettings.environment.DECAP_OAUTH_STATE_SECRET ??
    '',
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
  AUTH_EXECUTION_PROVIDER: expoPublicAuthExecutionProvider ?? '',
  EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: expoPublicAuthExecutionProvider ?? '',
  AUTH_EXCHANGE_URL: expoPublicAuthExchangeUrl ?? '',
  EXPO_PUBLIC_AUTH_EXCHANGE_URL: expoPublicAuthExchangeUrl ?? '',
  AUTH_BETTER_AUTH_URL: expoPublicBetterAuthUrl ?? '',
  EXPO_PUBLIC_BETTER_AUTH_URL: expoPublicBetterAuthUrl ?? '',
  EXPO_PUBLIC_AUTHENTIK_ISSUER: expoPublicAuthentikIssuer ?? '',
  EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: expoPublicAuthentikClientId ?? '',
  EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: expoPublicAuthentikRedirectUri ?? '',
  EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: expoPublicAuthentikLoginEntryMode ?? '',
  EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: expoPublicAuthentikSocialLoginMode ?? '',
  EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: expoPublicAuthentikProviderFlowSlugs ?? '',
  EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS:
    expoPublicAuthentikAllowCustomProviderFlowSlugs ?? '',
  INFRA_REDIRECT_AIRS_TO_DEV_SOURCE: airsToDevSourceDomain,
  INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN: airsToDevCertArn ?? '',
  INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE: devToTestnetSourceDomain,
  INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES: devToTestnetSourceDomains.join(','),
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

const adminSiteEnabledStages = parseEnabledPipelineStages(adminSiteEnabledStagesRaw);
const identityEnabledStages = parseEnabledPipelineStages(identityEnabledStagesRaw);
const backendApiEnabledStages = parseEnabledPipelineStages(backendApiEnabledStagesRaw);
const selectedPipelines = parseSelectedPipelines(selectedPipelinesRaw);
const pipelineSpecs = buildPipelineSpecs({
  env: process.env,
  pipeline: localConfig.pipeline,
});

export function createInfrastructure() {
  const stage = String($app.stage);
  const dashboardStackStage = isDashboardStackStage(stage);
  const adminSiteStackStage = isAdminSiteStackStage(stage);
  const backendApiStackStage = isBackendApiStackStage(stage);
  const identityStackStage = isIdentityStackStage(stage);
  const parsedDeploymentStage = resolveStackDeploymentStage(stage);
  const expoDeploymentStage = (parsedDeploymentStage ?? stage) as PipelineStage;
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

  if (dashboardStackStage && !adminSiteSettings.enabled) {
    throw new Error(
      `Refusing to deploy "${stage}" with INFRA_ENABLE_ADMIN_SITE=false. Dashboard stacks own admin resources and would otherwise remove them.`
    );
  }

  if (dashboardStackStage && !backendApiSettings.enabled) {
    throw new Error(
      `Refusing to deploy "${stage}" with INFRA_ENABLE_BACKEND_API=false. Dashboard stacks own backend API resources and would otherwise remove them.`
    );
  }

  if (adminSiteStackStage && !dashboardStackStage && !adminSiteSettings.enabled) {
    throw new Error(
      `Refusing to deploy "${stage}" with INFRA_ENABLE_ADMIN_SITE=false. Admin-dedicated stacks own admin resources and would otherwise remove them.`
    );
  }

  if (backendApiStackStage && !dashboardStackStage && !backendApiSettings.enabled) {
    throw new Error(
      `Refusing to deploy "${stage}" with INFRA_ENABLE_BACKEND_API=false. API-dedicated stacks own backend resources and would otherwise remove them.`
    );
  }

  if (adminSiteSettings.enabled && !adminSiteAllowedOnStack) {
    // eslint-disable-next-line no-console
    console.log(
      [
        `Admin site is enabled but skipped for stack "${stage}" because INFRA_ADMIN_DEDICATED_STACKS_ONLY=true.`,
        'Use STACK=admin-dev, STACK=admin-prod, STACK=dashboard-dev, or STACK=dashboard-prod to provision admin site resources.',
      ].join(' ')
    );
  }

  if (backendApiSettings.enabled && !backendApiAllowedOnStack) {
    // eslint-disable-next-line no-console
    console.log(
      [
        `Backend API is enabled but skipped for stack "${stage}" because INFRA_BACKEND_API_DEDICATED_STACKS_ONLY=true.`,
        'Use STACK=api-dev, STACK=api-prod, STACK=dashboard-dev, or STACK=dashboard-prod to provision backend API resources.',
      ].join(' ')
    );
  }

  if (identitySettings.enabled && !identityAllowedOnStack) {
    // eslint-disable-next-line no-console
    console.log(
      [
        `Identity is enabled but skipped for stack "${stage}" because INFRA_IDENTITY_DEDICATED_STACKS_ONLY=true.`,
        'Use STACK=identity-dev or STACK=identity-prod to provision identity resources.',
      ].join(' ')
    );
  }

  if (enableExpoSiteForStage) {
    assertExpoPublicAuthEnvironment(expoConfig, expoDeploymentStage);
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
        authentikJwtSigningKey: identityInfrastructure?.secrets.jwtSigningKey.value,
        authentikSmtpSecretArn: identityInfrastructure?.secrets.smtpCredentials.arn,
        env: process.env,
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
      ingress: identitySettings.ingress,
      tls: identitySettings.tls,
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
            acmeBackup: identityInfrastructure.acmeBackup ?? null,
            loadBalancer: identityInfrastructure.loadBalancer ?? null,
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
    const assetBucketName = assetBucketNames[expoDeploymentStage];
    const assetBaseUrl = createAssetBaseUrl(assetBucketName);
    const expoAuthExecutionProvider =
      expoPublicAuthExecutionProvider ??
      (expoPublicBetterAuthUrl ?? expoPublicAuthExchangeUrl ? 'better-auth' : 'supabase');
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
              stageCertificateArn: expoCerts[expoDeploymentStage],
              // AIRS -> testnet redirect is managed as an explicit router below.
              enableProductionToStageRedirect: false,
            })
          : undefined,
      certificateArn: enableCustomDomain ? expoCerts[expoDeploymentStage] : undefined,
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
        EXPO_PUBLIC_API_URL:
          expoPublicApiUrl ?? buildApiUrlFromStageDomain(expoStageMap[expoDeploymentStage]),
        AUTH_EXECUTION_PROVIDER: expoAuthExecutionProvider,
        EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: expoAuthExecutionProvider,
        AUTH_EXCHANGE_URL: expoPublicAuthExchangeUrl,
        EXPO_PUBLIC_AUTH_EXCHANGE_URL: expoPublicAuthExchangeUrl,
        AUTH_BETTER_AUTH_URL: expoPublicBetterAuthUrl,
        EXPO_PUBLIC_BETTER_AUTH_URL: expoPublicBetterAuthUrl,
        EXPO_PUBLIC_ASSET_BASE_URL: assetBaseUrl,
        EXPO_PUBLIC_AIRS_VIDEO_EN_URL: introVideoAssets.en.url,
        EXPO_PUBLIC_AIRS_VIDEO_ES_URL: introVideoAssets.es.url,
        EXPO_PUBLIC_AUTHENTIK_ISSUER: expoPublicAuthentikIssuer,
        EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: expoPublicAuthentikClientId,
        EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: expoPublicAuthentikLoginEntryMode,
        EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: expoPublicAuthentikSocialLoginMode,
        EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: expoPublicAuthentikProviderFlowSlugs,
        EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS:
          expoPublicAuthentikAllowCustomProviderFlowSlugs,
        EXPO_PUBLIC_RELEASE_UPDATE_MODE: expoPublicReleaseUpdateMode,
        // Auto-derive the redirect URI from the deployed expo domain when not explicitly set.
        // This ensures the OIDC callback always points at the dedicated callback route
        // on the correct deployed origin.
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI:
          expoPublicAuthentikRedirectUri ??
          (enableCustomDomain && expoStageMap[expoDeploymentStage]
            ? `https://${expoStageMap[expoDeploymentStage]}/auth/callback`
            : undefined),
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
      devToTestnetSourceDomains.some(
        (sourceDomain) => sourceDomain.toLowerCase() !== expoStageMap.dev.toLowerCase()
      );

    if (shouldCreateDevToTestnetRedirect) {
      devToTestnetSourceDomains.forEach((sourceDomain, index) => {
        if (sourceDomain.toLowerCase() === expoStageMap.dev.toLowerCase()) {
          return;
        }

        createExternalDomainRedirect({
          id: `dev-domain-redirect-${stage}-${index}`,
          sourceDomain,
          targetDomain: expoStageMap.dev,
          certificateArn: devToTestnetCertArn,
        });
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
      devToTestnetSources: shouldCreateDevToTestnetRedirect ? devToTestnetSourceDomains : null,
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

import fs from 'node:fs';
import path from 'node:path';
import type { LocalDeploymentConfig } from './deployment-config.js';
import {
  EXPO_INFRA_DEFAULTS,
  REDIRECT_INFRA_DEFAULTS,
  buildStageDomains,
} from './infrastructure-specs.js';
import { parseBoolean } from './parsing.js';
import type { PipelineStage } from './pipelines/index.js';

export interface ExpoProfileFlags {
  isDashboardPipelineProfile: boolean;
  isAdminSitePipelineProfile: boolean;
  isBackendApiPipelineProfile: boolean;
  isIdentityPipelineProfile: boolean;
}

export interface ResolvedExpoConfig {
  appPath: string;
  resolvedAppPath: string;
  subdomain: string;
  stageDomains: Record<PipelineStage, string>;
  certArns: Record<PipelineStage, string | undefined>;
  buildCommand: string;
  buildOutput: string;
  enableCustomDomain: boolean;
  requirePublicAuthEnv: boolean;
  enableExpoSite: boolean;
  publicEnv: {
    supabaseUrl?: string;
    supabaseKey?: string;
    walletConnectProjectId?: string;
    walletConnectChainId?: string;
    enableMockWalletAuth?: string;
    enableWalletOnlyAuth?: string;
    apiUrl?: string;
    authExecutionProvider?: string;
    authExchangeUrl?: string;
    betterAuthUrl?: string;
    authentikIssuer?: string;
    authentikClientId?: string;
    authentikRedirectUri?: string;
    authentikLoginEntryMode?: string;
    authentikSocialLoginMode?: string;
    authentikProviderFlowSlugs?: string;
    authentikAllowCustomProviderFlowSlugs?: string;
    releaseUpdateMode?: string;
  };
  redirects: {
    enableAirsToDev: boolean;
    airsToDevSourceDomain: string;
    airsToDevCertArn?: string;
    enableDevToTestnet: boolean;
    devToTestnetSourceDomain: string;
    devToTestnetSourceDomains: string[];
    devToTestnetCertArn?: string;
    enableRootDomainRedirect: boolean;
    rootDomainRedirectTarget: string;
    rootDomainRedirectCertArn?: string;
  };
  assetBucketNames: Record<PipelineStage, string>;
}

interface ResolveExpoConfigArgs {
  dirname: string;
  env: NodeJS.ProcessEnv;
  localConfig: LocalDeploymentConfig;
  pipelinePrefix: string;
  profileFlags: ExpoProfileFlags;
  rootDomain: string;
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

function createAssetBucketName(stage: PipelineStage, prefix: string, domain: string): string {
  return sanitizeBucketName(`${prefix}-${stage}-public-assets-${domain.replace(/\./g, '-')}`);
}

function resolveAuthentikProviderFlowSlugsEnvValue(
  env: NodeJS.ProcessEnv,
  localConfig: LocalDeploymentConfig,
  allowCustomProviderFlowSlugs: boolean
): string | undefined {
  if (!allowCustomProviderFlowSlugs) {
    return undefined;
  }

  if (env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS !== undefined) {
    return env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS;
  }

  if (localConfig.expo?.publicEnv?.authentikProviderFlowSlugs !== undefined) {
    return localConfig.expo.publicEnv.authentikProviderFlowSlugs;
  }

  return undefined;
}

function splitDomainList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeDomainList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .trim();

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeBetterAuthBaseUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(
      trimmed
        .replace(/\/+$/, '')
        .replace(/\/auth\/exchange$/, '')
        .replace(/\/auth$/, '')
    );
    const pathname = url.pathname === '/' ? '' : url.pathname;
    return `${url.origin}${pathname}`.replace(/\/+$/, '');
  } catch {
    const normalized = trimmed
      .replace(/\?.*$/, '')
      .replace(/#.*$/, '')
      .replace(/\/+$/, '')
      .replace(/\/auth\/exchange$/, '')
      .replace(/\/auth$/, '');
    return normalized.length > 0 ? normalized : undefined;
  }
}

function normalizePublicUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/\/+$/, '');
}

function normalizeAuthExecutionProvider(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'better-auth' || normalized === 'supabase') {
    return normalized;
  }

  return undefined;
}

function buildAuthExchangeUrl(apiUrl: string | undefined): string | undefined {
  if (!apiUrl) {
    return undefined;
  }

  return `${apiUrl}/auth/exchange`;
}

function resolveExpoAppPath(dirname: string, appPath: string): string {
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

export function createAssetBaseUrl(bucketName: string): string {
  return `https://${bucketName}.s3.amazonaws.com`;
}

export function assertExpoPublicAuthEnvironment(config: ResolvedExpoConfig, stage: string): void {
  if (!config.requirePublicAuthEnv) return;
  if (!['production', 'dev', 'mobile'].includes(stage)) return;

  if (!config.publicEnv.supabaseUrl || !config.publicEnv.supabaseKey) {
    throw new Error(
      [
        `Missing Expo auth env for stage "${stage}".`,
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY',
        'in packages/infra/.env or pipeline environment variables.',
      ].join(' ')
    );
  }
}

export function resolveExpoConfig({
  dirname,
  env,
  localConfig,
  pipelinePrefix,
  profileFlags,
  rootDomain,
}: ResolveExpoConfigArgs): ResolvedExpoConfig {
  const appPath =
    env.INFRA_EXPO_APP_PATH ?? localConfig.expo?.appPath ?? EXPO_INFRA_DEFAULTS.appPath;
  const resolvedAppPath = resolveExpoAppPath(dirname, appPath);
  const subdomain =
    env.INFRA_EXPO_SUBDOMAIN ?? localConfig.expo?.subdomain ?? EXPO_INFRA_DEFAULTS.subdomain;
  const legacyDevDomain = `${REDIRECT_INFRA_DEFAULTS.legacyDevSubdomain}.${subdomain}.${rootDomain}`;
  const defaultExpoDomains = buildStageDomains(subdomain, rootDomain);

  const stageDomains: Record<PipelineStage, string> = {
    production:
      env.INFRA_EXPO_DOMAIN_PRODUCTION ??
      localConfig.expo?.domains?.production ??
      defaultExpoDomains.production,
    dev: env.INFRA_EXPO_DOMAIN_DEV ?? localConfig.expo?.domains?.dev ?? defaultExpoDomains.dev,
    mobile:
      env.INFRA_EXPO_DOMAIN_MOBILE ??
      localConfig.expo?.domains?.mobile ??
      defaultExpoDomains.mobile,
  };

  const certArns: Record<PipelineStage, string | undefined> = {
    production: env.INFRA_EXPO_CERT_ARN_PRODUCTION ?? localConfig.expo?.certArns?.production,
    dev: env.INFRA_EXPO_CERT_ARN_DEV ?? localConfig.expo?.certArns?.dev,
    mobile: env.INFRA_EXPO_CERT_ARN_MOBILE ?? localConfig.expo?.certArns?.mobile,
  };

  const buildCommand =
    env.INFRA_EXPO_BUILD_COMMAND ??
    localConfig.expo?.build?.command ??
    EXPO_INFRA_DEFAULTS.buildCommand;
  const buildOutput =
    env.INFRA_EXPO_BUILD_OUTPUT ??
    localConfig.expo?.build?.output ??
    EXPO_INFRA_DEFAULTS.buildOutput;
  const enableCustomDomainRaw =
    env.INFRA_EXPO_ENABLE_CUSTOM_DOMAIN ??
    (localConfig.expo?.enableCustomDomain !== undefined
      ? String(localConfig.expo.enableCustomDomain)
      : undefined) ??
    String(EXPO_INFRA_DEFAULTS.enableCustomDomain);
  const enableCustomDomain = parseBoolean(
    enableCustomDomainRaw,
    EXPO_INFRA_DEFAULTS.enableCustomDomain
  );
  const requirePublicAuthEnv = parseBoolean(
    env.INFRA_REQUIRE_EXPO_PUBLIC_AUTH ??
      (localConfig.expo?.requirePublicAuthEnv !== undefined
        ? String(localConfig.expo.requirePublicAuthEnv)
        : undefined),
    EXPO_INFRA_DEFAULTS.requirePublicAuthEnv
  );
  const enableExpoSite = parseBoolean(
    env.INFRA_ENABLE_EXPO_SITE,
    !profileFlags.isIdentityPipelineProfile &&
      !profileFlags.isBackendApiPipelineProfile &&
      !profileFlags.isAdminSitePipelineProfile &&
      !profileFlags.isDashboardPipelineProfile
  );
  const allowCustomProviderFlowSlugs =
    parseBoolean(env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS, false) ||
    parseBoolean(env.INFRA_ALLOW_CUSTOM_AUTHENTIK_PROVIDER_FLOW_SLUGS, false) ||
    Boolean(localConfig.expo?.publicEnv?.authentikAllowCustomProviderFlowSlugs);
  const apiUrl = normalizePublicUrl(env.EXPO_PUBLIC_API_URL ?? localConfig.expo?.publicEnv?.apiUrl);
  const explicitAuthExecutionProvider = normalizeAuthExecutionProvider(
    env.AUTH_EXECUTION_PROVIDER ??
      env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER ??
      localConfig.expo?.publicEnv?.authExecutionProvider
  );
  const authExchangeUrl =
    normalizePublicUrl(
      env.AUTH_EXCHANGE_URL ??
        env.EXPO_PUBLIC_AUTH_EXCHANGE_URL ??
        localConfig.expo?.publicEnv?.authExchangeUrl
    ) ??
    ((explicitAuthExecutionProvider === 'better-auth' ||
      normalizeBetterAuthBaseUrl(
        env.AUTH_BETTER_AUTH_URL ??
          env.EXPO_PUBLIC_BETTER_AUTH_URL ??
          localConfig.expo?.publicEnv?.betterAuthUrl
      )) &&
    apiUrl
      ? buildAuthExchangeUrl(apiUrl)
      : undefined);
  const betterAuthUrl = normalizeBetterAuthBaseUrl(
    env.AUTH_BETTER_AUTH_URL ??
      env.EXPO_PUBLIC_BETTER_AUTH_URL ??
      localConfig.expo?.publicEnv?.betterAuthUrl ??
      authExchangeUrl ??
      (explicitAuthExecutionProvider === 'better-auth' ? apiUrl : undefined)
  );
  const authExecutionProvider =
    explicitAuthExecutionProvider ?? (betterAuthUrl ? 'better-auth' : undefined);

  const publicEnv = {
    supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL ?? localConfig.expo?.publicEnv?.supabaseUrl,
    supabaseKey:
      env.EXPO_PUBLIC_SUPABASE_KEY ??
      env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      localConfig.expo?.publicEnv?.supabaseKey,
    walletConnectProjectId:
      env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ??
      localConfig.expo?.publicEnv?.walletConnectProjectId,
    walletConnectChainId:
      env.EXPO_PUBLIC_WALLETCONNECT_CHAIN_ID ?? localConfig.expo?.publicEnv?.walletConnectChainId,
    enableMockWalletAuth:
      env.EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH ??
      (localConfig.expo?.publicEnv?.enableMockWalletAuth !== undefined
        ? String(localConfig.expo.publicEnv.enableMockWalletAuth)
        : undefined),
    enableWalletOnlyAuth:
      env.EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH ??
      (localConfig.expo?.publicEnv?.enableWalletOnlyAuth !== undefined
        ? String(localConfig.expo.publicEnv.enableWalletOnlyAuth)
        : undefined),
    apiUrl,
    authExecutionProvider,
    authExchangeUrl,
    betterAuthUrl,
    authentikIssuer:
      env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? localConfig.expo?.publicEnv?.authentikIssuer,
    authentikClientId:
      env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? localConfig.expo?.publicEnv?.authentikClientId,
    authentikRedirectUri:
      env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI ?? localConfig.expo?.publicEnv?.authentikRedirectUri,
    authentikLoginEntryMode:
      env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE ??
      localConfig.expo?.publicEnv?.authentikLoginEntryMode,
    authentikSocialLoginMode:
      env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE ??
      localConfig.expo?.publicEnv?.authentikSocialLoginMode,
    authentikProviderFlowSlugs: resolveAuthentikProviderFlowSlugsEnvValue(
      env,
      localConfig,
      allowCustomProviderFlowSlugs
    ),
    authentikAllowCustomProviderFlowSlugs: allowCustomProviderFlowSlugs ? 'true' : undefined,
    releaseUpdateMode:
      env.EXPO_PUBLIC_RELEASE_UPDATE_MODE ?? localConfig.expo?.publicEnv?.releaseUpdateMode,
  };

  const redirects = {
    enableAirsToDev: parseBoolean(
      env.INFRA_REDIRECT_AIRS_TO_DEV ??
        (localConfig.redirects?.enableAirsToDev !== undefined
          ? String(localConfig.redirects.enableAirsToDev)
          : undefined),
      REDIRECT_INFRA_DEFAULTS.enableAirsToDev
    ),
    airsToDevSourceDomain:
      env.INFRA_REDIRECT_AIRS_TO_DEV_SOURCE ??
      localConfig.redirects?.airsToDevSourceDomain ??
      stageDomains.production,
    airsToDevCertArn:
      env.INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN ?? localConfig.redirects?.certArns?.airsToDev,
    enableDevToTestnet: parseBoolean(
      env.INFRA_REDIRECT_DEV_TO_TESTNET ??
        (localConfig.redirects?.enableDevToTestnet !== undefined
          ? String(localConfig.redirects.enableDevToTestnet)
          : undefined),
      REDIRECT_INFRA_DEFAULTS.enableDevToTestnet
    ),
    devToTestnetSourceDomains: normalizeDomainList([
      ...splitDomainList(env.INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES),
      ...splitDomainList(env.INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE),
      ...(localConfig.redirects?.devToTestnetSourceDomains ?? []),
      ...(localConfig.redirects?.devToTestnetSourceDomain
        ? [localConfig.redirects.devToTestnetSourceDomain]
        : []),
      legacyDevDomain,
      `demo.${subdomain}.${rootDomain}`,
      `beta.${subdomain}.${rootDomain}`,
    ]),
    devToTestnetCertArn:
      env.INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN ?? localConfig.redirects?.certArns?.devToTestnet,
    enableRootDomainRedirect: parseBoolean(
      env.INFRA_REDIRECT_ROOT_DOMAIN ??
        (localConfig.redirects?.enableRootDomainRedirect !== undefined
          ? String(localConfig.redirects.enableRootDomainRedirect)
          : undefined),
      REDIRECT_INFRA_DEFAULTS.enableRootDomainRedirect
    ),
    rootDomainRedirectTarget:
      env.INFRA_REDIRECT_ROOT_TARGET ??
      localConfig.redirects?.rootDomainTarget ??
      REDIRECT_INFRA_DEFAULTS.rootDomainTarget,
    rootDomainRedirectCertArn:
      env.INFRA_REDIRECT_ROOT_CERT_ARN ?? localConfig.redirects?.certArns?.rootDomain,
  };
  const devToTestnetSourceDomain = redirects.devToTestnetSourceDomains[0] ?? legacyDevDomain;

  redirects.devToTestnetSourceDomain = devToTestnetSourceDomain;

  const assetBucketNames: Record<PipelineStage, string> = {
    production: createAssetBucketName('production', pipelinePrefix, rootDomain),
    dev: createAssetBucketName('dev', pipelinePrefix, rootDomain),
    mobile: createAssetBucketName('mobile', pipelinePrefix, rootDomain),
  };

  return {
    appPath,
    resolvedAppPath,
    subdomain,
    stageDomains,
    certArns,
    buildCommand,
    buildOutput,
    enableCustomDomain,
    requirePublicAuthEnv,
    enableExpoSite,
    publicEnv,
    redirects,
    assetBucketNames,
  };
}

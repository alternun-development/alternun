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
import { createExpoSite, createPipeline, resolveDomain } from '@lsts_tech/infra';
import { buildStageDomainConfig, createExternalDomainRedirect } from './modules/redirects.js';

type PipelineStage = 'production' | 'dev' | 'mobile';

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
  keyPrefix: string,
): PublicAssetFile {
  const source = path.resolve(dirname, appPath, relativePath);
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
const pipelineRepo =
  process.env.INFRA_PIPELINE_REPO ?? localConfig.pipeline?.repo ?? 'alternun-development/alternun';
const pipelinePrefix =
  process.env.INFRA_PIPELINE_PREFIX ?? localConfig.pipeline?.prefix ?? 'alternun';
const pipelineProjectTag =
  process.env.INFRA_PROJECT_TAG ?? localConfig.pipeline?.projectTag ?? pipelinePrefix;
const codestarConnectionArn =
  process.env.INFRA_CODESTAR_CONNECTION_ARN ?? localConfig.pipeline?.codestarConnectionArn;
const selectedPipelinesRaw =
  process.env.INFRA_PIPELINES ?? localConfig.pipeline?.pipelines ?? 'production,dev';

const expoAppPath =
  process.env.INFRA_EXPO_APP_PATH ?? localConfig.expo?.appPath ?? '../../apps/mobile';
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
  INFRA_REQUIRE_EXPO_PUBLIC_AUTH: String(requireExpoPublicAuthEnv),
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

function parsePipelineStage(value: string): PipelineStage | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'production' || normalized === 'prod') return 'production';
  if (normalized === 'dev') return 'dev';
  if (normalized === 'mobile') return 'mobile';
  return undefined;
}

const selectedPipelines = new Set<PipelineStage>(
  selectedPipelinesRaw
    .split(',')
    .map(value => parsePipelineStage(value))
    .filter((value): value is PipelineStage => value !== undefined)
);

const pipelineSpecs: Record<
  PipelineStage,
  { suffix: string; branch: string; stage: PipelineStage }
> = {
  production: {
    suffix: 'prod',
    branch: process.env.INFRA_PIPELINE_BRANCH_PROD ?? localConfig.pipeline?.branchProd ?? 'master',
    stage: 'production',
  },
  dev: {
    suffix: 'dev',
    branch: process.env.INFRA_PIPELINE_BRANCH_DEV ?? localConfig.pipeline?.branchDev ?? 'develop',
    stage: 'dev',
  },
  mobile: {
    suffix: 'mobile',
    branch:
      process.env.INFRA_PIPELINE_BRANCH_MOBILE ?? localConfig.pipeline?.branchMobile ?? 'mobile',
    stage: 'mobile',
  },
};

export function createInfrastructure() {
  const stage = $app.stage;
  assertExpoPublicAuthEnvironment(stage);
  const assetBucketName =
    assetBucketNames[stage as PipelineStage] ?? createAssetBucketName(stage, pipelinePrefix, rootDomain);
  const assetBaseUrl = createAssetBaseUrl(assetBucketName);
  const introVideoAssets = {
    en: buildPublicAssetFile(
      expoAppPath,
      assetBaseUrl,
      'assets/videos/AIRS-intro-videoplayback-EN.mp4',
      'landing/videos',
    ),
    es: buildPublicAssetFile(
      expoAppPath,
      assetBaseUrl,
      'assets/videos/AIRS-intro-videoplayback-ES.mp4',
      'landing/videos',
    ),
  } satisfies Record<'en' | 'es', PublicAssetFile>;
  const publicAssetBucket = new sst.aws.Bucket(`expo-assets-${stage}`, {
    access: 'public',
    cors: {
      allowHeaders: ['*'],
      allowMethods: ['GET', 'HEAD'],
      allowOrigins: ['*'],
      maxAge: '1 day',
    },
    transform: {
      bucket: args => {
        args.bucket = assetBucketName;
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

  const outputs: Record<string, unknown> = {
    app: appName,
    assets: {
      airsIntroVideoEn: introVideoAssets.en.url,
      airsIntroVideoEs: introVideoAssets.es.url,
    },
    assetBucket: {
      baseUrl: assetBaseUrl,
      domain: publicAssetBucket.domain,
      name: publicAssetBucket.name,
    },
    siteUrl: expoSite.url,
    domain: expoDomain?.domainName ?? null,
    customDomainEnabled: enableCustomDomain,
    redirects: {
      airsToDevEnabled: shouldCreateAirsToDevRedirect,
      airsToDevSource: shouldCreateAirsToDevRedirect ? airsToDevSourceDomain : null,
      airsToDevTarget: shouldCreateAirsToDevRedirect ? expoStageMap.dev : null,
      devToTestnetEnabled: shouldCreateDevToTestnetRedirect,
      devToTestnetSource: shouldCreateDevToTestnetRedirect ? devToTestnetSourceDomain : null,
      devToTestnetTarget: shouldCreateDevToTestnetRedirect ? expoStageMap.dev : null,
      rootDomainRedirectEnabled: shouldCreateRootDomainRedirect,
      rootDomainRedirectTarget: shouldCreateRootDomainRedirect ? rootDomainRedirectTarget : null,
    },
  };

  if (stage === 'production' && selectedPipelines.size > 0) {
    const pipelineOutputs: Record<string, string> = {};

    for (const pipelineStage of selectedPipelines) {
      const spec = pipelineSpecs[pipelineStage];
      const pipeline = createPipeline({
        name: `${pipelinePrefix}-${spec.suffix}`,
        repo: pipelineRepo,
        branch: spec.branch,
        stage: spec.stage,
        projectTag: pipelineProjectTag,
        codestarConnectionArn,
        buildEnv: commonBuildEnv,
      });

      pipelineOutputs[`${pipelineStage}PipelineName`] = pipeline.pipelineName;
    }

    outputs.pipelines = pipelineOutputs;
  }

  return outputs;
}

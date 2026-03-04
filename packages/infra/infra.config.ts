/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable comma-dangle */
/* eslint-disable indent */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-object-injection */
// / <reference path="./sst-env.d.ts" />

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExpoSite, createPipeline, resolveDomain } from '@lsts_tech/infra';
import { buildStageDomainConfig, createExternalDomainRedirect } from './modules/redirects.js';

type PipelineStage = 'production' | 'dev' | 'mobile';

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
  };
  redirects?: {
    enableAirsToDev?: boolean;
    enableDevToTestnet?: boolean;
    devToTestnetSourceDomain?: string;
    enableRootDomainRedirect?: boolean;
    rootDomainTarget?: string;
    certArns?: {
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

const enableAirsToDevRedirect = parseBoolean(
  process.env.INFRA_REDIRECT_AIRS_TO_DEV ??
    (localConfig.redirects?.enableAirsToDev !== undefined
      ? String(localConfig.redirects.enableAirsToDev)
      : undefined),
  true
);

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
  DOMAIN_ROOT: rootDomain,
  DOMAIN_PRODUCTION: expoStageMap.production,
  DOMAIN_DEV: expoStageMap.dev,
  DOMAIN_MOBILE: expoStageMap.mobile,
  PROJECT_PREFIX: pipelinePrefix,
  PREFIX: pipelinePrefix,
};

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
            enableProductionToStageRedirect: enableAirsToDevRedirect,
          })
        : undefined,
    certificateArn: enableCustomDomain ? expoCerts[stage] : undefined,
    environment: {
      EXPO_PUBLIC_ENV: stage,
      EXPO_PUBLIC_STAGE: stage,
      EXPO_PUBLIC_ORIGIN: expoDomain ? `https://${expoDomain.domainName}` : undefined,
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
    siteUrl: expoSite.url,
    domain: expoDomain?.domainName ?? null,
    customDomainEnabled: enableCustomDomain,
    redirects: {
      airsToDevEnabled: enableAirsToDevRedirect,
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

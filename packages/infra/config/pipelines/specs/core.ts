import { buildStageUrls } from '../../infrastructure-specs.js';
import { resolveBranch } from '../shared.js';
import type { PipelineConfigContext, PipelineSpecRecord, PipelineStage } from '../types.js';

function isTruthy(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function buildAuthentikRedirectUriForStage(stage: PipelineStage, env: NodeJS.ProcessEnv): string {
  const stageUrls = buildStageUrls(
    env.INFRA_EXPO_SUBDOMAIN ?? 'airs',
    env.INFRA_ROOT_DOMAIN ?? 'alternun.co'
  );

  return `${stageUrls[stage]}/auth/callback`;
}

function buildApiUrlForStage(stage: PipelineStage, env: NodeJS.ProcessEnv): string {
  const explicitApiUrl = env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitApiUrl) {
    return explicitApiUrl.replace(/\/+$/, '');
  }

  const stageUrls = buildStageUrls(
    env.INFRA_EXPO_SUBDOMAIN ?? 'airs',
    env.INFRA_ROOT_DOMAIN ?? 'alternun.co'
  );

  try {
    const stageUrl = new URL(stageUrls[stage]);
    const hostnameParts = stageUrl.hostname.split('.');
    const airsIndex = hostnameParts.indexOf('airs');

    if (airsIndex >= 0) {
      hostnameParts[airsIndex] = 'api';
      return `${stageUrl.protocol}//${hostnameParts.join('.')}`;
    }

    return stageUrl.origin;
  } catch {
    return stageUrls[stage];
  }
}

function buildAuthExchangeUrlForStage(stage: PipelineStage, env: NodeJS.ProcessEnv): string {
  return `${buildApiUrlForStage(stage, env)}/auth/exchange`;
}

function buildBetterAuthEnvForStage(
  stage: PipelineStage,
  env: NodeJS.ProcessEnv
): Record<string, string> {
  const executionProvider = resolveAuthExecutionProviderForStage(stage, env);
  if (executionProvider !== 'better-auth') {
    return {
      AUTH_BETTER_AUTH_URL: '',
      EXPO_PUBLIC_BETTER_AUTH_URL: '',
      AUTH_EXCHANGE_URL: '',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: '',
    };
  }

  const betterAuthUrl = buildApiUrlForStage(stage, env);
  const authExchangeUrl = buildAuthExchangeUrlForStage(stage, env);

  return {
    AUTH_BETTER_AUTH_URL: betterAuthUrl,
    EXPO_PUBLIC_BETTER_AUTH_URL: betterAuthUrl,
    AUTH_EXCHANGE_URL: authExchangeUrl,
    EXPO_PUBLIC_AUTH_EXCHANGE_URL: authExchangeUrl,
  };
}

function resolveAuthentikProviderFlowSlugsForStage(
  env: NodeJS.ProcessEnv,
  allowCustomProviderFlowSlugs: boolean
): string {
  if (!allowCustomProviderFlowSlugs) {
    return '';
  }

  return env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS ?? '';
}

function resolveAuthExecutionProviderForStage(
  stage: PipelineStage,
  env: NodeJS.ProcessEnv
): string {
  const explicit = env.AUTH_EXECUTION_PROVIDER ?? env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
  if (explicit?.trim()) {
    return explicit.trim();
  }

  return stage === 'production' ? 'supabase' : 'better-auth';
}

export function buildCorePipelineSpecs({
  env,
  pipeline,
}: PipelineConfigContext): PipelineSpecRecord<PipelineStage> {
  const allowCustomProviderFlowSlugs =
    isTruthy(env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS) ||
    isTruthy(env.INFRA_ALLOW_CUSTOM_AUTHENTIK_PROVIDER_FLOW_SLUGS);
  const authentikProviderFlowSlugs = resolveAuthentikProviderFlowSlugsForStage(
    env,
    allowCustomProviderFlowSlugs
  );
  const authentikAllowCustomProviderFlowSlugs = allowCustomProviderFlowSlugs ? 'true' : '';
  const productionAuthExecutionProvider = resolveAuthExecutionProviderForStage('production', env);
  const devAuthExecutionProvider = resolveAuthExecutionProviderForStage('dev', env);
  const mobileAuthExecutionProvider = resolveAuthExecutionProviderForStage('mobile', env);
  const productionApiUrl = buildApiUrlForStage('production', env);
  const devApiUrl = buildApiUrlForStage('dev', env);
  const mobileApiUrl = buildApiUrlForStage('mobile', env);

  return {
    production: {
      suffix: 'prod',
      branch: resolveBranch(env.INFRA_PIPELINE_BRANCH_PROD, pipeline?.branchProd, 'master'),
      outputKey: 'productionPipelineName',
      stage: 'production',
      buildEnv: {
        INFRA_ENABLE_EXPO_SITE: 'true',
        INFRA_IDENTITY_ENABLED: 'false',
        INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
        AUTH_EXECUTION_PROVIDER: productionAuthExecutionProvider,
        EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: productionAuthExecutionProvider,
        ...buildBetterAuthEnvForStage('production', env),
        EXPO_PUBLIC_AUTHENTIK_ISSUER: env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? '',
        EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? 'alternun-mobile',
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('production', env),
        EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: 'source',
        EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
        EXPO_PUBLIC_API_URL: productionApiUrl,
        EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS:
          authentikAllowCustomProviderFlowSlugs,
        EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: authentikProviderFlowSlugs,
        EXPO_PUBLIC_RELEASE_UPDATE_MODE: 'on',
      },
    },
    dev: {
      suffix: 'dev',
      branch: resolveBranch(env.INFRA_PIPELINE_BRANCH_DEV, pipeline?.branchDev, 'develop'),
      outputKey: 'devPipelineName',
      stage: 'dev',
      buildEnv: {
        INFRA_ENABLE_EXPO_SITE: 'true',
        INFRA_IDENTITY_ENABLED: 'false',
        INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
        AUTH_EXECUTION_PROVIDER: devAuthExecutionProvider,
        EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: devAuthExecutionProvider,
        ...buildBetterAuthEnvForStage('dev', env),
        EXPO_PUBLIC_AUTHENTIK_ISSUER: env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? '',
        EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? 'alternun-mobile',
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('dev', env),
        EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: 'source',
        EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
        EXPO_PUBLIC_API_URL: devApiUrl,
        EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS:
          authentikAllowCustomProviderFlowSlugs,
        EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: authentikProviderFlowSlugs,
        EXPO_PUBLIC_RELEASE_UPDATE_MODE: 'on',
      },
    },
    mobile: {
      suffix: 'mobile',
      branch: resolveBranch(env.INFRA_PIPELINE_BRANCH_MOBILE, pipeline?.branchMobile, 'mobile'),
      outputKey: 'mobilePipelineName',
      stage: 'mobile',
      buildEnv: {
        INFRA_ENABLE_EXPO_SITE: 'true',
        INFRA_IDENTITY_ENABLED: 'false',
        INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
        AUTH_EXECUTION_PROVIDER: mobileAuthExecutionProvider,
        EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: mobileAuthExecutionProvider,
        ...buildBetterAuthEnvForStage('mobile', env),
        EXPO_PUBLIC_AUTHENTIK_ISSUER: env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? '',
        EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? 'alternun-mobile',
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('mobile', env),
        EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: 'source',
        EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
        EXPO_PUBLIC_API_URL: mobileApiUrl,
        EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS:
          authentikAllowCustomProviderFlowSlugs,
        EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: authentikProviderFlowSlugs,
        EXPO_PUBLIC_RELEASE_UPDATE_MODE: 'on',
      },
    },
  };
}

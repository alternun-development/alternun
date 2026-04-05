import { buildStageUrls } from '../../infrastructure-specs.js';
import { resolveBranch } from '../shared.js';
import type { PipelineConfigContext, PipelineSpecRecord, PipelineStage } from '../types.js';

function buildAuthentikRedirectUriForStage(stage: PipelineStage, env: NodeJS.ProcessEnv): string {
  const stageUrls = buildStageUrls(
    env.INFRA_EXPO_SUBDOMAIN ?? 'airs',
    env.INFRA_ROOT_DOMAIN ?? 'alternun.co'
  );

  return `${stageUrls[stage]}/auth/callback`;
}

function resolveAuthentikProviderFlowSlugsForStage(
  stage: PipelineStage,
  env: NodeJS.ProcessEnv
): string {
  if (env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS !== undefined) {
    return env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS;
  }

  if (stage !== 'dev') {
    return '';
  }

  return '';
}

export function buildCorePipelineSpecs({
  env,
  pipeline,
}: PipelineConfigContext): PipelineSpecRecord<PipelineStage> {
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
        EXPO_PUBLIC_AUTHENTIK_ISSUER: env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? '',
        EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? 'alternun-mobile',
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('production', env),
        EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: 'source',
        EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
        EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: resolveAuthentikProviderFlowSlugsForStage(
          'production',
          env
        ),
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
        EXPO_PUBLIC_AUTHENTIK_ISSUER: env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? '',
        EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? 'alternun-mobile',
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('dev', env),
        EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: 'source',
        EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
        EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: resolveAuthentikProviderFlowSlugsForStage(
          'dev',
          env
        ),
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
        EXPO_PUBLIC_AUTHENTIK_ISSUER: env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? '',
        EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? 'alternun-mobile',
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('mobile', env),
        EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: 'source',
        EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
        EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: resolveAuthentikProviderFlowSlugsForStage(
          'mobile',
          env
        ),
        EXPO_PUBLIC_RELEASE_UPDATE_MODE: 'on',
      },
    },
  };
}

import { buildStageUrls } from '../../infrastructure-specs.js';
import { resolveBranch } from '../shared.js';
import type { PipelineConfigContext, PipelineSpecRecord, PipelineStage } from '../types.js';

function buildAuthentikRedirectUriForStage(stage: PipelineStage, env: NodeJS.ProcessEnv): string {
  const stageUrls = buildStageUrls(
    env.INFRA_EXPO_SUBDOMAIN ?? 'airs',
    env.INFRA_ROOT_DOMAIN ?? 'alternun.co'
  );

  return `${stageUrls[stage]}/`;
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
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('production', env),
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
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('dev', env),
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
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: buildAuthentikRedirectUriForStage('mobile', env),
      },
    },
  };
}

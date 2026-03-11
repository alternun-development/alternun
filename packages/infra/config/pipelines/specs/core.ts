import { resolveBranch } from '../shared.js';
import type { PipelineConfigContext, PipelineSpecRecord, PipelineStage } from '../types.js';

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
      },
    },
  };
}

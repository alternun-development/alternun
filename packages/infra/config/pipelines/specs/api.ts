import { buildNonExpoPipelineEnv, resolveBranch, STANDARD_PIPELINE_SET } from '../shared.js';
import type { BackendPipelineStage, PipelineConfigContext, PipelineSpec } from '../types.js';

export function buildBackendPipelineSpecs({
  env,
  pipeline,
}: PipelineConfigContext): Record<BackendPipelineStage, PipelineSpec> {
  return {
    'api-dev': {
      suffix: 'api-dev',
      branch: resolveBranch(
        env.INFRA_PIPELINE_BRANCH_API_DEV,
        env.INFRA_PIPELINE_BRANCH_API,
        pipeline?.branchApiDev,
        pipeline?.branchApi,
        pipeline?.branchDev,
        'develop'
      ),
      outputKey: 'apiDevPipelineName',
      stage: 'api-dev',
      buildEnv: buildNonExpoPipelineEnv('api-dev', STANDARD_PIPELINE_SET, {
        INFRA_ENABLE_BACKEND_API: 'true',
        INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: 'true',
        INFRA_BACKEND_API_ENABLED_STAGES: 'dev',
      }),
    },
    'api-prod': {
      suffix: 'api-prod',
      branch: resolveBranch(
        env.INFRA_PIPELINE_BRANCH_API_PROD,
        env.INFRA_PIPELINE_BRANCH_API,
        pipeline?.branchApiProd,
        pipeline?.branchProd,
        'master'
      ),
      outputKey: 'apiProdPipelineName',
      stage: 'api-prod',
      buildEnv: buildNonExpoPipelineEnv('api-prod', STANDARD_PIPELINE_SET, {
        INFRA_ENABLE_BACKEND_API: 'true',
        INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: 'true',
        INFRA_BACKEND_API_ENABLED_STAGES: 'production',
      }),
    },
  };
}

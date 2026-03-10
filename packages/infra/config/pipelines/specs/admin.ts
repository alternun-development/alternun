import { buildNonExpoPipelineEnv, resolveBranch, STANDARD_PIPELINE_SET } from '../shared.js';
import type { AdminPipelineStage, PipelineConfigContext, PipelineSpec } from '../types.js';

export function buildAdminPipelineSpecs({
  env,
  pipeline,
}: PipelineConfigContext): Record<AdminPipelineStage, PipelineSpec> {
  return {
    'admin-dev': {
      suffix: 'adm-dev',
      branch: resolveBranch(
        env.INFRA_PIPELINE_BRANCH_ADMIN_DEV,
        env.INFRA_PIPELINE_BRANCH_ADMIN,
        pipeline?.branchAdminDev,
        pipeline?.branchAdmin,
        pipeline?.branchDev,
        'develop'
      ),
      outputKey: 'adminDevPipelineName',
      stage: 'admin-dev',
      buildEnv: buildNonExpoPipelineEnv('admin-dev', STANDARD_PIPELINE_SET, {
        INFRA_ENABLE_ADMIN_SITE: 'true',
        INFRA_ADMIN_DEDICATED_STACKS_ONLY: 'true',
        INFRA_ADMIN_ENABLED_STAGES: 'dev',
      }),
    },
    'admin-prod': {
      suffix: 'adm-prod',
      branch: resolveBranch(
        env.INFRA_PIPELINE_BRANCH_ADMIN_PROD,
        env.INFRA_PIPELINE_BRANCH_ADMIN,
        pipeline?.branchAdminProd,
        pipeline?.branchProd,
        'master'
      ),
      outputKey: 'adminProdPipelineName',
      stage: 'admin-prod',
      buildEnv: buildNonExpoPipelineEnv('admin-prod', STANDARD_PIPELINE_SET, {
        INFRA_ENABLE_ADMIN_SITE: 'true',
        INFRA_ADMIN_DEDICATED_STACKS_ONLY: 'true',
        INFRA_ADMIN_ENABLED_STAGES: 'production',
      }),
    },
  };
}

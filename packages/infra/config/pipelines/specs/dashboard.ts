import { ALL_PIPELINE_SET, buildNonExpoPipelineEnv, resolveBranch } from '../shared.js';
import type {
  DashboardPipelineStage,
  PipelineConfigContext,
  PipelineSpecRecord,
} from '../types.js';

export function buildDashboardPipelineSpecs({
  env,
  pipeline,
}: PipelineConfigContext): PipelineSpecRecord<DashboardPipelineStage> {
  return {
    'dashboard-dev': {
      suffix: 'dash-dev',
      branch: resolveBranch(
        env.INFRA_PIPELINE_BRANCH_DASHBOARD_DEV,
        env.INFRA_PIPELINE_BRANCH_DASHBOARD,
        pipeline?.branchDashboardDev,
        pipeline?.branchDashboard,
        pipeline?.branchDev,
        'develop'
      ),
      outputKey: 'dashboardDevPipelineName',
      stage: 'dashboard-dev',
      buildEnv: buildNonExpoPipelineEnv('dashboard-dev', ALL_PIPELINE_SET, {
        INFRA_ENABLE_ADMIN_SITE: 'true',
        INFRA_ADMIN_DEDICATED_STACKS_ONLY: 'true',
        INFRA_ADMIN_ENABLED_STAGES: 'dev',
        INFRA_ENABLE_BACKEND_API: 'true',
        INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: 'true',
        INFRA_BACKEND_API_ENABLED_STAGES: 'dev',
      }),
    },
    'dashboard-prod': {
      suffix: 'dash-prod',
      branch: resolveBranch(
        env.INFRA_PIPELINE_BRANCH_DASHBOARD_PROD,
        env.INFRA_PIPELINE_BRANCH_DASHBOARD,
        pipeline?.branchDashboardProd,
        pipeline?.branchProd,
        'master'
      ),
      outputKey: 'dashboardProdPipelineName',
      stage: 'dashboard-prod',
      buildEnv: buildNonExpoPipelineEnv('dashboard-prod', ALL_PIPELINE_SET, {
        INFRA_ENABLE_ADMIN_SITE: 'true',
        INFRA_ADMIN_DEDICATED_STACKS_ONLY: 'true',
        INFRA_ADMIN_ENABLED_STAGES: 'production',
        INFRA_ENABLE_BACKEND_API: 'true',
        INFRA_BACKEND_API_DEDICATED_STACKS_ONLY: 'true',
        INFRA_BACKEND_API_ENABLED_STAGES: 'production',
      }),
    },
  };
}

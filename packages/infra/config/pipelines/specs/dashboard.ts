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
  const googleAuthClientId =
    env.INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_ID ?? env.GOOGLE_AUTH_CLIENT_ID ?? '';
  const googleAuthClientSecret =
    env.INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_SECRET ??
    env.GOOGLE_AUTH_CLIENT_SECRET ??
    env.GOOGLEA_AUTH_CLIENT_SECRET ??
    '';
  const googleAuthClientSecretKey = 'INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_SECRET';
  const betterAuthUrl =
    env.INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL ??
    env.AUTH_BETTER_AUTH_URL ??
    env.EXPO_PUBLIC_BETTER_AUTH_URL ??
    '';
  const betterAuthSecret =
    env.INFRA_BACKEND_API_BETTER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET ?? env.AUTH_SECRET ?? '';
  const betterAuthTrustedOrigins =
    env.INFRA_BACKEND_API_BETTER_AUTH_TRUSTED_ORIGINS ?? env.BETTER_AUTH_TRUSTED_ORIGINS ?? '';

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
        INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL: betterAuthUrl,
        INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_ID: googleAuthClientId,
        INFRA_BACKEND_API_BETTER_AUTH_TRUSTED_ORIGINS: betterAuthTrustedOrigins,
        ...(betterAuthSecret ? { INFRA_BACKEND_API_BETTER_AUTH_SECRET: betterAuthSecret } : {}),
        ...(googleAuthClientSecret ? { [googleAuthClientSecretKey]: googleAuthClientSecret } : {}),
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
        INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL: betterAuthUrl,
        INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_ID: googleAuthClientId,
        INFRA_BACKEND_API_BETTER_AUTH_TRUSTED_ORIGINS: betterAuthTrustedOrigins,
        ...(betterAuthSecret ? { INFRA_BACKEND_API_BETTER_AUTH_SECRET: betterAuthSecret } : {}),
        ...(googleAuthClientSecret ? { [googleAuthClientSecretKey]: googleAuthClientSecret } : {}),
      }),
    },
  };
}

export const STANDARD_PIPELINE_SET =
  'production,dev,identity-dev,identity-prod,api-dev,api-prod,admin-dev,admin-prod';
export const ALL_PIPELINE_SET = `${STANDARD_PIPELINE_SET},dashboard-dev,dashboard-prod`;
export const IDENTITY_PIPELINE_SET =
  'production,dev,identity-dev,identity-prod,admin-dev,admin-prod';

const NON_EXPO_PIPELINE_ENV = {
  INFRA_PRESERVE_EXISTING_ENV: 'true',
  INFRA_LOAD_ROOT_ENV: 'false',
  INFRA_REQUIRE_EXPO_PUBLIC_AUTH: 'false',
  INFRA_ENABLE_EXPO_SITE: 'false',
  INFRA_ENABLE_SECRET_SYNC: 'false',
  INFRA_ENABLE_PREDEPLOY_CHECKS: 'false',
  INFRA_ENABLE_PUBLIC_ASSET_SYNC: 'false',
  INFRA_ENABLE_REACHABILITY_CHECK: 'false',
} as const;

export function pickString(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function resolveBranch(...values: Array<string | undefined>): string {
  return pickString(...values) ?? 'develop';
}

export function buildNonExpoPipelineEnv(
  pipelineProfile: string,
  pipelineList: string,
  overrides: Record<string, string>
): Record<string, string> {
  return {
    INFRA_PIPELINE_PROFILE: pipelineProfile,
    INFRA_PIPELINES: pipelineList,
    ...NON_EXPO_PIPELINE_ENV,
    ...overrides,
  };
}

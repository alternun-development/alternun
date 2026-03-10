import type { ManagedPipeline, PipelineStage } from './types.js';

const CORE_STAGE_ALIASES: Record<PipelineStage, readonly string[]> = {
  production: ['production', 'prod'],
  dev: ['dev'],
  mobile: ['mobile'],
};

const STACK_STAGE_ALIASES: Record<PipelineStage, readonly string[]> = {
  production: [
    ...CORE_STAGE_ALIASES.production,
    'dashboard-prod',
    'dashboard-production',
    'dashboardapi-prod',
    'dashboard-admin-prod',
    'admin-prod',
    'admin-production',
    'backoffice-prod',
    'backoffice-admin-prod',
    'api-prod',
    'api-production',
    'backend-prod',
    'backend-api-prod',
    'identity-prod',
    'identityprod',
    'identity-production',
    'auth-prod',
    'authentik-prod',
  ],
  dev: [
    ...CORE_STAGE_ALIASES.dev,
    'dashboard-dev',
    'dashboardapi-dev',
    'dashboard-admin-dev',
    'admin-dev',
    'backoffice-dev',
    'backoffice-admin-dev',
    'api-dev',
    'backend-dev',
    'backend-api-dev',
    'identity-dev',
    'identitydev',
    'auth-dev',
    'authentik-dev',
  ],
  mobile: [...CORE_STAGE_ALIASES.mobile],
};

const MANAGED_PIPELINE_ALIASES: Record<ManagedPipeline, readonly string[]> = {
  production: ['production', 'prod'],
  dev: ['dev'],
  mobile: ['mobile'],
  'dashboard-dev': [
    'dashboard',
    'dashboard-dev',
    'dashboardapi',
    'dashboardapi-dev',
    'dashboard-admin',
    'dashboard-admin-dev',
  ],
  'dashboard-prod': [
    'dashboard-prod',
    'dashboard-production',
    'dashboardapi-prod',
    'dashboard-admin-prod',
  ],
  'admin-dev': [
    'admin',
    'admin-dev',
    'backoffice',
    'backoffice-dev',
    'backoffice-admin',
    'backoffice-admin-dev',
  ],
  'admin-prod': ['admin-prod', 'admin-production', 'backoffice-prod', 'backoffice-admin-prod'],
  'api-dev': ['api', 'api-dev', 'backend', 'backend-dev', 'backend-api-dev'],
  'api-prod': ['api-prod', 'api-production', 'backend-prod', 'backend-api-prod'],
  'identity-dev': [
    'identity',
    'identity-dev',
    'identitydev',
    'authentik',
    'authentik-dev',
    'auth',
    'auth-dev',
  ],
  'identity-prod': [
    'identity-prod',
    'identityprod',
    'identity-production',
    'authentik-prod',
    'auth-prod',
  ],
};

const ADMIN_SITE_STACK_ALIASES = MANAGED_PIPELINE_ALIASES['admin-dev'].concat(
  MANAGED_PIPELINE_ALIASES['admin-prod']
);
const DASHBOARD_STACK_ALIASES = MANAGED_PIPELINE_ALIASES['dashboard-dev'].concat(
  MANAGED_PIPELINE_ALIASES['dashboard-prod']
);
const IDENTITY_STACK_ALIASES = MANAGED_PIPELINE_ALIASES['identity-dev'].concat(
  MANAGED_PIPELINE_ALIASES['identity-prod']
);
const BACKEND_API_STACK_ALIASES = MANAGED_PIPELINE_ALIASES['api-dev'].concat(
  MANAGED_PIPELINE_ALIASES['api-prod']
);

const DASHBOARD_PIPELINE_PROFILES = [
  'dashboard',
  'dashboard-dev',
  'dashboard-prod',
  'dashboard-production',
  'dashboard-admin',
  'dashboard-api',
] as const;
const ADMIN_PIPELINE_PROFILES = [
  'admin',
  'admin-dev',
  'admin-prod',
  'admin-production',
  'backoffice',
  'backoffice-admin',
] as const;
const BACKEND_PIPELINE_PROFILES = ['api', 'api-dev', 'api-prod', 'backend', 'backend-api'] as const;
const IDENTITY_PIPELINE_PROFILES = [
  'identity',
  'identity-dev',
  'identity-prod',
  'auth',
  'auth-dev',
  'auth-prod',
  'authentik',
  'authentik-dev',
  'authentik-prod',
] as const;

function normalizeStageValue(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

function resolveAlias<T extends string>(
  aliasMap: Record<T, readonly string[]>,
  value: string
): T | undefined {
  const normalized = normalizeStageValue(value);

  for (const [alias, matches] of Object.entries(aliasMap) as Array<[T, readonly string[]]>) {
    if (matches.includes(normalized)) {
      return alias;
    }
  }

  return undefined;
}

function matchesStageAlias(value: string, aliases: readonly string[]): boolean {
  return aliases.includes(normalizeStageValue(value));
}

export function parseCoreDeploymentStage(value: string): PipelineStage | undefined {
  return resolveAlias(CORE_STAGE_ALIASES, value);
}

export function resolveStackDeploymentStage(value: string): PipelineStage | undefined {
  return resolveAlias(STACK_STAGE_ALIASES, value);
}

export function parsePipelineStage(value: string): ManagedPipeline | undefined {
  return resolveAlias(MANAGED_PIPELINE_ALIASES, value);
}

export function parseEnabledPipelineStages(raw: string): Set<PipelineStage> {
  return new Set(
    raw
      .split(',')
      .map(value => parseCoreDeploymentStage(value))
      .filter((value): value is PipelineStage => value !== undefined)
  );
}

export function parseSelectedPipelines(raw: string): Set<ManagedPipeline> {
  return new Set(
    raw
      .split(',')
      .map(value => parsePipelineStage(value))
      .filter((value): value is ManagedPipeline => value !== undefined)
  );
}

export function isAdminSiteStackStage(stage: string): boolean {
  return matchesStageAlias(stage, ADMIN_SITE_STACK_ALIASES);
}

export function isDashboardStackStage(stage: string): boolean {
  return matchesStageAlias(stage, DASHBOARD_STACK_ALIASES);
}

export function isIdentityStackStage(stage: string): boolean {
  return matchesStageAlias(stage, IDENTITY_STACK_ALIASES);
}

export function isBackendApiStackStage(stage: string): boolean {
  return matchesStageAlias(stage, BACKEND_API_STACK_ALIASES);
}

export function getPipelineProfileFlags(profile: string): {
  isDashboardPipelineProfile: boolean;
  isAdminSitePipelineProfile: boolean;
  isBackendApiPipelineProfile: boolean;
  isIdentityPipelineProfile: boolean;
} {
  const normalized = normalizeStageValue(profile);

  return {
    isDashboardPipelineProfile: DASHBOARD_PIPELINE_PROFILES.includes(
      normalized as (typeof DASHBOARD_PIPELINE_PROFILES)[number]
    ),
    isAdminSitePipelineProfile: ADMIN_PIPELINE_PROFILES.includes(
      normalized as (typeof ADMIN_PIPELINE_PROFILES)[number]
    ),
    isBackendApiPipelineProfile: BACKEND_PIPELINE_PROFILES.includes(
      normalized as (typeof BACKEND_PIPELINE_PROFILES)[number]
    ),
    isIdentityPipelineProfile: IDENTITY_PIPELINE_PROFILES.includes(
      normalized as (typeof IDENTITY_PIPELINE_PROFILES)[number]
    ),
  };
}

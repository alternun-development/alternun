/* eslint-disable comma-dangle */

import {
  IDENTITY_INFRA_DEFAULTS,
  buildIdentitySecretNameDefaults,
  buildStageDomains,
} from '../config/infrastructure-specs.js';

export type IdentityEmailProvider = 'ses' | 'postmark';
export type IdentityDatabaseMode = 'rds' | 'ec2';
export type IdentityPolicyEngineMode = 'any' | 'all';

export interface IdentityLocalConfig {
  enabled?: boolean;
  domains?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  ec2?: {
    instanceType?: string;
    volumeSizeGiB?: number;
  };
  rds?: {
    engineVersion?: string;
    instanceType?: string;
    storageGiB?: number;
    multiAz?: boolean;
    publicAccess?: boolean;
    backupRetentionDays?: number;
    performanceInsights?: boolean;
    enhancedMonitoring?: boolean;
  };
  database?: {
    mode?: IdentityDatabaseMode;
  };
  emailProvider?: IdentityEmailProvider;
  authentikImageTag?: string;
  jwt?: {
    audience?: string;
    roleClaim?: string;
    rolesClaim?: string;
    accessTokenTtlMinutes?: number;
  };
  integration?: {
    google?: {
      clientId?: string;
      clientSecret?: string;
      sourceName?: string;
      sourceSlug?: string;
    };
    supabase?: {
      applicationName?: string;
      applicationSlug?: string;
      managementAccessToken?: string;
      oidcClientId?: string;
      projectRef?: string;
      providerName?: string;
      syncConfig?: boolean;
    };
    bootstrap?: {
      admin?: {
        username?: string;
        email?: string;
        name?: string;
        password?: string;
        group?: string;
      };
      defaultApplication?: {
        enabled?: boolean;
        name?: string;
        slug?: string;
        group?: string;
        launchUrl?: string;
        openInNewTab?: boolean;
        publisher?: string;
        description?: string;
        policyEngineMode?: IdentityPolicyEngineMode;
      };
    };
  };
  secrets?: {
    authentikSecretKeyName?: string;
    databaseCredentialsSecretName?: string;
    smtpCredentialsSecretName?: string;
    jwtSigningKeySecretName?: string;
    integrationConfigSecretName?: string;
  };
}

export interface IdentitySettings {
  enabled: boolean;
  stageDomains: {
    production: string;
    dev: string;
    mobile: string;
  };
  ec2: {
    instanceType: string;
    volumeSizeGiB: number;
  };
  rds: {
    engineVersion: string;
    instanceType: string;
    storageGiB: number;
    multiAz: boolean;
    publicAccess: boolean;
    backupRetentionDays: number;
    performanceInsights: boolean;
    enhancedMonitoring: boolean;
  };
  database: {
    mode: IdentityDatabaseMode;
  };
  emailProvider: IdentityEmailProvider;
  authentikImageTag: string;
  jwt: {
    audience: string;
    roleClaim: string;
    rolesClaim: string;
    accessTokenTtlMinutes: number;
  };
  integration: {
    google: {
      clientId: string;
      clientSecret: string;
      sourceName: string;
      sourceSlug: string;
    };
    supabase: {
      applicationName: string;
      applicationSlug: string;
      managementAccessToken: string;
      oidcClientId: string;
      projectRef: string;
      providerName: string;
      syncConfig: boolean;
    };
    bootstrap: {
      admin: {
        username: string;
        email: string;
        name: string;
        password: string;
        group: string;
      };
      defaultApplication: {
        enabled: boolean;
        name: string;
        slug: string;
        group: string;
        launchUrl: string;
        openInNewTab: boolean;
        publisher: string;
        description: string;
        policyEngineMode: IdentityPolicyEngineMode;
      };
    };
  };
  secrets: {
    authentikSecretKeyName: string;
    databaseCredentialsSecretName: string;
    smtpCredentialsSecretName: string;
    jwtSigningKeySecretName: string;
    integrationConfigSecretName: string;
  };
}

interface BuildIdentitySettingsArgs {
  appName: string;
  rootDomain: string;
  env: NodeJS.ProcessEnv;
  localConfig?: IdentityLocalConfig;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
}

function parsePositiveInteger(value: string | number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeEmailProvider(value: string | undefined): IdentityEmailProvider {
  return value?.toLowerCase() === 'postmark' ? 'postmark' : IDENTITY_INFRA_DEFAULTS.emailProvider;
}

function normalizeDatabaseMode(value: string | undefined): IdentityDatabaseMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'ec2' || normalized === 'local' || normalized === 'local-ec2') {
    return 'ec2';
  }
  return 'rds';
}

function normalizePolicyEngineMode(value: string | undefined): IdentityPolicyEngineMode {
  return value?.trim().toLowerCase() === 'all' ? 'all' : 'any';
}

function extractAuthentikTag(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error('INFRA_IDENTITY_AUTHENTIK_IMAGE_TAG cannot be empty.');
  }

  if (trimmed.includes('/') && trimmed.includes(':')) {
    return trimmed.split(':').pop() ?? trimmed;
  }

  return trimmed;
}

function parseAuthentikCalendarVersion(tag: string): { year: number; release: number } {
  const match = tag.match(/^(\d{4})\.(\d+)(?:\.[0-9A-Za-z-]+)*$/);

  if (!match) {
    throw new Error(
      [
        `Invalid Authentik image tag "${tag}".`,
        'Use a calendar-version tag like "2026.2" or "2026.2.1".',
      ].join(' ')
    );
  }

  return {
    year: Number(match[1]),
    release: Number(match[2]),
  };
}

function normalizeAuthentikImageTag(value: string | undefined): string {
  const extractedTag = extractAuthentikTag(value ?? IDENTITY_INFRA_DEFAULTS.authentikImageTag);
  const { year, release } = parseAuthentikCalendarVersion(extractedTag);
  const minYear = 2025;
  const minRelease = 10;
  const supportsRedisless = year > minYear || (year === minYear && release >= minRelease);

  if (!supportsRedisless) {
    throw new Error(
      [
        `Authentik tag "${extractedTag}" is not supported in this infrastructure.`,
        'Use version >= 2025.10 because older versions require Redis.',
      ].join(' ')
    );
  }

  return extractedTag;
}

function parseSupabaseProjectRef(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return '';
  }

  if (!trimmed.includes('://') && !trimmed.includes('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const supabaseSuffix = '.supabase.co';

    if (host.endsWith(supabaseSuffix)) {
      return host.slice(0, -supabaseSuffix.length);
    }
  } catch {
    return '';
  }

  return '';
}

export function buildIdentitySettings(args: BuildIdentitySettingsArgs): IdentitySettings {
  const defaultStageDomains = buildStageDomains('auth', args.rootDomain);
  const localConfig = args.localConfig;
  const defaultIdentitySecretNames = buildIdentitySecretNameDefaults(args.appName);

  return {
    enabled: parseBoolean(
      args.env.INFRA_IDENTITY_ENABLED ??
        (localConfig?.enabled !== undefined ? String(localConfig.enabled) : undefined),
      false
    ),
    stageDomains: {
      production:
        args.env.INFRA_IDENTITY_DOMAIN_PRODUCTION ??
        localConfig?.domains?.production ??
        defaultStageDomains.production,
      dev:
        args.env.INFRA_IDENTITY_DOMAIN_DEV ?? localConfig?.domains?.dev ?? defaultStageDomains.dev,
      mobile:
        args.env.INFRA_IDENTITY_DOMAIN_MOBILE ??
        localConfig?.domains?.mobile ??
        defaultStageDomains.mobile,
    },
    ec2: {
      instanceType:
        args.env.INFRA_IDENTITY_EC2_INSTANCE_TYPE ??
        localConfig?.ec2?.instanceType ??
        IDENTITY_INFRA_DEFAULTS.ec2.instanceType,
      volumeSizeGiB: parsePositiveInteger(
        args.env.INFRA_IDENTITY_EC2_VOLUME_SIZE_GIB ?? localConfig?.ec2?.volumeSizeGiB,
        IDENTITY_INFRA_DEFAULTS.ec2.volumeSizeGiB
      ),
    },
    rds: {
      engineVersion:
        args.env.INFRA_IDENTITY_RDS_ENGINE_VERSION ??
        localConfig?.rds?.engineVersion ??
        IDENTITY_INFRA_DEFAULTS.rds.engineVersion,
      instanceType:
        args.env.INFRA_IDENTITY_RDS_INSTANCE_TYPE ??
        localConfig?.rds?.instanceType ??
        IDENTITY_INFRA_DEFAULTS.rds.instanceType,
      storageGiB: parsePositiveInteger(
        args.env.INFRA_IDENTITY_RDS_STORAGE_GIB ?? localConfig?.rds?.storageGiB,
        IDENTITY_INFRA_DEFAULTS.rds.storageGiB
      ),
      multiAz: parseBoolean(
        args.env.INFRA_IDENTITY_RDS_MULTI_AZ ??
          (localConfig?.rds?.multiAz !== undefined ? String(localConfig.rds.multiAz) : undefined),
        IDENTITY_INFRA_DEFAULTS.rds.multiAz
      ),
      publicAccess: parseBoolean(
        args.env.INFRA_IDENTITY_RDS_PUBLIC_ACCESS ??
          (localConfig?.rds?.publicAccess !== undefined
            ? String(localConfig.rds.publicAccess)
            : undefined),
        IDENTITY_INFRA_DEFAULTS.rds.publicAccess
      ),
      backupRetentionDays: parsePositiveInteger(
        args.env.INFRA_IDENTITY_RDS_BACKUP_RETENTION_DAYS ?? localConfig?.rds?.backupRetentionDays,
        IDENTITY_INFRA_DEFAULTS.rds.backupRetentionDays
      ),
      performanceInsights: parseBoolean(
        args.env.INFRA_IDENTITY_RDS_PERFORMANCE_INSIGHTS ??
          (localConfig?.rds?.performanceInsights !== undefined
            ? String(localConfig.rds.performanceInsights)
            : undefined),
        IDENTITY_INFRA_DEFAULTS.rds.performanceInsights
      ),
      enhancedMonitoring: parseBoolean(
        args.env.INFRA_IDENTITY_RDS_ENHANCED_MONITORING ??
          (localConfig?.rds?.enhancedMonitoring !== undefined
            ? String(localConfig.rds.enhancedMonitoring)
            : undefined),
        IDENTITY_INFRA_DEFAULTS.rds.enhancedMonitoring
      ),
    },
    database: {
      mode: normalizeDatabaseMode(
        args.env.INFRA_IDENTITY_DATABASE_MODE ?? localConfig?.database?.mode
      ),
    },
    emailProvider: normalizeEmailProvider(
      args.env.INFRA_IDENTITY_EMAIL_PROVIDER ?? localConfig?.emailProvider
    ),
    authentikImageTag: normalizeAuthentikImageTag(
      args.env.INFRA_IDENTITY_AUTHENTIK_IMAGE_TAG ?? localConfig?.authentikImageTag
    ),
    jwt: {
      audience:
        args.env.INFRA_IDENTITY_JWT_AUDIENCE ??
        localConfig?.jwt?.audience ??
        IDENTITY_INFRA_DEFAULTS.jwt.audience,
      roleClaim:
        args.env.INFRA_IDENTITY_JWT_ROLE_CLAIM ??
        localConfig?.jwt?.roleClaim ??
        IDENTITY_INFRA_DEFAULTS.jwt.roleClaim,
      rolesClaim:
        args.env.INFRA_IDENTITY_JWT_ROLES_CLAIM ??
        localConfig?.jwt?.rolesClaim ??
        IDENTITY_INFRA_DEFAULTS.jwt.rolesClaim,
      accessTokenTtlMinutes: parsePositiveInteger(
        args.env.INFRA_IDENTITY_JWT_ACCESS_TOKEN_TTL_MINUTES ??
          localConfig?.jwt?.accessTokenTtlMinutes,
        IDENTITY_INFRA_DEFAULTS.jwt.accessTokenTtlMinutes
      ),
    },
    integration: {
      google: {
        clientId:
          args.env.INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID ??
          localConfig?.integration?.google?.clientId ??
          args.env.GOOGLE_AUTH_CLIENT_ID ??
          '',
        clientSecret:
          args.env.INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_SECRET ??
          localConfig?.integration?.google?.clientSecret ??
          args.env.GOOGLE_AUTH_CLIENT_SECRET ??
          args.env.GOOGLEA_AUTH_CLIENT_SECRET ??
          '',
        sourceName:
          args.env.INFRA_IDENTITY_GOOGLE_SOURCE_NAME ??
          localConfig?.integration?.google?.sourceName ??
          IDENTITY_INFRA_DEFAULTS.integration.google.sourceName,
        sourceSlug:
          args.env.INFRA_IDENTITY_GOOGLE_SOURCE_SLUG ??
          localConfig?.integration?.google?.sourceSlug ??
          IDENTITY_INFRA_DEFAULTS.integration.google.sourceSlug,
      },
      supabase: {
        applicationName:
          args.env.INFRA_IDENTITY_SUPABASE_APPLICATION_NAME ??
          localConfig?.integration?.supabase?.applicationName ??
          IDENTITY_INFRA_DEFAULTS.integration.supabase.applicationName,
        applicationSlug:
          args.env.INFRA_IDENTITY_SUPABASE_APPLICATION_SLUG ??
          localConfig?.integration?.supabase?.applicationSlug ??
          IDENTITY_INFRA_DEFAULTS.integration.supabase.applicationSlug,
        managementAccessToken:
          args.env.INFRA_IDENTITY_SUPABASE_MANAGEMENT_ACCESS_TOKEN ??
          localConfig?.integration?.supabase?.managementAccessToken ??
          args.env.SUPABASE_ACCESS_TOKEN ??
          '',
        oidcClientId:
          args.env.INFRA_IDENTITY_SUPABASE_OIDC_CLIENT_ID ??
          localConfig?.integration?.supabase?.oidcClientId ??
          IDENTITY_INFRA_DEFAULTS.integration.supabase.applicationSlug,
        projectRef: parseSupabaseProjectRef(
          args.env.INFRA_IDENTITY_SUPABASE_PROJECT_REF ??
            localConfig?.integration?.supabase?.projectRef ??
            args.env.SUPABASE_PROJECT_REF ??
            args.env.EXPO_PUBLIC_SUPABASE_URL ??
            args.env.EXPO_PUBLIC_SUPABASE_URI
        ),
        providerName:
          args.env.INFRA_IDENTITY_SUPABASE_PROVIDER_NAME ??
          localConfig?.integration?.supabase?.providerName ??
          IDENTITY_INFRA_DEFAULTS.integration.supabase.providerName,
        syncConfig: parseBoolean(
          args.env.INFRA_IDENTITY_SUPABASE_SYNC_CONFIG ??
            (localConfig?.integration?.supabase?.syncConfig !== undefined
              ? String(localConfig.integration.supabase.syncConfig)
              : undefined),
          IDENTITY_INFRA_DEFAULTS.integration.supabase.syncConfig
        ),
      },
      bootstrap: {
        admin: {
          username:
            args.env.INFRA_IDENTITY_BOOTSTRAP_ADMIN_USERNAME ??
            localConfig?.integration?.bootstrap?.admin?.username ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.admin.username,
          email:
            args.env.INFRA_IDENTITY_BOOTSTRAP_ADMIN_EMAIL ??
            localConfig?.integration?.bootstrap?.admin?.email ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.admin.email,
          name:
            args.env.INFRA_IDENTITY_BOOTSTRAP_ADMIN_NAME ??
            localConfig?.integration?.bootstrap?.admin?.name ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.admin.name,
          password:
            args.env.INFRA_IDENTITY_BOOTSTRAP_ADMIN_PASSWORD ??
            localConfig?.integration?.bootstrap?.admin?.password ??
            '',
          group:
            args.env.INFRA_IDENTITY_BOOTSTRAP_ADMIN_GROUP ??
            localConfig?.integration?.bootstrap?.admin?.group ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.admin.group,
        },
        defaultApplication: {
          enabled: parseBoolean(
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_ENABLED ??
              (localConfig?.integration?.bootstrap?.defaultApplication?.enabled !== undefined
                ? String(localConfig.integration.bootstrap.defaultApplication.enabled)
                : undefined),
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.defaultApplication.enabled
          ),
          name:
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_NAME ??
            localConfig?.integration?.bootstrap?.defaultApplication?.name ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.defaultApplication.name,
          slug:
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_SLUG ??
            localConfig?.integration?.bootstrap?.defaultApplication?.slug ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.defaultApplication.slug,
          group:
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_GROUP ??
            localConfig?.integration?.bootstrap?.defaultApplication?.group ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.defaultApplication.group,
          launchUrl:
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL ??
            localConfig?.integration?.bootstrap?.defaultApplication?.launchUrl ??
            '',
          openInNewTab: parseBoolean(
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_OPEN_IN_NEW_TAB ??
              (localConfig?.integration?.bootstrap?.defaultApplication?.openInNewTab !== undefined
                ? String(localConfig.integration.bootstrap.defaultApplication.openInNewTab)
                : undefined),
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.defaultApplication.openInNewTab
          ),
          publisher:
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_PUBLISHER ??
            localConfig?.integration?.bootstrap?.defaultApplication?.publisher ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.defaultApplication.publisher,
          description:
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_DESCRIPTION ??
            localConfig?.integration?.bootstrap?.defaultApplication?.description ??
            IDENTITY_INFRA_DEFAULTS.integration.bootstrap.defaultApplication.description,
          policyEngineMode: normalizePolicyEngineMode(
            args.env.INFRA_IDENTITY_DEFAULT_APPLICATION_POLICY_ENGINE_MODE ??
              localConfig?.integration?.bootstrap?.defaultApplication?.policyEngineMode
          ),
        },
      },
    },
    secrets: {
      authentikSecretKeyName:
        args.env.INFRA_IDENTITY_SECRET_AUTHENTIK_KEY_NAME ??
        localConfig?.secrets?.authentikSecretKeyName ??
        defaultIdentitySecretNames.authentikSecretKeyName,
      databaseCredentialsSecretName:
        args.env.INFRA_IDENTITY_SECRET_DB_CREDENTIALS_NAME ??
        localConfig?.secrets?.databaseCredentialsSecretName ??
        defaultIdentitySecretNames.databaseCredentialsSecretName,
      smtpCredentialsSecretName:
        args.env.INFRA_IDENTITY_SECRET_SMTP_CREDENTIALS_NAME ??
        localConfig?.secrets?.smtpCredentialsSecretName ??
        defaultIdentitySecretNames.smtpCredentialsSecretName,
      jwtSigningKeySecretName:
        args.env.INFRA_IDENTITY_SECRET_JWT_SIGNING_KEY_NAME ??
        localConfig?.secrets?.jwtSigningKeySecretName ??
        defaultIdentitySecretNames.jwtSigningKeySecretName,
      integrationConfigSecretName:
        args.env.INFRA_IDENTITY_SECRET_INTEGRATION_CONFIG_NAME ??
        localConfig?.secrets?.integrationConfigSecretName ??
        defaultIdentitySecretNames.integrationConfigSecretName,
    },
  };
}

export function resolveIdentityStageDomain(settings: IdentitySettings, stage: string): string {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');

  if (
    normalized === 'production' ||
    normalized === 'prod' ||
    normalized === 'identity-prod' ||
    normalized === 'identity-production' ||
    normalized === 'auth-prod' ||
    normalized === 'authentik-prod'
  ) {
    return settings.stageDomains.production;
  }

  if (normalized === 'mobile' || normalized === 'identity-mobile') {
    return settings.stageDomains.mobile;
  }

  return settings.stageDomains.dev;
}

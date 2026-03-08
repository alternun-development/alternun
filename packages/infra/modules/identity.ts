/* eslint-disable comma-dangle */

export type IdentityEmailProvider = 'ses' | 'postmark';

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
  emailProvider?: IdentityEmailProvider;
  authentikImageTag?: string;
  jwt?: {
    audience?: string;
    roleClaim?: string;
    rolesClaim?: string;
    accessTokenTtlMinutes?: number;
  };
  secrets?: {
    authentikSecretKeyName?: string;
    databaseCredentialsSecretName?: string;
    smtpCredentialsSecretName?: string;
    jwtSigningKeySecretName?: string;
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
  emailProvider: IdentityEmailProvider;
  authentikImageTag: string;
  jwt: {
    audience: string;
    roleClaim: string;
    rolesClaim: string;
    accessTokenTtlMinutes: number;
  };
  secrets: {
    authentikSecretKeyName: string;
    databaseCredentialsSecretName: string;
    smtpCredentialsSecretName: string;
    jwtSigningKeySecretName: string;
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

function buildDefaultStageDomains(rootDomain: string): IdentitySettings['stageDomains'] {
  return {
    production: `auth.${rootDomain}`,
    dev: `auth.testnet.${rootDomain}`,
    mobile: `auth.preview.${rootDomain}`,
  };
}

function normalizeEmailProvider(value: string | undefined): IdentityEmailProvider {
  return value?.toLowerCase() === 'postmark' ? 'postmark' : 'ses';
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
  const extractedTag = extractAuthentikTag(value ?? '2026.2');
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

export function buildIdentitySettings(args: BuildIdentitySettingsArgs): IdentitySettings {
  const defaultStageDomains = buildDefaultStageDomains(args.rootDomain);
  const localConfig = args.localConfig;

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
        args.env.INFRA_IDENTITY_EC2_INSTANCE_TYPE ?? localConfig?.ec2?.instanceType ?? 't3.small',
      volumeSizeGiB: parsePositiveInteger(
        args.env.INFRA_IDENTITY_EC2_VOLUME_SIZE_GIB ?? localConfig?.ec2?.volumeSizeGiB,
        20
      ),
    },
    rds: {
      engineVersion:
        args.env.INFRA_IDENTITY_RDS_ENGINE_VERSION ?? localConfig?.rds?.engineVersion ?? '16',
      instanceType:
        args.env.INFRA_IDENTITY_RDS_INSTANCE_TYPE ??
        localConfig?.rds?.instanceType ??
        'db.t4g.micro',
      storageGiB: parsePositiveInteger(
        args.env.INFRA_IDENTITY_RDS_STORAGE_GIB ?? localConfig?.rds?.storageGiB,
        20
      ),
      multiAz: parseBoolean(
        args.env.INFRA_IDENTITY_RDS_MULTI_AZ ??
          (localConfig?.rds?.multiAz !== undefined ? String(localConfig.rds.multiAz) : undefined),
        false
      ),
      publicAccess: parseBoolean(
        args.env.INFRA_IDENTITY_RDS_PUBLIC_ACCESS ??
          (localConfig?.rds?.publicAccess !== undefined
            ? String(localConfig.rds.publicAccess)
            : undefined),
        false
      ),
      backupRetentionDays: parsePositiveInteger(
        args.env.INFRA_IDENTITY_RDS_BACKUP_RETENTION_DAYS ?? localConfig?.rds?.backupRetentionDays,
        7
      ),
      performanceInsights: parseBoolean(
        args.env.INFRA_IDENTITY_RDS_PERFORMANCE_INSIGHTS ??
          (localConfig?.rds?.performanceInsights !== undefined
            ? String(localConfig.rds.performanceInsights)
            : undefined),
        false
      ),
      enhancedMonitoring: parseBoolean(
        args.env.INFRA_IDENTITY_RDS_ENHANCED_MONITORING ??
          (localConfig?.rds?.enhancedMonitoring !== undefined
            ? String(localConfig.rds.enhancedMonitoring)
            : undefined),
        false
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
        args.env.INFRA_IDENTITY_JWT_AUDIENCE ?? localConfig?.jwt?.audience ?? 'alternun-app',
      roleClaim: args.env.INFRA_IDENTITY_JWT_ROLE_CLAIM ?? localConfig?.jwt?.roleClaim ?? 'role',
      rolesClaim:
        args.env.INFRA_IDENTITY_JWT_ROLES_CLAIM ?? localConfig?.jwt?.rolesClaim ?? 'alternun_roles',
      accessTokenTtlMinutes: parsePositiveInteger(
        args.env.INFRA_IDENTITY_JWT_ACCESS_TOKEN_TTL_MINUTES ??
          localConfig?.jwt?.accessTokenTtlMinutes,
        15
      ),
    },
    secrets: {
      authentikSecretKeyName:
        args.env.INFRA_IDENTITY_SECRET_AUTHENTIK_KEY_NAME ??
        localConfig?.secrets?.authentikSecretKeyName ??
        `${args.appName}/identity/authentik-secret-key`,
      databaseCredentialsSecretName:
        args.env.INFRA_IDENTITY_SECRET_DB_CREDENTIALS_NAME ??
        localConfig?.secrets?.databaseCredentialsSecretName ??
        `${args.appName}/identity/database-credentials`,
      smtpCredentialsSecretName:
        args.env.INFRA_IDENTITY_SECRET_SMTP_CREDENTIALS_NAME ??
        localConfig?.secrets?.smtpCredentialsSecretName ??
        `${args.appName}/identity/smtp-credentials`,
      jwtSigningKeySecretName:
        args.env.INFRA_IDENTITY_SECRET_JWT_SIGNING_KEY_NAME ??
        localConfig?.secrets?.jwtSigningKeySecretName ??
        `${args.appName}/identity/jwt-signing-key`,
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

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable comma-dangle */
/* eslint-disable indent */

import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { RandomPassword } from '@pulumi/random';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { gzipSync } from 'node:zlib';
import { buildStageDomains } from '../config/infrastructure-specs.js';
import type { IdentityDatabaseMode, IdentitySettings } from './identity.js';
import { resolveIdentityStageDomain } from './identity.js';

export interface IdentityInfrastructureArgs {
  appName: string;
  rootDomain: string;
  stage: string;
  hostedZoneId?: string;
  settings: IdentitySettings;
}

export interface IdentityInfrastructureResources {
  domain: string;
  dnsRecordFqdn: pulumi.Output<string>;
  instanceId: pulumi.Output<string>;
  instanceProfileName: pulumi.Output<string>;
  publicIp: pulumi.Output<string>;
  privateIp: pulumi.Output<string>;
  route53RecordName: pulumi.Output<string>;
  securityGroupIds: {
    app: pulumi.Output<string>;
    database: pulumi.Output<string>;
  };
  secrets: {
    authentik: {
      arn: pulumi.Output<string>;
      name: pulumi.Output<string>;
    };
    databaseCredentials: {
      arn: pulumi.Output<string>;
      name: pulumi.Output<string>;
    };
    jwtSigningKey: {
      arn: pulumi.Output<string>;
      name: pulumi.Output<string>;
    };
    smtpCredentials: {
      arn: pulumi.Output<string>;
      name: pulumi.Output<string>;
    };
    integrationConfig: {
      arn: pulumi.Output<string>;
      name: pulumi.Output<string>;
    };
  };
  vpc: {
    id: pulumi.Output<string>;
    privateSubnets: pulumi.Output<string[]>;
    publicSubnets: pulumi.Output<string[]>;
  };
  database: {
    mode: pulumi.Output<IdentityDatabaseMode>;
    address: pulumi.Output<string>;
    arn?: pulumi.Output<string>;
    dbName: pulumi.Output<string>;
    endpoint: pulumi.Output<string>;
    identifier?: pulumi.Output<string>;
    port: pulumi.Output<number>;
    subnetGroupName?: pulumi.Output<string>;
    username: pulumi.Output<string>;
  };
  acmeBackup?: {
    bucketArn: pulumi.Output<string>;
    bucketName: pulumi.Output<string>;
    prefix: pulumi.Output<string>;
  };
  loadBalancer?: {
    arn: pulumi.Output<string>;
    dnsName: pulumi.Output<string>;
    hostedZoneId: pulumi.Output<string>;
    securityGroupId: pulumi.Output<string>;
    targetGroupArn: pulumi.Output<string>;
  };
}

interface IdentityVpcComponent {
  id: pulumi.Output<string>;
  privateSubnets: pulumi.Output<pulumi.Input<string>[]>;
  publicSubnets: pulumi.Output<pulumi.Input<string>[]>;
}

const ARM_INSTANCE_PREFIXES = [
  'a1.',
  'c6g.',
  'c6gd.',
  'c7g.',
  'c7gd.',
  'c7gn.',
  'im4gn.',
  'is4gen.',
  'm6g.',
  'm6gd.',
  'm7g.',
  'm7gd.',
  'r6g.',
  'r6gd.',
  'r7g.',
  'r7gd.',
  't4g.',
  'x2gd.',
];

function readIdentityTemplate(fileName: string): string {
  const runtimePath = resolvePath(process.cwd(), 'scripts', 'templates', fileName);
  try {
    return readFileSync(runtimePath, 'utf8').trimEnd();
  } catch {
    const sourcePath = new URL(`../scripts/templates/${fileName}`, import.meta.url);
    return readFileSync(sourcePath, 'utf8').trimEnd();
  }
}

const DEPLOY_AUTHENTIK_SCRIPT_TEMPLATE = readIdentityTemplate('deploy-authentik.sh');
const DOCKER_COMPOSE_EC2_ROUTE53_TEMPLATE = readIdentityTemplate('docker-compose.ec2.yml');
const DOCKER_COMPOSE_RDS_ROUTE53_TEMPLATE = readIdentityTemplate('docker-compose.rds.yml');
const DOCKER_COMPOSE_EC2_ALB_TEMPLATE = readIdentityTemplate('docker-compose.ec2.alb.yml');
const DOCKER_COMPOSE_RDS_ALB_TEMPLATE = readIdentityTemplate('docker-compose.rds.alb.yml');
const AUTHENTIK_INTEGRATION_BOOTSTRAP_SCRIPT_TEMPLATE = readIdentityTemplate(
  'bootstrap-authentik-integrations.py'
);

function isArmInstanceType(instanceType: string): boolean {
  return ARM_INSTANCE_PREFIXES.some(prefix => instanceType.startsWith(prefix));
}

function sanitizeResourceName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '-');
}

function sanitizeBucketName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function sanitizeSecretName(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function scopeSecretName(secretName: string, stage: string): string {
  const normalized = sanitizeSecretName(secretName);

  if (normalized.endsWith(`/${stage}`) || normalized.endsWith(`-${stage}`)) {
    return normalized;
  }

  return `${normalized}/${stage}`;
}

function resolveApplicationStageKey(stage: string): 'production' | 'dev' | 'mobile' {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');

  if (
    normalized === 'production' ||
    normalized === 'prod' ||
    normalized === 'identity-prod' ||
    normalized === 'dashboard-prod'
  ) {
    return 'production';
  }

  if (normalized === 'mobile' || normalized === 'preview' || normalized === 'identity-mobile') {
    return 'mobile';
  }

  return 'dev';
}

function gzipUserData(userData: pulumi.Output<string>): pulumi.Output<string> {
  return userData.apply(script => gzipSync(Buffer.from(script, 'utf8')).toString('base64'));
}

function createResourceTags(args: IdentityInfrastructureArgs): Record<string, string> {
  return {
    Application: args.appName,
    Component: 'identity',
    ManagedBy: 'pulumi',
    Stage: args.stage,
  };
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function isProductionIdentityStage(stage: string): boolean {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');
  return (
    normalized === 'production' ||
    normalized === 'prod' ||
    normalized === 'identity-prod' ||
    normalized === 'identity-production' ||
    normalized === 'auth-prod' ||
    normalized === 'authentik-prod'
  );
}

function normalizeIdentityEnvironmentLabel(stage: string): string {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');

  if (
    normalized === 'dev' ||
    normalized === 'testnet' ||
    normalized === 'identity-dev' ||
    normalized === 'identitydev' ||
    normalized === 'auth-dev' ||
    normalized === 'authentik-dev'
  ) {
    return 'testnet';
  }

  if (
    normalized === 'prod' ||
    normalized === 'production' ||
    normalized === 'identity-prod' ||
    normalized === 'identityprod' ||
    normalized === 'identity-production' ||
    normalized === 'auth-prod' ||
    normalized === 'authentik-prod'
  ) {
    return 'production';
  }

  if (
    normalized === 'mobile' ||
    normalized === 'preview' ||
    normalized === 'identity-mobile' ||
    normalized === 'auth-mobile' ||
    normalized === 'authentik-mobile'
  ) {
    return 'preview';
  }

  return normalized;
}

function buildAuthBootstrapUserData(args: {
  appName: string;
  rootDomain: string;
  stage: string;
  domain: string;
  databaseMode: IdentityDatabaseMode;
  ingressMode: string;
  tlsMode: string;
  acmeEmail: string;
  route53HostedZoneId: pulumi.Input<string>;
  acmeBackupBucketName: pulumi.Input<string>;
  acmeBackupPrefix: string;
  authentikImageTag: string;
  authentikSecretArn: pulumi.Input<string>;
  databaseCredentialsSecretArn: pulumi.Input<string>;
  smtpCredentialsSecretArn: pulumi.Input<string>;
  jwtSigningKeySecretArn: pulumi.Input<string>;
  integrationConfigSecretArn: pulumi.Input<string>;
}): pulumi.Output<string> {
  return pulumi
    .all([
      args.authentikSecretArn,
      args.databaseCredentialsSecretArn,
      args.smtpCredentialsSecretArn,
      args.jwtSigningKeySecretArn,
      args.integrationConfigSecretArn,
      args.route53HostedZoneId,
      args.acmeBackupBucketName,
    ])
    .apply(
      ([
        authentikSecretArn,
        databaseCredentialsSecretArn,
        smtpCredentialsSecretArn,
        jwtSigningKeySecretArn,
        integrationConfigSecretArn,
        route53HostedZoneId,
        acmeBackupBucketName,
      ]) => `#!/bin/bash
set -euxo pipefail

dnf install -y docker jq awscli
if ! command -v curl >/dev/null 2>&1; then
  dnf install -y curl-minimal
fi
systemctl enable --now docker
usermod -aG docker ec2-user

if ! docker compose version >/dev/null 2>&1; then
  if ! dnf install -y docker-compose-plugin; then
    dnf install -y docker-compose || true
  fi
fi

if ! docker compose version >/dev/null 2>&1; then
  ARCH="$(uname -m)"
  case "\${ARCH}" in
    x86_64 | amd64) COMPOSE_ARCH="x86_64" ;;
    aarch64 | arm64) COMPOSE_ARCH="aarch64" ;;
    *)
      echo "Unsupported architecture for docker compose plugin: \${ARCH}"
      exit 1
      ;;
  esac

  install -d /usr/local/libexec/docker/cli-plugins
  curl -fsSL "https://github.com/docker/compose/releases/download/v2.33.1/docker-compose-linux-\${COMPOSE_ARCH}" -o /usr/local/libexec/docker/cli-plugins/docker-compose
  chmod 0755 /usr/local/libexec/docker/cli-plugins/docker-compose
fi

docker compose version

install -d -o ec2-user -g ec2-user /opt/alternun/identity
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik/data
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik/certs
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik/custom-templates
install -d -o ec2-user -g ec2-user /opt/alternun/identity/templates

cat >/etc/alternun-identity.env <<'ENVEOF'
ALTERNUN_APP_NAME=${args.appName}
ALTERNUN_ROOT_DOMAIN=${args.rootDomain}
ALTERNUN_STAGE=${args.stage}
ALTERNUN_IDENTITY_DOMAIN=${args.domain}
ALTERNUN_IDENTITY_INGRESS_MODE=${args.ingressMode}
ALTERNUN_IDENTITY_TLS_MODE=${args.tlsMode}
ALTERNUN_IDENTITY_TLS_ACME_EMAIL=${args.acmeEmail}
ALTERNUN_ROUTE53_HOSTED_ZONE_ID=${route53HostedZoneId}
ALTERNUN_IDENTITY_ACME_BACKUP_BUCKET=${acmeBackupBucketName}
ALTERNUN_IDENTITY_ACME_BACKUP_PREFIX=${args.acmeBackupPrefix}
AUTHENTIK_IMAGE_TAG=${args.authentikImageTag}
AUTHENTIK_DATABASE_MODE=${args.databaseMode}
AUTHENTIK_SECRET_ARN=${authentikSecretArn}
AUTHENTIK_DATABASE_SECRET_ARN=${databaseCredentialsSecretArn}
AUTHENTIK_SMTP_SECRET_ARN=${smtpCredentialsSecretArn}
AUTHENTIK_JWT_SIGNING_SECRET_ARN=${jwtSigningKeySecretArn}
AUTHENTIK_INTEGRATION_CONFIG_SECRET_ARN=${integrationConfigSecretArn}
ENVEOF

chmod 0600 /etc/alternun-identity.env
chown root:root /etc/alternun-identity.env

cat >/opt/alternun/identity/deploy-authentik.sh <<'SCRIPTEOF'
${DEPLOY_AUTHENTIK_SCRIPT_TEMPLATE}
SCRIPTEOF

cat >/opt/alternun/identity/templates/docker-compose.ec2.yml <<'COMPOSEEC2EOF'
${DOCKER_COMPOSE_EC2_ROUTE53_TEMPLATE}
COMPOSEEC2EOF

cat >/opt/alternun/identity/templates/docker-compose.rds.yml <<'COMPOSERDSEOF'
${DOCKER_COMPOSE_RDS_ROUTE53_TEMPLATE}
COMPOSERDSEOF

cat >/opt/alternun/identity/templates/docker-compose.ec2.alb.yml <<'COMPOSEEC2ALBEOF'
${DOCKER_COMPOSE_EC2_ALB_TEMPLATE}
COMPOSEEC2ALBEOF

cat >/opt/alternun/identity/templates/docker-compose.rds.alb.yml <<'COMPOSERDSALBEOF'
${DOCKER_COMPOSE_RDS_ALB_TEMPLATE}
COMPOSERDSALBEOF

cat >/opt/alternun/identity/templates/bootstrap-authentik-integrations.py <<'BOOTSTRAPEOF'
${AUTHENTIK_INTEGRATION_BOOTSTRAP_SCRIPT_TEMPLATE}
BOOTSTRAPEOF

chmod 0755 /opt/alternun/identity/deploy-authentik.sh
chmod 0644 /opt/alternun/identity/templates/docker-compose.ec2.yml
chmod 0644 /opt/alternun/identity/templates/docker-compose.rds.yml
chmod 0644 /opt/alternun/identity/templates/docker-compose.ec2.alb.yml
chmod 0644 /opt/alternun/identity/templates/docker-compose.rds.alb.yml
chmod 0644 /opt/alternun/identity/templates/bootstrap-authentik-integrations.py
chown ec2-user:ec2-user /opt/alternun/identity/templates/docker-compose.ec2.yml
chown ec2-user:ec2-user /opt/alternun/identity/templates/docker-compose.rds.yml
chown ec2-user:ec2-user /opt/alternun/identity/templates/docker-compose.ec2.alb.yml
chown ec2-user:ec2-user /opt/alternun/identity/templates/docker-compose.rds.alb.yml
chown ec2-user:ec2-user /opt/alternun/identity/templates/bootstrap-authentik-integrations.py

cat >/etc/systemd/system/alternun-authentik.service <<'SERVICEEOF'
[Unit]
Description=Alternun Authentik Runtime
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/opt/alternun/identity
ExecStart=/opt/alternun/identity/deploy-authentik.sh
RemainAfterExit=true
TimeoutStartSec=900

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable --now alternun-authentik.service
`
    );
}

export function deployIdentityInfrastructure(
  args: IdentityInfrastructureArgs
): IdentityInfrastructureResources {
  const productionIdentityStage = isProductionIdentityStage(args.stage);
  const userDataReplaceOnChange = parseBooleanEnv(
    process.env.INFRA_IDENTITY_USERDATA_REPLACE_ON_CHANGE,
    false
  );
  const allowInstanceReplacement = parseBooleanEnv(
    process.env.INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT,
    false
  );
  const protectCriticalResources = parseBooleanEnv(
    process.env.INFRA_IDENTITY_ENABLE_RESOURCE_PROTECTION,
    productionIdentityStage
  );
  const preventDestructiveIdentityChanges = protectCriticalResources && !allowInstanceReplacement;

  const identityDomain = resolveIdentityStageDomain(args.settings, args.stage);
  const identityStageKey = resolveApplicationStageKey(args.stage);
  const identityIngressMode = args.settings.ingress.stageModes[identityStageKey];
  const identityTlsMode = args.settings.tls.stageModes[identityStageKey];
  const useAlbIngress = identityIngressMode === 'alb';
  const useAcmeBackup =
    identityTlsMode === 'acme-route53-dns-01' && args.settings.tls.acmeBackup.enabled;
  const resourceBaseName = sanitizeResourceName(`identity-${args.stage}`);
  const environmentLabel = normalizeIdentityEnvironmentLabel(args.stage);
  const resourceDisplayPrefix = `${args.appName}-${environmentLabel}-auth`;
  const resourceTags = createResourceTags(args);
  const callerIdentity = aws.getCallerIdentityOutput({});
  const route53ZoneId =
    args.hostedZoneId ??
    args.settings.tls.route53HostedZoneId ??
    aws.route53.getZoneOutput({ name: args.rootDomain, privateZone: false }).zoneId;
  const acmeBackupBucketName =
    pulumi.interpolate`${args.appName}-${args.stage}-identity-acme-${callerIdentity.accountId}`.apply(
      sanitizeBucketName
    );
  const stageScopedSecrets = {
    authentik: scopeSecretName(args.settings.secrets.authentikSecretKeyName, args.stage),
    databaseCredentials: scopeSecretName(
      args.settings.secrets.databaseCredentialsSecretName,
      args.stage
    ),
    smtpCredentials: scopeSecretName(args.settings.secrets.smtpCredentialsSecretName, args.stage),
    jwtSigningKey: scopeSecretName(args.settings.secrets.jwtSigningKeySecretName, args.stage),
    integrationConfig: scopeSecretName(
      args.settings.secrets.integrationConfigSecretName,
      args.stage
    ),
  };
  const amazonLinuxAmiParameter = isArmInstanceType(args.settings.ec2.instanceType)
    ? '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-arm64'
    : '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64';

  // SST's generated aws namespace is intentionally dynamic and not strongly typed here.
  const vpc = new sst.aws.Vpc(resourceBaseName) as unknown as IdentityVpcComponent;
  const publicSubnetIds = pulumi.output(vpc.publicSubnets).apply(subnets => pulumi.all(subnets));
  const privateSubnetIds = pulumi.output(vpc.privateSubnets).apply(subnets => pulumi.all(subnets));
  const acmeBackupBucket = useAcmeBackup
    ? new aws.s3.BucketV2(`${resourceBaseName}-acme-backup`, {
        bucket: acmeBackupBucketName,
        forceDestroy: args.stage !== 'production',
        tags: {
          ...resourceTags,
          Name: `${resourceDisplayPrefix}-acme-backup`,
        },
      })
    : undefined;

  if (acmeBackupBucket) {
    new aws.s3.BucketPublicAccessBlock(`${resourceBaseName}-acme-backup-public-access`, {
      blockPublicAcls: true,
      blockPublicPolicy: true,
      bucket: acmeBackupBucket.id,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    new aws.s3.BucketServerSideEncryptionConfigurationV2(
      `${resourceBaseName}-acme-backup-encryption`,
      {
        bucket: acmeBackupBucket.id,
        rules: [{ applyServerSideEncryptionByDefault: { sseAlgorithm: 'AES256' } }],
      }
    );

    new aws.s3.BucketVersioningV2(`${resourceBaseName}-acme-backup-versioning`, {
      bucket: acmeBackupBucket.id,
      versioningConfiguration: { status: 'Enabled' },
    });
  }

  const useEc2Database = args.settings.database.mode === 'ec2';
  const loadBalancerSecurityGroup = useAlbIngress
    ? new aws.ec2.SecurityGroup(`${resourceBaseName}-alb-sg`, {
        description: `Authentik load balancer security group for ${args.stage}`,
        egress: [
          {
            cidrBlocks: ['0.0.0.0/0'],
            fromPort: 0,
            ipv6CidrBlocks: ['::/0'],
            protocol: '-1',
            toPort: 0,
          },
        ],
        ingress: [
          {
            cidrBlocks: ['0.0.0.0/0'],
            description: 'HTTP',
            fromPort: 80,
            protocol: 'tcp',
            toPort: 80,
          },
          {
            cidrBlocks: ['0.0.0.0/0'],
            description: 'HTTPS',
            fromPort: 443,
            protocol: 'tcp',
            toPort: 443,
          },
        ],
        tags: {
          ...resourceTags,
          Name: `${resourceDisplayPrefix}-alb-sg`,
        },
        vpcId: vpc.id,
      })
    : undefined;

  const appSecurityGroup = new aws.ec2.SecurityGroup(`${resourceBaseName}-app-sg`, {
    description: `Authentik application security group for ${args.stage}`,
    egress: [
      {
        cidrBlocks: ['0.0.0.0/0'],
        fromPort: 0,
        ipv6CidrBlocks: ['::/0'],
        protocol: '-1',
        toPort: 0,
      },
    ],
    ingress: [
      ...(useAlbIngress
        ? [
            {
              description: 'HTTPS from load balancer',
              fromPort: 443,
              protocol: 'tcp',
              securityGroups: [loadBalancerSecurityGroup!.id],
              toPort: 443,
            },
          ]
        : [
            {
              cidrBlocks: ['0.0.0.0/0'],
              description: 'HTTP',
              fromPort: 80,
              protocol: 'tcp',
              toPort: 80,
            },
            {
              cidrBlocks: ['0.0.0.0/0'],
              description: 'HTTPS',
              fromPort: 443,
              protocol: 'tcp',
              toPort: 443,
            },
          ]),
    ],
    tags: {
      ...resourceTags,
      Name: `${resourceDisplayPrefix}-app-sg`,
    },
    vpcId: vpc.id,
  });

  const databaseSecurityGroup = useEc2Database
    ? undefined
    : new aws.ec2.SecurityGroup(`${resourceBaseName}-db-sg`, {
        description: `Authentik database security group for ${args.stage}`,
        egress: [
          {
            cidrBlocks: ['0.0.0.0/0'],
            fromPort: 0,
            ipv6CidrBlocks: ['::/0'],
            protocol: '-1',
            toPort: 0,
          },
        ],
        ingress: [
          {
            description: 'PostgreSQL from identity application host',
            fromPort: 5432,
            protocol: 'tcp',
            securityGroups: [appSecurityGroup.id],
            toPort: 5432,
          },
        ],
        tags: {
          ...resourceTags,
          Name: `${resourceDisplayPrefix}-db-sg`,
        },
        vpcId: vpc.id,
      });

  const databasePassword = new RandomPassword(`${resourceBaseName}-db-password`, {
    length: 32,
    lower: true,
    minLower: 6,
    minNumeric: 6,
    minUpper: 6,
    number: true,
    special: false,
    upper: true,
  });

  const authentikSecretKey = new RandomPassword(`${resourceBaseName}-authentik-key`, {
    length: 64,
    lower: true,
    number: true,
    special: false,
    upper: true,
  });

  const jwtSigningKey = new RandomPassword(`${resourceBaseName}-jwt-key`, {
    length: 64,
    lower: true,
    number: true,
    special: false,
    upper: true,
  });

  const supabaseOidcClientSecret = new RandomPassword(`${resourceBaseName}-supabase-oidc-secret`, {
    length: 48,
    lower: true,
    number: true,
    special: false,
    upper: true,
  });

  const bootstrapAdminPassword = new RandomPassword(
    `${resourceBaseName}-bootstrap-admin-password`,
    {
      length: 32,
      lower: true,
      number: true,
      special: false,
      upper: true,
    }
  );

  const bootstrapAdminPasswordValue = args.settings.integration.bootstrap.admin.password
    ? pulumi.output(args.settings.integration.bootstrap.admin.password)
    : bootstrapAdminPassword.result;

  const authentikSecret = new aws.secretsmanager.Secret(`${resourceBaseName}-authentik-secret`, {
    description: `Authentik secret key for ${args.stage}`,
    name: stageScopedSecrets.authentik,
    tags: {
      ...resourceTags,
      Name: `${resourceDisplayPrefix}-authentik-secret`,
    },
  });

  new aws.secretsmanager.SecretVersion(`${resourceBaseName}-authentik-secret-version`, {
    secretId: authentikSecret.id,
    secretString: pulumi.interpolate`{"secretKey":"${authentikSecretKey.result}","domain":"${identityDomain}"}`,
  });

  const smtpCredentialsSecret = new aws.secretsmanager.Secret(`${resourceBaseName}-smtp-secret`, {
    description: `SMTP placeholder secret for ${args.stage}`,
    name: stageScopedSecrets.smtpCredentials,
    tags: {
      ...resourceTags,
      Name: `${resourceDisplayPrefix}-smtp-secret`,
    },
  });

  new aws.secretsmanager.SecretVersion(`${resourceBaseName}-smtp-secret-version`, {
    secretId: smtpCredentialsSecret.id,
    secretString: JSON.stringify({
      host: '',
      password: '',
      port: 587,
      provider: args.settings.emailProvider,
      username: '',
    }),
  });

  const jwtSigningKeySecret = new aws.secretsmanager.Secret(`${resourceBaseName}-jwt-secret`, {
    description: `Alternun JWT signing key for ${args.stage}`,
    name: stageScopedSecrets.jwtSigningKey,
    tags: {
      ...resourceTags,
      Name: `${resourceDisplayPrefix}-jwt-signing-secret`,
    },
  });

  new aws.secretsmanager.SecretVersion(`${resourceBaseName}-jwt-secret-version`, {
    secretId: jwtSigningKeySecret.id,
    secretString: pulumi.interpolate`{"audience":"${args.settings.jwt.audience}","key":"${jwtSigningKey.result}","roleClaim":"${args.settings.jwt.roleClaim}","rolesClaim":"${args.settings.jwt.rolesClaim}"}`,
  });

  const integrationConfigSecret = new aws.secretsmanager.Secret(
    `${resourceBaseName}-integration-config-secret`,
    {
      description: `Identity integration configuration for ${args.stage}`,
      name: stageScopedSecrets.integrationConfig,
      tags: {
        ...resourceTags,
        Name: `${resourceDisplayPrefix}-integration-config`,
      },
    }
  );

  const adminOidcClientSecret = new RandomPassword(`${resourceBaseName}-admin-oidc-secret`, {
    length: 40,
    special: false,
  });
  const adminStageKey = resolveApplicationStageKey(args.stage);
  const adminStageDomain = buildStageDomains('admin', args.rootDomain)[adminStageKey];
  const adminOidcRedirectUrl = `https://${adminStageDomain}/auth/callback`;
  const adminOidcPostLogoutRedirectUrl = `https://${adminStageDomain}/login`;

  new aws.secretsmanager.SecretVersion(`${resourceBaseName}-integration-config-secret-version`, {
    secretId: integrationConfigSecret.id,
    secretString: pulumi.secret(
      pulumi
        .all([
          supabaseOidcClientSecret.result,
          adminOidcClientSecret.result,
          bootstrapAdminPasswordValue,
        ])
        .apply(([supabaseClientSecret, adminClientSecret, adminPassword]) =>
          JSON.stringify({
            adminEmail: args.settings.integration.bootstrap.admin.email,
            adminGroup: args.settings.integration.bootstrap.admin.group,
            adminName: args.settings.integration.bootstrap.admin.name,
            adminAllowedEmailDomain: args.settings.integration.adminOidc.allowedEmailDomain,
            adminOidcApplicationName: args.settings.integration.adminOidc.applicationName,
            adminOidcApplicationSlug: args.settings.integration.adminOidc.applicationSlug,
            adminOidcClientId: args.settings.integration.adminOidc.clientId,
            adminOidcClientSecret: adminClientSecret,
            adminOidcPostLogoutRedirectUrl,
            adminOidcProviderName: args.settings.integration.adminOidc.providerName,
            adminOidcRedirectUrl,
            adminPassword,
            adminUsername: args.settings.integration.bootstrap.admin.username,
            defaultApplicationDescription:
              args.settings.integration.bootstrap.defaultApplication.description,
            defaultApplicationEnabled:
              args.settings.integration.bootstrap.defaultApplication.enabled,
            defaultApplicationGroup: args.settings.integration.bootstrap.defaultApplication.group,
            defaultApplicationLaunchUrl:
              args.settings.integration.bootstrap.defaultApplication.launchUrl,
            defaultApplicationName: args.settings.integration.bootstrap.defaultApplication.name,
            defaultApplicationOpenInNewTab:
              args.settings.integration.bootstrap.defaultApplication.openInNewTab,
            defaultApplicationPolicyEngineMode:
              args.settings.integration.bootstrap.defaultApplication.policyEngineMode,
            defaultApplicationPublisher:
              args.settings.integration.bootstrap.defaultApplication.publisher,
            defaultApplicationSlug: args.settings.integration.bootstrap.defaultApplication.slug,
            googleClientId: args.settings.integration.google.clientId,
            googleClientSecret: args.settings.integration.google.clientSecret,
            googleSourceName: args.settings.integration.google.sourceName,
            googleSourceSlug: args.settings.integration.google.sourceSlug,
            supabaseApplicationName: args.settings.integration.supabase.applicationName,
            supabaseApplicationSlug: args.settings.integration.supabase.applicationSlug,
            supabaseManagementAccessToken: args.settings.integration.supabase.managementAccessToken,
            supabaseOidcClientId: args.settings.integration.supabase.oidcClientId,
            supabaseOidcClientSecret: supabaseClientSecret,
            supabaseProjectRef: args.settings.integration.supabase.projectRef,
            supabaseProviderName: args.settings.integration.supabase.providerName,
            supabaseSyncConfig: args.settings.integration.supabase.syncConfig,
          })
        )
    ),
  });
  const databaseCredentialsSecret = new aws.secretsmanager.Secret(`${resourceBaseName}-db-secret`, {
    description: `Authentik database credentials for ${args.stage}`,
    name: stageScopedSecrets.databaseCredentials,
    tags: {
      ...resourceTags,
      Name: `${resourceDisplayPrefix}-database-credentials`,
    },
  });

  const databaseUsername = 'authentik';
  const databaseName = 'authentik';
  const databaseSubnetIds =
    !useEc2Database && args.settings.rds.publicAccess ? publicSubnetIds : privateSubnetIds;
  const databaseSubnetGroup = useEc2Database
    ? undefined
    : new aws.rds.SubnetGroup(`${resourceBaseName}-db-subnet-group`, {
        description: `Authentik database subnet group for ${args.stage}`,
        subnetIds: databaseSubnetIds,
        tags: {
          ...resourceTags,
          Name: `${resourceDisplayPrefix}-db-subnet-group`,
        },
      });
  const databaseMonitoringRole =
    !useEc2Database && args.settings.rds.enhancedMonitoring
      ? new aws.iam.Role(`${resourceBaseName}-db-monitoring-role`, {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: 'monitoring.rds.amazonaws.com',
          }),
          tags: {
            ...resourceTags,
            Name: `${resourceDisplayPrefix}-db-monitoring-role`,
          },
        })
      : undefined;

  if (databaseMonitoringRole) {
    new aws.iam.RolePolicyAttachment(`${resourceBaseName}-db-monitoring-policy`, {
      policyArn: 'arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole',
      role: databaseMonitoringRole.name,
    });
  }

  const database = useEc2Database
    ? undefined
    : new aws.rds.Instance(
        `${resourceBaseName}-db`,
        {
          allocatedStorage: args.settings.rds.storageGiB,
          applyImmediately: args.stage !== 'production',
          autoMinorVersionUpgrade: true,
          backupRetentionPeriod: args.settings.rds.backupRetentionDays,
          copyTagsToSnapshot: true,
          dbName: databaseName,
          dbSubnetGroupName: databaseSubnetGroup?.name,
          deletionProtection: args.stage === 'production',
          engine: 'postgres',
          engineVersion: args.settings.rds.engineVersion,
          finalSnapshotIdentifier:
            args.stage === 'production'
              ? `${args.appName}-${args.stage}-authentik-db-final`.toLowerCase()
              : undefined,
          identifier: `${args.appName}-${args.stage}-authentik-db`.toLowerCase(),
          instanceClass: args.settings.rds.instanceType,
          monitoringInterval: args.settings.rds.enhancedMonitoring ? 60 : 0,
          monitoringRoleArn: databaseMonitoringRole?.arn,
          multiAz: args.settings.rds.multiAz,
          password: databasePassword.result,
          performanceInsightsEnabled: args.settings.rds.performanceInsights,
          performanceInsightsRetentionPeriod: args.settings.rds.performanceInsights ? 7 : undefined,
          port: 5432,
          publiclyAccessible: args.settings.rds.publicAccess,
          skipFinalSnapshot: args.stage !== 'production',
          storageEncrypted: true,
          storageType: 'gp3',
          tags: {
            ...resourceTags,
            Name: `${resourceDisplayPrefix}-db`,
          },
          username: databaseUsername,
          vpcSecurityGroupIds: databaseSecurityGroup ? [databaseSecurityGroup.id] : undefined,
        },
        {
          deleteBeforeReplace: false,
          protect: preventDestructiveIdentityChanges,
        }
      );

  const databaseAddress = useEc2Database ? pulumi.output('postgres') : database!.address;
  const databaseEndpoint = useEc2Database ? pulumi.output('postgres:5432') : database!.endpoint;
  const databasePort = pulumi.output(5432);

  new aws.secretsmanager.SecretVersion(`${resourceBaseName}-db-secret-version`, {
    secretId: databaseCredentialsSecret.id,
    secretString: useEc2Database
      ? databasePassword.result.apply(password =>
          JSON.stringify({
            database: databaseName,
            endpoint: 'postgres:5432',
            engine: 'postgres',
            host: 'postgres',
            mode: 'ec2',
            password,
            port: 5432,
            sslmode: 'disable',
            uri: `postgresql://${databaseUsername}:${password}@postgres:5432/${databaseName}?sslmode=disable`,
            username: databaseUsername,
          })
        )
      : pulumi
          .all([databaseAddress, databaseEndpoint, databasePort, databasePassword.result])
          .apply(([address, endpoint, port, password]) =>
            JSON.stringify({
              database: databaseName,
              endpoint,
              engine: 'postgres',
              host: address,
              mode: 'rds',
              password,
              port,
              sslmode: 'require',
              uri: `postgresql://${databaseUsername}:${password}@${address}:${port}/${databaseName}?sslmode=require`,
              username: databaseUsername,
            })
          ),
  });

  const instanceRole = new aws.iam.Role(`${resourceBaseName}-instance-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'ec2.amazonaws.com',
    }),
    tags: {
      ...resourceTags,
      Name: `${resourceDisplayPrefix}-instance-role`,
    },
  });

  new aws.iam.RolePolicyAttachment(`${resourceBaseName}-instance-ssm-policy`, {
    policyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
    role: instanceRole.name,
  });

  new aws.iam.RolePolicy(`${resourceBaseName}-instance-secrets-policy`, {
    role: instanceRole.name,
    policy: pulumi
      .all([
        authentikSecret.arn,
        databaseCredentialsSecret.arn,
        smtpCredentialsSecret.arn,
        jwtSigningKeySecret.arn,
        integrationConfigSecret.arn,
      ])
      .apply(secretArns =>
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
              Effect: 'Allow',
              Resource: secretArns,
            },
          ],
        })
      ),
  });

  new aws.iam.RolePolicy(`${resourceBaseName}-instance-route53-policy`, {
    role: instanceRole.name,
    policy: pulumi.output(route53ZoneId).apply(zoneId =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: [
              'route53:ChangeResourceRecordSets',
              'route53:GetChange',
              'route53:ListHostedZones',
              'route53:ListHostedZonesByName',
              'route53:ListResourceRecordSets',
            ],
            Effect: 'Allow',
            Resource: ['*', `arn:aws:route53:::hostedzone/${zoneId}`],
          },
        ],
      })
    ),
  });

  if (acmeBackupBucket) {
    new aws.iam.RolePolicy(`${resourceBaseName}-instance-acme-backup-policy`, {
      role: instanceRole.name,
      policy: pulumi.all([acmeBackupBucket.arn]).apply(([bucketArn]) =>
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Action: ['s3:GetBucketLocation', 's3:ListBucket'],
              Effect: 'Allow',
              Resource: [bucketArn],
            },
            {
              Action: ['s3:GetObject', 's3:PutObject'],
              Effect: 'Allow',
              Resource: [`${bucketArn}/*`],
            },
          ],
        })
      ),
    });
  }

  const instanceProfile = new aws.iam.InstanceProfile(`${resourceBaseName}-instance-profile`, {
    role: instanceRole.name,
    tags: {
      ...resourceTags,
      Name: `${resourceDisplayPrefix}-instance-profile`,
    },
  });

  const amazonLinuxAmi = aws.ssm.getParameterOutput({ name: amazonLinuxAmiParameter }).value;
  const bootstrapUserData = buildAuthBootstrapUserData({
    appName: args.appName,
    rootDomain: args.rootDomain,
    stage: args.stage,
    domain: identityDomain,
    databaseMode: args.settings.database.mode,
    ingressMode: identityIngressMode,
    tlsMode: identityTlsMode,
    acmeEmail: args.settings.tls.acmeEmail,
    route53HostedZoneId: route53ZoneId,
    acmeBackupBucketName: acmeBackupBucket?.bucket ?? '',
    acmeBackupPrefix: args.settings.tls.acmeBackup.prefix,
    authentikImageTag: args.settings.authentikImageTag,
    authentikSecretArn: authentikSecret.arn,
    databaseCredentialsSecretArn: databaseCredentialsSecret.arn,
    smtpCredentialsSecretArn: smtpCredentialsSecret.arn,
    jwtSigningKeySecretArn: jwtSigningKeySecret.arn,
    integrationConfigSecretArn: integrationConfigSecret.arn,
  });

  const identityInstance = new aws.ec2.Instance(
    `${resourceBaseName}-instance`,
    {
      ami: amazonLinuxAmi,
      disableApiTermination: preventDestructiveIdentityChanges,
      iamInstanceProfile: instanceProfile.name,
      instanceType: args.settings.ec2.instanceType,
      metadataOptions: {
        httpEndpoint: 'enabled',
        httpPutResponseHopLimit: 2,
        httpTokens: 'required',
      },
      rootBlockDevice: {
        deleteOnTermination: true,
        encrypted: true,
        volumeSize: args.settings.ec2.volumeSizeGiB,
        volumeType: 'gp3',
      },
      subnetId: publicSubnetIds.apply(subnets => subnets[0]),
      tags: {
        ...resourceTags,
        Name: `${resourceDisplayPrefix}-instance`,
      },
      userDataBase64: gzipUserData(bootstrapUserData),
      userDataReplaceOnChange,
      vpcSecurityGroupIds: [appSecurityGroup.id],
    },
    {
      deleteBeforeReplace: false,
      protect: preventDestructiveIdentityChanges,
    }
  );

  const identityElasticIp = useAlbIngress
    ? undefined
    : new aws.ec2.Eip(
        `${resourceBaseName}-eip`,
        {
          domain: 'vpc',
          tags: {
            ...resourceTags,
            Name: `${resourceDisplayPrefix}-eip`,
          },
        },
        {
          protect: preventDestructiveIdentityChanges,
        }
      );

  if (identityElasticIp) {
    new aws.ec2.EipAssociation(
      `${resourceBaseName}-eip-association`,
      {
        allocationId: identityElasticIp.id,
        instanceId: identityInstance.id,
      },
      {
        deleteBeforeReplace: false,
        protect: preventDestructiveIdentityChanges,
      }
    );
  }

  let identityLoadBalancer: aws.lb.LoadBalancer | undefined;
  let identityTargetGroup: aws.lb.TargetGroup | undefined;

  if (useAlbIngress) {
    identityTargetGroup = new aws.lb.TargetGroup(`${resourceBaseName}-tg`, {
      deregistrationDelay: 30,
      healthCheck: {
        enabled: true,
        healthyThreshold: 2,
        interval: 30,
        matcher: args.settings.ingress.alb.healthCheckMatcher,
        path: args.settings.ingress.alb.healthCheckPath,
        port: 'traffic-port',
        protocol: 'HTTPS',
        timeout: 5,
        unhealthyThreshold: 3,
      },
      port: 443,
      protocol: 'HTTPS',
      targetType: 'instance',
      tags: {
        ...resourceTags,
        Name: `${resourceDisplayPrefix}-tg`,
      },
      vpcId: vpc.id,
    });

    new aws.lb.TargetGroupAttachment(`${resourceBaseName}-tg-attachment`, {
      port: 443,
      targetGroupArn: identityTargetGroup.arn,
      targetId: identityInstance.id,
    });

    identityLoadBalancer = new aws.lb.LoadBalancer(
      `${resourceBaseName}-alb`,
      {
        enableDeletionProtection: protectCriticalResources,
        idleTimeout: args.settings.ingress.alb.idleTimeoutSeconds,
        internal: false,
        loadBalancerType: 'application',
        securityGroups: [loadBalancerSecurityGroup!.id],
        subnets: publicSubnetIds,
        tags: {
          ...resourceTags,
          Name: `${resourceDisplayPrefix}-alb`,
        },
      },
      {
        protect: preventDestructiveIdentityChanges,
      }
    );

    let certificateArn: pulumi.Input<string> | undefined =
      args.settings.ingress.alb.certificateArn || undefined;

    if (!certificateArn) {
      const certificate = new aws.acm.Certificate(`${resourceBaseName}-alb-cert`, {
        domainName: identityDomain,
        validationMethod: 'DNS',
        tags: resourceTags,
      });

      const certificateValidationRecord = new aws.route53.Record(
        `${resourceBaseName}-alb-cert-validation`,
        {
          allowOverwrite: true,
          name: certificate.domainValidationOptions[0].resourceRecordName,
          records: [certificate.domainValidationOptions[0].resourceRecordValue],
          ttl: 60,
          type: certificate.domainValidationOptions[0].resourceRecordType,
          zoneId: route53ZoneId,
        }
      );

      const certificateValidation = new aws.acm.CertificateValidation(
        `${resourceBaseName}-alb-cert-validation-complete`,
        {
          certificateArn: certificate.arn,
          validationRecordFqdns: [certificateValidationRecord.fqdn],
        }
      );

      certificateArn = certificateValidation.certificateArn;
    }

    if (!certificateArn) {
      throw new Error(`Identity ALB certificate could not be resolved for ${identityDomain}.`);
    }

    new aws.lb.Listener(`${resourceBaseName}-alb-http`, {
      defaultActions: [
        {
          redirect: {
            port: '443',
            protocol: 'HTTPS',
            statusCode: 'HTTP_301',
          },
          type: 'redirect',
        },
      ],
      loadBalancerArn: identityLoadBalancer.arn,
      port: 80,
      protocol: 'HTTP',
    });

    new aws.lb.Listener(`${resourceBaseName}-alb-https`, {
      certificateArn,
      defaultActions: [
        {
          targetGroupArn: identityTargetGroup.arn,
          type: 'forward',
        },
      ],
      loadBalancerArn: identityLoadBalancer.arn,
      port: 443,
      protocol: 'HTTPS',
      sslPolicy: 'ELBSecurityPolicy-TLS13-1-2-2021-06',
    });
  }

  const identityRecord = useAlbIngress
    ? new aws.route53.Record(`${resourceBaseName}-dns`, {
        aliases: [
          {
            evaluateTargetHealth: true,
            name: identityLoadBalancer!.dnsName,
            zoneId: identityLoadBalancer!.zoneId,
          },
        ],
        allowOverwrite: true,
        name: identityDomain,
        type: 'A',
        zoneId: route53ZoneId,
      })
    : new aws.route53.Record(`${resourceBaseName}-dns`, {
        allowOverwrite: true,
        name: identityDomain,
        records: [identityElasticIp!.publicIp],
        ttl: 300,
        type: 'A',
        zoneId: route53ZoneId,
      });

  const identityPublicIp = identityElasticIp
    ? identityElasticIp.publicIp
    : identityInstance.publicIp;

  return {
    domain: identityDomain,
    dnsRecordFqdn: identityRecord.fqdn,
    instanceId: identityInstance.id,
    instanceProfileName: instanceProfile.name,
    publicIp: identityPublicIp,
    privateIp: identityInstance.privateIp,
    route53RecordName: identityRecord.name,
    securityGroupIds: {
      app: appSecurityGroup.id,
      database: databaseSecurityGroup?.id ?? appSecurityGroup.id,
    },
    secrets: {
      authentik: {
        arn: authentikSecret.arn,
        name: authentikSecret.name,
      },
      databaseCredentials: {
        arn: databaseCredentialsSecret.arn,
        name: databaseCredentialsSecret.name,
      },
      jwtSigningKey: {
        arn: jwtSigningKeySecret.arn,
        name: jwtSigningKeySecret.name,
      },
      smtpCredentials: {
        arn: smtpCredentialsSecret.arn,
        name: smtpCredentialsSecret.name,
      },
      integrationConfig: {
        arn: integrationConfigSecret.arn,
        name: integrationConfigSecret.name,
      },
    },
    vpc: {
      id: vpc.id,
      privateSubnets: privateSubnetIds,
      publicSubnets: publicSubnetIds,
    },
    database: {
      mode: pulumi.output(args.settings.database.mode),
      address: databaseAddress,
      arn: database?.arn,
      dbName: pulumi.output(databaseName),
      endpoint: databaseEndpoint,
      identifier: database?.identifier,
      port: databasePort,
      subnetGroupName: databaseSubnetGroup?.name,
      username: pulumi.output(databaseUsername),
    },
    acmeBackup: acmeBackupBucket
      ? {
          bucketArn: acmeBackupBucket.arn,
          bucketName: acmeBackupBucket.bucket,
          prefix: pulumi.output(args.settings.tls.acmeBackup.prefix),
        }
      : undefined,
    loadBalancer:
      identityLoadBalancer && identityTargetGroup && loadBalancerSecurityGroup
        ? {
            arn: identityLoadBalancer.arn,
            dnsName: identityLoadBalancer.dnsName,
            hostedZoneId: identityLoadBalancer.zoneId,
            securityGroupId: loadBalancerSecurityGroup.id,
            targetGroupArn: identityTargetGroup.arn,
          }
        : undefined,
  };
}

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
const DOCKER_COMPOSE_EC2_TEMPLATE = readIdentityTemplate('docker-compose.ec2.yml');
const DOCKER_COMPOSE_RDS_TEMPLATE = readIdentityTemplate('docker-compose.rds.yml');
const AUTHENTIK_INTEGRATION_BOOTSTRAP_SCRIPT_TEMPLATE = readIdentityTemplate(
  'bootstrap-authentik-integrations.py'
);

function isArmInstanceType(instanceType: string): boolean {
  return ARM_INSTANCE_PREFIXES.some(prefix => instanceType.startsWith(prefix));
}

function sanitizeResourceName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '-');
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
    ])
    .apply(
      ([
        authentikSecretArn,
        databaseCredentialsSecretArn,
        smtpCredentialsSecretArn,
        jwtSigningKeySecretArn,
        integrationConfigSecretArn,
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
${DOCKER_COMPOSE_EC2_TEMPLATE}
COMPOSEEC2EOF

cat >/opt/alternun/identity/templates/docker-compose.rds.yml <<'COMPOSERDSEOF'
${DOCKER_COMPOSE_RDS_TEMPLATE}
COMPOSERDSEOF

cat >/opt/alternun/identity/templates/bootstrap-authentik-integrations.py <<'BOOTSTRAPEOF'
${AUTHENTIK_INTEGRATION_BOOTSTRAP_SCRIPT_TEMPLATE}
BOOTSTRAPEOF

chmod 0755 /opt/alternun/identity/deploy-authentik.sh
chmod 0644 /opt/alternun/identity/templates/docker-compose.ec2.yml
chmod 0644 /opt/alternun/identity/templates/docker-compose.rds.yml
chmod 0644 /opt/alternun/identity/templates/bootstrap-authentik-integrations.py
chown ec2-user:ec2-user /opt/alternun/identity/templates/docker-compose.ec2.yml
chown ec2-user:ec2-user /opt/alternun/identity/templates/docker-compose.rds.yml
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
  const identityDomain = resolveIdentityStageDomain(args.settings, args.stage);
  const resourceBaseName = sanitizeResourceName(`identity-${args.stage}`);
  const environmentLabel = normalizeIdentityEnvironmentLabel(args.stage);
  const resourceDisplayPrefix = `${args.appName}-${environmentLabel}-auth`;
  const resourceTags = createResourceTags(args);
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
  const useEc2Database = args.settings.database.mode === 'ec2';

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

  new aws.secretsmanager.SecretVersion(`${resourceBaseName}-integration-config-secret-version`, {
    secretId: integrationConfigSecret.id,
    secretString: pulumi.secret(
      supabaseOidcClientSecret.result.apply(supabaseClientSecret =>
        JSON.stringify({
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
    : new aws.rds.Instance(`${resourceBaseName}-db`, {
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
      });

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
    authentikImageTag: args.settings.authentikImageTag,
    authentikSecretArn: authentikSecret.arn,
    databaseCredentialsSecretArn: databaseCredentialsSecret.arn,
    smtpCredentialsSecretArn: smtpCredentialsSecret.arn,
    jwtSigningKeySecretArn: jwtSigningKeySecret.arn,
    integrationConfigSecretArn: integrationConfigSecret.arn,
  });

  const identityInstance = new aws.ec2.Instance(`${resourceBaseName}-instance`, {
    ami: amazonLinuxAmi,
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
    userDataReplaceOnChange: true,
    vpcSecurityGroupIds: [appSecurityGroup.id],
  });

  const identityElasticIp = new aws.ec2.Eip(`${resourceBaseName}-eip`, {
    domain: 'vpc',
    tags: {
      ...resourceTags,
      Name: `${resourceDisplayPrefix}-eip`,
    },
  });

  new aws.ec2.EipAssociation(`${resourceBaseName}-eip-association`, {
    allocationId: identityElasticIp.id,
    instanceId: identityInstance.id,
  });

  const route53ZoneId =
    args.hostedZoneId ??
    aws.route53.getZoneOutput({ name: args.rootDomain, privateZone: false }).zoneId;

  const identityRecord = new aws.route53.Record(`${resourceBaseName}-dns`, {
    allowOverwrite: true,
    name: identityDomain,
    records: [identityElasticIp.publicIp],
    ttl: 300,
    type: 'A',
    zoneId: route53ZoneId,
  });

  return {
    domain: identityDomain,
    dnsRecordFqdn: identityRecord.fqdn,
    instanceId: identityInstance.id,
    instanceProfileName: instanceProfile.name,
    publicIp: identityElasticIp.publicIp,
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
  };
}

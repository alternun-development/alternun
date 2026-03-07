/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable comma-dangle */
/* eslint-disable indent */

import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { RandomPassword } from '@pulumi/random';
import type { IdentitySettings } from './identity.js';
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
  };
  vpc: {
    id: pulumi.Output<string>;
    privateSubnets: pulumi.Output<string[]>;
    publicSubnets: pulumi.Output<string[]>;
  };
  database: {
    address: pulumi.Output<string>;
    arn: pulumi.Output<string>;
    dbName: pulumi.Output<string>;
    endpoint: pulumi.Output<string>;
    identifier: pulumi.Output<string>;
    port: pulumi.Output<number>;
    subnetGroupName: pulumi.Output<string>;
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

function createResourceTags(args: IdentityInfrastructureArgs): Record<string, string> {
  return {
    Application: args.appName,
    Component: 'identity',
    ManagedBy: 'pulumi',
    Stage: args.stage,
  };
}

function buildAuthBootstrapUserData(args: {
  appName: string;
  stage: string;
  domain: string;
  authentikSecretArn: pulumi.Input<string>;
  databaseCredentialsSecretArn: pulumi.Input<string>;
  smtpCredentialsSecretArn: pulumi.Input<string>;
  jwtSigningKeySecretArn: pulumi.Input<string>;
}): pulumi.Output<string> {
  return pulumi
    .all([
      args.authentikSecretArn,
      args.databaseCredentialsSecretArn,
      args.smtpCredentialsSecretArn,
      args.jwtSigningKeySecretArn,
    ])
    .apply(
      ([
        authentikSecretArn,
        databaseCredentialsSecretArn,
        smtpCredentialsSecretArn,
        jwtSigningKeySecretArn,
      ]) => `#!/bin/bash
set -euxo pipefail

dnf install -y docker docker-compose-plugin jq
systemctl enable --now docker
usermod -aG docker ec2-user

install -d -o ec2-user -g ec2-user /opt/alternun/identity
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik/media
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik/custom-templates

cat >/etc/alternun-identity.env <<'ENVEOF'
ALTERNUN_APP_NAME=${args.appName}
ALTERNUN_STAGE=${args.stage}
ALTERNUN_IDENTITY_DOMAIN=${args.domain}
AUTHENTIK_SECRET_ARN=${authentikSecretArn}
AUTHENTIK_DATABASE_SECRET_ARN=${databaseCredentialsSecretArn}
AUTHENTIK_SMTP_SECRET_ARN=${smtpCredentialsSecretArn}
AUTHENTIK_JWT_SIGNING_SECRET_ARN=${jwtSigningKeySecretArn}
ENVEOF

chmod 0600 /etc/alternun-identity.env
chown root:root /etc/alternun-identity.env
`
    );
}

export function deployIdentityInfrastructure(
  args: IdentityInfrastructureArgs
): IdentityInfrastructureResources {
  const identityDomain = resolveIdentityStageDomain(args.settings, args.stage);
  const resourceBaseName = sanitizeResourceName(`identity-${args.stage}`);
  const resourceTags = createResourceTags(args);
  const stageScopedSecrets = {
    authentik: scopeSecretName(args.settings.secrets.authentikSecretKeyName, args.stage),
    databaseCredentials: scopeSecretName(
      args.settings.secrets.databaseCredentialsSecretName,
      args.stage
    ),
    smtpCredentials: scopeSecretName(args.settings.secrets.smtpCredentialsSecretName, args.stage),
    jwtSigningKey: scopeSecretName(args.settings.secrets.jwtSigningKeySecretName, args.stage),
  };
  const amazonLinuxAmiParameter = isArmInstanceType(args.settings.ec2.instanceType)
    ? '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-arm64'
    : '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64';

  // SST's generated aws namespace is intentionally dynamic and not strongly typed here.
  const vpc = new sst.aws.Vpc(resourceBaseName) as unknown as IdentityVpcComponent;
  const publicSubnetIds = pulumi.output(vpc.publicSubnets).apply(subnets => pulumi.all(subnets));
  const privateSubnetIds = pulumi.output(vpc.privateSubnets).apply(subnets => pulumi.all(subnets));

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
      Name: `${args.appName}-${args.stage}-identity-app-sg`,
    },
    vpcId: vpc.id,
  });

  const databaseSecurityGroup = new aws.ec2.SecurityGroup(`${resourceBaseName}-db-sg`, {
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
      Name: `${args.appName}-${args.stage}-identity-db-sg`,
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

  const authentikSecret = new aws.secretsmanager.Secret(`${resourceBaseName}-authentik-secret`, {
    description: `Authentik secret key for ${args.stage}`,
    name: stageScopedSecrets.authentik,
    tags: {
      ...resourceTags,
      Name: `${args.appName}-${args.stage}-authentik-secret`,
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
      Name: `${args.appName}-${args.stage}-smtp-secret`,
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
      Name: `${args.appName}-${args.stage}-jwt-signing-secret`,
    },
  });

  new aws.secretsmanager.SecretVersion(`${resourceBaseName}-jwt-secret-version`, {
    secretId: jwtSigningKeySecret.id,
    secretString: pulumi.interpolate`{"audience":"${args.settings.jwt.audience}","key":"${jwtSigningKey.result}","roleClaim":"${args.settings.jwt.roleClaim}","rolesClaim":"${args.settings.jwt.rolesClaim}"}`,
  });

  const databaseCredentialsSecret = new aws.secretsmanager.Secret(`${resourceBaseName}-db-secret`, {
    description: `Authentik database credentials for ${args.stage}`,
    name: stageScopedSecrets.databaseCredentials,
    tags: {
      ...resourceTags,
      Name: `${args.appName}-${args.stage}-database-credentials`,
    },
  });

  const databaseSubnetIds = args.settings.rds.publicAccess ? publicSubnetIds : privateSubnetIds;
  const databaseSubnetGroup = new aws.rds.SubnetGroup(`${resourceBaseName}-db-subnet-group`, {
    description: `Authentik database subnet group for ${args.stage}`,
    subnetIds: databaseSubnetIds,
    tags: {
      ...resourceTags,
      Name: `${args.appName}-${args.stage}-identity-db-subnet-group`,
    },
  });

  const databaseUsername = 'authentik';
  const databaseName = 'authentik';
  const databaseMonitoringRole = args.settings.rds.enhancedMonitoring
    ? new aws.iam.Role(`${resourceBaseName}-db-monitoring-role`, {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: 'monitoring.rds.amazonaws.com',
        }),
        tags: {
          ...resourceTags,
          Name: `${args.appName}-${args.stage}-identity-db-monitoring-role`,
        },
      })
    : undefined;

  if (databaseMonitoringRole) {
    new aws.iam.RolePolicyAttachment(`${resourceBaseName}-db-monitoring-policy`, {
      policyArn: 'arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole',
      role: databaseMonitoringRole.name,
    });
  }

  const database = new aws.rds.Instance(`${resourceBaseName}-db`, {
    allocatedStorage: args.settings.rds.storageGiB,
    applyImmediately: args.stage !== 'production',
    autoMinorVersionUpgrade: true,
    backupRetentionPeriod: args.settings.rds.backupRetentionDays,
    copyTagsToSnapshot: true,
    dbName: databaseName,
    dbSubnetGroupName: databaseSubnetGroup.name,
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
      Name: `${args.appName}-${args.stage}-authentik-db`,
    },
    username: databaseUsername,
    vpcSecurityGroupIds: [databaseSecurityGroup.id],
  });

  new aws.secretsmanager.SecretVersion(`${resourceBaseName}-db-secret-version`, {
    secretId: databaseCredentialsSecret.id,
    secretString: pulumi
      .all([database.address, database.endpoint, database.port, databasePassword.result])
      .apply(([address, endpoint, port, password]) =>
        JSON.stringify({
          database: databaseName,
          endpoint,
          engine: 'postgres',
          host: address,
          password,
          port,
          uri: `postgresql://${databaseUsername}:${password}@${address}:${port}/${databaseName}`,
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
      Name: `${args.appName}-${args.stage}-identity-instance-role`,
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
      Name: `${args.appName}-${args.stage}-identity-instance-profile`,
    },
  });

  const amazonLinuxAmi = aws.ssm.getParameterOutput({ name: amazonLinuxAmiParameter }).value;

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
      Name: `${args.appName}-${args.stage}-identity-instance`,
    },
    userData: buildAuthBootstrapUserData({
      appName: args.appName,
      stage: args.stage,
      domain: identityDomain,
      authentikSecretArn: authentikSecret.arn,
      databaseCredentialsSecretArn: databaseCredentialsSecret.arn,
      smtpCredentialsSecretArn: smtpCredentialsSecret.arn,
      jwtSigningKeySecretArn: jwtSigningKeySecret.arn,
    }),
    userDataReplaceOnChange: true,
    vpcSecurityGroupIds: [appSecurityGroup.id],
  });

  const identityElasticIp = new aws.ec2.Eip(`${resourceBaseName}-eip`, {
    domain: 'vpc',
    tags: {
      ...resourceTags,
      Name: `${args.appName}-${args.stage}-identity-eip`,
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
      database: databaseSecurityGroup.id,
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
    },
    vpc: {
      id: vpc.id,
      privateSubnets: privateSubnetIds,
      publicSubnets: publicSubnetIds,
    },
    database: {
      address: database.address,
      arn: database.arn,
      dbName: pulumi.output(databaseName),
      endpoint: database.endpoint,
      identifier: database.identifier,
      port: pulumi.output(5432),
      subnetGroupName: databaseSubnetGroup.name,
      username: pulumi.output(databaseUsername),
    },
  };
}

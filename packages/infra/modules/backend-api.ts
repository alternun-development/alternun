/* eslint-disable comma-dangle */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { BACKEND_API_INFRA_DEFAULTS, buildStageDomains } from '../config/infrastructure-specs.js';

export type BackendApiArchitecture = 'arm64' | 'x86_64';

export interface BackendApiLocalConfig {
  enabled?: boolean;
  appPath?: string;
  buildOutput?: string;
  buildCommand?: string;
  enableCustomDomain?: boolean;
  domains?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  certArns?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  lambda?: {
    architecture?: BackendApiArchitecture;
    logRetentionDays?: number;
    memorySize?: number;
    timeoutSeconds?: number;
  };
  auth?: {
    audience?: string;
    issuer?: string;
    jwksUrl?: string;
  };
  environment?: Record<string, string>;
}

export interface BackendApiSettings {
  enabled: boolean;
  appPath: string;
  buildOutput: string;
  buildCommand: string;
  enableCustomDomain: boolean;
  stageDomains: {
    production: string;
    dev: string;
    mobile: string;
  };
  certArns: {
    production: string;
    dev: string;
    mobile: string;
  };
  lambda: {
    architecture: BackendApiArchitecture;
    logRetentionDays: number;
    memorySize: number;
    timeoutSeconds: number;
  };
  auth: {
    audience: string;
    issuer: string;
    jwksUrl: string;
  };
  environment: Record<string, string>;
}

export interface BackendApiInfrastructureArgs {
  appName: string;
  rootDomain: string;
  stage: string;
  hostedZoneId?: string;
  authentikJwtSigningKey?: pulumi.Input<string>;
  settings: BackendApiSettings;
}

export interface BackendApiInfrastructureResources {
  apiId: pulumi.Output<string>;
  customDomain: pulumi.Output<string | undefined>;
  functionArn: pulumi.Output<string>;
  functionName: pulumi.Output<string>;
  invokeUrl: pulumi.Output<string>;
  logGroupName: pulumi.Output<string>;
}

interface BuildBackendApiSettingsArgs {
  appName: string;
  rootDomain: string;
  env: NodeJS.ProcessEnv;
  localConfig?: BackendApiLocalConfig;
}

const dirname = path.dirname(fileURLToPath(import.meta.url));

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
}

function parsePositiveInteger(value: string | number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeArchitecture(value: string | undefined): BackendApiArchitecture {
  return value?.trim().toLowerCase() === 'x86_64' ? 'x86_64' : 'arm64';
}

function resolveStageKey(stage: string): keyof BackendApiSettings['stageDomains'] {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');

  if (
    normalized === 'production' ||
    normalized === 'prod' ||
    normalized === 'api-prod' ||
    normalized === 'api-production'
  ) {
    return 'production';
  }

  if (normalized === 'mobile' || normalized === 'preview' || normalized === 'api-mobile') {
    return 'mobile';
  }

  return 'dev';
}

function resolveAuthDomain(rootDomain: string, stage: string): string {
  return buildStageDomains('sso', rootDomain)[resolveStageKey(stage)];
}

function sanitizeResourceName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '-');
}

function resolveBackendApiAppPath(appPath: string): string {
  const candidatePaths = [
    appPath,
    path.resolve(dirname, appPath),
    path.resolve(dirname, '..', appPath),
    path.resolve(dirname, '../..', appPath),
    path.resolve(process.cwd(), appPath),
    path.resolve(process.cwd(), '..', appPath),
  ];

  for (const candidatePath of candidatePaths) {
    const resolvedPath = path.isAbsolute(candidatePath)
      ? candidatePath
      : path.resolve(candidatePath);

    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return path.resolve(dirname, appPath);
}

function createResourceTags(args: BackendApiInfrastructureArgs): Record<string, string> {
  return {
    Application: args.appName,
    Component: 'backend-api',
    ManagedBy: 'pulumi',
    Stage: args.stage,
  };
}

export function buildBackendApiSettings(args: BuildBackendApiSettingsArgs): BackendApiSettings {
  const defaultStageDomains = buildStageDomains('api', args.rootDomain);
  const localConfig = args.localConfig;

  return {
    enabled: parseBoolean(
      args.env.INFRA_ENABLE_BACKEND_API ??
        (localConfig?.enabled !== undefined ? String(localConfig.enabled) : undefined),
      false
    ),
    appPath:
      args.env.INFRA_BACKEND_API_APP_PATH ??
      localConfig?.appPath ??
      BACKEND_API_INFRA_DEFAULTS.appPath,
    buildOutput:
      args.env.INFRA_BACKEND_API_BUILD_OUTPUT ??
      localConfig?.buildOutput ??
      BACKEND_API_INFRA_DEFAULTS.buildOutput,
    buildCommand:
      args.env.INFRA_BACKEND_API_BUILD_COMMAND ??
      localConfig?.buildCommand ??
      BACKEND_API_INFRA_DEFAULTS.buildCommand,
    enableCustomDomain: parseBoolean(
      args.env.INFRA_BACKEND_API_ENABLE_CUSTOM_DOMAIN ??
        (localConfig?.enableCustomDomain !== undefined
          ? String(localConfig.enableCustomDomain)
          : undefined),
      BACKEND_API_INFRA_DEFAULTS.enableCustomDomain
    ),
    stageDomains: {
      production:
        args.env.INFRA_BACKEND_API_DOMAIN_PRODUCTION ??
        localConfig?.domains?.production ??
        defaultStageDomains.production,
      dev:
        args.env.INFRA_BACKEND_API_DOMAIN_DEV ??
        localConfig?.domains?.dev ??
        defaultStageDomains.dev,
      mobile:
        args.env.INFRA_BACKEND_API_DOMAIN_MOBILE ??
        localConfig?.domains?.mobile ??
        defaultStageDomains.mobile,
    },
    certArns: {
      production:
        args.env.INFRA_BACKEND_API_CERT_ARN_PRODUCTION ?? localConfig?.certArns?.production ?? '',
      dev: args.env.INFRA_BACKEND_API_CERT_ARN_DEV ?? localConfig?.certArns?.dev ?? '',
      mobile: args.env.INFRA_BACKEND_API_CERT_ARN_MOBILE ?? localConfig?.certArns?.mobile ?? '',
    },
    lambda: {
      architecture: normalizeArchitecture(
        args.env.INFRA_BACKEND_API_ARCHITECTURE ??
          localConfig?.lambda?.architecture ??
          BACKEND_API_INFRA_DEFAULTS.lambda.architecture
      ),
      logRetentionDays: parsePositiveInteger(
        args.env.INFRA_BACKEND_API_LOG_RETENTION_DAYS ?? localConfig?.lambda?.logRetentionDays,
        BACKEND_API_INFRA_DEFAULTS.lambda.logRetentionDays
      ),
      memorySize: parsePositiveInteger(
        args.env.INFRA_BACKEND_API_MEMORY_SIZE ?? localConfig?.lambda?.memorySize,
        BACKEND_API_INFRA_DEFAULTS.lambda.memorySize
      ),
      timeoutSeconds: parsePositiveInteger(
        args.env.INFRA_BACKEND_API_TIMEOUT_SECONDS ?? localConfig?.lambda?.timeoutSeconds,
        BACKEND_API_INFRA_DEFAULTS.lambda.timeoutSeconds
      ),
    },
    auth: {
      audience:
        args.env.INFRA_BACKEND_API_AUTHENTIK_AUDIENCE ??
        localConfig?.auth?.audience ??
        BACKEND_API_INFRA_DEFAULTS.auth.audience,
      issuer: args.env.INFRA_BACKEND_API_AUTHENTIK_ISSUER ?? localConfig?.auth?.issuer ?? '',
      jwksUrl: args.env.INFRA_BACKEND_API_AUTHENTIK_JWKS_URL ?? localConfig?.auth?.jwksUrl ?? '',
    },
    environment: {
      ...(localConfig?.environment ?? {}),
      ...(args.env.INFRA_BACKEND_API_AUTHENTIK_JWT_SIGNING_KEY
        ? {
            AUTHENTIK_JWT_SIGNING_KEY: args.env.INFRA_BACKEND_API_AUTHENTIK_JWT_SIGNING_KEY,
          }
        : {}),
      ...(args.env.INFRA_BACKEND_API_DATABASE_URL
        ? { DATABASE_URL: args.env.INFRA_BACKEND_API_DATABASE_URL }
        : {}),
      ...(args.env.INFRA_BACKEND_API_DECAP_PUBLIC_BASE_URL
        ? { DECAP_PUBLIC_BASE_URL: args.env.INFRA_BACKEND_API_DECAP_PUBLIC_BASE_URL }
        : {}),
      ...(args.env.INFRA_BACKEND_API_DECAP_ALLOWED_ORIGINS
        ? { DECAP_ALLOWED_ORIGINS: args.env.INFRA_BACKEND_API_DECAP_ALLOWED_ORIGINS }
        : {}),
      ...(args.env.INFRA_BACKEND_API_DECAP_GITHUB_CLIENT_ID
        ? {
            DECAP_GITHUB_OAUTH_CLIENT_ID: args.env.INFRA_BACKEND_API_DECAP_GITHUB_CLIENT_ID,
          }
        : {}),
      ...(args.env.INFRA_BACKEND_API_DECAP_GITHUB_CLIENT_SECRET
        ? {
            DECAP_GITHUB_OAUTH_CLIENT_SECRET: args.env.INFRA_BACKEND_API_DECAP_GITHUB_CLIENT_SECRET,
          }
        : {}),
      ...(args.env.INFRA_BACKEND_API_DECAP_GITHUB_OAUTH_REPO_PRIVATE
        ? {
            DECAP_GITHUB_OAUTH_REPO_PRIVATE:
              args.env.INFRA_BACKEND_API_DECAP_GITHUB_OAUTH_REPO_PRIVATE,
          }
        : {}),
      ...(args.env.INFRA_BACKEND_API_DECAP_GITHUB_OAUTH_SCOPE
        ? {
            DECAP_GITHUB_OAUTH_SCOPE: args.env.INFRA_BACKEND_API_DECAP_GITHUB_OAUTH_SCOPE,
          }
        : {}),
      ...(args.env.INFRA_BACKEND_API_DECAP_OAUTH_STATE_SECRET
        ? {
            DECAP_OAUTH_STATE_SECRET: args.env.INFRA_BACKEND_API_DECAP_OAUTH_STATE_SECRET,
          }
        : {}),
    },
  };
}

export function resolveBackendApiStageDomain(settings: BackendApiSettings, stage: string): string {
  return settings.stageDomains[resolveStageKey(stage)];
}

export function deployBackendApiInfrastructure(
  args: BackendApiInfrastructureArgs
): BackendApiInfrastructureResources {
  const resolvedAppPath = resolveBackendApiAppPath(args.settings.appPath);
  const bundlePath = path.resolve(resolvedAppPath, args.settings.buildOutput);

  if (!fs.existsSync(bundlePath)) {
    throw new Error(
      [
        `Backend API bundle not found at ${bundlePath}.`,
        `Run "${args.settings.buildCommand}" before deploying a backend API stack.`,
      ].join(' ')
    );
  }

  const stageDomain = resolveBackendApiStageDomain(args.settings, args.stage);
  const stageKey = resolveStageKey(args.stage);
  const authIssuer =
    args.settings.auth.issuer || `https://${resolveAuthDomain(args.rootDomain, args.stage)}`;
  const authJwksUrl =
    args.settings.auth.jwksUrl || `${authIssuer.replace(/\/+$/, '')}/application/o/jwks/`;
  const resourceBaseName = sanitizeResourceName(`${args.appName}-${args.stage}-api`);
  const lambdaFunctionName = sanitizeResourceName(`${args.appName}-${args.stage}-nestjs-api`);
  const tags = createResourceTags(args);

  const role = new aws.iam.Role(`${resourceBaseName}-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'lambda.amazonaws.com',
    }),
    tags,
  });

  new aws.iam.RolePolicyAttachment(`${resourceBaseName}-basic-exec`, {
    role: role.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  const logGroup = new aws.cloudwatch.LogGroup(`${resourceBaseName}-logs`, {
    name: `/aws/lambda/${lambdaFunctionName}`,
    retentionInDays: args.settings.lambda.logRetentionDays,
    tags,
  });

  const apiFunction = new aws.lambda.Function(
    resourceBaseName,
    {
      architectures: [args.settings.lambda.architecture],
      code: new pulumi.asset.FileArchive(bundlePath),
      environment: {
        variables: {
          APP_STAGE: resolveStageKey(args.stage),
          AUTHENTIK_AUDIENCE: args.settings.auth.audience,
          AUTHENTIK_ISSUER: authIssuer,
          AUTHENTIK_JWKS_URL: authJwksUrl,
          NODE_ENV: 'production',
          ...args.settings.environment,
          AUTHENTIK_JWT_SIGNING_KEY:
            args.authentikJwtSigningKey ??
            args.settings.environment.AUTHENTIK_JWT_SIGNING_KEY ??
            '',
        },
      },
      name: lambdaFunctionName,
      handler: 'lambda.handler',
      memorySize: args.settings.lambda.memorySize,
      role: role.arn,
      runtime: 'nodejs22.x',
      tags,
      timeout: args.settings.lambda.timeoutSeconds,
    },
    {
      dependsOn: [logGroup],
    }
  );

  const api = new aws.apigatewayv2.Api(`${resourceBaseName}-http-api`, {
    description: 'Alternun NestJS API',
    name: `${resourceBaseName}-http-api`,
    protocolType: 'HTTP',
    tags,
  });

  const integration = new aws.apigatewayv2.Integration(`${resourceBaseName}-integration`, {
    apiId: api.id,
    integrationType: 'AWS_PROXY',
    integrationUri: apiFunction.invokeArn,
    integrationMethod: 'POST',
    payloadFormatVersion: '2.0',
  });

  new aws.apigatewayv2.Route(`${resourceBaseName}-default-route`, {
    apiId: api.id,
    routeKey: '$default',
    target: pulumi.interpolate`integrations/${integration.id}`,
  });

  const apiStage = new aws.apigatewayv2.Stage(`${resourceBaseName}-stage`, {
    apiId: api.id,
    autoDeploy: true,
    name: '$default',
    tags,
  });

  new aws.lambda.Permission(`${resourceBaseName}-invoke-permission`, {
    action: 'lambda:InvokeFunction',
    function: apiFunction.name,
    principal: 'apigateway.amazonaws.com',
    sourceArn: pulumi.interpolate`${api.executionArn}/*`,
  });

  const shouldCreateCustomDomain = args.settings.enableCustomDomain && Boolean(args.hostedZoneId);

  let customDomain: aws.apigatewayv2.DomainName | undefined;
  let certificateArn: pulumi.Input<string> | undefined =
    args.settings.certArns[stageKey] || undefined;
  if (shouldCreateCustomDomain && args.hostedZoneId) {
    if (!certificateArn) {
      const certificate = new aws.acm.Certificate(`${resourceBaseName}-cert`, {
        domainName: stageDomain,
        validationMethod: 'DNS',
        tags,
      });

      const certificateValidationRecord = new aws.route53.Record(
        `${resourceBaseName}-cert-validation`,
        {
          allowOverwrite: true,
          name: certificate.domainValidationOptions[0].resourceRecordName,
          records: [certificate.domainValidationOptions[0].resourceRecordValue],
          ttl: 60,
          type: certificate.domainValidationOptions[0].resourceRecordType,
          zoneId: args.hostedZoneId,
        }
      );

      const certificateValidation = new aws.acm.CertificateValidation(
        `${resourceBaseName}-cert-validation-complete`,
        {
          certificateArn: certificate.arn,
          validationRecordFqdns: [certificateValidationRecord.fqdn],
        }
      );

      certificateArn = certificateValidation.certificateArn;
    }

    if (!certificateArn) {
      throw new Error(`Custom domain certificate could not be resolved for ${stageDomain}.`);
    }

    customDomain = new aws.apigatewayv2.DomainName(`${resourceBaseName}-domain`, {
      domainName: stageDomain,
      domainNameConfiguration: {
        certificateArn,
        endpointType: 'REGIONAL',
        securityPolicy: 'TLS_1_2',
      },
      tags,
    });

    new aws.apigatewayv2.ApiMapping(`${resourceBaseName}-mapping`, {
      apiId: api.id,
      domainName: customDomain.domainName,
      stage: apiStage.name,
    });

    new aws.route53.Record(`${resourceBaseName}-alias`, {
      aliases: [
        {
          evaluateTargetHealth: false,
          name: customDomain.domainNameConfiguration.targetDomainName,
          zoneId: customDomain.domainNameConfiguration.hostedZoneId,
        },
      ],
      name: stageDomain,
      type: 'A',
      zoneId: args.hostedZoneId,
    });
  }

  const invokeUrl = customDomain
    ? pulumi.interpolate`https://${customDomain.domainName}`
    : api.apiEndpoint;

  return {
    apiId: api.id,
    customDomain: customDomain ? customDomain.domainName : pulumi.output(undefined),
    functionArn: apiFunction.arn,
    functionName: apiFunction.name,
    invokeUrl,
    logGroupName: logGroup.name,
  };
}

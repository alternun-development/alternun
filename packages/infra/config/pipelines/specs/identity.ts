import { buildNonExpoPipelineEnv, IDENTITY_PIPELINE_SET, resolveBranch } from '../shared.js';
import type { IdentityPipelineStage, PipelineConfigContext, PipelineSpecRecord } from '../types.js';

function resolveDevGoogleLoginFlowSlug(env: NodeJS.ProcessEnv): string {
  return env.INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG?.trim() ?? '';
}

function resolveDevDiscordLoginFlowSlug(env: NodeJS.ProcessEnv): string {
  return env.INFRA_IDENTITY_DISCORD_LOGIN_FLOW_SLUG?.trim() ?? '';
}

export function buildIdentityPipelineSpecs({
  env,
  pipeline,
}: PipelineConfigContext): PipelineSpecRecord<IdentityPipelineStage> {
  const googleAuthClientId =
    env.INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID ?? env.GOOGLE_AUTH_CLIENT_ID ?? '';
  const googleAuthClientSecret =
    env.INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_SECRET ??
    env.GOOGLE_AUTH_CLIENT_SECRET ??
    env.GOOGLEA_AUTH_CLIENT_SECRET ??
    '';
  const googleAuthClientSecretKey = 'INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_SECRET';
  const discordAuthClientId =
    env.INFRA_IDENTITY_DISCORD_AUTH_CLIENT_ID ?? env.DISCORD_CLIENT_ID ?? '';
  const discordAuthClientSecret =
    env.INFRA_IDENTITY_DISCORD_AUTH_CLIENT_SECRET ?? env.DISCORD_CLIENT_SECRET ?? '';
  const discordAuthClientSecretKey = 'INFRA_IDENTITY_DISCORD_AUTH_CLIENT_SECRET';
  const devGoogleLoginFlowSlug = resolveDevGoogleLoginFlowSlug(env);
  const devDiscordLoginFlowSlug = resolveDevDiscordLoginFlowSlug(env);
  const productionExistingSmtpCredentialsSecretName =
    env.INFRA_IDENTITY_EXISTING_SMTP_SECRET_NAME?.trim() ?? '';
  const productionExistingAuthentikSecretName =
    env.INFRA_IDENTITY_EXISTING_AUTHENTIK_SECRET_NAME?.trim() ?? '';
  const productionExistingDatabaseCredentialsSecretName =
    env.INFRA_IDENTITY_EXISTING_DATABASE_CREDENTIALS_SECRET_NAME?.trim() ?? '';
  const productionExistingJwtSigningSecretName =
    env.INFRA_IDENTITY_EXISTING_JWT_SIGNING_SECRET_NAME?.trim() ?? '';
  const productionExistingIntegrationConfigSecretName =
    env.INFRA_IDENTITY_EXISTING_INTEGRATION_CONFIG_SECRET_NAME?.trim() ?? '';
  const productionEc2MigrationEnabled =
    env.INFRA_IDENTITY_ENABLE_EC2_PRODUCTION_MIGRATION?.trim().toLowerCase() === 'true';
  const productionExistingLoadBalancerArn =
    env.INFRA_IDENTITY_IMPORT_EXISTING_ALB_ARN?.trim() ?? '';
  const productionExistingDatabaseIdentifier =
    env.INFRA_IDENTITY_IMPORT_EXISTING_RDS_INSTANCE_IDENTIFIER?.trim() ?? '';
  const clearedDefaultApplicationLaunchUrl = '';

  return {
    'identity-dev': {
      suffix: 'auth-dev',
      branch: resolveBranch(
        env.INFRA_PIPELINE_BRANCH_IDENTITY_DEV,
        env.INFRA_PIPELINE_BRANCH_IDENTITY,
        pipeline?.branchIdentityDev,
        pipeline?.branchIdentity,
        pipeline?.branchDev,
        'develop'
      ),
      outputKey: 'identityDevPipelineName',
      stage: 'identity-dev',
      buildEnv: buildNonExpoPipelineEnv('identity-dev', IDENTITY_PIPELINE_SET, {
        INFRA_IDENTITY_ENABLED: 'true',
        INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
        INFRA_IDENTITY_ENABLED_STAGES: 'dev',
        INFRA_IDENTITY_DATABASE_MODE: 'rds',
        INFRA_IDENTITY_USERDATA_REPLACE_ON_CHANGE: 'false',
        INFRA_IDENTITY_ENABLE_RESOURCE_PROTECTION: 'true',
        INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT: 'false',
        INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE: 'false',
        INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID: googleAuthClientId,
        INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG: devGoogleLoginFlowSlug,
        INFRA_IDENTITY_DISCORD_AUTH_CLIENT_ID: discordAuthClientId,
        INFRA_IDENTITY_DISCORD_LOGIN_FLOW_SLUG: devDiscordLoginFlowSlug,
        INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL: clearedDefaultApplicationLaunchUrl,
        [googleAuthClientSecretKey]: googleAuthClientSecret,
        [discordAuthClientSecretKey]: discordAuthClientSecret,
      }),
    },
    'identity-prod': {
      suffix: 'auth-prod',
      branch: resolveBranch(
        env.INFRA_PIPELINE_BRANCH_IDENTITY_PROD,
        pipeline?.branchIdentityProd,
        pipeline?.branchProd,
        'master'
      ),
      outputKey: 'identityProdPipelineName',
      stage: 'identity-prod',
      buildEnv: buildNonExpoPipelineEnv('identity-prod', IDENTITY_PIPELINE_SET, {
        INFRA_IDENTITY_ENABLED: 'true',
        INFRA_IDENTITY_DEDICATED_STACKS_ONLY: 'true',
        INFRA_IDENTITY_ENABLED_STAGES: 'production',
        // Existing production stacks use RDS behind an ALB. Do not transition
        // that topology just by deploying a source change: an operator must
        // explicitly opt in to the coordinated EC2/direct-ingress migration.
        INFRA_IDENTITY_DATABASE_MODE: productionEc2MigrationEnabled ? 'ec2' : 'rds',
        INFRA_IDENTITY_INGRESS_MODE_PRODUCTION: productionEc2MigrationEnabled ? 'instance' : 'alb',
        INFRA_IDENTITY_TLS_MODE_PRODUCTION: productionEc2MigrationEnabled
          ? 'acme-route53-dns-01'
          : 'alb-acm',
        INFRA_IDENTITY_IMPORT_EXISTING_ALB_ARN: productionExistingLoadBalancerArn,
        INFRA_IDENTITY_IMPORT_EXISTING_RDS_INSTANCE_IDENTIFIER:
          productionExistingDatabaseIdentifier,
        // The original names are awaiting deletion in Secrets Manager. Keep the
        // new production deployment isolated from that retired secret set.
        INFRA_IDENTITY_SECRET_AUTHENTIK_KEY_NAME: 'alternun-infra/identity/authentik-secret-key-v2',
        INFRA_IDENTITY_SECRET_DB_CREDENTIALS_NAME:
          'alternun-infra/identity/database-credentials-v2',
        INFRA_IDENTITY_SECRET_SMTP_CREDENTIALS_NAME: 'alternun-infra/identity/smtp-credentials-v2',
        // Adoption is opt-in per deployment environment. New and recovery
        // accounts leave this empty and create the managed secret instead.
        INFRA_IDENTITY_EXISTING_AUTHENTIK_SECRET_NAME: productionExistingAuthentikSecretName,
        INFRA_IDENTITY_EXISTING_DATABASE_CREDENTIALS_SECRET_NAME:
          productionExistingDatabaseCredentialsSecretName,
        INFRA_IDENTITY_EXISTING_SMTP_SECRET_NAME: productionExistingSmtpCredentialsSecretName,
        INFRA_IDENTITY_EXISTING_JWT_SIGNING_SECRET_NAME: productionExistingJwtSigningSecretName,
        INFRA_IDENTITY_EXISTING_INTEGRATION_CONFIG_SECRET_NAME:
          productionExistingIntegrationConfigSecretName,
        INFRA_IDENTITY_SECRET_JWT_SIGNING_KEY_NAME: 'alternun-infra/identity/jwt-signing-key-v2',
        INFRA_IDENTITY_SECRET_INTEGRATION_CONFIG_NAME:
          'alternun-infra/identity/integration-config-v2',
        INFRA_IDENTITY_USERDATA_REPLACE_ON_CHANGE: 'false',
        INFRA_IDENTITY_ENABLE_RESOURCE_PROTECTION: 'true',
        INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT: 'false',
        INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE: productionEc2MigrationEnabled ? 'true' : 'false',
        // Provider-specific outer SourceStage flows resume the pending Admin
        // OIDC request after the selected provider returns to its callback.
        // Keep every configured provider out of the shared default source
        // flows so one direct provider cannot reintroduce UserLoginStage.
        INFRA_ALLOW_CUSTOM_AUTHENTIK_PROVIDER_FLOW_SLUGS: 'true',
        INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID: googleAuthClientId,
        INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG: 'alternun-google-login',
        INFRA_IDENTITY_DISCORD_AUTH_CLIENT_ID: discordAuthClientId,
        INFRA_IDENTITY_DISCORD_LOGIN_FLOW_SLUG: 'alternun-discord-login',
        INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL: clearedDefaultApplicationLaunchUrl,
        [googleAuthClientSecretKey]: googleAuthClientSecret,
        [discordAuthClientSecretKey]: discordAuthClientSecret,
      }),
    },
  };
}

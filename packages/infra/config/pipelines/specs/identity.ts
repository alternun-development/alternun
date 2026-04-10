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
        INFRA_IDENTITY_DATABASE_MODE: 'rds',
        INFRA_IDENTITY_USERDATA_REPLACE_ON_CHANGE: 'false',
        INFRA_IDENTITY_ENABLE_RESOURCE_PROTECTION: 'true',
        INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT: 'false',
        INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE: 'false',
        INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID: googleAuthClientId,
        INFRA_IDENTITY_DISCORD_AUTH_CLIENT_ID: discordAuthClientId,
        INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL: clearedDefaultApplicationLaunchUrl,
        [googleAuthClientSecretKey]: googleAuthClientSecret,
        [discordAuthClientSecretKey]: discordAuthClientSecret,
      }),
    },
  };
}

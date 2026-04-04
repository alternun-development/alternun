import { buildNonExpoPipelineEnv, IDENTITY_PIPELINE_SET, resolveBranch } from '../shared.js';
import type { IdentityPipelineStage, PipelineConfigContext, PipelineSpecRecord } from '../types.js';

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
  const devAppLaunchUrl = `https://${
    env.INFRA_EXPO_DOMAIN_DEV ?? 'testnet.airs.alternun.co'
  }/auth?next=/`;
  const prodAppLaunchUrl = `https://${
    env.INFRA_EXPO_DOMAIN_PRODUCTION ?? 'airs.alternun.co'
  }/auth?next=/`;

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
        INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL: devAppLaunchUrl,
        INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID: googleAuthClientId,
        INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG: 'alternun-google-login',
        [googleAuthClientSecretKey]: googleAuthClientSecret,
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
        INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL: prodAppLaunchUrl,
        INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID: googleAuthClientId,
        [googleAuthClientSecretKey]: googleAuthClientSecret,
      }),
    },
  };
}

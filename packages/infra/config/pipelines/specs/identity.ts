import { buildNonExpoPipelineEnv, IDENTITY_PIPELINE_SET, resolveBranch } from '../shared.js';
import type { IdentityPipelineStage, PipelineConfigContext, PipelineSpecRecord } from '../types.js';

export function buildIdentityPipelineSpecs({
  env,
  pipeline,
}: PipelineConfigContext): PipelineSpecRecord<IdentityPipelineStage> {
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
        INFRA_IDENTITY_DATABASE_MODE: 'ec2',
        INFRA_IDENTITY_USERDATA_REPLACE_ON_CHANGE: 'false',
        INFRA_IDENTITY_ENABLE_RESOURCE_PROTECTION: 'true',
        INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT: 'false',
        INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE: 'false',
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
      }),
    },
  };
}

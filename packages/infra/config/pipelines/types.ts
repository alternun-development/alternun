export type PipelineStage = 'production' | 'dev' | 'mobile';
export type DashboardPipelineStage = 'dashboard-dev' | 'dashboard-prod';
export type AdminPipelineStage = 'admin-dev' | 'admin-prod';
export type BackendPipelineStage = 'api-dev' | 'api-prod';
export type IdentityPipelineStage = 'identity-dev' | 'identity-prod';
export type DeploymentStage =
  | PipelineStage
  | IdentityPipelineStage
  | BackendPipelineStage
  | AdminPipelineStage
  | DashboardPipelineStage;
export type ManagedPipeline =
  | PipelineStage
  | IdentityPipelineStage
  | BackendPipelineStage
  | AdminPipelineStage
  | DashboardPipelineStage;
export type PipelineComputeType =
  | 'BUILD_GENERAL1_SMALL'
  | 'BUILD_GENERAL1_MEDIUM'
  | 'BUILD_GENERAL1_LARGE';

export interface PipelineLocalConfig {
  repo?: string;
  prefix?: string;
  projectTag?: string;
  codestarConnectionArn?: string;
  pipelines?: string;
  branchProd?: string;
  branchDev?: string;
  branchMobile?: string;
  branchIdentity?: string;
  branchIdentityDev?: string;
  branchIdentityProd?: string;
  branchApi?: string;
  branchApiDev?: string;
  branchApiProd?: string;
  branchAdmin?: string;
  branchAdminDev?: string;
  branchAdminProd?: string;
  branchDashboard?: string;
  branchDashboardDev?: string;
  branchDashboardProd?: string;
  computeType?: PipelineComputeType;
  timeoutMinutes?: number;
}

export interface PipelineSpec {
  suffix: string;
  branch: string;
  outputKey: string;
  stage: DeploymentStage;
  buildEnv?: Record<string, string>;
}

export type PipelineSpecRecord<T extends ManagedPipeline> = Record<T, PipelineSpec>;

export interface PipelineConfigContext {
  env: NodeJS.ProcessEnv;
  pipeline?: PipelineLocalConfig;
}

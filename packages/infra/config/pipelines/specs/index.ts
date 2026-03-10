import type { PipelineConfigContext, PipelineSpecRecord, ManagedPipeline } from '../types.js';
import { buildAdminPipelineSpecs } from './admin.js';
import { buildBackendPipelineSpecs } from './api.js';
import { buildCorePipelineSpecs } from './core.js';
import { buildDashboardPipelineSpecs } from './dashboard.js';
import { buildIdentityPipelineSpecs } from './identity.js';

export function buildPipelineSpecs(
  context: PipelineConfigContext
): PipelineSpecRecord<ManagedPipeline> {
  return {
    ...buildCorePipelineSpecs(context),
    ...buildBackendPipelineSpecs(context),
    ...buildIdentityPipelineSpecs(context),
    ...buildDashboardPipelineSpecs(context),
    ...buildAdminPipelineSpecs(context),
  };
}

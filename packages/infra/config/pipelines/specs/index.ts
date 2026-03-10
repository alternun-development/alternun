import type { PipelineConfigContext, PipelineSpecRecord, ManagedPipeline } from '../types.js';
import { buildCorePipelineSpecs } from './core.js';
import { buildDashboardPipelineSpecs } from './dashboard.js';
import { buildIdentityPipelineSpecs } from './identity.js';

export function buildPipelineSpecs(
  context: PipelineConfigContext
): PipelineSpecRecord<ManagedPipeline> {
  return {
    ...buildCorePipelineSpecs(context),
    ...buildIdentityPipelineSpecs(context),
    ...buildDashboardPipelineSpecs(context),
  };
}

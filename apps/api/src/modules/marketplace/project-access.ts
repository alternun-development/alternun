/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Get, Inject, Injectable, Req, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import {
  hasPermission,
  type AdminPrincipal,
  type FastifyAdminRequest,
} from '../../common/admin-auth/admin-auth.guard';
import { ApiErrorDto } from './marketplace.dto';
import {
  MarketplaceApiError,
  MarketplaceExceptionFilter,
  marketplaceError,
} from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import { MARKETPLACE_SUPABASE, MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';

/** A project that still lacks its Airs account or an active Project Admin. */
export interface ProjectAccessGap {
  projectId: string;
  slug: string;
  missingAccount: boolean;
  missingAdmin: boolean;
}

type Row = Record<string, unknown>;

export function mapProjectAccessGap(row: Row): ProjectAccessGap {
  return {
    projectId: String(row.project_id ?? ''),
    slug: String(row.slug ?? ''),
    missingAccount: row.missing_account === true,
    missingAdmin: row.missing_admin === true,
  };
}

@Injectable()
export class ProjectAccessRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async gaps(): Promise<ProjectAccessGap[]> {
    const { data, error } = await this.client.rpc('marketplace_projects_missing_account_or_admin');
    if (error) {
      throw new MarketplaceApiError(
        'MARKETPLACE_UNAVAILABLE',
        'Marketplace storage is unavailable.'
      );
    }
    return ((data ?? []) as Row[]).map(mapProjectAccessGap);
  }
}

@Injectable()
export class ProjectAccessService {
  constructor(
    private readonly repository: ProjectAccessRepository,
    private readonly adminRepository: MarketplaceAdminRepository
  ) {}

  /** Projects without an Airs account or a Project Admin: the B2 check, for Super Admins. */
  async gaps(principal: AdminPrincipal, requestId: string): Promise<ProjectAccessGap[]> {
    if (!hasPermission(principal, 'project_access:read')) {
      await this.adminRepository.audit({
        actor: actorFromPrincipal(principal),
        action: 'authorization.denied',
        targetType: 'project_access',
        requestId,
        result: 'denied',
        reasonCode: 'PERMISSION_DENIED',
      });
      marketplaceError('PERMISSION_DENIED');
    }
    return this.repository.gaps();
  }
}

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

@ApiTags('admin project access')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/project-access', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class ProjectAccessController {
  constructor(private readonly service: ProjectAccessService) {}

  @Get('gaps')
  @RequireMarketplacePermission('project_access:read')
  @ApiOkResponse({
    description: 'Projects with no linked Airs account or no active Project Admin.',
  })
  gaps(@Req() request: FastifyAdminRequest) {
    return this.service.gaps(request.adminPrincipal!, requestId(request));
  }
}

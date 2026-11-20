import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateEnterpriseProductDto,
  CreateUploadUrlDto,
  UpdateEnterpriseDto,
  UpdateEnterpriseProductDto,
} from './marketplace.dto';
import { MarketplaceExceptionFilter, marketplaceError } from './marketplace.errors';
import { MarketplaceAdminService } from './marketplace.service';
import { MarketplaceMembershipService } from './marketplace-membership.service';
import { AddProjectTeamMemberDto, RevokeProjectTeamMemberDto } from './project-manage.dto';
import { enterpriseManageOverview, ProjectManageAccess } from './project-manage.service';
import { ProjectClientService } from './project-client.service';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

function bearer(authorization: string | undefined): string {
  if (!authorization?.trim()) throw new UnauthorizedException('Missing bearer token');
  return authorization;
}

/**
 * In-app "Manage enterprise" API for enterprise admins (enterprise-wide memberships) and Alternun
 * global admins, authorized with the Airs session. Each call reuses the console's services.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller({ path: 'me/enterprises/:enterpriseId/manage', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class EnterpriseManageController {
  constructor(
    private readonly access: ProjectManageAccess,
    private readonly marketplace: MarketplaceAdminService,
    private readonly memberships: MarketplaceMembershipService,
    private readonly clients: ProjectClientService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Enterprise, roles and what the user can manage on it.' })
  async overview(
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string
  ) {
    const { principal, enterprise, isGlobalAdmin } = await this.access.resolveEnterprise(
      bearer(authorization),
      enterpriseId
    );
    return enterpriseManageOverview(principal, enterprise, isGlobalAdmin);
  }

  @Patch()
  @ApiOperation({ summary: 'Edit the enterprise mini-page profile.' })
  async update(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Body() body: UpdateEnterpriseDto
  ) {
    const { principal, isGlobalAdmin } = await this.access.resolveEnterprise(
      bearer(authorization),
      enterpriseId
    );
    const enterprise = await this.marketplace.updateEnterprise(
      principal,
      requestId(request),
      enterpriseId,
      body
    );
    return enterpriseManageOverview(principal, enterprise, isGlobalAdmin).enterprise;
  }

  @Post('upload-url')
  async uploadUrl(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Body() body: CreateUploadUrlDto
  ) {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    return this.marketplace.createUploadUrl(
      principal,
      requestId(request),
      { type: 'enterprise', id: enterpriseId },
      body
    );
  }

  @Get('products')
  async products(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string
  ) {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    return this.marketplace.listProducts(principal, requestId(request), enterpriseId);
  }

  @Post('products')
  async createProduct(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Body() body: CreateEnterpriseProductDto
  ) {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    return this.marketplace.createProduct(principal, requestId(request), enterpriseId, body);
  }

  @Patch('products/:productId')
  async updateProduct(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() body: UpdateEnterpriseProductDto
  ) {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    return this.marketplace.updateProduct(
      principal,
      requestId(request),
      enterpriseId,
      productId,
      body
    );
  }

  @Delete('products/:productId')
  @HttpCode(204)
  async deleteProduct(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string
  ): Promise<void> {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    await this.marketplace.deleteProduct(principal, requestId(request), enterpriseId, productId);
  }

  @Get('team')
  async team(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string
  ) {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    const all = await this.memberships.list(principal, requestId(request), { enterpriseId });
    // Project teams are managed from each project's view.
    return all.filter((membership) => membership.scopeType === 'enterprise');
  }

  @Post('team')
  async addTeamMember(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Body() body: AddProjectTeamMemberDto
  ) {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    return this.memberships.grantByEmail(principal, requestId(request), {
      email: body.email,
      role: body.role,
      enterpriseId,
      scopeType: 'enterprise',
    });
  }

  @Post('team/:membershipId/revoke')
  async revokeTeamMember(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Param('membershipId', new ParseUUIDPipe({ version: '4' })) membershipId: string,
    @Body() body: RevokeProjectTeamMemberDto
  ) {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    const membership = await this.memberships.get(principal, requestId(request), membershipId);
    // Only enterprise-wide memberships of this enterprise can be revoked from its manage view.
    if (membership.enterpriseId !== enterpriseId || membership.scopeType !== 'enterprise')
      marketplaceError('MEMBERSHIP_NOT_FOUND');
    return this.memberships.revoke(principal, requestId(request), membershipId, body.reason);
  }

  @Get('clients')
  @ApiOperation({ summary: "Clients of the enterprise's projects, with the project names." })
  async listClients(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string
  ) {
    const { principal } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    return this.clients.listForEnterprise(principal, requestId(request), enterpriseId);
  }
}

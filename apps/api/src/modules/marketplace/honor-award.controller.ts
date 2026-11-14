import {
  Body,
  Controller,
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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { FastifyRequest } from 'fastify';
import type { FastifyAdminRequest } from '../../common/admin-auth/admin-auth.guard';
import { resolveUserId } from '../../common/auth/resolve-user-id';
import { ApiErrorDto } from './marketplace.dto';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard, RequireMarketplacePermission } from './marketplace.guard';
import { ProjectManageAccess } from './project-manage.service';
import { HonorAwardService } from './honor-award.service';
import {
  HONOR_AWARD_AUDIENCES,
  HONOR_AWARD_KINDS,
  HONOR_AWARD_TIERS,
  type HonorAwardAudience,
  type HonorAwardKind,
  type HonorAwardTier,
} from './honor-award.types';

function requestId(request: FastifyRequest): string {
  return String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
}

function bearer(authorization: string | undefined): string {
  if (!authorization?.trim()) throw new UnauthorizedException('Missing bearer token');
  return authorization;
}

class HonorAwardRecipeFieldsDto {
  @ApiPropertyOptional({ enum: HONOR_AWARD_KINDS })
  @IsOptional()
  @IsIn(HONOR_AWARD_KINDS)
  kind?: HonorAwardKind;

  @ApiPropertyOptional({ enum: HONOR_AWARD_TIERS })
  @IsOptional()
  @IsIn(HONOR_AWARD_TIERS)
  tier?: HonorAwardTier;

  @ApiPropertyOptional({ enum: HONOR_AWARD_AUDIENCES })
  @IsOptional()
  @IsIn(HONOR_AWARD_AUDIENCES)
  audience?: HonorAwardAudience;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(80)
  classification?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  purpose?: string | null;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  eventName?: string | null;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(2000)
  @Max(2100)
  eventYear?: number | null;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  venueName?: string | null;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(160)
  venueLocation?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 1000000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  airsAmount?: number;

  @ApiPropertyOptional({ description: 'Medal art shown in the collection and the claim.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  badgeImageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Optional full art of the front of the card.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  frontImageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Header photo of the back of the card.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  backImageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Built-in art when there is no image, e.g. "golf_mangrove" or "coast".',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(40)
  artPreset?: string | null;

  @ApiPropertyOptional({ description: 'Impact project the award supports.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  projectId?: string | null;

  @ApiPropertyOptional({ description: 'Ally enterprise that backs the award.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  partnerEnterpriseId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class CreateHonorAwardRecipeDto extends HonorAwardRecipeFieldsDto {
  @ApiProperty({ minLength: 1, maxLength: 80, description: 'Mission or award name.' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;
}

export class UpdateHonorAwardRecipeDto extends HonorAwardRecipeFieldsDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GrantHonorAwardDto {
  @ApiProperty({ enum: HONOR_AWARD_AUDIENCES })
  @IsIn(HONOR_AWARD_AUDIENCES)
  recipientType!: HonorAwardAudience;

  @ApiPropertyOptional({ description: 'Account email of the person (recipientType "user").' })
  @ValidateIf((dto: GrantHonorAwardDto) => dto.recipientType === 'user')
  @IsString()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ description: 'Enterprise id (recipientType "enterprise").' })
  @ValidateIf((dto: GrantHonorAwardDto) => dto.recipientType === 'enterprise')
  @IsUUID('4')
  enterpriseId?: string;

  @ApiPropertyOptional({ maxLength: 80, description: 'For example a reservation number.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class EnterpriseGrantHonorAwardDto {
  @ApiProperty({ description: 'Honor award recipe backed by this ally.' })
  @IsUUID('4')
  recipeId!: string;

  @ApiProperty({ description: 'Account email of the person.' })
  @IsString()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional({ maxLength: 80, description: 'For example the reservation number.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class HonorAwardGuestLookupDto {
  @ApiProperty({ description: 'Account email of the person.' })
  @IsString()
  @MaxLength(320)
  email!: string;
}

@ApiTags('admin honor awards')
@ApiBearerAuth()
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@Controller({ path: 'admin/honor-awards', version: '1' })
@UseGuards(MarketplaceAdminGuard)
@UseFilters(MarketplaceExceptionFilter)
export class HonorAwardAdminController {
  constructor(private readonly service: HonorAwardService) {}

  @Get('recipes')
  @RequireMarketplacePermission('medals:manage')
  @ApiOkResponse({ description: 'Every honor award recipe.' })
  listRecipes(@Req() request: FastifyAdminRequest) {
    return this.service.listRecipes(request.adminPrincipal!, requestId(request));
  }

  @Post('recipes')
  @RequireMarketplacePermission('medals:manage')
  createRecipe(@Req() request: FastifyAdminRequest, @Body() body: CreateHonorAwardRecipeDto) {
    return this.service.createRecipe(request.adminPrincipal!, requestId(request), body);
  }

  @Patch('recipes/:recipeId')
  @RequireMarketplacePermission('medals:manage')
  updateRecipe(
    @Req() request: FastifyAdminRequest,
    @Param('recipeId', new ParseUUIDPipe({ version: '4' })) recipeId: string,
    @Body() body: UpdateHonorAwardRecipeDto
  ) {
    return this.service.updateRecipe(request.adminPrincipal!, requestId(request), recipeId, body);
  }

  @Get('recipes/:recipeId/grants')
  @RequireMarketplacePermission('medals:manage')
  listGrants(
    @Req() request: FastifyAdminRequest,
    @Param('recipeId', new ParseUUIDPipe({ version: '4' })) recipeId: string
  ) {
    return this.service.listGrants(request.adminPrincipal!, requestId(request), recipeId);
  }

  @Post('recipes/:recipeId/grants')
  @RequireMarketplacePermission('medals:manage')
  grant(
    @Req() request: FastifyAdminRequest,
    @Param('recipeId', new ParseUUIDPipe({ version: '4' })) recipeId: string,
    @Body() body: GrantHonorAwardDto
  ) {
    const recipient =
      body.recipientType === 'user'
        ? {
            recipientType: 'user' as const,
            email: body.email ?? '',
            reference: body.reference,
            note: body.note,
          }
        : {
            recipientType: 'enterprise' as const,
            enterpriseId: body.enterpriseId ?? '',
            note: body.note,
          };
    return this.service.grant(request.adminPrincipal!, requestId(request), recipeId, recipient);
  }

  @Post('grants/:grantId/revoke')
  @HttpCode(200)
  @RequireMarketplacePermission('medals:manage')
  revoke(
    @Req() request: FastifyAdminRequest,
    @Param('grantId', new ParseUUIDPipe({ version: '4' })) grantId: string
  ) {
    return this.service.revoke(request.adminPrincipal!, requestId(request), grantId);
  }
}

/** The signed-in person's honor awards: pending ones to claim and the ones already claimed. */
@ApiTags('me')
@ApiBearerAuth()
@Controller({ path: 'me/honor-awards', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class HonorAwardMeController {
  constructor(private readonly service: HonorAwardService) {}

  @Get()
  @ApiOperation({ summary: 'Pending and claimed honor awards of the signed-in person.' })
  async list(@Headers('authorization') authorization: string | undefined) {
    const userId = await resolveUserId(bearer(authorization));
    return this.service.listForOwner({ userId });
  }

  @Post(':grantId/claim')
  @HttpCode(200)
  @ApiOperation({ summary: 'Claim a pending honor award.' })
  async claim(
    @Headers('authorization') authorization: string | undefined,
    @Param('grantId', new ParseUUIDPipe({ version: '4' })) grantId: string
  ) {
    const userId = await resolveUserId(bearer(authorization));
    return this.service.claim({ userId }, grantId);
  }
}

/** Honor awards of an ally, claimed from its in-app manage view. */
@ApiTags('me')
@ApiBearerAuth()
@Controller({ path: 'me/enterprises/:enterpriseId/manage/honor-awards', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class EnterpriseHonorAwardController {
  constructor(
    private readonly access: ProjectManageAccess,
    private readonly service: HonorAwardService
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string
  ) {
    const { enterprise } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    return this.service.listForOwner({ enterpriseId: enterprise.id });
  }

  @Post(':grantId/claim')
  @HttpCode(200)
  async claim(
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Param('grantId', new ParseUUIDPipe({ version: '4' })) grantId: string
  ) {
    const { enterprise } = await this.access.resolveEnterprise(bearer(authorization), enterpriseId);
    return this.service.claim({ enterpriseId: enterprise.id }, grantId);
  }
  @Get('recipes')
  @ApiOperation({ summary: 'Honor awards for people this ally can give.' })
  async grantableRecipes(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string
  ) {
    const { principal, enterprise } = await this.access.resolveEnterprise(
      bearer(authorization),
      enterpriseId
    );
    return this.service.listGrantableForEnterprise(principal, requestId(request), enterprise.id);
  }

  @Post('grants')
  @ApiOperation({ summary: "Give one of this ally's honor awards to a person (e.g. per stay)." })
  async grant(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Body() body: EnterpriseGrantHonorAwardDto
  ) {
    const { principal, enterprise } = await this.access.resolveEnterprise(
      bearer(authorization),
      enterpriseId
    );
    return this.service.grantFromEnterprise(principal, requestId(request), enterprise.id, body);
  }

  @Post('guests/lookup')
  @HttpCode(200)
  @ApiOperation({ summary: "How many of this ally's honor awards a person holds." })
  async lookupGuest(
    @Req() request: FastifyRequest,
    @Headers('authorization') authorization: string | undefined,
    @Param('enterpriseId', new ParseUUIDPipe({ version: '4' })) enterpriseId: string,
    @Body() body: HonorAwardGuestLookupDto
  ) {
    const { principal, enterprise } = await this.access.resolveEnterprise(
      bearer(authorization),
      enterpriseId
    );
    return this.service.guestSummary(principal, requestId(request), enterprise.id, body.email);
  }
}

/** Claimed honor awards shown on an ally's public page. */
@ApiTags('enterprises')
@Controller({ path: 'enterprises/:slug/honor-awards', version: '1' })
@UseFilters(MarketplaceExceptionFilter)
export class EnterpriseHonorAwardPublicController {
  constructor(private readonly service: HonorAwardService) {}

  @Get()
  @ApiOperation({ summary: 'Honor awards an active enterprise has claimed.' })
  list(@Param('slug') slug: string) {
    return this.service.listPublicForEnterprise(slug);
  }
}

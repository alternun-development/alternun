import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ACTIVITY_REPEAT_PERIODS,
  COMMENT_STATUSES,
  ENTERPRISE_KINDS,
  MEDIA_KINDS,
  PARTNERSHIP_STATUSES,
  PROJECT_CATEGORIES,
  UPLOAD_IMAGE_TYPES,
} from './marketplace.types';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
export const PROJECT_MEMBERSHIP_ROLES = [
  'partner_operator',
  'sub_admin',
  'partner_readonly',
] as const;

export class ApiErrorDto {
  @ApiProperty() statusCode!: number;
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiProperty() requestId!: string;
  @ApiPropertyOptional() details?: unknown;
  @ApiPropertyOptional() fieldErrors?: unknown;
}

export class ProjectContentBlockDto {
  @IsString() @MinLength(1) @MaxLength(120) title!: string;
  @IsString() @MinLength(1) @MaxLength(120) location!: string;
  @IsString() @MinLength(1) @MaxLength(120) theme!: string;
  @IsString() @MinLength(1) @MaxLength(4000) description!: string;
  @IsOptional() @IsString() @MaxLength(2000) participationCopy?: string;
  @IsOptional() @IsString() @MaxLength(80) ctaLabel?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  waysToContribute!: string[];
}

// Profile values are free text on purpose: testnet keeps placeholders such as "POR CONFIRMAR".
export class ProfileLocationDto {
  @IsOptional() @IsString() @MaxLength(160) municipality?: string;
  @IsOptional() @IsString() @MaxLength(160) department?: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsString() @MaxLength(500) coverage?: string;
}

export class PublicContactDto {
  @IsOptional() @IsString() @MaxLength(240) web?: string;
  @IsOptional() @IsString() @MaxLength(240) email?: string;
  @IsOptional() @IsString() @MaxLength(80) phone?: string;
  @IsOptional() @IsString() @MaxLength(80) whatsapp?: string;
  @IsOptional() @IsString() @MaxLength(240) instagram?: string;
  @IsOptional() @IsString() @MaxLength(240) facebook?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class InternalContactDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(160) role?: string;
  @IsOptional() @IsString() @MaxLength(240) email?: string;
}

export class EnterpriseSiteDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsInt() @Min(0) rooms?: number;
  @IsOptional() @IsString() @MaxLength(240) web?: string;
}

export class EventVenueDto extends ProfileLocationDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(240) web?: string;
}

export class EnterpriseEventDetailsDto {
  @IsOptional() @IsString() @MaxLength(160) date?: string;
  @IsOptional() @ValidateNested() @Type(() => EventVenueDto) venue?: EventVenueDto;
}

class EnterpriseProfileDto {
  @IsOptional() @IsIn(ENTERPRISE_KINDS) kind?: (typeof ENTERPRISE_KINDS)[number];
  @IsOptional() @IsString() @MaxLength(160) sector?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional()
  @IsIn(PARTNERSHIP_STATUSES)
  partnershipStatus?: (typeof PARTNERSHIP_STATUSES)[number];
  @IsOptional() @ValidateNested() @Type(() => ProfileLocationDto) location?: ProfileLocationDto;
  @IsOptional() @ValidateNested() @Type(() => PublicContactDto) publicContact?: PublicContactDto;
  /** https URL on an allowed logo host; an empty string clears it. */
  @IsOptional() @IsString() @MaxLength(2048) logoUrl?: string;
  /** https URL on an allowed cover host; an empty string clears it. */
  @IsOptional() @IsString() @MaxLength(2048) bannerUrl?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => EnterpriseEventDetailsDto)
  eventDetails?: EnterpriseEventDetailsDto;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EnterpriseSiteDto)
  sites?: EnterpriseSiteDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => InternalContactDto)
  internalContacts?: InternalContactDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  pendingItems?: string[];
  @IsOptional() @IsString() @MaxLength(4000) internalNotes?: string;
}

export class CreateEnterpriseDto extends EnterpriseProfileDto {
  @ApiProperty({ pattern: SLUG_PATTERN.source, minLength: 3, maxLength: 80 })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MinLength(3)
  @MaxLength(80)
  slug!: string;
  @IsString() @MinLength(1) @MaxLength(160) displayName!: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(240) legalName?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) websiteUrl?: string;
}

export class UpdateEnterpriseDto extends EnterpriseProfileDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) displayName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(240) legalName?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) websiteUrl?: string;
}

export class CreateEnterpriseProductDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsInt() @Min(0) airsMin?: number;
  @IsOptional() @IsInt() @Min(0) airsMax?: number;
  @IsOptional() @IsString() @MaxLength(160) airsNote?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateEnterpriseProductDto extends PartialType(CreateEnterpriseProductDto) {}

export class LinkProjectEnterpriseDto {
  @IsIn(['operator', 'sponsor', 'partner']) relation!: 'operator' | 'sponsor' | 'partner';
}

export class CreateUploadUrlDto {
  /** project: logo | cover | gallery_image; enterprise: logo | banner. */
  @IsIn(['logo', 'cover', 'gallery_image', 'banner']) kind!: string;
  @IsIn(UPLOAD_IMAGE_TYPES) contentType!: (typeof UPLOAD_IMAGE_TYPES)[number];
}

export class CreateProjectDto {
  @IsUUID('4')
  enterpriseId!: string;
  @IsString() @Matches(SLUG_PATTERN) @MinLength(3) @MaxLength(80) slug!: string;
  @IsString() @Matches(/^[a-z][a-z0-9_]{2,63}$/) categoryCode!: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @IsString() @MinLength(1) @MaxLength(80) timeZone!: string;
  @IsString() @Matches(LOCALE_PATTERN) defaultLocale!: string;
  @IsObject() @IsNotEmptyObject() content!: Record<string, ProjectContentBlockDto>;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @Matches(SLUG_PATTERN) @MinLength(3) @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @Matches(/^[a-z][a-z0-9_]{2,63}$/) categoryCode?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) timeZone?: string;
  @IsOptional() @IsString() @Matches(LOCALE_PATTERN) defaultLocale?: string;
  @IsOptional() @IsObject() @IsNotEmptyObject() content?: Record<string, ProjectContentBlockDto>;
  @IsOptional() @IsString() @MaxLength(160) alternateName?: string;
  @IsOptional()
  @IsIn(PARTNERSHIP_STATUSES)
  partnershipStatus?: (typeof PARTNERSHIP_STATUSES)[number];
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileLocationDto)
  locationDetails?: ProfileLocationDto;
  @IsOptional() @ValidateNested() @Type(() => PublicContactDto) publicContact?: PublicContactDto;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => InternalContactDto)
  internalContacts?: InternalContactDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  pendingItems?: string[];
  @IsOptional() @IsString() @MaxLength(4000) internalNotes?: string;
}

export class TransitionProjectDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(500) reason?: string;
}

export class CreateProjectMediaDto {
  @IsString() @IsIn(MEDIA_KINDS) kind!: string;
  @IsString() @MaxLength(2048) url!: string;
  @IsOptional() @IsString() @MaxLength(2048) embedUrl?: string;
  @IsOptional() @IsObject() altText?: Record<string, string>;
  @IsOptional() @IsObject() caption?: Record<string, string>;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateProjectMediaDto extends PartialType(CreateProjectMediaDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class MediaOrderItemDto {
  @IsUUID('4') id!: string;
  @Type(() => Number) @IsInt() @Min(0) sortOrder!: number;
}

export class ReorderProjectMediaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MediaOrderItemDto)
  items!: MediaOrderItemDto[];
}

export class ReorderMarketplaceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class ActivityContentBlockDto {
  @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @IsString() @MinLength(1) @MaxLength(4000) description!: string;
}

export class CreateProjectActivityDto {
  @IsString() @Matches(SLUG_PATTERN) @MinLength(3) @MaxLength(80) code!: string;
  @IsString() @Matches(LOCALE_PATTERN) defaultLocale!: string;
  @IsObject() @IsNotEmptyObject() content!: Record<string, ActivityContentBlockDto>;
  @Type(() => Number) @IsNumber() @Min(0.000001) defaultAirsAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0.000001) maxAirsPerAward!: number;
  @IsString() @IsIn(ACTIVITY_REPEAT_PERIODS) repeatPeriod!: string;
  @Type(() => Number) @IsInt() @Min(1) maxAwardsPerPeriod!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxAwardsLifetime?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}

export class UpdateProjectActivityDto extends PartialType(CreateProjectActivityDto) {}

export class TransitionActivityDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(500) reason?: string;
}

export class CreateActivityCompletionDto {
  @IsString() @MinLength(1) @MaxLength(255) userId!: string;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) assignmentId?: string;
  @IsOptional() @IsString() @MaxLength(2000) evidenceNote?: string;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  evidenceUrl?: string;
}

export class ApproveActivityCompletionDto {
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class RejectActivityCompletionDto {
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ReverseActivityCompletionDto {
  @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}

export class ActorRefDto {
  @IsString() @MinLength(1) @MaxLength(500) issuer!: string;
  @IsString() @MinLength(1) @MaxLength(255) subject!: string;
}

export class ListProjectMembershipsQueryDto {
  @IsOptional() @IsUUID('4') enterpriseId?: string;
  @IsOptional() @IsUUID('4') projectId?: string;
}

export class CreateProjectMembershipDto {
  @ValidateNested() @Type(() => ActorRefDto) member!: ActorRefDto;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) memberUserId?: string;
  @IsUUID('4') enterpriseId!: string;
  @IsOptional() @IsUUID('4') projectId?: string;
  @IsString() @IsIn(['enterprise', 'project']) scopeType!: 'enterprise' | 'project';
  @IsString()
  @IsIn(PROJECT_MEMBERSHIP_ROLES)
  role!: (typeof PROJECT_MEMBERSHIP_ROLES)[number];
}

export class CreateProjectMembershipByEmailDto {
  @ApiProperty({ format: 'email', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  email!: string;
  @IsUUID('4') enterpriseId!: string;
  @IsOptional() @IsUUID('4') projectId?: string;
  @IsString() @IsIn(['enterprise', 'project']) scopeType!: 'enterprise' | 'project';
  @IsString()
  @IsIn(PROJECT_MEMBERSHIP_ROLES)
  role!: (typeof PROJECT_MEMBERSHIP_ROLES)[number];
}

export class ChangeProjectMembershipDto {
  @IsOptional()
  @IsString()
  @IsIn(PROJECT_MEMBERSHIP_ROLES)
  role?: (typeof PROJECT_MEMBERSHIP_ROLES)[number];
  @IsOptional() @IsString() @IsIn(['active', 'revoked']) status?: 'active' | 'revoked';
  @IsOptional() @IsString() @MinLength(1) @MaxLength(500) reason?: string;
}

export class RevokeProjectMembershipDto {
  @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}

export class LocaleQueryDto {
  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  @Matches(LOCALE_PATTERN)
  locale?: string;
}

export class ListProjectsQueryDto extends LocaleQueryDto {
  @IsOptional() @IsString() @IsIn(PROJECT_CATEGORIES) categoryCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) perPage = 20;
}

export class ListEnterprisesQueryDto extends LocaleQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) perPage = 20;
}

export class ListProjectCommentsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) perPage = 20;
}

export class CreateProjectCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @Matches(/^[^\p{Cc}]+$/u)
  body!: string;
}

export class ListAdminProjectCommentsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(COMMENT_STATUSES)
  status?: (typeof COMMENT_STATUSES)[number];
}

export class ModerateProjectCommentDto {
  @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}

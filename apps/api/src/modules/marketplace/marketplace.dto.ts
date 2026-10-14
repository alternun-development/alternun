import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
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
import { ACTIVITY_REPEAT_PERIODS, MEDIA_KINDS, PROJECT_CATEGORIES } from './marketplace.types';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

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

export class CreateEnterpriseDto {
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

export class UpdateEnterpriseDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) displayName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(240) legalName?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) websiteUrl?: string;
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

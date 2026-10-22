import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProjectProposalCategory, ProjectProposalLanguage } from './project-proposal.types';

// These explicit ranges keep all controls out of single-line fields while allowing safe
// line breaks in the optional message.
// eslint-disable-next-line no-control-regex
const NO_CONTROL_CHARACTERS = /^[^\u0000-\u001f\u007f]*$/u;
// eslint-disable-next-line no-control-regex
const NO_UNSAFE_CONTROL_CHARACTERS = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/u;

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class CreateProjectProposalDto {
  @ApiProperty({ minLength: 2, maxLength: 160 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(2, 160)
  @Matches(NO_CONTROL_CHARACTERS)
  projectName!: string;

  @ApiProperty({ minLength: 2, maxLength: 160 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(2, 160)
  @Matches(NO_CONTROL_CHARACTERS)
  location!: string;

  @ApiProperty({ enum: ['productive', 'conservation'] })
  @IsIn(['productive', 'conservation'])
  category!: ProjectProposalCategory;

  @ApiPropertyOptional({ minLength: 1, maxLength: 2000 })
  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  @Matches(NO_UNSAFE_CONTROL_CHARACTERS)
  message?: string;

  @ApiProperty({ format: 'email', maxLength: 254 })
  @Transform(({ value }) => normalizeEmail(value))
  @IsString()
  @MaxLength(254)
  @IsEmail()
  contactEmail!: string;

  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(2, 120)
  @Matches(NO_CONTROL_CHARACTERS)
  contactName!: string;

  @ApiProperty({ enum: ['es', 'en', 'th'] })
  @IsIn(['es', 'en', 'th'])
  language!: ProjectProposalLanguage;

  @ApiPropertyOptional({ description: 'Leave blank. Anti-spam honeypot.', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class ProjectProposalAcceptedDto {
  @ApiProperty({ example: true })
  accepted!: true;
}

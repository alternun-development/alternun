import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  EnterpriseApplicationLanguage,
  EnterpriseCompanySize,
} from './enterprise-application.types';

// eslint-disable-next-line no-control-regex
const NO_CONTROL_CHARACTERS = /^[^\u0000-\u001f\u007f]*$/u;
// eslint-disable-next-line no-control-regex
const NO_UNSAFE_CONTROL_CHARACTERS = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/u;
const COMPANY_SIZES: readonly EnterpriseCompanySize[] = ['1-10', '11-50', '51-200', '201+'];

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
// Optional text: blank means "not given".
const optional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateEnterpriseApplicationDto {
  @ApiProperty({ minLength: 2, maxLength: 160 })
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  @Matches(NO_CONTROL_CHARACTERS)
  companyName!: string;

  @ApiPropertyOptional({ minLength: 2, maxLength: 240 })
  @Transform(optional)
  @IsOptional()
  @IsString()
  @Length(2, 240)
  @Matches(NO_CONTROL_CHARACTERS)
  legalName?: string;

  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  @Matches(NO_CONTROL_CHARACTERS)
  sector!: string;

  @ApiProperty({ minLength: 2, maxLength: 160, description: 'City and country.' })
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  @Matches(NO_CONTROL_CHARACTERS)
  location!: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @Transform(optional)
  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Matches(/^https?:\/\/\S+$/)
  websiteUrl?: string;

  @ApiPropertyOptional({ enum: COMPANY_SIZES })
  @Transform(optional)
  @IsOptional()
  @IsIn(COMPANY_SIZES)
  companySize?: EnterpriseCompanySize;

  @ApiProperty({
    minLength: 2,
    maxLength: 1000,
    description: 'Products or services with which customers could earn Airs.',
  })
  @Transform(trim)
  @IsString()
  @Length(2, 1000)
  @Matches(NO_UNSAFE_CONTROL_CHARACTERS)
  offer!: string;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Cause or project they would support.' })
  @Transform(optional)
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  @Matches(NO_UNSAFE_CONTROL_CHARACTERS)
  interest?: string;

  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  @Matches(NO_CONTROL_CHARACTERS)
  contactName!: string;

  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  @Transform(optional)
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Matches(NO_CONTROL_CHARACTERS)
  contactRole?: string;

  @ApiProperty({ format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  @IsString()
  @MaxLength(254)
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @Transform(optional)
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+()\s.-]{7,40}$/)
  contactPhone?: string;

  @ApiProperty({ enum: ['es', 'en', 'th'] })
  @IsIn(['es', 'en', 'th'])
  language!: EnterpriseApplicationLanguage;

  @ApiPropertyOptional({ description: 'Leave blank. Anti-spam honeypot.', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  faxNumber?: string;
}

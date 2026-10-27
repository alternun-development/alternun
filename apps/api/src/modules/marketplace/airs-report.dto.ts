import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AIRS_REPORT_CONCEPT_MAX_LENGTH,
  AIRS_REPORT_CONCEPT_MIN_LENGTH,
  AIRS_REPORT_DOCUMENT_NUMBER_MAX_LENGTH,
  AIRS_REPORT_EMAIL_MAX_LENGTH,
  AIRS_REPORT_NAME_MAX_LENGTH,
  AIRS_REPORT_REASON_MAX_LENGTH,
  AIRS_REPORT_STATUSES,
  SHA256_HEX_PATTERN,
  type AirsReportStatus,
} from './airs-report.types';

// Amounts have no business cap per report; this is only the storage bound.
const AIRS_REPORT_AMOUNT_STORAGE_MAX = 2147483647;

export class SubmitAirsReportDto {
  @ApiProperty({ format: 'email', maxLength: AIRS_REPORT_EMAIL_MAX_LENGTH })
  @IsEmail()
  @MaxLength(AIRS_REPORT_EMAIL_MAX_LENGTH)
  recipientEmail!: string;

  @ApiPropertyOptional({
    maxLength: AIRS_REPORT_NAME_MAX_LENGTH,
    description: 'Required when the email has no verified account.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(AIRS_REPORT_NAME_MAX_LENGTH)
  recipientName?: string;

  @ApiProperty({ minimum: 1, maximum: AIRS_REPORT_AMOUNT_STORAGE_MAX })
  @IsInt()
  @Min(1)
  @Max(AIRS_REPORT_AMOUNT_STORAGE_MAX)
  amount!: number;

  @ApiProperty({
    minLength: AIRS_REPORT_CONCEPT_MIN_LENGTH,
    maxLength: AIRS_REPORT_CONCEPT_MAX_LENGTH,
  })
  @IsString()
  @MinLength(AIRS_REPORT_CONCEPT_MIN_LENGTH)
  @MaxLength(AIRS_REPORT_CONCEPT_MAX_LENGTH)
  concept!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Reserved for the project medal catalog.' })
  @IsOptional()
  @IsUUID()
  medalId?: string;

  @ApiProperty({
    maxLength: AIRS_REPORT_DOCUMENT_NUMBER_MAX_LENGTH,
    description: 'Supporting document number, for example the invoice number. Required for now.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(AIRS_REPORT_DOCUMENT_NUMBER_MAX_LENGTH)
  @Matches(/\S/)
  documentNumber!: string;

  @ApiPropertyOptional({ pattern: SHA256_HEX_PATTERN.source })
  @IsOptional()
  @Matches(SHA256_HEX_PATTERN)
  documentSha256?: string;
}

export class ListAirsReportsQueryDto {
  @ApiPropertyOptional({ enum: AIRS_REPORT_STATUSES })
  @IsOptional()
  @IsIn(AIRS_REPORT_STATUSES)
  status?: AirsReportStatus;
}

export class AirsReportRecipientLookupQueryDto {
  @ApiProperty({ format: 'email', maxLength: AIRS_REPORT_EMAIL_MAX_LENGTH })
  @IsEmail()
  @MaxLength(AIRS_REPORT_EMAIL_MAX_LENGTH)
  email!: string;
}

export class ApproveAirsReportDto {
  @ApiProperty({ pattern: SHA256_HEX_PATTERN.source })
  @Matches(SHA256_HEX_PATTERN)
  snapshotHash!: string;
}

export class AirsReportReasonDto {
  @ApiProperty({ minLength: 1, maxLength: AIRS_REPORT_REASON_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(AIRS_REPORT_REASON_MAX_LENGTH)
  reason!: string;
}

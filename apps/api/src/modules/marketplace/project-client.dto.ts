import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  AIRS_REPORT_CONCEPT_MAX_LENGTH,
  AIRS_REPORT_CONCEPT_MIN_LENGTH,
  AIRS_REPORT_DOCUMENT_NUMBER_MAX_LENGTH,
  AIRS_REPORT_REQUEST_KEY_PATTERN,
} from './airs-report.types';
import { AIRS_REPORT_PROOF_MAX_BYTES, AIRS_REPORT_PROOF_TYPES } from './project-client.types';

export class AssignClientAirsDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amount!: number;

  @ApiProperty({
    minLength: AIRS_REPORT_CONCEPT_MIN_LENGTH,
    maxLength: AIRS_REPORT_CONCEPT_MAX_LENGTH,
  })
  @IsString()
  @MinLength(AIRS_REPORT_CONCEPT_MIN_LENGTH)
  @MaxLength(AIRS_REPORT_CONCEPT_MAX_LENGTH)
  concept!: string;

  @ApiPropertyOptional({ maxLength: AIRS_REPORT_DOCUMENT_NUMBER_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(AIRS_REPORT_DOCUMENT_NUMBER_MAX_LENGTH)
  @Matches(/\S/)
  documentNumber?: string;

  @ApiPropertyOptional({ description: 'Path returned by the proof upload URL.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  proofPath?: string;

  @ApiPropertyOptional({ pattern: AIRS_REPORT_REQUEST_KEY_PATTERN.source })
  @IsOptional()
  @Matches(AIRS_REPORT_REQUEST_KEY_PATTERN)
  requestKey?: string;
}

export class AddProjectClientDto {
  @ApiProperty({ format: 'email', maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ maxLength: 120, description: 'Required for a person without account.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: AssignClientAirsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignClientAirsDto)
  airs?: AssignClientAirsDto;
}

export class ClientProofUploadDto {
  @ApiProperty({ enum: Object.keys(AIRS_REPORT_PROOF_TYPES) })
  @IsIn(Object.keys(AIRS_REPORT_PROOF_TYPES))
  contentType!: string;

  @ApiProperty({ minimum: 1, maximum: AIRS_REPORT_PROOF_MAX_BYTES })
  @IsInt()
  @Min(1)
  @Max(AIRS_REPORT_PROOF_MAX_BYTES)
  size!: number;
}

export class RemoveProjectClientDto {
  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const CODE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

export class CreateProjectTypeDto {
  @ApiProperty({ pattern: CODE_PATTERN.source, example: 'boutique_hotel' })
  @IsString()
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiProperty({
    description: 'Names by locale. English ("en") is required.',
    example: { en: 'Boutique hotel', es: 'Hotel boutique' },
  })
  @IsObject()
  labels!: Record<string, string>;

  @ApiProperty({ description: 'Whether reports for projects of this type need a document number.' })
  @IsBoolean()
  requiresDocumentNumber!: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class UpdateProjectTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  labels?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresDocumentNumber?: boolean;

  @ApiPropertyOptional({ description: 'False retires the type: it can no longer be assigned.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class SetProjectTypeDto {
  @ApiProperty({ nullable: true, type: String, description: 'Type code, or null to clear it.' })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(CODE_PATTERN)
  projectTypeCode!: string | null;
}

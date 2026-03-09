import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'alternun-api' })
  service!: string;

  @ApiProperty({ example: '1.0.4' })
  version!: string;

  @ApiProperty({ example: 'dev' })
  stage!: string;

  @ApiProperty({ example: '2026-03-09T12:00:00.000Z' })
  timestamp!: string;
}

import { Controller, Get, Version } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_NAME, APP_VERSION } from '../../common/app-metadata';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get API health status' })
  @ApiOkResponse({
    description: 'Backend health check response.',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: APP_NAME,
      version: APP_VERSION,
      stage: process.env.APP_STAGE ?? 'local',
      timestamp: new Date().toISOString(),
    };
  }
}

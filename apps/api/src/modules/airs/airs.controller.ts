import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AirsService } from './airs.service';

interface AirsOnboardingBody {
  locale?: string | null;
}

interface AirsSnapshotQuery {
  locale?: string | null;
}

@ApiTags('airs')
@Controller({
  path: 'airs',
  version: VERSION_NEUTRAL,
})
export class AirsController {
  constructor(private readonly airsService: AirsService) {}

  @Post('onboarding')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Record first dashboard entry, award the AIRS welcome bonus, and send the onboarding email.',
  })
  @ApiOkResponse({
    description: 'AIRS onboarding result.',
  })
  async onboarding(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: AirsOnboardingBody
  ): Promise<import('./airs.service').AirsOnboardingResult> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing AIRS bearer token.');
    }

    return this.airsService.onboard({
      token: authorization,
      locale: body.locale ?? null,
    });
  }

  @Get('me')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch the current AIRS balance, lifetime earnings, and recent ledger entries.',
  })
  @ApiOkResponse({
    description: 'AIRS account snapshot.',
  })
  async me(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: AirsSnapshotQuery
  ): Promise<import('./airs.repository').AirsDashboardSnapshot> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing AIRS bearer token.');
    }

    return this.airsService.snapshot({
      token: authorization,
      locale: query.locale ?? null,
    });
  }
}

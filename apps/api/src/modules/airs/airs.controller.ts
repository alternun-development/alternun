import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  VERSION_NEUTRAL,
  ParseIntPipe,
  DefaultValuePipe,
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
  version: [VERSION_NEUTRAL, '1'],
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

  @Get('my-position')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Fetch the authenticated user's AIRS rank: global, country, and city.",
  })
  @ApiOkResponse({ description: 'User position ranks.' })
  async myPosition(
    @Headers('authorization') authorization: string | undefined
  ): Promise<import('./airs.repository').AirsUserPositions> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing AIRS bearer token.');
    }
    return this.airsService.myPosition(authorization);
  }

  @Patch('profile')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update the authenticated user profile fields (name, country, city).',
  })
  @ApiOkResponse({ description: 'Updated profile.' })
  async updateProfile(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { name?: string | null; country?: string | null; city?: string | null }
  ): Promise<{ userId: string; name: string | null; country: string | null; city: string | null }> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing AIRS bearer token.');
    }
    return this.airsService.updateProfile(authorization, body);
  }

  @Get('leaderboard')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Fetch the AIRS leaderboard with top users and the requesting user's rank.",
  })
  @ApiOkResponse({
    description: 'AIRS leaderboard.',
  })
  async leaderboard(
    @Headers('authorization') authorization: string | undefined,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ): Promise<import('./airs.repository').AirsLeaderboardResult> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing AIRS bearer token.');
    }

    return this.airsService.leaderboard(authorization, limit);
  }

  @Get('achievements')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch the user achievements with unlock status.',
  })
  @ApiOkResponse({
    description: 'User achievements list.',
  })
  async achievements(
    @Headers('authorization') authorization: string | undefined
  ): Promise<import('./airs.repository').UserAchievement[]> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing AIRS bearer token.');
    }

    return this.airsService.achievements(authorization);
  }
}

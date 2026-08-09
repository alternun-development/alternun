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

const AIRS_SOURCE_KINDS = new Set([
  'allied_commerce',
  'validated_regenerative_action',
  'compensation',
  'profile_completion_bonus',
  'correction',
  'referral_bonus',
]);

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
    @Query('limit', new DefaultValuePipe(7), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number
  ): Promise<import('./airs.repository').AirsLeaderboardResult> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing AIRS bearer token.');
    }

    return this.airsService.leaderboard(authorization, limit, page);
  }

  @Get('activity')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch paginated AIRS ledger activity for the user or global network.' })
  @ApiOkResponse({ description: 'Paginated AIRS activity.' })
  async activity(
    @Headers('authorization') authorization: string | undefined,
    @Query('scope') scope: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search: string | undefined,
    @Query('source_kind') sourceKind: string | undefined
  ): Promise<import('./airs.repository').AirsActivityResult> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing AIRS bearer token.');
    }

    return this.airsService.activity(authorization, {
      scope: scope === 'global' ? 'global' : 'personal',
      page,
      limit,
      search: search ?? null,
      sourceKind: AIRS_SOURCE_KINDS.has(sourceKind ?? '')
        ? (sourceKind as import('./airs.repository').AirsLedgerSourceKind)
        : null,
    });
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

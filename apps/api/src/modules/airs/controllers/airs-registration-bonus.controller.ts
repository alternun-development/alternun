import {
  Controller,
  Post,
  HttpCode,
  Headers,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AirsRegistrationBonusService } from '../services/airs-registration-bonus.service';

@ApiTags('airs')
@Controller({
  path: 'airs/registration-bonus',
  version: VERSION_NEUTRAL,
})
export class AirsRegistrationBonusController {
  constructor(private readonly bonusService: AirsRegistrationBonusService) {}

  @Post('claim')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Claim 10 AIRS registration welcome bonus on first dashboard visit',
  })
  @ApiOkResponse({
    description: 'Registration bonus claim result',
  })
  async claimBonus(
    @Headers('authorization') authorization: string | undefined
  ): Promise<{ success: boolean; awarded: boolean; message: string; balance: number }> {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const result = await this.bonusService.awardRegistrationBonus(authorization);
    return {
      success: result.awarded,
      awarded: result.awarded,
      message: result.awarded
        ? 'Welcome bonus of 10 AIRS has been awarded!'
        : 'Bonus already claimed',
      balance: result.balance,
    };
  }
}

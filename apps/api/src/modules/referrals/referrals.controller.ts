import { Body, Controller, Post, Req, Version, UnauthorizedException } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';

interface AuthenticatedUser {
  sub: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@ApiTags('referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create a referral record for the authenticated user' })
  @ApiCreatedResponse({
    description: 'Referral record created successfully.',
    type: ReferralResponseDto,
  })
  async create(
    @Body() createReferralDto: CreateReferralDto,
    @Req() request: AuthenticatedRequest
  ): Promise<ReferralResponseDto> {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    return this.referralsService.create(userId, createReferralDto);
  }
}

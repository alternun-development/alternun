import { Body, Controller, Get, Post, Req, Version, UnauthorizedException } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';
import { ReferralSummaryDto } from './dto/referral-summary.dto';

interface AuthenticatedUser {
  sub: string;
}

interface AuthenticatedRequest extends FastifyRequest {
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

  @Get('me')
  @Version('1')
  @ApiOperation({ summary: 'Get the authenticated user referral summary' })
  @ApiOkResponse({
    description: 'Referral summary fetched successfully.',
    type: ReferralSummaryDto,
  })
  async getMe(@Req() request: AuthenticatedRequest): Promise<ReferralSummaryDto> {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    const originHeader = request.headers.origin as string | string[] | undefined;
    const requestedOrigin = Array.isArray(originHeader)
      ? originHeader[0] ?? null
      : originHeader ?? null;
    return this.referralsService.getMe(userId, requestedOrigin);
  }
}

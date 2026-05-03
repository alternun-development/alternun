import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  Query,
  Version,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';
import { ReferralSummaryDto } from './dto/referral-summary.dto';
import { verifyIssuerJwt } from '../auth-exchange/auth-exchange-jwt';

interface AuthenticatedUser {
  sub: string;
}

interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthenticatedUser;
}

interface SupabaseAuthConfig {
  url: string;
  key: string;
}

function trimRuntimeValue(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeRuntimeValue(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeBearerToken(authorization: string | undefined): string | null {
  const trimmed = normalizeRuntimeValue(authorization);
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith('Bearer ') ? trimmed.slice('Bearer '.length).trim() : trimmed;
}

function resolveSigningKey(): string | null {
  const signingKey =
    process.env.AUTHENTIK_JWT_SIGNING_KEY ??
    process.env.AUTHENTIK_JWT_SIGNING_SECRET ??
    process.env.AUTH_SESSION_SIGNING_KEY ??
    '';
  const trimmed = signingKey.trim();

  return trimmed || null;
}

function resolveSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = trimRuntimeValue(process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL);
  const key = trimRuntimeValue(
    process.env.SUPABASE_ANON_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!url || !key) {
    return null;
  }

  return {
    url: url.replace(/\/+$/, ''),
    key,
  };
}

function resolveIssuerUserId(token: string): string | null {
  const signingKey = resolveSigningKey();
  if (!signingKey) {
    return null;
  }

  try {
    const verified = verifyIssuerJwt(token, signingKey);
    return verified.claims.app_user_id?.trim() ?? verified.claims.sub.trim() ?? null;
  } catch {
    return null;
  }
}

async function resolveSupabaseUserId(token: string): Promise<string | null> {
  const config = resolveSupabaseAuthConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    id?: unknown;
    user?: { id?: unknown };
  } | null;
  const userId =
    typeof payload?.id === 'string'
      ? payload.id.trim()
      : typeof payload?.user?.id === 'string'
      ? payload.user.id.trim()
      : '';

  return userId || null;
}

async function resolveAuthenticatedUserId(
  request: AuthenticatedRequest,
  authorization: string | undefined,
  requestedUserId?: string | null
): Promise<string> {
  const requestUserId = request.user?.sub?.trim();
  if (requestUserId) {
    return requestUserId;
  }

  const token = normalizeBearerToken(authorization);
  if (token) {
    const issuerUserId = resolveIssuerUserId(token);
    if (issuerUserId) {
      return issuerUserId;
    }

    const supabaseUserId = await resolveSupabaseUserId(token);
    if (supabaseUserId) {
      return supabaseUserId;
    }
  }

  const fallbackUserId = normalizeRuntimeValue(requestedUserId);
  if (fallbackUserId) {
    return fallbackUserId;
  }

  throw new UnauthorizedException('User ID not found in referral request');
}

@ApiTags('referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @Version('1')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a referral record for the authenticated user' })
  @ApiCreatedResponse({
    description: 'Referral record created successfully.',
    type: ReferralResponseDto,
  })
  async create(
    @Body() createReferralDto: CreateReferralDto,
    @Req() request: AuthenticatedRequest,
    @Headers('authorization') authorization: string | undefined,
    @Body('user_id') bodyUserId?: string,
    @Query('user_id') queryUserId?: string
  ): Promise<ReferralResponseDto> {
    const userId = await resolveAuthenticatedUserId(
      request,
      authorization,
      bodyUserId ?? queryUserId ?? null
    );

    return this.referralsService.create(userId, createReferralDto);
  }

  @Get('me')
  @Version('1')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user referral summary' })
  @ApiOkResponse({
    description: 'Referral summary fetched successfully.',
    type: ReferralSummaryDto,
  })
  async getMe(
    @Req() request: AuthenticatedRequest,
    @Headers('authorization') authorization: string | undefined,
    @Query('user_id') userId?: string,
    @Query('display_name') displayName?: string
  ): Promise<ReferralSummaryDto> {
    const resolvedUserId = await resolveAuthenticatedUserId(request, authorization, userId);
    const originHeader = request.headers.origin as string | string[] | undefined;
    const requestedOrigin = Array.isArray(originHeader)
      ? originHeader[0] ?? null
      : originHeader ?? null;
    return this.referralsService.getMe(resolvedUserId, requestedOrigin, displayName);
  }
}

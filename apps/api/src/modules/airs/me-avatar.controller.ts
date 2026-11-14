import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { resolveUserId } from '../../common/auth/resolve-user-id';
import {
  getAirsUserAvatar,
  setAirsUserAvatar,
  type AirsUserAvatar,
  type AirsUserAvatarKind,
} from './airs.repository';

const AVATAR_KINDS = ['social', 'preset', 'tier', 'achievement', 'honor_award'] as const;

export class UpdateUserAvatarDto {
  @ApiPropertyOptional({
    enum: AVATAR_KINDS,
    nullable: true,
    description: 'Null goes back to the default (social photo, then initials).',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(AVATAR_KINDS)
  kind?: AirsUserAvatarKind | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 80,
    description: 'Illustration key, tier, milestone key or honor award grant id.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(80)
  ref?: string | null;
}

function bearer(authorization: string | undefined): string {
  if (!authorization?.trim()) throw new UnauthorizedException('Missing bearer token');
  return authorization;
}

/** Maps the RPC checks to API errors the app can show. */
export function avatarError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('AVATAR_NOT_ALLOWED')) {
    throw new HttpException(
      { statusCode: 403, code: 'AVATAR_NOT_ALLOWED', message: 'You do not hold this avatar.' },
      HttpStatus.FORBIDDEN
    );
  }
  if (message.includes('AVATAR_USER_NOT_FOUND')) {
    throw new HttpException(
      { statusCode: 404, code: 'AVATAR_USER_NOT_FOUND', message: 'User not found.' },
      HttpStatus.NOT_FOUND
    );
  }
  throw error;
}

/** The signed-in person's avatar: read it and choose a new one. */
@ApiTags('me')
@ApiBearerAuth()
@Controller({ path: 'me/avatar', version: '1' })
export class MeAvatarController {
  @Get()
  @ApiOperation({ summary: 'The avatar the signed-in person chose (null kind = default).' })
  @ApiOkResponse({ description: 'Avatar choice with the art of honor awards.' })
  async get(@Headers('authorization') authorization: string | undefined): Promise<AirsUserAvatar> {
    const userId = await resolveUserId(bearer(authorization));
    return getAirsUserAvatar(userId).catch(avatarError);
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({ summary: 'Choose an avatar: social photo, illustration or a badge held.' })
  async set(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: UpdateUserAvatarDto
  ): Promise<AirsUserAvatar> {
    const userId = await resolveUserId(bearer(authorization));
    return setAirsUserAvatar({ userId, kind: body.kind ?? null, ref: body.ref ?? null }).catch(
      avatarError
    );
  }
}

import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DecapService } from './decap.service';

@ApiExcludeController()
@Controller({
  path: 'decap',
  version: VERSION_NEUTRAL,
})
export class DecapController {
  constructor(private readonly decapService: DecapService) {}

  @Get('auth')
  async auth(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('provider') provider?: string
  ): Promise<void> {
    try {
      const authorizeUrl = this.decapService.createAuthorizationUrl(request, provider);
      await reply.redirect(authorizeUrl);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        await reply
          .code(error.getStatus())
          .type('text/plain; charset=utf-8')
          .send(String(error.message));
        return;
      }

      throw error;
    }
  }

  @Get('callback')
  async callback(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('provider') provider?: string,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') oauthError?: string,
    @Query('error_description') oauthErrorDescription?: string
  ): Promise<void> {
    const response = await this.decapService.handleCallback(request, {
      code,
      oauthError,
      oauthErrorDescription,
      provider,
      state,
    });

    await reply
      .code(response.statusCode)
      .header('cache-control', 'no-store')
      .type('text/html; charset=utf-8')
      .send(response.html);
  }
}

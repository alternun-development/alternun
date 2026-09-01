import { timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AuthentikWebhookPayload } from './dto/authentik-event.dto';
import { AuthentikService } from './authentik.service';

/**
 * Receives lifecycle events from Authentik's notification-webhook system.
 *
 * Authentik is configured to POST to /authentik/webhook with a shared secret
 * in the `X-Authentik-Webhook-Secret` header.  This controller:
 *   1. Validates the secret.
 *   2. Delegates to AuthentikService which upserts the user into public.users.
 *
 * This ensures every Authentik user (email sign-up, Google, Discord, etc.)
 * is replicated into Supabase as the vendor-independent source of truth.
 */
@ApiExcludeController()
@Controller({
  path: 'authentik',
  version: VERSION_NEUTRAL,
})
export class AuthentikController {
  private readonly logger = new Logger(AuthentikController.name);

  constructor(private readonly authentikService: AuthentikService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('x-authentik-webhook-secret') secret: string | undefined,
    @Body() payload: AuthentikWebhookPayload
  ): Promise<{ ok: boolean }> {
    const expectedSecret = (process.env.AUTHENTIK_WEBHOOK_SECRET ?? '').trim();

    if (!expectedSecret) {
      this.logger.error('AUTHENTIK_WEBHOOK_SECRET is not configured; refusing Authentik webhook.');
      throw new ServiceUnavailableException(
        'AUTHENTIK_WEBHOOK_SECRET must be configured before accepting Authentik webhooks.'
      );
    }

    const providedSecret = secret ?? '';
    const providedBuffer = Buffer.from(providedSecret);
    const expectedBuffer = Buffer.from(expectedSecret);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid webhook secret.');
    }

    await this.authentikService.handleWebhookEvent(payload);
    return { ok: true };
  }
}

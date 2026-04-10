import { Injectable, Logger } from '@nestjs/common';
import type { AuthentikWebhookPayload, AuthentikWebhookUserBody } from './dto/authentik-event.dto';
import { upsertOidcUserViaSupabase } from './supabase-sync';

const USER_EVENTS = new Set(['model_created', 'model_updated']);
const USER_MODEL = 'authentik_core.user';

@Injectable()
export class AuthentikService {
  private readonly logger = new Logger(AuthentikService.name);

  private getAuthentikIssuer(): string {
    return process.env.AUTHENTIK_ISSUER ?? '';
  }

  async handleWebhookEvent(payload: AuthentikWebhookPayload): Promise<void> {
    const { action, model, body } = payload;

    if (!action || !USER_EVENTS.has(action)) {
      return;
    }

    if (model !== USER_MODEL) {
      return;
    }

    if (!body) {
      return;
    }

    // Skip internal/service accounts — only sync external (social + email) users.
    if (body.type === 'internal' || body.type === 'service_account') {
      return;
    }

    await this.upsertUser(body);
  }

  private async upsertUser(user: AuthentikWebhookUserBody): Promise<void> {
    const issuer = this.getAuthentikIssuer();
    const sub = user.uuid ?? user.pk;
    if (!sub) {
      this.logger.warn('Authentik webhook user has no uuid/pk; skipping.');
      return;
    }

    try {
      const result = await upsertOidcUserViaSupabase(
        {
          sub,
          iss: issuer || '',
          email: user.email ?? null,
          emailVerified: Boolean(user.email),
          name: user.name ?? user.username ?? null,
          picture: null,
          provider: null,
          rawClaims: user as Record<string, unknown>,
        },
        process.env
      );

      if (result.skipped) {
        this.logger.warn(
          'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured; skipping user sync.'
        );
        return;
      }

      this.logger.log(
        `Synced Authentik user ${sub} (${user.email ?? 'no-email'}) to Supabase as ${
          result.appUserId ?? result.principalId
        }.`
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upsert Authentik user ${sub}: ${text}`);
    }
  }
}

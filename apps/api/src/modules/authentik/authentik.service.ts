import { Injectable, Logger } from '@nestjs/common';
import type { AuthentikWebhookPayload, AuthentikWebhookUserBody } from './dto/authentik-event.dto';

const USER_EVENTS = new Set(['model_created', 'model_updated']);
const USER_MODEL = 'authentik_core.user';

@Injectable()
export class AuthentikService {
  private readonly logger = new Logger(AuthentikService.name);

  private getSupabaseUrl(): string {
    return process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  }

  private getSupabaseKey(): string {
    // Prefer service-role key for server-side calls; fall back to anon key.
    // upsert_oidc_user is SECURITY DEFINER so anon key works too.
    return (
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_KEY ??
      ''
    );
  }

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
    const supabaseUrl = this.getSupabaseUrl();
    const supabaseKey = this.getSupabaseKey();
    const issuer = this.getAuthentikIssuer();

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured; skipping user sync.'
      );
      return;
    }

    // sub = user UUID (matches mobile OIDC sub_mode: user_uuid)
    const sub = user.uuid ?? user.pk;
    if (!sub) {
      this.logger.warn('Authentik webhook user has no uuid/pk; skipping.');
      return;
    }

    const body = {
      p_sub: sub,
      p_iss: issuer || `https://${new URL(supabaseUrl).host}`,
      p_email: user.email ?? null,
      p_email_verified: Boolean(user.email),
      p_name: user.name ?? user.username ?? null,
      p_picture: null,
      p_provider: null,
      p_raw_claims: user,
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_oidc_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Failed to upsert Authentik user ${sub}: ${res.status} ${text}`);
      return;
    }

    this.logger.log(`Synced Authentik user ${sub} (${user.email ?? 'no-email'}) to Supabase.`);
  }
}

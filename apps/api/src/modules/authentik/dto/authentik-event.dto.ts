/**
 * Subset of the Authentik notification-webhook event payload.
 * Authentik sends this as the top-level body for model lifecycle events.
 *
 * Relevant actions: "model_created", "model_updated"
 * Relevant model:   "authentik_core.user"
 */

export interface AuthentikWebhookUserBody {
  pk?: string;
  /** Authentik user UUID — equals the OIDC `sub` when sub_mode is user_uuid */
  uuid?: string;
  username?: string;
  name?: string;
  email?: string;
  is_active?: boolean;
  /** "internal" | "external" | "service_account" */
  type?: string;
  attributes?: Record<string, unknown>;
}

export interface AuthentikWebhookPayload {
  /** "model_created" | "model_updated" | "login" | etc. */
  action?: string;
  /** "authentik_core.user" | "authentik_core.token" | etc. */
  model?: string;
  app?: string;
  /** For model events, this holds the serialised model instance. */
  body?: AuthentikWebhookUserBody;
}

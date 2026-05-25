import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { betterAuth } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import { sql } from 'drizzle-orm';
import { oAuthProxy } from 'better-auth/plugins/oauth-proxy';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { BetterAuthDevConfig, BetterAuthDevOAuthProxyConfig } from './better-auth-dev.config';
import { getDatabase } from '../../common/database/connection';
import * as betterAuthSchema from '../../common/database/better-auth.schema';
import { sendAuthVerificationEmail } from '../auth-exchange/auth-confirmation.email';

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const trimmedValues: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      trimmedValues.push(trimmed);
    }
  }

  return trimmedValues.filter((value, index, array) => array.indexOf(value) === index);
}

function buildOAuthProxyPlugin(
  proxy: BetterAuthDevOAuthProxyConfig
): ReturnType<typeof oAuthProxy> | null {
  if (!proxy.enabled) {
    return null;
  }

  return oAuthProxy({
    ...(proxy.currentURL ? { currentURL: proxy.currentURL } : {}),
    ...(proxy.productionURL ? { productionURL: proxy.productionURL } : {}),
    ...(proxy.secret ? { secret: proxy.secret } : {}),
    ...(proxy.maxAge ? { maxAge: proxy.maxAge } : {}),
  });
}

function deriveCrossSubDomainCookieDomain(baseURL: string): string | undefined {
  try {
    const url = new URL(baseURL);
    if (isIP(url.hostname)) {
      return undefined;
    }

    const hostnameParts = url.hostname.split('.');
    if (hostnameParts.length <= 2) {
      return undefined;
    }

    // Use the parent domain for the current Alternun host layout so
    // `testnet.api.*` and `testnet.airs.*` can share the same session cookie.
    return `.${hostnameParts.slice(-2).join('.')}`;
  } catch {
    return undefined;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0.0.0.0'
  );
}

function deriveAppOriginFromBaseURL(baseURL: string): string | undefined {
  try {
    const url = new URL(baseURL);

    if (isLoopbackHostname(url.hostname)) {
      const port = Number(url.port || '0');
      if (Number.isFinite(port) && port > 0) {
        url.port = String(Math.max(port - 1, 1));
      } else {
        url.port = '8081';
      }

      return url.origin;
    }

    const hostnameParts = url.hostname.split('.');
    const apiIndex = hostnameParts.indexOf('api');
    if (apiIndex < 0) {
      return undefined;
    }

    hostnameParts[apiIndex] = 'airs';
    url.hostname = hostnameParts.join('.');
    return url.origin;
  } catch {
    return undefined;
  }
}

function deriveBetterAuthErrorUrl(baseURL: string): string | undefined {
  const appOrigin = deriveAppOriginFromBaseURL(baseURL);
  if (!appOrigin) {
    return undefined;
  }

  return `${appOrigin}/auth/callback`;
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function fillBetterAuthUserIdentity(user: Record<string, unknown>): Record<string, unknown> {
  const id = normalizeString(user.id) ?? randomUUID();
  const image = normalizeString(user.image);
  const picture = normalizeString(user.picture);

  return {
    ...user,
    id,
    sub: normalizeString(user.sub) ?? id,
    iss: normalizeString(user.iss) ?? 'better-auth',
    aud: normalizeString(user.aud) ?? 'authenticated',
    provider: normalizeString(user.provider) ?? 'better-auth',
    ...(picture !== null || image === null ? {} : { picture: image }),
  };
}

type BetterAuthExecuteClient = {
  execute(query: unknown): Promise<unknown>;
};

type BetterAuthWelcomeEmailRecord = {
  email: string | null;
  name: string | null;
  locale: string | null;
  welcomeEmailSent: boolean;
};

function isTruthyDatabaseValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized);
  }

  return false;
}

export async function fetchBetterAuthWelcomeEmailRecord(
  db: BetterAuthExecuteClient,
  userId: string
): Promise<BetterAuthWelcomeEmailRecord | null> {
  const result = await db.execute(sql`
    select email, name, locale, welcome_email_sent
    from public.users
    where id = ${userId}
    limit 1
  `);
  const rows = (result as { rows?: Array<Record<string, unknown>> }).rows ?? [];
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    email: typeof row.email === 'string' ? row.email : null,
    name: typeof row.name === 'string' ? row.name : null,
    locale: typeof row.locale === 'string' ? row.locale : null,
    welcomeEmailSent: isTruthyDatabaseValue(row.welcome_email_sent),
  };
}

export async function markBetterAuthWelcomeEmailSent(
  db: BetterAuthExecuteClient,
  userId: string
): Promise<void> {
  await db.execute(sql`
    update public.users
    set
      welcome_email_sent = true,
      welcome_email_sent_at = now(),
      updated_at = now()
    where id = ${userId}
  `);
}

type BetterAuthDatabaseAdapterConfig = {
  provider: 'pg';
  schema: typeof betterAuthSchema;
};

type BetterAuthVerificationEmailUser = {
  email: string;
  name?: string | null;
};

type BetterAuthVerificationEmailRequest = {
  headers?: {
    get(name: string): string | null;
  };
};

type BetterAuthVerificationEmailArgs = {
  user: BetterAuthVerificationEmailUser;
  url: string;
  token: string;
};

export function createBetterAuthDevAuth(config: BetterAuthDevConfig) {
  const oauthProxyPlugin = buildOAuthProxyPlugin(config.oauthProxy);
  const hasGoogleProvider = Boolean(config.googleClientId && config.googleClientSecret);
  const hasDiscordProvider = Boolean(config.discordClientId && config.discordClientSecret);

  // Keep cross-subdomain cookies on the shared parent domain so
  // `testnet.api.*` and `testnet.airs.*` can share the Better Auth session.
  const cookieDomain = deriveCrossSubDomainCookieDomain(config.baseURL);

  const socialProviders = {
    ...(hasGoogleProvider
      ? {
          google: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
            prompt: 'select_account' as const,
            accessType: 'offline' as const,
          },
        }
      : {}),
    ...(hasDiscordProvider
      ? {
          discord: {
            clientId: config.discordClientId,
            clientSecret: config.discordClientSecret,
          },
        }
      : {}),
  };
  const trustedOrigins = uniqueStrings([
    ...config.trustedOrigins,
    config.baseURL,
    config.oauthProxy.currentURL,
    config.oauthProxy.productionURL,
  ]);
  const errorURL = deriveBetterAuthErrorUrl(config.baseURL);

  const isProduction = process.env.NODE_ENV === 'production';
  const db = getDatabase();
  const dbClient = db as BetterAuthExecuteClient;
  const createDrizzleAdapter = drizzleAdapter as unknown as (
    database: typeof db,
    options: BetterAuthDatabaseAdapterConfig
  ) => unknown;

  return betterAuth({
    appName: 'Alternun Dev Better Auth',
    baseURL: config.baseURL,
    basePath: '/auth',
    secret: config.secret,
    ...(errorURL ? { errorURL } : {}),
    trustedOrigins,
    database: createDrizzleAdapter(db, {
      provider: 'pg',
      schema: betterAuthSchema,
    }),
    plugins: oauthProxyPlugin ? [oauthProxyPlugin] : [],
    socialProviders,
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      async sendVerificationEmail(
        { user, url, token }: BetterAuthVerificationEmailArgs,
        request?: BetterAuthVerificationEmailRequest
      ) {
        await sendAuthVerificationEmail(
          {
            to: user.email,
            displayName: user.name,
            confirmationUrl: url,
            token,
            locale: request?.headers?.get('accept-language') ?? undefined,
          },
          process.env
        );
      },
    },
    databaseHooks: {
      user: {
        create: {
          before(user: Record<string, unknown>) {
            return Promise.resolve({
              data: fillBetterAuthUserIdentity(user),
            });
          },
          after: async (user: Record<string, unknown>) => {
            // Send AIRS welcome email after user creation
            const { sendAirsWelcomeEmail } = await import('../auth-exchange/airs-welcome.email');
            const userId = user?.id;
            const locale = user?.locale;
            const email = user?.email;
            const name = user?.name;

            if (email && typeof email === 'string') {
              try {
                await sendAirsWelcomeEmail({
                  to: email,
                  displayName: typeof name === 'string' ? name : undefined,
                  locale: typeof locale === 'string' ? locale : undefined,
                  bonusAirs: 10,
                });

                // Mark welcome email as sent in database
                if (userId && typeof userId === 'string') {
                  try {
                    await markBetterAuthWelcomeEmailSent(dbClient, userId);
                  } catch (dbError) {
                    console.error('Failed to mark welcome email as sent:', dbError);
                  }
                }
              } catch (error) {
                console.error('Failed to send AIRS welcome email:', error);
              }
            }
          },
        },
      },
      session: {
        create: {
          after: async (session: Record<string, unknown>) => {
            try {
              const userId = session?.userId;
              if (!userId || typeof userId !== 'string') return;

              const userRecord = await fetchBetterAuthWelcomeEmailRecord(dbClient, userId);
              if (!userRecord || userRecord.welcomeEmailSent) return;

              const email = userRecord.email ?? undefined;
              if (!email) return;

              const { sendAirsWelcomeEmail } = await import('../auth-exchange/airs-welcome.email');
              try {
                await sendAirsWelcomeEmail({
                  to: email,
                  displayName: userRecord.name ?? undefined,
                  locale: userRecord.locale ?? undefined,
                  bonusAirs: 10,
                });

                // Mark as sent
                await markBetterAuthWelcomeEmailSent(dbClient, userId);
              } catch (emailError) {
                console.error('Failed to send welcome email on login:', emailError);
              }
            } catch (error) {
              console.error('Error checking welcome email status at login:', error);
            }
          },
        },
      },
    },
    account: {
      storeAccountCookie: true,
      encryptOAuthTokens: true,
      storeStateStrategy: 'database',
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', ...(hasDiscordProvider ? ['discord'] : []), 'email-password'],
        allowDifferentEmails: false,
      },
      // The database-backed state row is authoritative; skipping the extra
      // cookie echo check avoids cross-origin browser cookie loss on testnet.
      skipStateCookieCheck: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
      cookieCache: {
        enabled: true,
      },
    },
    advanced: {
      useSecureCookies: isProduction,
      disableCSRFCheck: false,
      disableOriginCheck: false,
      skipTrailingSlashes: true,
      ...(cookieDomain
        ? {
            crossSubDomainCookies: {
              enabled: true,
              domain: cookieDomain,
            },
          }
        : {}),
      database: {
        generateId: 'uuid',
      },
    },
    telemetry: {
      enabled: false,
    },
  });
}

export function createBetterAuthDevServer(config: BetterAuthDevConfig): Server {
  const auth = createBetterAuthDevAuth(config);
  const authHandler = toNodeHandler(auth.handler);

  return createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Missing request URL');
      return;
    }

    void authHandler(req, res);
  });
}

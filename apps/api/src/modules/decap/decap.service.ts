import crypto from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

const GITHUB_PROVIDER = 'github';
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_ALLOWED_ORIGINS = [
  'https://docs.alternun.io',
  'https://alternun-development.github.io',
  'http://127.0.0.1:8083',
  'http://localhost:8083',
];

interface DecapCallbackParams {
  code?: string;
  oauthError?: string;
  oauthErrorDescription?: string;
  provider?: string;
  state?: string;
}

interface DecapHtmlResponse {
  html: string;
  statusCode: number;
}

interface DecapOauthConfig {
  allowedOrigins: Set<string>;
  clientId: string;
  clientSecret: string;
  publicBaseUrl?: string;
  scope: string;
  stateSecret: string;
}

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface SignedStatePayload {
  iat: number;
  origin?: string;
  provider: typeof GITHUB_PROVIDER;
  v: 1;
}

@Injectable()
export class DecapService {
  private readonly logger = new Logger(DecapService.name);

  createAuthorizationUrl(request: FastifyRequest, provider?: string): string {
    const resolvedProvider = this.resolveProvider(provider);
    const config = this.getConfig();
    const callbackUrl = this.getCallbackUrl(request, config.publicBaseUrl);
    const origin = this.resolveAllowedOrigin(request, config.allowedOrigins);
    const state = this.signState(
      {
        iat: Date.now(),
        origin,
        provider: resolvedProvider,
        v: 1,
      },
      config.stateSecret
    );

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      scope: config.scope,
      state,
    });

    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
  }

  async handleCallback(
    request: FastifyRequest,
    params: DecapCallbackParams
  ): Promise<DecapHtmlResponse> {
    const resolvedProvider = this.resolveProvider(params.provider);
    const config = this.getConfig();
    const statePayload = this.verifyState(params.state, config.stateSecret);
    const targetOrigin =
      statePayload?.origin && config.allowedOrigins.has(statePayload.origin)
        ? statePayload.origin
        : '*';

    if (params.oauthError) {
      return this.renderOauthResponse(
        'error',
        {
          error: this.formatErrorMessage(params.oauthError, params.oauthErrorDescription),
        },
        targetOrigin,
        400
      );
    }

    if (!params.code) {
      return this.renderOauthResponse(
        'error',
        {
          error: 'GitHub did not provide an authorization code.',
        },
        targetOrigin,
        400
      );
    }

    if (!statePayload || statePayload.provider !== resolvedProvider) {
      return this.renderOauthResponse(
        'error',
        {
          error: 'The Decap OAuth state is invalid or expired.',
        },
        targetOrigin,
        400
      );
    }

    const callbackUrl = this.getCallbackUrl(request, config.publicBaseUrl);

    try {
      const tokenResponse = await this.exchangeCodeForToken({
        callbackUrl,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        code: params.code,
        state: params.state ?? '',
      });

      if (!tokenResponse.access_token) {
        return this.renderOauthResponse(
          'error',
          {
            error: this.formatErrorMessage(
              tokenResponse.error ?? 'github_token_exchange_failed',
              tokenResponse.error_description
            ),
          },
          targetOrigin,
          502
        );
      }

      return this.renderOauthResponse(
        'success',
        { token: tokenResponse.access_token },
        targetOrigin,
        200
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub OAuth exchange failed.';
      this.logger.error(message);

      return this.renderOauthResponse(
        'error',
        {
          error: message,
        },
        targetOrigin,
        502
      );
    }
  }

  private getConfig(): DecapOauthConfig {
    const clientId = process.env.DECAP_GITHUB_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.DECAP_GITHUB_OAUTH_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Decap GitHub OAuth is not configured. Set DECAP_GITHUB_OAUTH_CLIENT_ID and DECAP_GITHUB_OAUTH_CLIENT_SECRET.'
      );
    }

    const publicBaseUrl = this.normalizeOptionalValue(process.env.DECAP_PUBLIC_BASE_URL?.trim());
    const repoPrivate = this.parseBoolean(process.env.DECAP_GITHUB_OAUTH_REPO_PRIVATE, false);
    const scopeFromEnv = this.normalizeOptionalValue(process.env.DECAP_GITHUB_OAUTH_SCOPE?.trim());
    const scope = scopeFromEnv ?? (repoPrivate ? 'repo,user' : 'public_repo,user');
    const stateSecret =
      this.normalizeOptionalValue(process.env.DECAP_OAUTH_STATE_SECRET?.trim()) ??
      this.normalizeOptionalValue(process.env.DECAP_GITHUB_OAUTH_STATE_SECRET?.trim()) ??
      clientSecret;

    return {
      allowedOrigins: new Set(
        this.parseList(process.env.DECAP_ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS)
      ),
      clientId,
      clientSecret,
      publicBaseUrl: publicBaseUrl ? publicBaseUrl.replace(/\/+$/, '') : undefined,
      scope,
      stateSecret,
    };
  }

  private resolveProvider(provider?: string): typeof GITHUB_PROVIDER {
    if (!provider || provider === GITHUB_PROVIDER) {
      return GITHUB_PROVIDER;
    }

    throw new BadRequestException(`Unsupported Decap OAuth provider "${provider}".`);
  }

  private getCallbackUrl(request: FastifyRequest, publicBaseUrl?: string): string {
    const baseUrl = publicBaseUrl ?? this.resolveRequestBaseUrl(request);
    return `${baseUrl}/decap/callback?provider=${GITHUB_PROVIDER}`;
  }

  private resolveRequestBaseUrl(request: FastifyRequest): string {
    const forwardedProto = this.readHeader(request.headers['x-forwarded-proto']);
    const forwardedHost = this.readHeader(request.headers['x-forwarded-host']);
    const host = forwardedHost ?? this.readHeader(request.headers.host) ?? request.hostname;

    if (!host) {
      throw new ServiceUnavailableException('Unable to determine the Decap OAuth public host.');
    }

    const protocol =
      forwardedProto ??
      request.protocol ??
      (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

    return `${protocol}://${host}`;
  }

  private resolveAllowedOrigin(
    request: FastifyRequest,
    allowedOrigins: Set<string>
  ): string | undefined {
    const candidates = [
      this.readHeader(request.headers.origin),
      this.readHeader(request.headers.referer),
      this.readHeader(request.headers.referrer),
    ];

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      try {
        const origin = new URL(candidate).origin;
        if (allowedOrigins.has(origin)) {
          return origin;
        }
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private signState(payload: SignedStatePayload, secret: string): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  private verifyState(state: string | undefined, secret: string): SignedStatePayload | null {
    if (!state) {
      return null;
    }

    const parts = state.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8')
      ) as SignedStatePayload;

      if (payload.v !== 1 || payload.provider !== GITHUB_PROVIDER) {
        return null;
      }

      if (
        typeof payload.iat !== 'number' ||
        payload.iat <= 0 ||
        Date.now() - payload.iat > STATE_TTL_MS
      ) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private async exchangeCodeForToken(args: {
    callbackUrl: string;
    clientId: string;
    clientSecret: string;
    code: string;
    state: string;
  }): Promise<GithubTokenResponse> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': '@alternun/api decap oauth bridge',
      },
      body: new URLSearchParams({
        client_id: args.clientId,
        client_secret: args.clientSecret,
        code: args.code,
        redirect_uri: args.callbackUrl,
        state: args.state,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed with status ${response.status}.`);
    }

    return (await response.json()) as GithubTokenResponse;
  }

  private renderOauthResponse(
    status: 'success' | 'error',
    payload: Record<string, string>,
    targetOrigin: string,
    statusCode: number
  ): DecapHtmlResponse {
    const safeTargetOrigin = JSON.stringify(targetOrigin);
    const safePayload = JSON.stringify(JSON.stringify(payload).replace(/</g, '\\u003c'));

    return {
      html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Alternun Decap OAuth</title>
  </head>
  <body>
    <p>Completing Decap authentication…</p>
    <script>
      (function () {
        var targetOrigin = ${safeTargetOrigin};
        var payload = ${safePayload};
        var delivered = false;

        function sendResult() {
          if (delivered || !window.opener) {
            return;
          }

          delivered = true;
          window.opener.postMessage('authorization:github:${status}:' + payload, targetOrigin);
          window.close();
        }

        function receiveMessage() {
          window.removeEventListener('message', receiveMessage, false);
          sendResult();
        }

        window.addEventListener('message', receiveMessage, false);

        if (window.opener) {
          window.opener.postMessage('authorizing:github', targetOrigin);
          window.setTimeout(sendResult, 300);
        }
      })();
    </script>
  </body>
</html>`,
      statusCode,
    };
  }

  private formatErrorMessage(error: string, description?: string): string {
    return description?.trim() ? `${error}: ${description.trim()}` : error;
  }

  private parseList(value: string | undefined, fallback: string[]): string[] {
    if (!value) {
      return fallback;
    }

    return value
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean);
  }

  private parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) {
      return fallback;
    }

    return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
  }

  private readHeader(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value?.split(',')[0]?.trim();
  }

  private normalizeOptionalValue(value: string | undefined): string | undefined {
    if (!value || value.length === 0) {
      return undefined;
    }

    return value;
  }
}

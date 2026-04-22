import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import { renderEmailTemplateTranslation, normalizeEmailLocale } from '@alternun/email-templates';

type BetterAuthVerificationEmailInput = {
  to: string;
  displayName?: string | null;
  confirmationUrl: string;
  token: string;
  locale?: string | null;
};

type SmtpSecretPayload = {
  host?: string;
  port?: number | string;
  username?: string;
  password?: string;
  from?: string;
  senderName?: string;
  useTls?: boolean | string;
  useSsl?: boolean | string;
  secure?: boolean | string;
  requireTls?: boolean | string;
};

type VerificationEmailConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  senderName: string;
  secure: boolean;
  requireTls: boolean;
};

let cachedVerificationEmailConfig: Promise<VerificationEmailConfig | null> | null = null;

function firstNonEmptyTrimmed(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  return false;
}

function parsePort(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return fallback;
}

function resolveSenderName(env: Record<string, string | undefined>): string {
  return (
    firstNonEmptyTrimmed([
      env.EMAIL_SENDER_NAME,
      env.AUTH_EMAIL_SENDER_NAME,
      env.SUPABASE_SMTP_SENDER_NAME,
      'Alternun',
    ]) ?? 'Alternun'
  );
}

async function loadVerificationEmailConfig(
  env: Record<string, string | undefined>
): Promise<VerificationEmailConfig | null> {
  const secretArn = firstNonEmptyTrimmed([env.AUTHENTIK_SMTP_SECRET_ARN, env.AIRS_SMTP_SECRET_ARN]);
  if (!secretArn) {
    return null;
  }

  const region = firstNonEmptyTrimmed([env.AWS_REGION, env.AWS_DEFAULT_REGION]) ?? 'us-east-1';
  const client = new SecretsManagerClient({ region });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const secretString = response.SecretString ?? '';

  if (!secretString.trim()) {
    return null;
  }

  const payload = JSON.parse(secretString) as SmtpSecretPayload;
  const host = firstNonEmptyTrimmed([payload.host]);
  const username = firstNonEmptyTrimmed([payload.username]);
  const password = firstNonEmptyTrimmed([payload.password]);
  const from = firstNonEmptyTrimmed([payload.from, env.EMAIL_FROM, env.AUTH_EMAIL_FROM, username]);

  if (!host || !username || !password || !from) {
    return null;
  }

  const port = parsePort(payload.port, 587);
  const secure = parseBoolean(payload.secure) || parseBoolean(payload.useSsl) || port === 465;
  const requireTls = parseBoolean(payload.requireTls) || parseBoolean(payload.useTls) || !secure;

  return {
    host,
    port,
    username,
    password,
    from,
    senderName: firstNonEmptyTrimmed([payload.senderName, resolveSenderName(env)]) ?? 'Alternun',
    secure,
    requireTls,
  };
}

async function resolveVerificationEmailConfig(
  env: Record<string, string | undefined> = process.env
): Promise<VerificationEmailConfig> {
  if (!cachedVerificationEmailConfig) {
    cachedVerificationEmailConfig = loadVerificationEmailConfig(env);
  }

  const config = await cachedVerificationEmailConfig;
  if (!config) {
    throw new Error(
      'Auth verification email SMTP is not configured. Set AUTHENTIK_SMTP_SECRET_ARN or AIRS_SMTP_SECRET_ARN.'
    );
  }

  return config;
}

function buildVerificationEmailHtml(input: {
  subject: string;
  preview: string;
  greeting: string;
  intro: string;
  token: string;
  confirmationUrl: string;
  ctaLabel: string;
  ignoreNotice: string;
  footer: string;
}): string {
  const safeSubject = sanitizeHtml(input.subject);
  const safePreview = sanitizeHtml(input.preview);
  const safeGreeting = sanitizeHtml(input.greeting);
  const safeIntro = sanitizeHtml(input.intro).replace(/\n/g, '<br />');
  const safeToken = sanitizeHtml(input.token);
  const safeUrl = sanitizeHtml(input.confirmationUrl);
  const safeCtaLabel = sanitizeHtml(input.ctaLabel);
  const safeIgnoreNotice = sanitizeHtml(input.ignoreNotice);
  const safeFooter = sanitizeHtml(input.footer);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f0f1f5;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f1f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr><td style="height:8px;background:#333782;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:28px 28px 12px 28px;">
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#1c676c;text-align:center;font-family:Tahoma,Geneva,sans-serif;">${safeSubject}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px 28px;text-align:center;color:#545454;font-size:16px;line-height:1.5;">
                <strong style="display:block;font-size:18px;color:#0f172a;margin-bottom:8px;">${safeGreeting}</strong>
                <div style="margin-bottom:12px;">${safeIntro}</div>
                <div style="margin:16px auto;padding:12px 16px;border-radius:12px;background:#f0f2ff;text-align:center;max-width:320px;">
                  <p style="margin:0 0 6px 0;font-size:13px;color:#475569;"><strong>Verification code</strong></p>
                  <p style="margin:0;font-size:24px;letter-spacing:2px;font-family:Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;color:#1e1b4b;">${safeToken}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 4px 28px;text-align:center;">
                <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;background:#333782;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">${safeCtaLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 16px 28px;text-align:center;color:#64748b;font-size:13px;line-height:1.45;">
                ${safeIgnoreNotice}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px 28px;text-align:center;color:#347e09;font-size:14px;line-height:1.45;">
                ${safeFooter}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendAuthVerificationEmail(
  input: BetterAuthVerificationEmailInput,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  try {
    const config = await resolveVerificationEmailConfig(env);
    const locale = normalizeEmailLocale(input.locale, 'en');
    const translation = renderEmailTemplateTranslation({
      locale,
      template: 'confirm-signup-email',
      params: {
        email: input.to,
        token: input.token,
        url: input.confirmationUrl,
        confirmationUrl: input.confirmationUrl,
      },
    });

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTls,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    const html = buildVerificationEmailHtml({
      subject: translation.subject,
      preview: translation.preview,
      greeting: translation.greeting,
      intro: translation.intro,
      token: input.token,
      confirmationUrl: input.confirmationUrl,
      ctaLabel: translation.ctaLabel,
      ignoreNotice: translation.ignoreNotice,
      footer: translation.footer,
    });

    const text = [
      translation.subject,
      '',
      translation.greeting,
      '',
      translation.intro,
      '',
      `${translation.codeLabel ?? 'Verification code'}: ${input.token}`,
      `${translation.ctaLabel}: ${input.confirmationUrl}`,
      '',
      translation.ignoreNotice,
      '',
      translation.footer,
    ].join('\n');

    await transporter.sendMail({
      from: `"${config.senderName}" <${config.from}>`,
      to: input.to,
      subject: translation.subject,
      text,
      html,
    });
  } catch (error) {
    // Keep the signup log actionable when SMTP is misconfigured or rejected.
    // eslint-disable-next-line no-console
    console.error('Failed to send auth verification email', {
      to: input.to,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { renderSignupWelcomeEmail } from '@alternun/email-templates';

type SignupWelcomeEmailInput = {
  to: string;
  displayName?: string | null;
  dashboardUrl?: string;
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

type SignupWelcomeEmailConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  senderName: string;
  secure: boolean;
  requireTls: boolean;
};

let cachedSignupWelcomeEmailConfig: Promise<SignupWelcomeEmailConfig | null> | null = null;
const logger = new Logger('SignupWelcomeEmail');

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

async function loadSignupWelcomeEmailConfig(
  env: Record<string, string | undefined>
): Promise<SignupWelcomeEmailConfig | null> {
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

async function resolveSignupWelcomeEmailConfig(
  env: Record<string, string | undefined> = process.env
): Promise<SignupWelcomeEmailConfig> {
  if (!cachedSignupWelcomeEmailConfig) {
    cachedSignupWelcomeEmailConfig = loadSignupWelcomeEmailConfig(env);
  }

  const config = await cachedSignupWelcomeEmailConfig;
  if (!config) {
    throw new Error(
      'Signup welcome email SMTP is not configured. Set AUTHENTIK_SMTP_SECRET_ARN or AIRS_SMTP_SECRET_ARN.'
    );
  }

  return config;
}

export async function sendSignupWelcomeEmail(
  input: SignupWelcomeEmailInput,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  try {
    const config = await resolveSignupWelcomeEmailConfig(env);
    const email = renderSignupWelcomeEmail({
      locale: input.locale,
      displayName: input.displayName,
      dashboardUrl: input.dashboardUrl,
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

    await transporter.sendMail({
      from: `"${config.senderName}" <${config.from}>`,
      to: input.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (error) {
    logger.error(
      `Failed to send signup welcome email to ${input.to}`,
      error instanceof Error ? error.stack : String(error)
    );
    throw error;
  }
}

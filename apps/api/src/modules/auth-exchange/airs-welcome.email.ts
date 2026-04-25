import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { renderAirsWelcomeEmail } from '@alternun/email-templates';

type AirsWelcomeEmailInput = {
  to: string;
  displayName?: string | null;
  dashboardUrl?: string;
  locale?: string | null;
  bonusAirs?: number;
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

type AirsWelcomeEmailConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  senderName: string;
  secure: boolean;
  requireTls: boolean;
};

let cachedAirsWelcomeEmailConfig: Promise<AirsWelcomeEmailConfig | null> | null = null;
const logger = new Logger('AirsWelcomeEmail');

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

async function loadAirsWelcomeEmailConfig(
  env: Record<string, string | undefined>
): Promise<AirsWelcomeEmailConfig | null> {
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

async function resolveAirsWelcomeEmailConfig(
  env: Record<string, string | undefined> = process.env
): Promise<AirsWelcomeEmailConfig> {
  if (!cachedAirsWelcomeEmailConfig) {
    cachedAirsWelcomeEmailConfig = loadAirsWelcomeEmailConfig(env);
  }

  const config = await cachedAirsWelcomeEmailConfig;
  if (!config) {
    throw new Error(
      'AIRS welcome email SMTP is not configured. Set AUTHENTIK_SMTP_SECRET_ARN or AIRS_SMTP_SECRET_ARN.'
    );
  }

  return config;
}

export async function sendAirsWelcomeEmail(
  input: AirsWelcomeEmailInput,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  try {
    const config = await resolveAirsWelcomeEmailConfig(env);
    const email = renderAirsWelcomeEmail({
      locale: input.locale,
      displayName: input.displayName,
      dashboardUrl: input.dashboardUrl,
      bonusAirs: input.bonusAirs ?? 10,
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
      `Failed to send AIRS welcome email to ${input.to}`,
      error instanceof Error ? error.stack : String(error)
    );
    throw error;
  }
}

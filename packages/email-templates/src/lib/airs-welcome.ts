import { normalizeEmailLocale, type EmailLocale } from './i18n';

export interface AirsWelcomeEmailInput {
  locale?: string | null;
  displayName?: string | null;
  dashboardUrl?: string | null;
  bonusAirs?: number;
}

export interface AirsWelcomeEmail {
  locale: EmailLocale;
  subject: string;
  preview: string;
  greeting: string;
  intro: string;
  body: string;
  ctaLabel: string;
  dashboardUrl: string;
  text: string;
  html: string;
}

interface AirsWelcomeTemplate {
  subject: string;
  preview: string;
  /** With the person's name, and without it when the account has none. */
  greeting: string;
  greetingNoName: string;
  intro: string;
  body: string;
  ctaLabel: string;
  closing: string;
  signature: string;
  reason: string;
  bannerAlt: string;
}

const DEFAULT_DASHBOARD_URL = 'https://airs.alternun.co/';
const DEFAULT_BONUS_AIRS = 10;

/** Welcome v2 art (Email01Airs design), served from the public media bucket. */
const ASSET_BASE =
  'https://rjebeugdvwbjpaktrrbx.supabase.co/storage/v1/object/public/marketplace-media/email/welcome-v2';
const BANNER_URL = `${ASSET_BASE}/banner.jpg`;
const FOOTER_URL = `${ASSET_BASE}/footer.jpg`;
const ALTERNUN_URL = 'https://alternun.io';

// Copy from the 19-Nov-2026 email audit (Email01 and Ficha 11), checked with the Airs language
// guardrail: Airs is reputation, no exchange rate, no rewards fund or token wording.
const AIRS_WELCOME_TEMPLATES: Record<EmailLocale, AirsWelcomeTemplate> = {
  es: {
    subject: 'Te damos la bienvenida a Airs',
    preview: 'Completa tu perfil y suma tus primeros {{bonusAirs}} Airs.',
    greeting: 'Hola, {{displayName}}:',
    greetingNoName: 'Hola:',
    intro: 'Desde hoy, tus acciones de impacto positivo con marcas y proyectos aliados suman Airs.',
    body: 'Los Airs se construyen con lo que haces, no vencen y forman tu trayectoria. Completa tu perfil y suma tus primeros {{bonusAirs}} Airs.',
    ctaLabel: 'Completar mi perfil',
    closing: 'Que lo que haces por el planeta, quede.',
    signature: 'Equipo Airs',
    reason: 'Recibes este correo porque creaste una cuenta en Airs.',
    bannerAlt: 'Te damos la bienvenida a Airs',
  },
  en: {
    subject: 'Welcome to Airs',
    preview: 'Complete your profile and get your first {{bonusAirs}} Airs.',
    greeting: 'Hi {{displayName}},',
    greetingNoName: 'Hi,',
    intro: 'From today, your positive-impact actions with partner brands and projects earn Airs.',
    body: 'Airs are built by what you do, never expire and become your track record. Complete your profile to get your first {{bonusAirs}} Airs.',
    ctaLabel: 'Complete my profile',
    closing: 'What you do for the planet, stays.',
    signature: 'The Airs team',
    reason: 'You are receiving this email because you created an Airs account.',
    bannerAlt: 'Welcome to Airs',
  },
  th: {
    subject: 'ยินดีต้อนรับสู่ Airs',
    preview: 'กรอกโปรไฟล์ให้ครบและรับ {{bonusAirs}} Airs แรกของคุณ',
    greeting: 'สวัสดี {{displayName}}',
    greetingNoName: 'สวัสดี',
    intro:
      'ตั้งแต่วันนี้ การกระทำที่สร้างผลกระทบเชิงบวกของคุณร่วมกับแบรนด์และโครงการพันธมิตรจะสะสมเป็น Airs',
    body: 'Airs สร้างขึ้นจากสิ่งที่คุณทำ ไม่มีวันหมดอายุ และกลายเป็นเส้นทางของคุณ กรอกโปรไฟล์ให้ครบเพื่อรับ {{bonusAirs}} Airs แรกของคุณ',
    ctaLabel: 'กรอกโปรไฟล์ของฉัน',
    closing: 'ให้สิ่งที่คุณทำเพื่อโลกคงอยู่',
    signature: 'ทีม Airs',
    reason: 'คุณได้รับอีเมลนี้เพราะคุณสร้างบัญชี Airs',
    bannerAlt: 'ยินดีต้อนรับสู่ Airs',
  },
};

function interpolate(value: string, params: { displayName: string; bonusAirs: number }): string {
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match: string, key: string) => {
    const trimmedKey = key.trim();
    if (trimmedKey === 'displayName') return params.displayName;
    if (trimmedKey === 'bonusAirs') return String(params.bonusAirs);
    return match;
  });
}

const HTML_ESCAPE_LOOKUP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_LOOKUP[char] ?? char);
}

function stripTrailingSlashes(value: string): string {
  let result = value;
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

const SPACER = '<tr><td style="font-size:0;line-height:0;height:16px" height="16">&nbsp;</td></tr>';
const DIVIDER =
  '<tr><td style="padding:0 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#bfc3c8">&nbsp;</td></tr></table></td></tr>';
const TEXT_STYLE =
  'padding:0 20px;color:#545454;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.45;text-align:left';

/**
 * The Airs welcome email (v2): the Email01Airs design from the design team (banner, title,
 * greeting, two paragraphs, profile button, closing and the Alternun footer) with copy that
 * follows the Airs language rules. Spanish by default, because a new account often has no locale.
 */
export function renderAirsWelcomeEmail(input: AirsWelcomeEmailInput): AirsWelcomeEmail {
  const locale = normalizeEmailLocale(input.locale, 'es');
  const template = AIRS_WELCOME_TEMPLATES[locale] ?? AIRS_WELCOME_TEMPLATES.es;
  const displayName = input.displayName?.trim() ?? '';
  const dashboardUrl = stripTrailingSlashes(input.dashboardUrl?.trim() ?? DEFAULT_DASHBOARD_URL);
  const profileUrl = `${dashboardUrl}/profile`;
  const bonusAirs = Number.isFinite(input.bonusAirs ?? DEFAULT_BONUS_AIRS)
    ? Number(input.bonusAirs ?? DEFAULT_BONUS_AIRS)
    : DEFAULT_BONUS_AIRS;
  const params = { displayName, bonusAirs };

  const subject = interpolate(template.subject, params);
  const preview = interpolate(template.preview, params);
  const greeting = displayName
    ? interpolate(template.greeting, params)
    : interpolate(template.greetingNoName, params);
  const intro = interpolate(template.intro, params);
  const body = interpolate(template.body, params);
  const ctaLabel = template.ctaLabel;
  const year = new Date().getUTCFullYear();
  const legal = `© ${year} Alternun Colombia SAS · info@alternun.io`;

  const text = [
    subject,
    '',
    greeting,
    '',
    intro,
    '',
    body,
    '',
    `${ctaLabel}: ${profileUrl}`,
    '',
    template.closing,
    template.signature,
    '',
    legal,
    template.reason,
  ].join('\n');

  const html = `<!doctype html>
<html lang="${locale}">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;width:100%;background-color:#f0f1f5;-webkit-text-size-adjust:100%;text-size-adjust:100%">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(
      preview
    )}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f1f5" style="background-color:#f0f1f5">
      <tr>
        <td align="center" style="padding:16px 8px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background-color:#ffffff">
            ${SPACER}
            <tr>
              <td style="padding:0 20px">
                <a href="${escapeHtml(dashboardUrl)}" style="text-decoration:none">
                  <img src="${BANNER_URL}" width="560" alt="${escapeHtml(
    template.bannerAlt
  )}" style="display:block;width:100%;max-width:560px;height:auto;border:0" />
                </a>
              </td>
            </tr>
            ${SPACER}
            ${DIVIDER}
            ${SPACER}
            <tr>
              <td style="padding:0 20px;color:#1c676c;font-family:Tahoma,Geneva,sans-serif;font-size:28px;font-weight:700;line-height:1.3;text-align:center">${escapeHtml(
                subject
              )}</td>
            </tr>
            ${SPACER}
            ${DIVIDER}
            ${SPACER}
            <tr><td style="${TEXT_STYLE};font-weight:700">${escapeHtml(greeting)}</td></tr>
            ${SPACER}
            <tr><td style="${TEXT_STYLE}">${escapeHtml(intro)}</td></tr>
            ${SPACER}
            <tr><td style="${TEXT_STYLE}">${escapeHtml(body)}</td></tr>
            ${SPACER}
            ${SPACER}
            <tr>
              <td style="padding:0 20px">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#333782" style="border-radius:26px;background-color:#333782">
                      <a href="${escapeHtml(
                        profileUrl
                      )}" target="_blank" rel="noopener" style="display:block;padding:15px 24px;color:#ffffff;font-family:Verdana,Geneva,sans-serif;font-size:16px;font-weight:700;line-height:1.4;text-decoration:none;border-radius:26px">${escapeHtml(
    ctaLabel
  )}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${SPACER}
            <tr>
              <td style="padding:0 20px;color:#347e09;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.3;text-align:center">${escapeHtml(
                template.closing
              )}</td>
            </tr>
            <tr>
              <td style="padding:6px 20px 0 20px;color:#545454;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.3;text-align:center">${escapeHtml(
                template.signature
              )}</td>
            </tr>
            ${SPACER}
            ${SPACER}
            <tr>
              <td style="padding:0 20px">
                <a href="${ALTERNUN_URL}" style="text-decoration:none">
                  <img src="${FOOTER_URL}" width="560" alt="Alternun" style="display:block;width:100%;max-width:560px;height:auto;border:0" />
                </a>
              </td>
            </tr>
            ${SPACER}
            <tr>
              <td style="padding:0 20px;color:#545454;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;text-align:center">${escapeHtml(
                legal
              )}</td>
            </tr>
            ${SPACER}
            ${DIVIDER}
            ${SPACER}
            <tr>
              <td style="padding:0 20px 8px 20px;color:#545454;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;text-align:center">${escapeHtml(
                template.reason
              )}</td>
            </tr>
            ${SPACER}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    locale,
    subject,
    preview,
    greeting,
    intro,
    body,
    ctaLabel,
    dashboardUrl,
    text,
    html,
  };
}

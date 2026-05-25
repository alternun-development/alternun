import { normalizeEmailLocale, type EmailLocale } from './i18n';

export interface SignupWelcomeEmailInput {
  locale?: string | null;
  displayName?: string | null;
  dashboardUrl?: string | null;
}

export interface SignupWelcomeEmail {
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

interface SignupWelcomeTemplate {
  subject: string;
  preview: string;
  greeting: string;
  intro: string;
  body: string;
  ctaLabel: string;
  footer: string;
}

const DEFAULT_DASHBOARD_URL = 'https://airs.alternun.co/';

const SIGNUP_WELCOME_TEMPLATES: Record<EmailLocale, SignupWelcomeTemplate> = {
  en: {
    subject: 'Welcome to Alternun AIRS',
    preview: 'Your account has been successfully created. Start your regenerative journey today.',
    greeting: 'Welcome {{displayName}},',
    intro:
      'Thank you for joining Alternun! Your account has been successfully created and is ready to use.',
    body: 'You are now part of a community dedicated to regenerative commerce. Explore our platform, connect your wallet, and start accumulating AIRS through sustainable actions and allied commerce. Every action counts towards a more sustainable future.',
    ctaLabel: 'Start exploring',
    footer: 'Welcome to the Alternun community',
  },
  es: {
    subject: 'Bienvenido a Alternun AIRS',
    preview: 'Tu cuenta ha sido creada exitosamente. Comienza tu jornada regenerativa hoy.',
    greeting: 'Bienvenido {{displayName}},',
    intro:
      'Gracias por unirte a Alternun! Tu cuenta ha sido creada exitosamente y está lista para usar.',
    body: 'Ya eres parte de una comunidad dedicada al comercio regenerativo. Explora nuestra plataforma, conecta tu billetera y comienza a acumular AIRS a través de acciones sustentables y comercio aliado. Cada acción cuenta hacia un futuro más sustentable.',
    ctaLabel: 'Comenzar a explorar',
    footer: 'Bienvenido a la comunidad de Alternun',
  },
  th: {
    subject: 'ยินดีต้อนรับสู่ Alternun AIRS',
    preview: 'บัญชีของคุณได้สร้างเรียบร้อยแล้ว เริ่มการเดินทางด้านการสร้างสรรค์ของคุณวันนี้',
    greeting: 'ยินดีต้อนรับ {{displayName}},',
    intro: 'ขอบคุณที่เข้าร่วม Alternun! บัญชีของคุณได้สร้างเรียบร้อยแล้วและพร้อมใช้งาน',
    body: 'คุณเป็นส่วนหนึ่งของชุมชนที่อุทิศให้กับการค้าเพื่อการสร้างสรรค์ สำรวจแพลตฟอร์มของเรา เชื่อมต่อกระเป๋าของคุณ และเริ่มสะสม AIRS ผ่านการกระทำที่ยั่งยืนและการค้าเครือข่ายพันธมิตร ทุกการกระทำมีส่วนสนับสนุนต่ออนาคตที่ยั่งยืนขึ้น',
    ctaLabel: 'เริ่มสำรวจ',
    footer: 'ยินดีต้อนรับสู่ชุมชน Alternun',
  },
};

function interpolate(
  value: string,
  params: {
    displayName: string;
  }
): string {
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match: string, key: string) => {
    const trimmedKey = key.trim();
    if (trimmedKey === 'displayName') {
      return params.displayName;
    }
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

function escapeHtmlWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function stripTrailingSlashes(value: string): string {
  let result = value;
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

export function renderSignupWelcomeEmail(input: SignupWelcomeEmailInput): SignupWelcomeEmail {
  const locale = normalizeEmailLocale(input.locale, 'en');
  const template =
    locale === 'es'
      ? SIGNUP_WELCOME_TEMPLATES.es
      : locale === 'th'
      ? SIGNUP_WELCOME_TEMPLATES.th
      : SIGNUP_WELCOME_TEMPLATES.en;
  const displayName = (input.displayName?.trim() ?? 'AIRS member').trim();
  const dashboardUrl = stripTrailingSlashes(input.dashboardUrl?.trim() ?? DEFAULT_DASHBOARD_URL);
  const params = {
    displayName,
  };

  const subject = interpolate(template.subject, params);
  const preview = interpolate(template.preview, params);
  const greeting = interpolate(template.greeting, params);
  const intro = interpolate(template.intro, params);
  const body = interpolate(template.body, params);
  const ctaLabel = template.ctaLabel;
  const footer = template.footer;

  const text = [
    subject,
    '',
    greeting,
    '',
    intro,
    '',
    body,
    '',
    `${ctaLabel}: ${dashboardUrl}`,
    '',
    footer,
  ].join('\n');

  const html = `<!doctype html>
<html lang="${locale}">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f0f1f5;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f1f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="height:8px;background:#333782;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 28px 12px 28px;">
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#1c676c;text-align:center;font-family:Tahoma,Geneva,sans-serif;">${escapeHtml(
                  subject
                )}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px 28px;text-align:center;color:#545454;font-size:16px;line-height:1.5;">
                <strong style="display:block;font-size:18px;color:#0f172a;margin-bottom:8px;">${escapeHtml(
                  greeting
                )}</strong>
                <div style="margin-bottom:12px;">${escapeHtmlWithBreaks(intro)}</div>
                <div style="margin-bottom:12px;">${escapeHtmlWithBreaks(body)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 4px 28px;text-align:center;">
                <a href="${escapeHtml(
                  dashboardUrl
                )}" style="display:inline-block;padding:14px 24px;background:#333782;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">
                  ${escapeHtml(ctaLabel)}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px 28px;text-align:center;color:#347e09;font-size:14px;line-height:1.45;">
                ${escapeHtml(footer)}
              </td>
            </tr>
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

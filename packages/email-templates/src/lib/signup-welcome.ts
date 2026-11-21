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
  /** With the person's name, and without it when the account has none. */
  greeting: string;
  greetingNoName: string;
  intro: string;
  body: string;
  ctaLabel: string;
  footer: string;
}

const DEFAULT_DASHBOARD_URL = 'https://airs.alternun.co/';

// Copy from the 19-Nov-2026 email audit (Ficha 10), checked with the Airs language guardrail.
const SIGNUP_WELCOME_TEMPLATES: Record<EmailLocale, SignupWelcomeTemplate> = {
  en: {
    subject: 'Your Airs account is ready',
    preview: 'You can now start earning Airs with your positive-impact actions.',
    greeting: 'Hi {{displayName}},',
    greetingNoName: 'Hi,',
    intro: 'Thanks for joining Airs. Your account is ready.',
    body: 'Airs recognizes your positive-impact actions with partner brands and projects and turns them into a track record that stays. Explore the projects and see how to earn Airs.',
    ctaLabel: 'Explore Airs',
    footer: 'Welcome to the Airs community',
  },
  es: {
    subject: 'Tu cuenta de Airs está lista',
    preview: 'Ya puedes empezar a sumar Airs con tus acciones de impacto positivo.',
    greeting: 'Hola, {{displayName}}:',
    greetingNoName: 'Hola:',
    intro: 'Gracias por unirte a Airs. Tu cuenta quedó creada.',
    body: 'Airs reconoce tus acciones de impacto positivo con marcas y proyectos aliados y las convierte en una trayectoria que queda. Explora los proyectos y descubre cómo sumar.',
    ctaLabel: 'Explorar Airs',
    footer: 'Te damos la bienvenida a la comunidad Airs',
  },
  th: {
    subject: 'บัญชี Airs ของคุณพร้อมแล้ว',
    preview: 'ตอนนี้คุณเริ่มสะสม Airs จากการกระทำที่สร้างผลกระทบเชิงบวกได้แล้ว',
    greeting: 'สวัสดี {{displayName}}',
    greetingNoName: 'สวัสดี',
    intro: 'ขอบคุณที่เข้าร่วม Airs บัญชีของคุณพร้อมแล้ว',
    body: 'Airs ยกย่องการกระทำที่สร้างผลกระทบเชิงบวกของคุณร่วมกับแบรนด์และโครงการพันธมิตร และเปลี่ยนให้เป็นเส้นทางที่คงอยู่ สำรวจโครงการและดูว่าจะสะสม Airs ได้อย่างไร',
    ctaLabel: 'สำรวจ Airs',
    footer: 'ยินดีต้อนรับสู่ชุมชน Airs',
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
  // Spanish by default, because a new account often has no locale yet.
  const locale = normalizeEmailLocale(input.locale, 'es');
  const template =
    locale === 'es'
      ? SIGNUP_WELCOME_TEMPLATES.es
      : locale === 'th'
      ? SIGNUP_WELCOME_TEMPLATES.th
      : SIGNUP_WELCOME_TEMPLATES.en;
  const displayName = input.displayName?.trim() ?? '';
  const dashboardUrl = stripTrailingSlashes(input.dashboardUrl?.trim() ?? DEFAULT_DASHBOARD_URL);
  const params = {
    displayName,
  };

  const subject = interpolate(template.subject, params);
  const preview = interpolate(template.preview, params);
  const greeting = displayName ? interpolate(template.greeting, params) : template.greetingNoName;
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

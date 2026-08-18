import { normalizeEmailLocale, type EmailLocale } from './i18n';

export interface ReferralRewardEmailInput {
  locale?: string | null;
  recipientName?: string | null;
  counterpartName?: string | null;
  recipientRole: 'referrer' | 'referee';
  recipientAirs: number;
  counterpartAirs: number;
  referralUrl?: string | null;
}

export interface ReferralRewardEmail {
  locale: EmailLocale;
  subject: string;
  text: string;
  html: string;
}

const DEFAULT_REFERRAL_URL = 'https://airs.alternun.co/mi-perfil';

type Template = {
  subject: string;
  greeting: string;
  referrer: string;
  referee: string;
  cta: string;
  footer: string;
};

const TEMPLATES: Record<EmailLocale, Template> = {
  en: {
    subject: 'Your AIRS referral reward is here',
    greeting: 'Hi {{recipientName}},',
    referrer:
      'You referred {{counterpartName}} to AIRS. You received {{recipientAirs}} AIRS and {{counterpartName}} received {{counterpartAirs}} AIRS. Thank you for growing the regenerative mission together.',
    referee:
      '{{counterpartName}} referred you to AIRS. You received {{recipientAirs}} AIRS and {{counterpartName}} received {{counterpartAirs}} AIRS. Welcome to the regenerative mission.',
    cta: 'Invite another friend',
    footer: 'Alternun AIRS · Your regenerative companion',
  },
  es: {
    subject: 'Tu recompensa AIRS por referido ya llegó',
    greeting: 'Hola {{recipientName}},',
    referrer:
      'Referiste a {{counterpartName}} a AIRS. Recibiste {{recipientAirs}} AIRS y {{counterpartName}} recibió {{counterpartAirs}} AIRS. Gracias por hacer crecer juntos la misión regenerativa.',
    referee:
      '{{counterpartName}} te refirió a AIRS. Recibiste {{recipientAirs}} AIRS y {{counterpartName}} recibió {{counterpartAirs}} AIRS. Te damos la bienvenida a la misión regenerativa.',
    cta: 'Invitar a otra persona',
    footer: 'Alternun AIRS · Tu compañero regenerativo',
  },
  th: {
    subject: 'รางวัล AIRS จากการแนะนำของคุณมาถึงแล้ว',
    greeting: 'สวัสดี {{recipientName}},',
    referrer:
      'คุณแนะนำ {{counterpartName}} ให้เข้าร่วม AIRS คุณได้รับ {{recipientAirs}} AIRS และ {{counterpartName}} ได้รับ {{counterpartAirs}} AIRS ขอบคุณที่ร่วมขยายภารกิจฟื้นฟูไปด้วยกัน',
    referee:
      '{{counterpartName}} แนะนำคุณให้เข้าร่วม AIRS คุณได้รับ {{recipientAirs}} AIRS และ {{counterpartName}} ได้รับ {{counterpartAirs}} AIRS ยินดีต้อนรับสู่ภารกิจฟื้นฟู',
    cta: 'ชวนเพื่อนอีกคน',
    footer: 'Alternun AIRS · เพื่อนร่วมทางเพื่อการฟื้นฟูของคุณ',
  },
};

function escapeHtml(value: string): string {
  const escaped: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (char) => escaped[char] ?? char);
}

function interpolate(value: string, params: Record<string, string>): string {
  return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => params[key] ?? match);
}

function fallbackForBlank(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : fallback;
}

export function renderReferralRewardEmail(input: ReferralRewardEmailInput): ReferralRewardEmail {
  const locale = normalizeEmailLocale(input.locale, 'en');
  const template = TEMPLATES[locale];
  const recipientName = fallbackForBlank(input.recipientName, 'AIRS member');
  const counterpartName = fallbackForBlank(input.counterpartName, 'your AIRS companion');
  const params = {
    recipientName,
    counterpartName,
    recipientAirs: String(input.recipientAirs),
    counterpartAirs: String(input.counterpartAirs),
  };
  const greeting = interpolate(template.greeting, params);
  const body = interpolate(template[input.recipientRole], params);
  const url = fallbackForBlank(input.referralUrl, DEFAULT_REFERRAL_URL);
  const text = [
    template.subject,
    '',
    greeting,
    '',
    body,
    '',
    `${template.cta}: ${url}`,
    '',
    template.footer,
  ].join('\n');
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;padding:24px;background:#f0f1f5;font-family:Arial,Helvetica,sans-serif;color:#0f172a;"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="600" style="max-width:100%;background:#fff;border-radius:18px;overflow:hidden;"><tr><td style="height:8px;background:#333782"></td></tr><tr><td style="padding:28px;text-align:center"><h1 style="margin:0 0 18px;color:#1c676c;font-size:28px">${escapeHtml(
    template.subject
  )}</h1><p style="font-size:18px;font-weight:bold">${escapeHtml(
    greeting
  )}</p><p style="font-size:16px;line-height:1.6">${escapeHtml(body)}</p><p><a href="${escapeHtml(
    url
  )}" style="display:inline-block;padding:14px 24px;background:#333782;color:#fff;text-decoration:none;border-radius:999px;font-weight:bold">${escapeHtml(
    template.cta
  )}</a></p><p style="color:#347e09;font-size:14px">${escapeHtml(
    template.footer
  )}</p></td></tr></table></td></tr></table></body></html>`;

  return { locale, subject: template.subject, text, html };
}

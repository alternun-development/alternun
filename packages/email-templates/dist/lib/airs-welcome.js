"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderAirsWelcomeEmail = renderAirsWelcomeEmail;
const i18n_1 = require("./i18n");
const DEFAULT_DASHBOARD_URL = 'https://airs.alternun.co/';
const DEFAULT_BONUS_AIRS = 10;
const DEFAULT_AIRS_PER_DOLLAR = 5;
const AIRS_WELCOME_TEMPLATES = {
    en: {
        subject: 'Welcome to AIRS accumulation',
        preview: 'Complete your profile to claim your 10 AIRS bonus and start earning.',
        greeting: 'Hi {{displayName}},',
        intro: 'Your AIRS account is active. You can now accumulate AIRS through allied commerce and validated regenerative actions.',
        body: 'You earn {{airsPerDollar}} AIRS for every USD spent in allied commerce or validated regenerative actions. Complete your profile to unlock the {{bonusAirs}} AIRS welcome bonus and keep your regenerative score flowing.',
        ctaLabel: 'Open dashboard',
        footer: 'Alternun AIRS Team',
    },
    es: {
        subject: 'Bienvenido a la acumulacion de AIRS',
        preview: 'Completa tu perfil para reclamar tu bono de 10 AIRS y comenzar a acumular.',
        greeting: 'Hola {{displayName}},',
        intro: 'Tu cuenta AIRS ya esta activa. Ahora puedes acumular AIRS mediante comercio aliado y acciones regenerativas validadas.',
        body: 'Ganas {{airsPerDollar}} AIRS por cada USD utilizado en comercio aliado o acciones regenerativas validadas. Completa tu perfil para desbloquear el bono de bienvenida de {{bonusAirs}} AIRS y mantener tu puntuacion regenerativa en movimiento.',
        ctaLabel: 'Abrir panel',
        footer: 'Equipo AIRS de Alternun',
    },
    th: {
        subject: 'ยินดีต้อนรับสู่การสะสม AIRS',
        preview: 'กรอกโปรไฟล์ของคุณให้ครบเพื่อรับโบนัส 10 AIRS และเริ่มสะสม',
        greeting: 'สวัสดี {{displayName}},',
        intro: 'บัญชี AIRS ของคุณพร้อมใช้งานแล้ว ตอนนี้คุณสามารถสะสม AIRS จากการค้าเครือข่ายพันธมิตรและการกระทำเชิงฟื้นฟูที่ตรวจสอบได้',
        body: 'คุณจะได้รับ {{airsPerDollar}} AIRS สำหรับทุก USD ที่ใช้กับการค้าเครือข่ายพันธมิตรหรือการกระทำเชิงฟื้นฟูที่ตรวจสอบแล้ว กรอกโปรไฟล์ให้ครบเพื่อปลดล็อกโบนัสต้อนรับ {{bonusAirs}} AIRS และเดินหน้าคะแนนฟื้นฟูของคุณต่อไป',
        ctaLabel: 'เปิดแดชบอร์ด',
        footer: 'ทีม AIRS ของ Alternun',
    },
};
function interpolate(value, params) {
    return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        const resolved = params[trimmedKey];
        return resolved == null ? match : String(resolved);
    });
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escapeHtmlWithBreaks(value) {
    return escapeHtml(value).replace(/\n/g, '<br />');
}
function renderAirsWelcomeEmail(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const locale = (0, i18n_1.normalizeEmailLocale)(input.locale, 'en');
    const template = (_a = AIRS_WELCOME_TEMPLATES[locale]) !== null && _a !== void 0 ? _a : AIRS_WELCOME_TEMPLATES.en;
    const displayName = ((_c = (_b = input.displayName) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : 'AIRS member').trim();
    const dashboardUrl = ((_e = (_d = input.dashboardUrl) === null || _d === void 0 ? void 0 : _d.trim()) !== null && _e !== void 0 ? _e : DEFAULT_DASHBOARD_URL).replace(/\/+$/, '');
    const bonusAirs = Number.isFinite((_f = input.bonusAirs) !== null && _f !== void 0 ? _f : DEFAULT_BONUS_AIRS)
        ? Number((_g = input.bonusAirs) !== null && _g !== void 0 ? _g : DEFAULT_BONUS_AIRS)
        : DEFAULT_BONUS_AIRS;
    const airsPerDollar = Number.isFinite((_h = input.airsPerDollar) !== null && _h !== void 0 ? _h : DEFAULT_AIRS_PER_DOLLAR)
        ? Number((_j = input.airsPerDollar) !== null && _j !== void 0 ? _j : DEFAULT_AIRS_PER_DOLLAR)
        : DEFAULT_AIRS_PER_DOLLAR;
    const params = {
        displayName,
        bonusAirs,
        airsPerDollar,
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
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#1c676c;text-align:center;font-family:Tahoma,Geneva,sans-serif;">${escapeHtml(subject)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px 28px;text-align:center;color:#545454;font-size:16px;line-height:1.5;">
                <strong style="display:block;font-size:18px;color:#0f172a;margin-bottom:8px;">${escapeHtml(greeting)}</strong>
                <div style="margin-bottom:12px;">${escapeHtmlWithBreaks(intro)}</div>
                <div style="margin-bottom:12px;">${escapeHtmlWithBreaks(body)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 4px 28px;text-align:center;">
                <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:14px 24px;background:#333782;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">
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

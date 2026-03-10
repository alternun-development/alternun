#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SUPPORTED_LOCALES = ["en", "es", "th"];
const DEFAULT_LOCALE = "en";
const DATA_LOCALE_FIELD = ".Data.locale";
const DEFAULT_STYLE = {
  bannerColor: "#333782",
  headingColor: "#1c676c",
  buttonBackground: "#333782",
  buttonText: "#ffffff",
  closingColor: "#347e09",
  codeBackground: "#f8fafc",
  codeText: "#0f172a",
};
const STYLE_BY_EVENT = {
  confirmation: {
    bannerColor: "#333782",
    headingColor: "#1c676c",
    buttonBackground: "#333782",
    buttonText: "#ffffff",
    closingColor: "#347e09",
    codeBackground: "#f0f2ff",
    codeText: "#1e1b4b",
  },
  invite: {
    bannerColor: "#347e09",
    headingColor: "#1c676c",
    buttonBackground: "#347e09",
    buttonText: "#ffffff",
    closingColor: "#347e09",
    codeBackground: "#f0fdf4",
    codeText: "#14532d",
  },
  magic_link: {
    bannerColor: "#0f7058",
    headingColor: "#1c676c",
    buttonBackground: "#1ee6b4",
    buttonText: "#114038",
    closingColor: "#0f7058",
    codeBackground: "#ecfeff",
    codeText: "#164e63",
  },
  email_change: {
    bannerColor: "#0f7058",
    headingColor: "#1c676c",
    buttonBackground: "#0f7058",
    buttonText: "#ffffff",
    closingColor: "#0f7058",
    codeBackground: "#ecfdf5",
    codeText: "#14532d",
  },
  recovery: {
    bannerColor: "#c2410c",
    headingColor: "#9a3412",
    buttonBackground: "#c2410c",
    buttonText: "#ffffff",
    closingColor: "#9a3412",
    codeBackground: "#fff7ed",
    codeText: "#7c2d12",
  },
  reauthentication: {
    bannerColor: "#334155",
    headingColor: "#1e293b",
    buttonBackground: "#334155",
    buttonText: "#ffffff",
    closingColor: "#334155",
    codeBackground: "#f8fafc",
    codeText: "#0f172a",
  },
  account_delete: {
    bannerColor: "#be123c",
    headingColor: "#9f1239",
    buttonBackground: "#be123c",
    buttonText: "#ffffff",
    closingColor: "#9f1239",
    codeBackground: "#fff1f2",
    codeText: "#9f1239",
  },
};

function findRepoRoot(startDir = __dirname) {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }

    current = parent;
  }
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Failed to parse JSON file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1 || index + 1 >= process.argv.length) {
    return null;
  }

  return process.argv[index + 1];
}

function normalizeLocale(value, fallbackLocale = DEFAULT_LOCALE) {
  if (!value) {
    return fallbackLocale;
  }

  const normalized = String(value).trim().toLowerCase().replace("_", "-");
  if (SUPPORTED_LOCALES.includes(normalized)) {
    return normalized;
  }

  const baseLocale = normalized.split("-")[0];
  return SUPPORTED_LOCALES.includes(baseLocale) ? baseLocale : fallbackLocale;
}

function parseLocales(rawLocales, fallbackLocale) {
  if (!rawLocales) {
    return [...SUPPORTED_LOCALES];
  }

  const uniqueLocales = [];
  for (const entry of String(rawLocales).split(",")) {
    const normalized = normalizeLocale(entry, fallbackLocale);
    if (!uniqueLocales.includes(normalized)) {
      uniqueLocales.push(normalized);
    }
  }

  if (!uniqueLocales.includes(fallbackLocale)) {
    uniqueLocales.push(fallbackLocale);
  }

  return uniqueLocales;
}

function interpolateTemplateText(value, params) {
  if (!params) {
    return value;
  }

  return String(value).replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, rawToken) => {
    const token = rawToken.trim();
    const resolvedValue = params[token];
    return resolvedValue == null ? match : String(resolvedValue);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlWithLineBreaks(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function renderIntroParagraphs(intro) {
  return String(intro)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px 0;font-size:16px;line-height:1.45;color:#545454;">${escapeHtmlWithLineBreaks(
          paragraph
        )}</p>`
    )
    .join("");
}

function renderHtmlEmail(translation, options) {
  const style = {
    ...DEFAULT_STYLE,
    ...(options.style || {}),
  };
  const includeCode = options.includeCode && translation.codeLabel;
  const includeActionLink = options.includeActionLink;

  const codeSection = includeCode
    ? `
            {{ if .Token }}
            <div style="margin:16px 0 0 0;padding:12px 16px;border-radius:12px;background:${style.codeBackground};">
              <p style="margin:0 0 6px 0;font-size:13px;color:#475569;">
                <strong>${escapeHtml(translation.codeLabel)}</strong>
              </p>
              <p style="margin:0;font-size:24px;letter-spacing:2px;font-family:Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;color:${style.codeText};">
                ${escapeHtml(translation.otpCode)}
              </p>
            </div>
            {{ end }}`
    : "";

  const actionSection = includeActionLink
    ? `
            <p style="margin:24px 0 0 0;">
              <a href="${escapeHtml(
                translation.actionLink
              )}" style="display:inline-block;padding:12px 20px;background:${style.buttonBackground};color:${style.buttonText};text-decoration:none;border-radius:25px;font-weight:700;">
                ${escapeHtml(translation.ctaLabel)}
              </a>
            </p>`
    : "";

  const closingSection = translation.closing
    ? `<p style="margin:22px 0 0 0;font-size:18px;line-height:1.35;font-weight:700;color:${style.closingColor};text-align:center;">${escapeHtmlWithLineBreaks(
        translation.closing
      )}</p>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(translation.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f0f1f5;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(translation.preview)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f1f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="height:8px;background:${style.bannerColor};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:22px 28px 0 28px;">
                <h1 style="margin:0;font-size:28px;line-height:1.25;color:${style.headingColor};text-align:center;font-family:Tahoma,Geneva,sans-serif;">${escapeHtml(
                  translation.subject
                )}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 6px 28px;">
                <div style="height:1px;background:#bfc3c8;border-radius:999px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px 28px;">
                <p style="margin:0 0 12px 0;font-size:16px;line-height:1.45;color:#545454;"><strong>${escapeHtml(
                  translation.greeting
                )}</strong></p>
                ${renderIntroParagraphs(translation.intro)}${codeSection}${actionSection}${closingSection}
                <p style="margin:20px 0 0 0;font-size:13px;line-height:1.45;color:#64748b;">${escapeHtml(
                  translation.ignoreNotice
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 16px 28px;">
                <div style="height:1px;background:#bfc3c8;border-radius:999px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px 28px;background:#ffffff;font-size:12px;color:#64748b;text-align:center;">
                © 2026 Alternun. ${escapeHtml(translation.footer)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderTextEmail(translation, options) {
  const lines = [
    translation.subject,
    "",
    translation.greeting,
    translation.intro,
  ];

  if (options.includeCode && translation.codeLabel) {
    lines.push(`${translation.codeLabel}: ${translation.otpCode}`);
  }

  if (options.includeActionLink) {
    lines.push(`${translation.ctaLabel}: ${translation.actionLink}`);
  }

  if (translation.closing) {
    lines.push("", translation.closing);
  }

  lines.push("", translation.ignoreNotice, "", translation.footer);
  return lines.join("\n");
}

function loadLocaleTemplate(packageRoot, locale, templateKey) {
  const filePath = path.join(
    packageRoot,
    "src",
    "locales",
    locale,
    `${templateKey}.json`
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing translation file: ${filePath}`);
  }

  const template = readJson(filePath);
  const requiredFields = [
    "subject",
    "preview",
    "greeting",
    "intro",
    "ctaLabel",
    "ignoreNotice",
    "footer",
  ];

  const missing = requiredFields.filter((field) => {
    const value = template[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required fields in ${filePath}: ${missing.join(", ")}`
    );
  }

  return template;
}

function buildTemplateVariant(packageRoot, locale, templateKey, options) {
  const baseTemplate = loadLocaleTemplate(packageRoot, locale, templateKey);
  const interpolationParams = {
    email: "{{ .Email }}",
    action_link: "{{ .ConfirmationURL }}",
    otp_code: "{{ .Token }}",
  };

  const translation = {
    subject: interpolateTemplateText(baseTemplate.subject, interpolationParams),
    preview: interpolateTemplateText(baseTemplate.preview, interpolationParams),
    greeting: interpolateTemplateText(baseTemplate.greeting, interpolationParams),
    intro: interpolateTemplateText(baseTemplate.intro, interpolationParams),
    ctaLabel: interpolateTemplateText(baseTemplate.ctaLabel, interpolationParams),
    ignoreNotice: interpolateTemplateText(
      baseTemplate.ignoreNotice,
      interpolationParams
    ),
    footer: interpolateTemplateText(baseTemplate.footer, interpolationParams),
    codeLabel: baseTemplate.codeLabel
      ? interpolateTemplateText(baseTemplate.codeLabel, interpolationParams)
      : "",
    closing: baseTemplate.closing
      ? interpolateTemplateText(baseTemplate.closing, interpolationParams)
      : "",
    actionLink: "{{ .ConfirmationURL }}",
    otpCode: "{{ .Token }}",
  };

  return {
    subject: translation.subject,
    html: renderHtmlEmail(translation, options),
    text: renderTextEmail(translation, options),
  };
}

function buildLocaleConditional(variantsByLocale, locales, fallbackLocale) {
  const availableLocales = locales.filter((locale) => variantsByLocale[locale]);
  if (availableLocales.length === 0) {
    throw new Error("No localized variants were generated.");
  }

  if (!availableLocales.includes(fallbackLocale)) {
    availableLocales.push(fallbackLocale);
  }

  const nonFallbackLocales = availableLocales.filter(
    (locale) => locale !== fallbackLocale
  );

  if (nonFallbackLocales.length === 0) {
    return variantsByLocale[fallbackLocale];
  }

  let content = "";
  nonFallbackLocales.forEach((locale, index) => {
    const prefix =
      index === 0
        ? `{{ if eq ${DATA_LOCALE_FIELD} "${locale}" }}`
        : `{{ else if eq ${DATA_LOCALE_FIELD} "${locale}" }}`;
    content += `${prefix}\n${variantsByLocale[locale]}\n`;
  });

  const fallbackContent =
    variantsByLocale[fallbackLocale] ?? variantsByLocale[nonFallbackLocales[0]];
  content += `{{ else }}\n${fallbackContent}\n{{ end }}`;
  return content;
}

function main() {
  const repoRoot = findRepoRoot(__dirname);
  const packageRoot = path.resolve(__dirname, "..");
  const fallbackLocale = normalizeLocale(
    getArgValue("--fallback-locale") ||
      process.env.SUPABASE_EMAIL_TEMPLATE_FALLBACK_LOCALE ||
      DEFAULT_LOCALE,
    DEFAULT_LOCALE
  );
  const selectedLocales = parseLocales(
    getArgValue("--locales") || process.env.SUPABASE_EMAIL_TEMPLATE_LOCALES,
    fallbackLocale
  );

  const outputPathRaw =
    getArgValue("--output") || process.env.SUPABASE_EMAIL_TEMPLATE_OUTPUT;
  const outputPath = outputPathRaw
    ? path.isAbsolute(outputPathRaw)
      ? outputPathRaw
      : path.resolve(process.cwd(), outputPathRaw)
    : path.join(
        repoRoot,
        "packages",
        "auth",
        "infra",
        "email",
        "out",
        "supabase-auth-templates.local.json"
      );

  const eventMappings = [
    {
      event: "confirmation",
      template: "confirm-signup-email",
      includeCode: true,
      style: STYLE_BY_EVENT.confirmation,
    },
    {
      event: "invite",
      template: "invite-email",
      includeCode: false,
      style: STYLE_BY_EVENT.invite,
    },
    {
      event: "magic_link",
      template: "magic-link-email",
      includeCode: true,
      style: STYLE_BY_EVENT.magic_link,
    },
    {
      event: "email_change",
      template: "change-email-email",
      includeCode: true,
      style: STYLE_BY_EVENT.email_change,
    },
    {
      event: "recovery",
      template: "reset-password-email",
      includeCode: true,
      style: STYLE_BY_EVENT.recovery,
    },
    {
      event: "reauthentication",
      template: "reauthentication-email",
      includeCode: true,
      style: STYLE_BY_EVENT.reauthentication,
    },
  ];

  const payload = {};
  for (const mapping of eventMappings) {
    const subjectByLocale = {};
    const htmlByLocale = {};

    for (const locale of selectedLocales) {
      if (!SUPPORTED_LOCALES.includes(locale)) {
        continue;
      }

      const variant = buildTemplateVariant(
        packageRoot,
        locale,
        mapping.template,
        {
          includeCode: mapping.includeCode,
          includeActionLink: true,
          style: mapping.style,
        }
      );
      subjectByLocale[locale] = variant.subject;
      htmlByLocale[locale] = variant.html;
    }

    payload[`mailer_subjects_${mapping.event}`] = buildLocaleConditional(
      subjectByLocale,
      selectedLocales,
      fallbackLocale
    );
    payload[`mailer_templates_${mapping.event}_content`] = buildLocaleConditional(
      htmlByLocale,
      selectedLocales,
      fallbackLocale
    );
  }

  const accountDeleteByLocale = {};
  for (const locale of selectedLocales) {
    const variant = buildTemplateVariant(
      packageRoot,
      locale,
      "account-delete-email",
      {
        includeCode: false,
        includeActionLink: true,
        style: STYLE_BY_EVENT.account_delete,
      }
    );
    accountDeleteByLocale[locale] = {
      subject: variant.subject,
      html: variant.html,
      text: variant.text,
    };
  }

  const output = {
    generatedAt: new Date().toISOString(),
    selectedLocales,
    fallbackLocale,
    localeSelector: `{{ ${DATA_LOCALE_FIELD} }}`,
    payload,
    customTemplates: {
      accountDeleteEmail: accountDeleteByLocale,
    },
  };

  ensureDirectory(path.dirname(outputPath));
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("Supabase Auth email template payload generated.");
  console.log(`- Locales: ${selectedLocales.join(", ")}`);
  console.log(`- Fallback locale: ${fallbackLocale}`);
  console.log(`- Locale selector: {{ ${DATA_LOCALE_FIELD} }}`);
  console.log(`- Output: ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error("Email template payload generation failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

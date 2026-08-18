#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const SMTP_PASS_FIELD = "smtp" + "_pass";

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

function normalizeEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = normalizeEnvValue(trimmed.slice(separatorIndex + 1));

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const repoRoot = findRepoRoot(__dirname);
loadDotEnvFile(path.join(repoRoot, ".env"));
loadDotEnvFile(path.join(repoRoot, "packages", "auth", ".env"));

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1 || index + 1 >= process.argv.length) {
    return null;
  }

  return process.argv[index + 1];
}

function resolveConfigPath() {
  const argPath = getArgValue("--config");
  const envPath = process.env.EMAIL_CONFIG_PATH;
  const rawPath = argPath || envPath;

  if (rawPath) {
    if (path.isAbsolute(rawPath)) {
      return rawPath;
    }
    return path.resolve(process.cwd(), rawPath);
  }

  const emailConfigPath = path.resolve(__dirname, "..", "config.local.json");
  if (fs.existsSync(emailConfigPath)) {
    return emailConfigPath;
  }

  return emailConfigPath;
}

function ensureRequiredKeys(config, keys, contextLabel = "config") {
  const missing = keys.filter((key) => {
    const value = config[key];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missing.length > 0) {
    throw new Error(`Missing required ${contextLabel} keys: ${missing.join(", ")}`);
  }
}

function loadConfig(requiredKeys = [], options = {}) {
  const { allowMissing = false } = options;
  const configPath = resolveConfigPath();

  if (!fs.existsSync(configPath)) {
    if (allowMissing) {
      return {
        config: {},
        configPath: null,
      };
    }

    throw new Error(
      `Missing email config file at ${configPath}. Copy infra/email/config.example.json to infra/email/config.local.json.`
    );
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Invalid JSON in email config file ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  ensureRequiredKeys(config, requiredKeys, "email config");

  return {
    config,
    configPath,
  };
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeJson(filePath, payload) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeText(filePath, contents) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, "utf8");
}

function getOutputDirectory() {
  return path.resolve(__dirname, "..", "out");
}

function maskValue(value) {
  if (!value) {
    return "";
  }

  if (value.length <= 6) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function firstNonEmpty(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function parseProvider(value) {
  const normalized = (value || "tlao").trim().toLowerCase();
  if (normalized === "tlao" || normalized === "postmark") {
    return normalized;
  }

  throw new Error(
    `Unsupported email provider "${value}". Allowed values: tlao, postmark.`
  );
}

function parseProviderList(value) {
  if (Array.isArray(value)) {
    return value.map(parseProvider);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .map(parseProvider);
}

function parsePort(rawValue, defaultPort) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
    return defaultPort;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid SMTP port value: ${rawValue}`);
  }

  return parsed;
}

function getSupabaseToken() {
  return process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MANAGEMENT_TOKEN || "";
}

function getSupabaseProjectRef(config) {
  return firstNonEmpty([process.env.SUPABASE_PROJECT_REF, config.supabaseProjectRef]);
}

function resolveCommonFields(config) {
  const fromEmail = firstNonEmpty([
    process.env.EMAIL_FROM,
    process.env.SUPABASE_SMTP_ADMIN_EMAIL,
    config.fromEmail,
  ]);

  const senderName = firstNonEmpty([
    process.env.EMAIL_SENDER_NAME,
    process.env.SUPABASE_SMTP_SENDER_NAME,
    config.senderName,
  ]);

  const maxFrequencyRaw = firstNonEmpty([
    process.env.SUPABASE_SMTP_MAX_FREQUENCY,
    config.supabaseSmtpMaxFrequencySeconds,
    45,
  ]);

  if (!fromEmail) {
    throw new Error("Missing sender email. Set fromEmail in config or EMAIL_FROM in env.");
  }

  if (!senderName) {
    throw new Error(
      "Missing sender name. Set senderName in config or EMAIL_SENDER_NAME in env."
    );
  }

  const smtpMaxFrequency = Number(maxFrequencyRaw);
  if (!Number.isFinite(smtpMaxFrequency) || smtpMaxFrequency <= 0) {
    throw new Error(`Invalid smtp_max_frequency value: ${maxFrequencyRaw}`);
  }

  return {
    smtp_admin_email: fromEmail,
    smtp_sender_name: senderName,
    smtp_max_frequency: smtpMaxFrequency,
  };
}

function resolvePostmarkProvider(config) {
  const providerConfig = config.postmark || {};

  const smtpHost = firstNonEmpty([
    process.env.POSTMARK_SMTP_HOST,
    providerConfig.smtpHost,
    "smtp-broadcasts.postmarkapp.com",
  ]);

  const smtpPort = parsePort(
    firstNonEmpty([process.env.POSTMARK_SMTP_PORT, providerConfig.smtpPort, 587]),
    587
  );

  const accessKey = firstNonEmpty([
    process.env.POSTMARK_SMTP_ACCESS_KEY,
    providerConfig.accessKey,
  ]);
  const secretKey = firstNonEmpty([
    process.env.POSTMARK_SMTP_SECRET_KEY,
    providerConfig.secretKey,
  ]);
  const explicitUser = firstNonEmpty([
    process.env.POSTMARK_SMTP_USERNAME,
    providerConfig.username,
  ]);
  const explicitPass = firstNonEmpty([
    process.env.POSTMARK_SMTP_PASSWORD,
    providerConfig.password,
  ]);
  const serverToken = firstNonEmpty([
    process.env.POSTMARK_SERVER_TOKEN,
    process.env.POSTMARK_SERVER_API_TOKEN,
    process.env.POSTMARK_API_TOKEN,
    providerConfig.serverToken,
  ]);

  let smtpUser = "";
  let smtpPass = "";
  let credentialMode = "";

  if (accessKey && secretKey) {
    smtpUser = accessKey;
    smtpPass = secretKey;
    credentialMode = "smtp-token";
  } else if (explicitUser && explicitPass) {
    smtpUser = explicitUser;
    smtpPass = explicitPass;
    credentialMode = "username-password";
  } else if (serverToken) {
    smtpUser = explicitUser || serverToken;
    smtpPass = explicitPass || serverToken;
    credentialMode = "server-token";
  }

  if (!smtpUser || !smtpPass) {
    throw new Error(
      [
        "Postmark SMTP credentials are missing.",
        "Set one of the following:",
        "- POSTMARK_SMTP_ACCESS_KEY + POSTMARK_SMTP_SECRET_KEY",
        "- POSTMARK_SMTP_USERNAME + POSTMARK_SMTP_PASSWORD",
        "- POSTMARK_SERVER_TOKEN (or POSTMARK_SERVER_API_TOKEN / POSTMARK_API_TOKEN)",
      ].join("\n")
    );
  }

  return {
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    [SMTP_PASS_FIELD]: smtpPass,
    meta: {
      provider: "postmark",
      credentialMode,
    },
  };
}

function resolveTlaoProvider(config) {
  const providerConfig = config.tlao || {};
  const smtpHost = firstNonEmpty([
    process.env.TLAO_SMTP_HOST,
    providerConfig.host,
    providerConfig.smtpHost,
    'mail.xn--tlo-fla.com',
  ]);
  const smtpPort = parsePort(
    firstNonEmpty([
      process.env.TLAO_SMTP_PORT,
      providerConfig.port,
      providerConfig.smtpPort,
      587,
    ]),
    587
  );
  const smtpUser = firstNonEmpty([process.env.TLAO_SMTP_USERNAME, providerConfig.username]);
  const smtpPass = firstNonEmpty([process.env.TLAO_SMTP_PASSWORD, providerConfig.password]);

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      'Tláo SMTP credentials are missing. Set TLAO_SMTP_HOST, TLAO_SMTP_USERNAME, and TLAO_SMTP_PASSWORD.'
    );
  }

  return {
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    [SMTP_PASS_FIELD]: smtpPass,
    meta: {
      provider: 'tlao',
      credentialMode: 'username-password',
    },
  };
}

function buildSupabaseSmtpConfig(config) {
  const provider = parseProvider(
    firstNonEmpty([process.env.EMAIL_SMTP_PROVIDER, config.provider, "tlao"])
  );

  const commonFields = resolveCommonFields(config);
  const fallbackProviders = parseProviderList(
    process.env.EMAIL_SMTP_FALLBACK_PROVIDERS || config.fallbackProviders
  );
  const providers = [...new Set([provider, ...fallbackProviders])];
  let lastError;

  for (const candidate of providers) {
    try {
      const providerFields =
        candidate === 'tlao'
          ? resolveTlaoProvider(config)
          : resolvePostmarkProvider(config);

      return {
        provider: candidate,
        payload: {
          ...commonFields,
          smtp_host: providerFields.smtp_host,
          smtp_port: String(providerFields.smtp_port),
          smtp_user: providerFields.smtp_user,
          [SMTP_PASS_FIELD]: providerFields[SMTP_PASS_FIELD],
        },
        meta: providerFields.meta,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

module.exports = {
  buildSupabaseSmtpConfig,
  getOutputDirectory,
  getSupabaseProjectRef,
  getSupabaseToken,
  loadConfig,
  maskValue,
  writeJson,
  writeText,
};

#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

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
loadDotEnvFile(path.join(repoRoot, ".env.local"));
loadDotEnvFile(path.join(repoRoot, "packages", "auth", ".env"));
loadDotEnvFile(path.join(repoRoot, "packages", "auth", ".env.local"));

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

  // Backward compatibility with previous SES-only setup.
  return path.resolve(__dirname, "..", "..", "ses", "config.local.json");
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

function deriveSesSmtpPassword(secretAccessKey, region) {
  const initialKey = Buffer.from(`AWS4${secretAccessKey}`, "utf8");
  const dateKey = crypto
    .createHmac("sha256", initialKey)
    .update("11111111", "utf8")
    .digest();
  const regionKey = crypto
    .createHmac("sha256", dateKey)
    .update(region, "utf8")
    .digest();
  const serviceKey = crypto
    .createHmac("sha256", regionKey)
    .update("ses", "utf8")
    .digest();
  const signingKey = crypto
    .createHmac("sha256", serviceKey)
    .update("aws4_request", "utf8")
    .digest();
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update("SendRawEmail", "utf8")
    .digest();

  return Buffer.concat([Buffer.from([0x04]), signature]).toString("base64");
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
  const normalized = (value || "postmark").trim().toLowerCase();
  if (normalized === "postmark" || normalized === "ses") {
    return normalized;
  }

  throw new Error(
    `Unsupported email provider "${value}". Allowed values: postmark, ses.`
  );
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
    smtp_pass: smtpPass,
    meta: {
      provider: "postmark",
      credentialMode,
    },
  };
}

function resolveSesProvider(config) {
  const providerConfig = config.ses || {};

  const region = firstNonEmpty([
    process.env.AWS_REGION,
    process.env.AWS_DEFAULT_REGION,
    providerConfig.awsRegion,
    config.awsRegion,
    "us-east-1",
  ]);

  const smtpHost = firstNonEmpty([
    process.env.AWS_SES_SMTP_HOST,
    providerConfig.smtpHost,
    `email-smtp.${region}.amazonaws.com`,
  ]);

  const smtpPort = parsePort(
    firstNonEmpty([process.env.AWS_SES_SMTP_PORT, providerConfig.smtpPort, 587]),
    587
  );

  const smtpUser = firstNonEmpty([
    process.env.AWS_SES_SMTP_ACCESS_KEY_ID,
    process.env.AWS_ACCESS_KEY_ID,
    process.env.AWS_KEY_ID,
    providerConfig.smtpUser,
    config.awsAccessKeyId,
  ]);

  const directPassword = firstNonEmpty([
    process.env.AWS_SES_SMTP_PASSWORD,
    providerConfig.smtpPassword,
  ]);

  const secretAccessKey = firstNonEmpty([
    process.env.AWS_SES_SMTP_SECRET_ACCESS_KEY,
    process.env.AWS_SECRET_ACCESS_KEY,
    providerConfig.smtpSecretAccessKey,
    config.awsSecretAccessKey,
  ]);

  let smtpPass = directPassword;
  let credentialMode = directPassword ? "precomputed-password" : "";

  if (!smtpPass && smtpUser && secretAccessKey) {
    smtpPass = deriveSesSmtpPassword(secretAccessKey, region);
    credentialMode = "derived-from-secret";
  }

  if (!smtpUser || !smtpPass) {
    throw new Error(
      [
        "SES SMTP credentials are missing.",
        "Set one of the following:",
        "- AWS_SES_SMTP_ACCESS_KEY_ID + AWS_SES_SMTP_PASSWORD",
        "- AWS_SES_SMTP_ACCESS_KEY_ID + AWS_SES_SMTP_SECRET_ACCESS_KEY",
        "- AWS_ACCESS_KEY_ID/AWS_KEY_ID + AWS_SECRET_ACCESS_KEY",
      ].join("\n")
    );
  }

  return {
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    smtp_pass: smtpPass,
    meta: {
      provider: "ses",
      region,
      credentialMode,
    },
  };
}

function buildSupabaseSmtpConfig(config) {
  const provider = parseProvider(
    firstNonEmpty([process.env.EMAIL_SMTP_PROVIDER, config.provider, "postmark"])
  );

  const commonFields = resolveCommonFields(config);
  const providerFields =
    provider === "postmark" ? resolvePostmarkProvider(config) : resolveSesProvider(config);

  return {
    provider,
    payload: {
      ...commonFields,
      smtp_host: providerFields.smtp_host,
      smtp_port: String(providerFields.smtp_port),
      smtp_user: providerFields.smtp_user,
      smtp_pass: providerFields.smtp_pass,
    },
    meta: providerFields.meta,
  };
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

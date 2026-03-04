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
  const envPath = process.env.SES_CONFIG_PATH;
  const rawPath = argPath || envPath;

  if (!rawPath) {
    return path.resolve(__dirname, "..", "config.local.json");
  }

  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }

  return path.resolve(process.cwd(), rawPath);
}

function loadConfig(requiredKeys = []) {
  const configPath = resolveConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Missing SES config file at ${configPath}. Copy config.example.json to config.local.json.`
    );
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Invalid JSON in SES config file ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  ensureRequiredKeys(config, requiredKeys, "SES config");

  return {
    config,
    configPath,
  };
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

function getAwsRegion(config) {
  return (
    config.awsRegion ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    "us-east-1"
  );
}

function getAwsCredentialMaterial(config) {
  const accessKeyId =
    process.env.AWS_SES_SMTP_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_KEY_ID ||
    config.awsAccessKeyId ||
    null;

  const secretAccessKey =
    process.env.AWS_SES_SMTP_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    config.awsSecretAccessKey ||
    null;

  const sessionToken =
    process.env.AWS_SESSION_TOKEN || config.awsSessionToken || null;

  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new Error(
      "Both AWS access key ID and AWS secret access key are required for static credential usage."
    );
  }

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: sessionToken || undefined,
  };
}

function getAwsClientConfig(config) {
  const region = getAwsRegion(config);
  const credentialMaterial = getAwsCredentialMaterial(config);

  if (!credentialMaterial) {
    return { region };
  }

  return {
    region,
    credentials: credentialMaterial,
  };
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

function maskValue(value) {
  if (!value) {
    return "";
  }

  if (value.length <= 6) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function withTrailingDot(value) {
  if (!value) {
    return value;
  }

  return value.endsWith(".") ? value : `${value}.`;
}

function formatRoute53Value(type, value) {
  if (type === "TXT") {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value;
    }

    return `"${value}"`;
  }

  if (type === "MX") {
    const [priority, host] = value.trim().split(/\s+/, 2);
    if (!priority || !host) {
      return value;
    }

    return `${priority} ${withTrailingDot(host)}`;
  }

  if (type === "CNAME") {
    return withTrailingDot(value);
  }

  return value;
}

function buildSesDnsRecords({ domain, region, dkimTokens, mailFromSubdomain }) {
  const records = [];

  for (const token of dkimTokens || []) {
    records.push({
      type: "CNAME",
      name: `${token}._domainkey.${domain}`,
      values: [`${token}.dkim.amazonses.com`],
      ttl: 300,
      purpose: "SES Easy DKIM",
    });
  }

  const mailFromDomain = `${mailFromSubdomain}.${domain}`;
  records.push({
    type: "MX",
    name: mailFromDomain,
    values: [`10 feedback-smtp.${region}.amazonses.com`],
    ttl: 300,
    purpose: "SES custom MAIL FROM",
  });

  records.push({
    type: "TXT",
    name: mailFromDomain,
    values: ["v=spf1 include:amazonses.com ~all"],
    ttl: 300,
    purpose: "SPF for custom MAIL FROM",
  });

  return records;
}

function getSupabaseToken() {
  return process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MANAGEMENT_TOKEN || "";
}

module.exports = {
  buildSesDnsRecords,
  deriveSesSmtpPassword,
  ensureDirectory,
  ensureRequiredKeys,
  formatRoute53Value,
  getArgValue,
  getAwsClientConfig,
  getAwsCredentialMaterial,
  getAwsRegion,
  getOutputDirectory,
  getSupabaseToken,
  loadConfig,
  maskValue,
  repoRoot,
  withTrailingDot,
  writeJson,
  writeText,
};

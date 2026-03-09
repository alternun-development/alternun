#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  getOutputDirectory,
  getSupabaseProjectRef,
  getSupabaseToken,
  loadConfig,
  writeJson,
} = require("./common.cjs");

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1 || index + 1 >= process.argv.length) {
    return null;
  }

  return process.argv[index + 1];
}

function getTemplatePayloadPath() {
  const value =
    getArgValue("--input") ||
    process.env.SUPABASE_EMAIL_TEMPLATE_PAYLOAD ||
    path.join(getOutputDirectory(), "supabase-auth-templates.local.json");

  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(process.cwd(), value);
}

function parseTemplatePayload(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Template payload file not found: ${filePath}. Generate it first with pnpm --filter @alternun/auth email:templates:generate`
    );
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Invalid JSON in template payload file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const payload = raw && typeof raw.payload === "object" ? raw.payload : raw;
  if (!payload || typeof payload !== "object") {
    throw new Error(`Template payload in ${filePath} is empty or invalid.`);
  }

  const keys = Object.keys(payload).filter((key) =>
    key.startsWith("mailer_")
  );
  if (keys.length === 0) {
    throw new Error(
      `No Supabase mailer keys found in ${filePath}. Expected keys like mailer_templates_invite_content.`
    );
  }

  return {
    payload,
    keys,
    metadata:
      raw && typeof raw === "object"
        ? {
            generatedAt: raw.generatedAt ?? null,
            selectedLocales: raw.selectedLocales ?? null,
            fallbackLocale: raw.fallbackLocale ?? null,
          }
        : {},
  };
}

async function main() {
  const { config, configPath } = loadConfig([], { allowMissing: true });

  const accessToken = getSupabaseToken();
  if (!accessToken) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN (or SUPABASE_MANAGEMENT_TOKEN) is required."
    );
  }

  const projectRef = getSupabaseProjectRef(config);
  if (!projectRef) {
    throw new Error(
      "Supabase project ref is missing. Set supabaseProjectRef in config.local.json or SUPABASE_PROJECT_REF in env."
    );
  }

  const payloadPath = getTemplatePayloadPath();
  const { payload, keys, metadata } = parseTemplatePayload(payloadPath);

  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Supabase template config update failed (${response.status}): ${responseText}`
    );
  }

  let parsedResponse = {};
  try {
    parsedResponse = responseText ? JSON.parse(responseText) : {};
  } catch {
    parsedResponse = { raw: responseText };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    configPath,
    payloadPath,
    endpoint,
    projectRef,
    updatedKeys: keys,
    templateMetadata: metadata,
    response: parsedResponse,
  };

  const outputPath = path.join(
    getOutputDirectory(),
    "supabase-template-sync-report.local.json"
  );
  writeJson(outputPath, report);

  console.log("Supabase Auth email template sync complete.");
  console.log(`- Project ref: ${projectRef}`);
  console.log(`- Updated keys: ${keys.length}`);
  console.log(`- Payload source: ${payloadPath}`);
  console.log(`- Output report: ${outputPath}`);
}

main().catch((error) => {
  console.error("Supabase Auth template sync failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

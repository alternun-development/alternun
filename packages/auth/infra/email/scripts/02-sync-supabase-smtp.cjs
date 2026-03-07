#!/usr/bin/env node

const path = require("path");
const {
  buildSupabaseSmtpConfig,
  getOutputDirectory,
  getSupabaseProjectRef,
  getSupabaseToken,
  loadConfig,
  maskValue,
  writeJson,
} = require("./common.cjs");

async function main() {
  const { config, configPath } = loadConfig();
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

  const resolved = buildSupabaseSmtpConfig(config);
  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resolved.payload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Supabase config update failed (${response.status}): ${responseText}`
    );
  }

  let parsedResponse = {};
  try {
    parsedResponse = responseText ? JSON.parse(responseText) : {};
  } catch {
    parsedResponse = {
      raw: responseText,
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    configPath,
    endpoint,
    projectRef,
    provider: resolved.provider,
    payload: {
      ...resolved.payload,
      smtp_pass: maskValue(resolved.payload.smtp_pass),
    },
    response: parsedResponse,
  };

  const outputPath = path.join(
    getOutputDirectory(),
    "supabase-sync-report.local.json"
  );
  writeJson(outputPath, report);

  console.log("Supabase SMTP config update complete.");
  console.log(`- Project ref: ${projectRef}`);
  console.log(`- Provider: ${resolved.provider}`);
  console.log(`- SMTP host: ${resolved.payload.smtp_host}:${resolved.payload.smtp_port}`);
  console.log(`- SMTP user: ${resolved.payload.smtp_user}`);
  console.log(`- SMTP pass: ${maskValue(resolved.payload.smtp_pass)}`);
  console.log(`- Output report: ${outputPath}`);
}

main().catch((error) => {
  console.error("Supabase SMTP sync failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

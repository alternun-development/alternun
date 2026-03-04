#!/usr/bin/env node

const path = require("path");
const {
  deriveSesSmtpPassword,
  getAwsCredentialMaterial,
  getAwsRegion,
  getOutputDirectory,
  getSupabaseToken,
  loadConfig,
  maskValue,
  writeJson,
} = require("./common.cjs");

function buildSupabasePayload(config, credentialMaterial) {
  const region = getAwsRegion(config);
  const smtpPassword = deriveSesSmtpPassword(
    credentialMaterial.secretAccessKey,
    region
  );

  return {
    smtp_admin_email: config.fromEmail,
    smtp_host: config.smtpHost || `email-smtp.${region}.amazonaws.com`,
    smtp_port: String(config.smtpPort || 587),
    smtp_user: credentialMaterial.accessKeyId,
    smtp_pass: smtpPassword,
    smtp_sender_name: config.senderName,
    smtp_max_frequency: Number(config.supabaseSmtpMaxFrequencySeconds || 45),
  };
}

async function main() {
  const { config, configPath } = loadConfig([
    "awsRegion",
    "fromEmail",
    "senderName",
  ]);

  const credentialMaterial = getAwsCredentialMaterial(config);
  if (!credentialMaterial) {
    throw new Error(
      "AWS credentials not found for SMTP derivation. Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY."
    );
  }

  const accessToken = getSupabaseToken();
  if (!accessToken) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN (or SUPABASE_MANAGEMENT_TOKEN) is required."
    );
  }

  const projectRef =
    process.env.SUPABASE_PROJECT_REF || config.supabaseProjectRef || "";
  if (!projectRef.trim()) {
    throw new Error(
      "Supabase project ref is missing. Set supabaseProjectRef in config.local.json or SUPABASE_PROJECT_REF in env."
    );
  }

  const payload = buildSupabasePayload(config, credentialMaterial);
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
    payload: {
      ...payload,
      smtp_pass: maskValue(payload.smtp_pass),
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
  console.log(`- SMTP host: ${payload.smtp_host}:${payload.smtp_port}`);
  console.log(`- SMTP user: ${payload.smtp_user}`);
  console.log(`- SMTP pass: ${maskValue(payload.smtp_pass)}`);
  console.log(`- Output report: ${outputPath}`);
}

main().catch((error) => {
  console.error("Supabase SMTP sync failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

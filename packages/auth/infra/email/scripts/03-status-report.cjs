#!/usr/bin/env node

const path = require('path');
const {
  getOutputDirectory,
  getSupabaseProjectRef,
  getSupabaseToken,
  loadConfig,
  writeJson,
} = require('./common.cjs');

function inferProviderFromHost(smtpHost) {
  const host = normalizeHostname(smtpHost);
  if (matchesHostname(host, 'postmarkapp.com')) {
    return 'postmark';
  }
  if (matchesHostname(host, 'amazonaws.com')) {
    return 'ses';
  }
  if (!host) {
    return 'unknown';
  }
  return 'custom';
}

function normalizeHostname(value) {
  if (!value) {
    return '';
  }

  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) {
    return '';
  }

  try {
    return new URL(trimmed.includes('://') ? trimmed : `smtp://${trimmed}`).hostname;
  } catch {
    return trimmed.replace(/^[^a-z0-9]+|[^a-z0-9.-]+$/g, '');
  }
}

function matchesHostname(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

async function main() {
  const { config, configPath } = loadConfig([], { allowMissing: true });
  const accessToken = getSupabaseToken();
  if (!accessToken) {
    throw new Error('SUPABASE_ACCESS_TOKEN (or SUPABASE_MANAGEMENT_TOKEN) is required.');
  }

  const projectRef = getSupabaseProjectRef(config);
  if (!projectRef) {
    throw new Error(
      'Supabase project ref is missing. Set supabaseProjectRef in config.local.json or SUPABASE_PROJECT_REF in env.'
    );
  }

  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const raw = await response.text();
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { raw };
  }

  if (!response.ok) {
    throw new Error(`Supabase auth config fetch failed (${response.status}): ${raw}`);
  }

  const authConfig = {
    smtp_admin_email: parsed.smtp_admin_email,
    smtp_host: parsed.smtp_host,
    smtp_port: parsed.smtp_port,
    smtp_user: parsed.smtp_user,
    smtp_sender_name: parsed.smtp_sender_name,
    smtp_max_frequency: parsed.smtp_max_frequency,
  };

  const provider = inferProviderFromHost(authConfig.smtp_host);

  const report = {
    generatedAt: new Date().toISOString(),
    configPath,
    projectRef,
    provider,
    authConfig,
  };

  const outputPath = path.join(getOutputDirectory(), 'status-report.json');
  writeJson(outputPath, report);

  console.log('Supabase SMTP status report generated.');
  console.log(`- Project ref: ${projectRef}`);
  console.log(`- Detected provider: ${provider}`);
  console.log(`- SMTP host: ${authConfig.smtp_host}:${authConfig.smtp_port}`);
  console.log(`- SMTP user: ${authConfig.smtp_user}`);
  console.log(`- Output: ${outputPath}`);
}

main().catch(error => {
  console.error('Status report generation failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

#!/usr/bin/env node

const {
  GetAccountCommand,
  GetEmailIdentityCommand,
  SESv2Client,
} = require("@aws-sdk/client-sesv2");
const path = require("path");
const {
  getAwsClientConfig,
  getAwsRegion,
  getOutputDirectory,
  getSupabaseToken,
  loadConfig,
  writeJson,
} = require("./common.cjs");

async function getIdentity(client, emailIdentity) {
  try {
    return await client.send(
      new GetEmailIdentityCommand({
        EmailIdentity: emailIdentity,
      })
    );
  } catch (error) {
    if (error && error.name === "NotFoundException") {
      return null;
    }

    throw error;
  }
}

async function getSupabaseAuthConfig(projectRef, accessToken) {
  if (!projectRef || !accessToken) {
    return {
      skipped: true,
      reason: "Missing projectRef or Supabase management token.",
    };
  }

  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const raw = await response.text();
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {
      raw,
    };
  }

  if (!response.ok) {
    return {
      skipped: false,
      ok: false,
      status: response.status,
      body: parsed,
    };
  }

  return {
    skipped: false,
    ok: true,
    status: response.status,
    body: {
      smtp_admin_email: parsed.smtp_admin_email,
      smtp_host: parsed.smtp_host,
      smtp_port: parsed.smtp_port,
      smtp_user: parsed.smtp_user,
      smtp_sender_name: parsed.smtp_sender_name,
      smtp_max_frequency: parsed.smtp_max_frequency,
    },
  };
}

async function main() {
  const { config, configPath } = loadConfig(["awsRegion", "domain", "fromEmail"]);

  const region = getAwsRegion(config);
  const domain = config.domain.trim().toLowerCase();
  const fromEmail = config.fromEmail.trim().toLowerCase();
  const projectRef =
    process.env.SUPABASE_PROJECT_REF || config.supabaseProjectRef || "";
  const supabaseToken = getSupabaseToken();

  const sesClient = new SESv2Client(getAwsClientConfig(config));

  const account = await sesClient.send(new GetAccountCommand({}));
  const domainIdentity = await getIdentity(sesClient, domain);
  const fromEmailIdentity = await getIdentity(sesClient, fromEmail);
  const supabaseAuthConfig = await getSupabaseAuthConfig(projectRef, supabaseToken);

  const report = {
    generatedAt: new Date().toISOString(),
    configPath,
    region,
    sesAccount: {
      productionAccessEnabled: account.ProductionAccessEnabled,
      sendingEnabled: account.SendingEnabled,
      suppressionAttributes: account.SuppressionAttributes || null,
      details: account.Details || null,
    },
    identities: {
      domain: {
        emailIdentity: domain,
        exists: Boolean(domainIdentity),
        verificationStatus: domainIdentity?.VerificationStatus || null,
        dkimStatus: domainIdentity?.DkimAttributes?.Status || null,
        dkimTokens: domainIdentity?.DkimAttributes?.Tokens || [],
      },
      fromEmail: {
        emailIdentity: fromEmail,
        exists: Boolean(fromEmailIdentity),
        verificationStatus: fromEmailIdentity?.VerificationStatus || null,
      },
    },
    supabase: {
      projectRef: projectRef || null,
      authConfig: supabaseAuthConfig,
    },
  };

  const outputPath = path.join(getOutputDirectory(), "status-report.json");
  writeJson(outputPath, report);

  console.log("SES status report generated.");
  console.log(`- Output: ${outputPath}`);
  console.log(
    `- SES production access: ${String(report.sesAccount.productionAccessEnabled)}`
  );
  console.log(
    `- Domain verification: ${report.identities.domain.verificationStatus || "MISSING"}`
  );
  console.log(
    `- From-email verification: ${report.identities.fromEmail.verificationStatus || "MISSING"}`
  );
  if (projectRef) {
    console.log(`- Supabase project ref: ${projectRef}`);
  }
}

main().catch((error) => {
  console.error("Status report generation failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

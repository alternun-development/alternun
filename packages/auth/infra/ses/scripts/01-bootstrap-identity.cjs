#!/usr/bin/env node

const {
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand,
  SESv2Client,
} = require("@aws-sdk/client-sesv2");
const path = require("path");
const {
  buildSesDnsRecords,
  getAwsClientConfig,
  getAwsRegion,
  getOutputDirectory,
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

async function ensureIdentity(client, emailIdentity) {
  const existing = await getIdentity(client, emailIdentity);
  if (existing) {
    return {
      created: false,
      details: existing,
    };
  }

  await client.send(
    new CreateEmailIdentityCommand({
      EmailIdentity: emailIdentity,
    })
  );

  const details = await getIdentity(client, emailIdentity);

  return {
    created: true,
    details,
  };
}

async function main() {
  const { config, configPath } = loadConfig([
    "awsRegion",
    "domain",
    "fromEmail",
    "senderName",
  ]);

  const domain = config.domain.trim().toLowerCase();
  const fromEmail = config.fromEmail.trim().toLowerCase();
  const senderName = config.senderName.trim();
  const mailFromSubdomain = (config.mailFromSubdomain || "mail")
    .trim()
    .toLowerCase();
  const mailFromDomain = `${mailFromSubdomain}.${domain}`;
  const region = getAwsRegion(config);

  const sesClient = new SESv2Client(getAwsClientConfig(config));

  const domainResult = await ensureIdentity(sesClient, domain);
  const fromEmailResult = await ensureIdentity(sesClient, fromEmail);

  await sesClient.send(
    new PutEmailIdentityMailFromAttributesCommand({
      EmailIdentity: domain,
      MailFromDomain: mailFromDomain,
      BehaviorOnMxFailure: "USE_DEFAULT_VALUE",
    })
  );

  const domainDetails = await getIdentity(sesClient, domain);
  const fromEmailDetails = await getIdentity(sesClient, fromEmail);
  const dkimTokens = domainDetails?.DkimAttributes?.Tokens || [];
  const dnsRecords = buildSesDnsRecords({
    domain,
    region,
    dkimTokens,
    mailFromSubdomain,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    configPath,
    region,
    domain,
    fromEmail,
    senderName,
    mailFromDomain,
    created: {
      domainIdentity: domainResult.created,
      fromEmailIdentity: fromEmailResult.created,
    },
    status: {
      domainVerificationStatus: domainDetails?.VerificationStatus || "UNKNOWN",
      domainDkimStatus: domainDetails?.DkimAttributes?.Status || "UNKNOWN",
      fromEmailVerificationStatus:
        fromEmailDetails?.VerificationStatus || "UNKNOWN",
    },
    dnsRecords,
  };

  const outputPath = path.join(getOutputDirectory(), "bootstrap-report.json");
  writeJson(outputPath, report);

  console.log("SES bootstrap complete.");
  console.log(`- Config: ${configPath}`);
  console.log(`- Region: ${region}`);
  console.log(`- Domain identity created: ${domainResult.created}`);
  console.log(`- From-email identity created: ${fromEmailResult.created}`);
  console.log(`- Domain verification status: ${report.status.domainVerificationStatus}`);
  console.log(`- DKIM status: ${report.status.domainDkimStatus}`);
  console.log(`- Output: ${outputPath}`);
  console.log("");
  console.log("Next:");
  console.log("1) Add/verify DNS records from bootstrap-report.json.");
  console.log("2) Optionally run ses:route53 if hosted in Route53.");
}

main().catch((error) => {
  console.error("SES bootstrap failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

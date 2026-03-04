#!/usr/bin/env node

const {
  ChangeResourceRecordSetsCommand,
  Route53Client,
} = require("@aws-sdk/client-route-53");
const {
  GetEmailIdentityCommand,
  SESv2Client,
} = require("@aws-sdk/client-sesv2");
const path = require("path");
const {
  buildSesDnsRecords,
  formatRoute53Value,
  getAwsClientConfig,
  getAwsRegion,
  getOutputDirectory,
  loadConfig,
  withTrailingDot,
  writeJson,
} = require("./common.cjs");

async function getDomainIdentity(client, domain) {
  try {
    return await client.send(
      new GetEmailIdentityCommand({
        EmailIdentity: domain,
      })
    );
  } catch (error) {
    if (error && error.name === "NotFoundException") {
      throw new Error(
        `SES domain identity ${domain} does not exist. Run ses:bootstrap first.`
      );
    }

    throw error;
  }
}

async function main() {
  const { config, configPath } = loadConfig(["awsRegion", "domain"]);

  if (!config.route53HostedZoneId) {
    console.log(
      "No route53HostedZoneId set in config.local.json; skipping Route53 upsert."
    );
    return;
  }

  const region = getAwsRegion(config);
  const domain = config.domain.trim().toLowerCase();
  const mailFromSubdomain = (config.mailFromSubdomain || "mail")
    .trim()
    .toLowerCase();
  const hostedZoneId = config.route53HostedZoneId.trim();

  const awsClientConfig = getAwsClientConfig(config);
  const sesClient = new SESv2Client(awsClientConfig);
  const route53Client = new Route53Client(awsClientConfig);

  const domainDetails = await getDomainIdentity(sesClient, domain);
  const dkimTokens = domainDetails?.DkimAttributes?.Tokens || [];

  if (dkimTokens.length === 0) {
    console.warn(
      "No DKIM tokens returned from SES yet. Route53 update will only include MAIL FROM records."
    );
  }

  const dnsRecords = buildSesDnsRecords({
    domain,
    region,
    dkimTokens,
    mailFromSubdomain,
  });

  const changes = dnsRecords.map((record) => ({
    Action: "UPSERT",
    ResourceRecordSet: {
      Name: withTrailingDot(record.name),
      Type: record.type,
      TTL: record.ttl || 300,
      ResourceRecords: record.values.map((value) => ({
        Value: formatRoute53Value(record.type, value),
      })),
    },
  }));

  const response = await route53Client.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Comment: `SES DNS bootstrap for ${domain}`,
        Changes: changes,
      },
    })
  );

  const report = {
    generatedAt: new Date().toISOString(),
    configPath,
    region,
    hostedZoneId,
    domain,
    appliedRecordCount: dnsRecords.length,
    route53Change: response.ChangeInfo || null,
    records: dnsRecords,
  };

  const outputPath = path.join(getOutputDirectory(), "route53-report.json");
  writeJson(outputPath, report);

  console.log("Route53 SES DNS upsert complete.");
  console.log(`- Config: ${configPath}`);
  console.log(`- Hosted zone: ${hostedZoneId}`);
  console.log(`- Records applied: ${dnsRecords.length}`);
  console.log(`- Output: ${outputPath}`);
}

main().catch((error) => {
  console.error("Route53 upsert failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

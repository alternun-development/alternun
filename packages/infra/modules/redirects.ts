/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable comma-dangle */

import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

type RouterDomainConfig =
  | string
  | {
      name: string;
      cert?: pulumi.Input<string>;
      redirects?: string[];
      aliases?: string[];
      dns?: unknown;
    };

type StageDomainConfig =
  | string
  | {
      name: string;
      cert?: string;
      redirects?: string[];
      aliases?: string[];
      dns?: unknown;
    };

interface RedirectDistributionArgs {
  transform?: unknown;
}

interface RedirectCdnArgs {
  transform?: {
    distribution?: (
      args: RedirectDistributionArgs,
      opts: pulumi.CustomResourceOptions,
      name: string
    ) => undefined;
  };
}

export interface DnsValidatedCertificateArgs {
  id: string;
  domainName: string;
  hostedZoneId: string;
  aliases?: string[];
}

export interface StageDomainRedirectArgs {
  stage: string;
  stageDomain: string;
  productionDomain: string;
  stageCertificateArn?: string;
  enableProductionToStageRedirect: boolean;
}

export interface ExternalDomainRedirectArgs {
  id: string;
  sourceDomain: string;
  targetDomain: string;
  certificateArn?: pulumi.Input<string>;
  redirects?: string[];
  aliases?: string[];
}

const PROTOCOL_PREFIX = /^https?:\/\//i;

function sanitizeDomain(value: string): string {
  return value.replace(PROTOCOL_PREFIX, '').replace(/\/+$/, '');
}

function buildAliases(aliases?: string[], suffix = ''): pulumi.Alias[] | undefined {
  if (!aliases || aliases.length === 0) {
    return undefined;
  }

  return aliases.map((name) => ({
    name: `${name}${suffix}`,
  }));
}

function appendAlias(opts: pulumi.CustomResourceOptions, aliasName: string): void {
  const aliases = Array.isArray(opts.aliases) ? (opts.aliases as Array<string | pulumi.Alias>) : [];
  if (
    aliases.some(
      (alias) => alias === aliasName || (typeof alias !== 'string' && alias.name === aliasName)
    )
  ) {
    return;
  }

  opts.aliases = [...aliases, { name: aliasName }];
}

function buildDomainConfig(
  domainName: string,
  certificateArn?: pulumi.Input<string>,
  redirects?: string[]
): RouterDomainConfig {
  const cleanRedirects = (redirects ?? [])
    .map((value) => sanitizeDomain(value))
    .filter(Boolean)
    .filter((value) => value !== sanitizeDomain(domainName));

  if (!certificateArn && cleanRedirects.length === 0) {
    return sanitizeDomain(domainName);
  }

  const domainConfig: { name: string; cert?: pulumi.Input<string>; redirects?: string[] } = {
    name: sanitizeDomain(domainName),
  };

  if (certificateArn) {
    domainConfig.cert = certificateArn;
  }

  if (cleanRedirects.length > 0) {
    domainConfig.redirects = cleanRedirects;
  }

  return domainConfig;
}

export function createDnsValidatedCertificate(
  args: DnsValidatedCertificateArgs
): pulumi.Output<string> {
  const certificateAliases = buildAliases(args.aliases);
  const certificate = new aws.acm.Certificate(
    `${args.id}`,
    {
      domainName: args.domainName,
      validationMethod: 'DNS',
    },
    certificateAliases ? { aliases: certificateAliases } : undefined
  );

  const certificateValidationRecordAliases = buildAliases(args.aliases, '-validation');
  const certificateValidationRecord = new aws.route53.Record(
    `${args.id}-validation`,
    {
      allowOverwrite: true,
      name: certificate.domainValidationOptions[0].resourceRecordName,
      records: [certificate.domainValidationOptions[0].resourceRecordValue],
      ttl: 60,
      type: certificate.domainValidationOptions[0].resourceRecordType,
      zoneId: args.hostedZoneId,
    },
    certificateValidationRecordAliases ? { aliases: certificateValidationRecordAliases } : undefined
  );

  const certificateValidationAliases = buildAliases(args.aliases, '-validation-complete');
  const certificateValidation = new aws.acm.CertificateValidation(
    `${args.id}-validation-complete`,
    {
      certificateArn: certificate.arn,
      validationRecordFqdns: [certificateValidationRecord.fqdn],
    },
    certificateValidationAliases ? { aliases: certificateValidationAliases } : undefined
  );

  return certificateValidation.certificateArn;
}

function buildRedirectInjection(targetUrl: string): string {
  return `
var redirectBase = ${JSON.stringify(targetUrl)};
var uri = event.request.uri || "/";
var querystring = event.request.querystring || {};
var queryParts = [];
var key;

for (key in querystring) {
  if (!Object.prototype.hasOwnProperty.call(querystring, key)) continue;

  var entry = querystring[key];
  var multiValue = entry && entry.multiValue;

  if (entry && multiValue && multiValue.length) {
    for (var i = 0; i < multiValue.length; i++) {
      var item = multiValue[i];
      if (item && typeof item.value === "string") {
        queryParts.push(key + "=" + item.value);
      }
    }
    continue;
  }

  if (entry && typeof entry.value === "string") {
    queryParts.push(key + "=" + entry.value);
  }
}

var query = queryParts.length > 0 ? "?" + queryParts.join("&") : "";

return {
  statusCode: 308,
  statusDescription: "Permanent Redirect",
  headers: {
    location: { value: redirectBase + uri + query },
    "cache-control": { value: "public, max-age=300" }
  }
};`;
}

export function buildStageDomainConfig(args: StageDomainRedirectArgs): StageDomainConfig {
  const stageDomain = sanitizeDomain(args.stageDomain);
  const productionDomain = sanitizeDomain(args.productionDomain);

  const redirects =
    args.stage === 'dev' && args.enableProductionToStageRedirect ? [productionDomain] : undefined;

  if (!args.stageCertificateArn && !redirects?.length) {
    return stageDomain;
  }

  const domainConfig: { name: string; cert?: string; redirects?: string[] } = {
    name: stageDomain,
  };

  if (args.stageCertificateArn) {
    domainConfig.cert = args.stageCertificateArn;
  }

  if (redirects?.length) {
    domainConfig.redirects = redirects;
  }

  return domainConfig;
}

function buildRedirectCdnTransform(
  legacyCdnName: string,
  legacyDistributionName: string
): (args: RedirectCdnArgs, opts: pulumi.CustomResourceOptions, name: string) => undefined {
  return (cdnArgs: RedirectCdnArgs, cdnOpts: pulumi.CustomResourceOptions): undefined => {
    appendAlias(cdnOpts, legacyCdnName);
    cdnArgs.transform = {
      ...(cdnArgs.transform ?? {}),
      distribution: (_distributionArgs: RedirectDistributionArgs, distributionOpts): undefined => {
        appendAlias(distributionOpts, legacyDistributionName);
        return undefined;
      },
    };
    return undefined;
  };
}

export function createExternalDomainRedirect(args: ExternalDomainRedirectArgs): void {
  const sourceDomain = sanitizeDomain(args.sourceDomain);
  const targetDomain = sanitizeDomain(args.targetDomain);
  const targetUrl = `https://${targetDomain}`;
  const routerAliases = buildAliases(args.aliases);
  const legacyId = args.id.replace('-redir-', '-domain-redirect-');
  const legacyCdnName = `${legacyId}Cdn`;
  const legacyDistributionName = `${legacyCdnName}Distribution`;

  new sst.aws.Router(
    args.id,
    {
      domain: buildDomainConfig(sourceDomain, args.certificateArn, args.redirects),
      routes: {
        '/*': {
          url: targetUrl,
          edge: {
            viewerRequest: {
              injection: buildRedirectInjection(targetUrl),
            },
          },
        },
      },
      transform: {
        cdn: buildRedirectCdnTransform(legacyCdnName, legacyDistributionName),
      },
    },
    routerAliases ? { aliases: routerAliases } : undefined
  );
}

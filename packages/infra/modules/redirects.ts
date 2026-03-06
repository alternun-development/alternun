/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable comma-dangle */

type DomainConfig = string | { name: string; cert?: string; redirects?: string[] };

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
  certificateArn?: string;
}

const PROTOCOL_PREFIX = /^https?:\/\//i;

function sanitizeDomain(value: string): string {
  return value.replace(PROTOCOL_PREFIX, '').replace(/\/+$/, '');
}

function buildDomainConfig(
  domainName: string,
  certificateArn?: string,
  redirects?: string[]
): DomainConfig {
  const cleanRedirects = (redirects ?? [])
    .map(value => sanitizeDomain(value))
    .filter(Boolean)
    .filter(value => value !== sanitizeDomain(domainName));

  if (!certificateArn && cleanRedirects.length === 0) {
    return sanitizeDomain(domainName);
  }

  const domainConfig: { name: string; cert?: string; redirects?: string[] } = {
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

export function buildStageDomainConfig(args: StageDomainRedirectArgs): DomainConfig {
  const stageDomain = sanitizeDomain(args.stageDomain);
  const productionDomain = sanitizeDomain(args.productionDomain);

  const redirects =
    args.stage === 'dev' && args.enableProductionToStageRedirect ? [productionDomain] : undefined;

  return buildDomainConfig(stageDomain, args.stageCertificateArn, redirects);
}

export function createExternalDomainRedirect(args: ExternalDomainRedirectArgs): void {
  const sourceDomain = sanitizeDomain(args.sourceDomain);
  const targetDomain = sanitizeDomain(args.targetDomain);
  const targetUrl = `https://${targetDomain}`;

  new sst.aws.Router(args.id, {
    domain: buildDomainConfig(sourceDomain, args.certificateArn),
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
  });
}

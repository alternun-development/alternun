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
const redirectBase = ${JSON.stringify(targetUrl)};
const uri = event.request.uri || "/";
const queryParts = [];

for (const [key, entry] of Object.entries(event.request.querystring || {})) {
  if (entry && Array.isArray(entry.multiValue)) {
    for (const item of entry.multiValue) {
      if (item && typeof item.value === "string") queryParts.push(key + "=" + item.value);
    }
    continue;
  }
  if (entry && typeof entry.value === "string") {
    queryParts.push(key + "=" + entry.value);
  }
}

const query = queryParts.length > 0 ? "?" + queryParts.join("&") : "";

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
      '/*': targetUrl,
    },
    edge: {
      viewerRequest: {
        injection: buildRedirectInjection(targetUrl),
      },
    },
  });
}

#!/usr/bin/env node
import tls from 'node:tls';
import { resolveCname } from 'node:dns/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

interface AcmCertificate {
  Type?: string;
  Status?: string;
  RenewalEligibility?: string;
  NotAfter?: string;
  RenewalSummary?: { RenewalStatus?: string };
  DomainValidationOptions?: Array<{
    DomainName?: string;
    ValidationMethod?: string;
    ResourceRecord?: { Name?: string; Type?: string; Value?: string };
  }>;
}
interface Distributions {
  DistributionList?: {
    Items?: Array<{
      Aliases?: { Items?: string[] };
      ViewerCertificate?: { ACMCertificateArn?: string };
    }>;
  };
}
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';
const execFileAsync = promisify(execFile);
export const defaultHosts = [
  'airs.alternun.co',
  'testnet.airs.alternun.co',
  'testnet.admin.alternun.co',
  'testnet.alternun.co',
  'admin.alternun.co',
  'ed.alternun.co',
];

export function checkExpiry(
  expiry: string | undefined,
  minimumDays = 30,
  now = Date.now()
): string {
  const expiresAt = Date.parse(expiry ?? '');
  if (!Number.isFinite(expiresAt)) throw new Error('Missing or invalid certificate expiry');
  const days = (expiresAt - now) / 86400000;
  if (days <= minimumDays) {
    throw new Error(
      `Certificate expires ${new Date(expiresAt).toISOString()} (${days.toFixed(
        1
      )} days remaining; minimum ${minimumDays})`
    );
  }
  return `${new Date(expiresAt).toISOString()} (${days.toFixed(1)} days remaining)`;
}

export function checkEndpoint(
  host: string,
  {
    minimumDays = 30,
    timeoutMs = 12000,
    connect = tls.connect,
  }: {
    minimumDays?: number;
    timeoutMs?: number;
    connect?: (options: tls.ConnectionOptions) => tls.TLSSocket;
  } = {}
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let socket: tls.TLSSocket | undefined;
    const timer = setTimeout(() => finish(new Error('TLS connection timed out')), timeoutMs);
    function finish(error: unknown, result = ''): void {
      clearTimeout(timer);
      socket?.destroy();
      if (error) reject(error);
      else resolve(result);
    }
    try {
      socket = connect({ host, port: 443, servername: host, rejectUnauthorized: true });
      socket.once('error', (error) => finish(error));
      socket.once('secureConnect', () => {
        try {
          if (!socket?.authorized) throw new Error('TLS certificate is not trusted');
          finish(null, checkExpiry(socket.getPeerCertificate().valid_to, minimumDays));
        } catch (error) {
          finish(error);
        }
      });
    } catch (error) {
      finish(error);
    }
  });
}

async function awsJson<T>(args: string[]): Promise<T> {
  try {
    const { stdout } = await execFileAsync(
      'aws',
      ['--region', 'us-east-1', ...args, '--output', 'json'],
      {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, AWS_PAGER: '' },
      }
    );
    return JSON.parse(stdout) as T;
  } catch {
    // CLI errors can contain private ARNs, account IDs, and environment details.
    throw new Error(`AWS ${args[0]} ${args[1]} failed; check credentials and read permissions`);
  }
}

const normalize = (value: string): string => value.toLowerCase().replace(/\.$/, '');
export async function checkAcmCertificate(
  certificate: AcmCertificate,
  {
    minimumDays = 30,
    lookup = resolveCname,
  }: {
    minimumDays?: number;
    lookup?: (hostname: string) => Promise<string[]>;
  } = {}
): Promise<string> {
  const problems: string[] = [];
  if (certificate.Type !== 'AMAZON_ISSUED') problems.push('Certificate is not managed by Amazon');
  if (certificate.Status !== 'ISSUED') problems.push(`Certificate status: ${certificate.Status}`);
  if (certificate.RenewalEligibility !== 'ELIGIBLE')
    problems.push('Certificate is not eligible for managed renewal');
  const renewal = certificate.RenewalSummary?.RenewalStatus;
  if (renewal === 'FAILED' || renewal === 'PENDING_VALIDATION')
    problems.push(`Renewal status: ${renewal}`);
  try {
    checkExpiry(certificate.NotAfter, minimumDays);
  } catch (error) {
    problems.push(errorMessage(error));
  }
  const validations = certificate.DomainValidationOptions ?? [];
  if (!validations.length) problems.push('No domain validation records');
  for (const validation of validations) {
    const record = validation.ResourceRecord;
    if (
      validation.ValidationMethod !== 'DNS' ||
      record?.Type !== 'CNAME' ||
      !record.Name ||
      !record.Value
    ) {
      problems.push(`Missing DNS renewal configuration for ${validation.DomainName}`);
      continue;
    }
    try {
      const answers = await lookup(record.Name);
      if (!answers.some((answer) => normalize(answer) === normalize(record.Value ?? ''))) {
        problems.push(`Incorrect renewal CNAME for ${validation.DomainName}`);
      }
    } catch {
      problems.push(`Missing or unresolvable renewal CNAME for ${validation.DomainName}`);
    }
  }
  if (problems.length) throw new Error(problems.join('; '));
  return 'ACM renewal eligibility and public validation CNAMEs verified';
}

export async function main(args = process.argv.slice(2)): Promise<number> {
  const withAcm = args.includes('--acm');
  const hosts = args.filter((arg) => arg !== '--acm');
  const minimumDays = Number(process.env.TLS_MINIMUM_DAYS ?? 30);
  if (!Number.isFinite(minimumDays) || minimumDays < 1)
    throw new Error('TLS_MINIMUM_DAYS must be a positive number');
  if (hosts.some((host) => !/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/i.test(host)))
    throw new Error('Pass DNS hostnames only');
  const targets = hosts.length ? hosts : defaultHosts;
  let failures = 0;
  await Promise.all(
    targets.map(async (host) => {
      try {
        console.log(`PASS ${host}: ${await checkEndpoint(host, { minimumDays })}`);
      } catch (error) {
        failures++;
        console.error(`FAIL ${host}: ${errorMessage(error)}`);
      }
    })
  );
  if (withAcm) {
    const result = await awsJson<Distributions>(['cloudfront', 'list-distributions']);
    const distributions = result.DistributionList?.Items ?? [];
    const certificates = new Map<string, string[]>();
    for (const host of targets) {
      const distribution = distributions.find((item) => item.Aliases?.Items?.includes(host));
      const arn = distribution?.ViewerCertificate?.ACMCertificateArn;
      if (!arn) {
        failures++;
        console.error(`FAIL ${host}: no CloudFront ACM certificate found`);
        continue;
      }
      const names = certificates.get(arn) ?? [];
      names.push(host);
      certificates.set(arn, names);
    }
    const certificateEntries: Array<[string, string[]]> = Array.from(certificates.entries());
    for (const [arn, names] of certificateEntries) {
      try {
        const { Certificate } = await awsJson<{ Certificate: AcmCertificate }>([
          'acm',
          'describe-certificate',
          '--certificate-arn',
          arn,
        ]);
        console.log(
          `PASS ${names.join(', ')}: ${await checkAcmCertificate(Certificate, { minimumDays })}`
        );
      } catch (error) {
        failures++;
        console.error(`FAIL ${names.join(', ')}: ${errorMessage(error)}`);
      }
    }
  }
  return failures ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`FAIL TLS audit: ${errorMessage(error)}`);
      process.exitCode = 1;
    });
}

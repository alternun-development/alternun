#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_LOCKFILE_PATH = path.resolve(process.cwd(), 'pnpm-lock.yaml');
const DEFAULT_ENDPOINT = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk';
const SEVERITY_RANK = new Map([
  ['low', 1],
  ['moderate', 2],
  ['high', 3],
  ['critical', 4],
]);

function normalizeSeverity(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!SEVERITY_RANK.has(normalized)) {
    throw new Error(`Unsupported SECURITY_AUDIT_LEVEL "${value}". Use low, moderate, high, or critical.`);
  }
  return normalized;
}

function unquoteLockfileKey(rawKey) {
  if ((rawKey.startsWith("'") && rawKey.endsWith("'")) || (rawKey.startsWith('"') && rawKey.endsWith('"'))) {
    return rawKey.slice(1, -1).replace(/''/g, "'").replace(/\\"/g, '"');
  }

  return rawKey;
}

function parseLockfilePackageKey(rawKey) {
  const key = unquoteLockfileKey(rawKey.trim());
  const baseKey = key.replace(/\([^)]*\)$/, '');
  const separatorIndex = baseKey.lastIndexOf('@');

  if (separatorIndex <= 0) {
    return null;
  }

  const name = baseKey.slice(0, separatorIndex).trim();
  const version = baseKey.slice(separatorIndex + 1).trim();

  if (!name || !version) {
    return null;
  }

  return { name, version };
}

function extractPackagesFromLockfile(lockfileText) {
  const packages = [];
  const lines = lockfileText.split(/\r?\n/);
  let inPackagesSection = false;

  for (const line of lines) {
    if (!inPackagesSection) {
      if (line === 'packages:') {
        inPackagesSection = true;
      }
      continue;
    }

    if (line === 'snapshots:') {
      break;
    }

    const match = line.match(/^  ([^ ].*):$/);
    if (!match) {
      continue;
    }

    const parsed = parseLockfilePackageKey(match[1]);
    if (parsed) {
      packages.push(parsed);
    }
  }

  return packages;
}

function dedupePackages(packages) {
  const byName = new Map();

  for (const { name, version } of packages) {
    const versions = byName.get(name) ?? new Set();
    versions.add(version);
    byName.set(name, versions);
  }

  return byName;
}

function chunkEntries(entries, size) {
  const chunks = [];
  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }
  return chunks;
}

async function fetchBulkAdvisories(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bulk advisory request failed with HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Bulk advisory response was not a JSON object.');
  }

  return data;
}

function collectAdvisories(response) {
  const advisories = [];

  for (const [packageName, packageAdvisories] of Object.entries(response)) {
    if (!Array.isArray(packageAdvisories)) {
      continue;
    }

    for (const advisory of packageAdvisories) {
      if (!advisory || typeof advisory !== 'object') {
        continue;
      }

      advisories.push({
        packageName,
        id: advisory.id,
        title: advisory.title ?? 'Unknown advisory',
        severity: String(advisory.severity ?? '').toLowerCase(),
        url: advisory.url ?? '',
        vulnerableVersions: advisory.vulnerable_versions ?? '',
      });
    }
  }

  return advisories;
}

function formatAdvisoryLine(advisory) {
  const advisoryId = advisory.id ? `#${advisory.id}` : 'unknown-id';
  const vulnerableVersions = advisory.vulnerableVersions ? ` [${advisory.vulnerableVersions}]` : '';
  const url = advisory.url ? ` (${advisory.url})` : '';

  return `- ${advisory.packageName} ${advisoryId}: ${advisory.title}${vulnerableVersions}${url}`;
}

async function main() {
  const lockfilePath = process.env.SECURITY_AUDIT_LOCKFILE ?? DEFAULT_LOCKFILE_PATH;
  const endpoint = process.env.SECURITY_AUDIT_ENDPOINT ?? DEFAULT_ENDPOINT;
  const auditLevel = normalizeSeverity(process.env.SECURITY_AUDIT_LEVEL ?? 'critical');
  const threshold = SEVERITY_RANK.get(auditLevel);

  const lockfileText = await fs.readFile(lockfilePath, 'utf8');
  const packages = extractPackagesFromLockfile(lockfileText);
  const dedupedPackages = dedupePackages(packages);
  const packageEntries = [...dedupedPackages.entries()].map(([name, versions]) => [
    name,
    [...versions].sort(),
  ]);

  if (packageEntries.length === 0) {
    throw new Error(`No package entries were found in ${path.relative(process.cwd(), lockfilePath)}.`);
  }

  const advisoryResults = [];
  const chunkSize = Number(process.env.SECURITY_AUDIT_CHUNK_SIZE ?? '200');
  const chunks = chunkEntries(packageEntries, Number.isFinite(chunkSize) && chunkSize > 0 ? chunkSize : 200);

  for (const chunk of chunks) {
    const payload = Object.fromEntries(chunk);
    const response = await fetchBulkAdvisories(endpoint, payload);
    advisoryResults.push(...collectAdvisories(response));
  }

  const uniqueAdvisories = new Map();
  for (const advisory of advisoryResults) {
    const advisoryKey = `${advisory.packageName}:${advisory.id}:${advisory.title}:${advisory.vulnerableVersions}`;
    uniqueAdvisories.set(advisoryKey, advisory);
  }

  const filteredAdvisories = [...uniqueAdvisories.values()].filter((advisory) => {
    const severityRank = SEVERITY_RANK.get(advisory.severity);
    return typeof severityRank === 'number' && severityRank >= (threshold ?? 4);
  });

  if (filteredAdvisories.length > 0) {
    console.error(`Security audit failed: found ${filteredAdvisories.length} ${auditLevel} advisory(s).`);
    for (const advisory of filteredAdvisories.sort((left, right) => {
      const nameComparison = left.packageName.localeCompare(right.packageName);
      if (nameComparison !== 0) {
        return nameComparison;
      }
      return String(left.id).localeCompare(String(right.id));
    })) {
      console.error(formatAdvisoryLine(advisory));
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Security audit passed: checked ${packageEntries.length} packages, no ${auditLevel} vulnerabilities found.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

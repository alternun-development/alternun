import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadLocalApiEnv(envFilePath = resolve(process.cwd(), '.env')): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  if (!existsSync(envFilePath)) {
    return;
  }

  const contents = readFileSync(envFilePath, 'utf8');

  for (const line of contents.split('\n')) {
    const normalizedLine = line.replace(/\r$/, '').trim();

    if (!normalizedLine || normalizedLine.startsWith('#')) {
      continue;
    }

    const lineWithoutExport = normalizedLine.startsWith('export ')
      ? normalizedLine.slice('export '.length).trim()
      : normalizedLine;
    const equalsIndex = lineWithoutExport.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    const key = lineWithoutExport.slice(0, equalsIndex).trim();
    const rawValue = lineWithoutExport.slice(equalsIndex + 1);

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    process.env[key] = parseEnvValue(rawValue);
  }
}

loadLocalApiEnv();

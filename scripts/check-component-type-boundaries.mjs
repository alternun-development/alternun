#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import parser from '@typescript-eslint/parser';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const COMPONENT_PATH = /(?:^|\/)components\/.+\.(?:tsx?|mts|cts)$/;
const PAGE_PATH = /(?:^|\/)pages\/.+\.(?:tsx?|mts|cts)$/;
const APP_PATH = /(?:^|\/)app\/.+\.(?:tsx?|mts|cts)$/;
const TYPE_FILE = /(?:^|\/)(?:types?|[^/]+\.types?)\.(?:ts|tsx|mts|cts)$/;
const TEST_FILE = /(?:^|\/)(__tests__\/|[^/]+\.(?:test|spec)\.)/;

function isComponentSource(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  return (
    (COMPONENT_PATH.test(normalized) || PAGE_PATH.test(normalized) || APP_PATH.test(normalized)) &&
    !TYPE_FILE.test(normalized) &&
    !TEST_FILE.test(normalized)
  );
}

function isTypeSource(filePath) {
  return TYPE_FILE.test(filePath.replaceAll('\\', '/'));
}

export function collectTopLevelTypeNames(source, filePath = 'file.tsx') {
  // Framework route names such as `[slug].tsx` are valid filesystem paths but
  // can be interpreted inconsistently by parser versions. Only the extension
  // matters for this syntax-only check, so use a neutral virtual filename.
  const parserFilePath = filePath.endsWith('.tsx') ? 'file.tsx' : 'file.ts';
  const ast = parser.parse(source, {
    ecmaVersion: 2022,
    filePath: parserFilePath,
    loc: true,
    range: true,
    sourceType: 'module',
  });

  return ast.body
    .map((node) => (node.type === 'ExportNamedDeclaration' ? node.declaration : node))
    .filter(
      (node) => node?.type === 'TSInterfaceDeclaration' || node?.type === 'TSTypeAliasDeclaration'
    )
    .map((node) => node.id.name);
}

export function validateTypeBoundary(filePath, baseSource, nextSource) {
  if (!isComponentSource(filePath) || isTypeSource(filePath)) return [];

  const previous = new Set(collectTopLevelTypeNames(baseSource, filePath));
  return collectTopLevelTypeNames(nextSource, filePath)
    .filter((name) => !previous.has(name))
    .map((name) => ({ filePath, name }));
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function changedFiles({ base, staged }) {
  const args = ['diff', '--name-only', '--diff-filter=ACMR'];
  if (staged) args.push('--cached');
  if (base) args.push(`${base}...HEAD`);
  return git(...args)
    .split('\n')
    .map((filePath) => filePath.trim())
    .filter(Boolean);
}

function readGitFile(ref, filePath) {
  if (!ref) return '';
  try {
    return git('show', ref === ':' ? `:${filePath}` : `${ref}:${filePath}`);
  } catch {
    return '';
  }
}

function readNextFile(filePath, staged) {
  if (staged) return readGitFile(':', filePath);
  const absolutePath = resolve(repoRoot, filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function run({ base, staged }) {
  const violations = [];
  for (const filePath of changedFiles({ base, staged })) {
    if (!isComponentSource(filePath)) continue;
    const baseSource = staged ? readGitFile('HEAD', filePath) : readGitFile(base, filePath);
    const nextSource = readNextFile(filePath, staged);
    violations.push(...validateTypeBoundary(filePath, baseSource, nextSource));
  }

  if (violations.length === 0) {
    console.log('Component type boundary check passed.');
    return;
  }

  console.error('Top-level types must live outside component files:');
  for (const { filePath, name } of violations) {
    console.error(`- ${filePath}: move ${name} to a *.types.ts or types.ts file`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseIndex = process.argv.indexOf('--base');
  const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : undefined;
  run({ base, staged: !base });
}

export { isComponentSource, isTypeSource };

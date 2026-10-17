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

function isIdentifierStart(character) {
  return character !== undefined && /[A-Za-z_$]/.test(character);
}

function isIdentifierPart(character) {
  return character !== undefined && /[A-Za-z0-9_$]/.test(character);
}

function skipQuotedText(source, index, quote) {
  let cursor = index + 1;
  while (cursor < source.length) {
    if (source[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (source[cursor] === quote) return cursor + 1;
    cursor += 1;
  }
  return cursor;
}

function collectTopLevelTypeNamesFallback(source) {
  const names = [];
  let depth = 0;
  let cursor = 0;

  while (cursor < source.length) {
    if (source.startsWith('//', cursor)) {
      const lineEnd = source.indexOf('\n', cursor + 2);
      cursor = lineEnd === -1 ? source.length : lineEnd + 1;
      continue;
    }
    if (source.startsWith('/*', cursor)) {
      const commentEnd = source.indexOf('*/', cursor + 2);
      cursor = commentEnd === -1 ? source.length : commentEnd + 2;
      continue;
    }

    const character = source[cursor];
    if (character === '"' || character === "'" || character === '`') {
      cursor = skipQuotedText(source, cursor, character);
      continue;
    }
    if (character === '{') {
      depth += 1;
      cursor += 1;
      continue;
    }
    if (character === '}') {
      depth = Math.max(0, depth - 1);
      cursor += 1;
      continue;
    }

    if (depth !== 0 || !isIdentifierStart(character)) {
      cursor += 1;
      continue;
    }

    const wordStart = cursor;
    cursor += 1;
    while (isIdentifierPart(source[cursor])) cursor += 1;
    const word = source.slice(wordStart, cursor);
    if (word !== 'interface' && word !== 'type') continue;

    while (source[cursor] !== undefined && /\s/.test(source[cursor])) cursor += 1;
    if (!isIdentifierStart(source[cursor])) continue;

    const nameStart = cursor;
    cursor += 1;
    while (isIdentifierPart(source[cursor])) cursor += 1;
    const name = source.slice(nameStart, cursor);

    if (word === 'interface') {
      names.push(name);
      continue;
    }

    let probe = cursor;
    let foundAssignment = false;
    while (probe < source.length) {
      if (source.startsWith('//', probe) || source.startsWith('/*', probe)) break;
      if (source[probe] === ';') break;
      if (/\s/.test(source[probe])) {
        probe += 1;
        continue;
      }
      if (source[probe] === '=') {
        foundAssignment = true;
        break;
      }
      if (isIdentifierStart(source[probe])) {
        const tokenStart = probe;
        probe += 1;
        while (isIdentifierPart(source[probe])) probe += 1;
        if (source.slice(tokenStart, probe) === 'from') break;
        continue;
      }
      probe += 1;
    }
    if (foundAssignment) names.push(name);
  }

  return names;
}

export function collectTopLevelTypeNames(source, filePath = 'file.tsx') {
  // Framework route names such as `[slug].tsx` are valid filesystem paths but
  // can be interpreted inconsistently by parser versions. Only the extension
  // matters for this syntax-only check, so use a neutral virtual filename.
  const parserFilePath = filePath.endsWith('.tsx') ? 'file.tsx' : 'file.ts';
  let ast;
  try {
    ast = parser.parse(source, {
      ecmaVersion: 2022,
      filePath: parserFilePath,
      loc: true,
      range: true,
      sourceType: 'module',
    });
  } catch {
    // Keep the guard usable when a parser/TypeScript version rejects valid
    // framework syntax. The fallback only recognizes declarations at module
    // depth and still ignores comments, strings, and nested type bodies.
    return collectTopLevelTypeNamesFallback(source);
  }

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

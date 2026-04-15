import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIST_DIR = fileURLToPath(new URL('../dist/', import.meta.url));

function shouldRewrite(specifier) {
  return (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.(?:js|mjs|cjs|json)$/.test(specifier)
  );
}

function rewriteSpecifier(specifier) {
  return shouldRewrite(specifier) ? `${specifier}.js` : specifier;
}

async function collectJsFiles(dir, output = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsFiles(fullPath, output);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      output.push(fullPath);
    }
  }

  return output;
}

function rewriteImports(content) {
  return content
    .replace(/(from\s+['"])(\.\.?(?:\/[^'"]+))(['"])/g, (_, prefix, specifier, suffix) => {
      return `${prefix}${rewriteSpecifier(specifier)}${suffix}`;
    })
    .replace(/(import\s+['"])(\.\.?(?:\/[^'"]+))(['"])/g, (_, prefix, specifier, suffix) => {
      return `${prefix}${rewriteSpecifier(specifier)}${suffix}`;
    });
}

const files = await collectJsFiles(DIST_DIR);

await Promise.all(
  files.map(async (file) => {
    const original = await fs.readFile(file, 'utf8');
    const updated = rewriteImports(original);
    if (updated !== original) {
      await fs.writeFile(file, updated, 'utf8');
    }
  })
);

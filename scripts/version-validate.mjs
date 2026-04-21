#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  getCurrentBranch,
  readRootVersion,
  resolveBranchRule,
  validateBranchVersionFiles,
  validateProductionVersionMirror,
  validateWorkspacePackageVersions,
  validateSupplementalVersionFiles,
} = require('./versioning/version-files.cjs');

const branch = getCurrentBranch();
const expectedVersion = readRootVersion(branch);
const branchValidation = validateBranchVersionFiles(expectedVersion, branch);
const workspaceValidation = validateWorkspacePackageVersions(expectedVersion);
const supplementalValidation = validateSupplementalVersionFiles(expectedVersion);
const branchRule = resolveBranchRule(branch);
const productionMirrorValidation =
  branchRule.resolvedConfig?.environment === 'production'
    ? validateProductionVersionMirror()
    : { valid: true, issues: [] };

const issues = [
  ...branchValidation.issues,
  ...workspaceValidation.issues,
  ...supplementalValidation.issues,
  ...productionMirrorValidation.issues,
];

if (issues.length > 0) {
  console.error(`❌ Version sync issues for branch ${branch || 'detached HEAD'}:`);
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

console.log(`✅ Version files are in sync with ${expectedVersion} on ${branch || 'detached HEAD'}`);

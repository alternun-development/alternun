import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const identityResourcesPath = path.resolve('modules/identity-resources.ts');

void test('identity RDS deletion-protection settings use isProductionIdentityStage, not a raw stage === production check', () => {
  const source = fs.readFileSync(identityResourcesPath, 'utf8');

  // Regression guard: the `identity-prod` stage previously fell through the
  // literal `args.stage === 'production'` checks below, which left the
  // production Authentik database without deletion protection or a final
  // snapshot and let a routine deploy delete it outright.
  assert.match(source, /applyImmediately: !productionIdentityStage,/);
  assert.match(source, /deletionProtection: productionIdentityStage,/);
  assert.match(
    source,
    /finalSnapshotIdentifier: productionIdentityStage\s*\n\s*\? `\$\{args\.appName\}-\$\{args\.stage\}-authentik-db-final`\.toLowerCase\(\)\s*\n\s*: undefined,/
  );
  assert.match(source, /skipFinalSnapshot: !productionIdentityStage,/);

  assert.doesNotMatch(source, /applyImmediately: args\.stage !== 'production',/);
  assert.doesNotMatch(source, /deletionProtection: args\.stage === 'production',/);
  assert.doesNotMatch(source, /skipFinalSnapshot: args\.stage !== 'production',/);
});

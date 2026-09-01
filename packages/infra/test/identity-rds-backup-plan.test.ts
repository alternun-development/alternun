import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const identityResourcesPath = path.resolve('modules/identity-resources.ts');

void test('identity RDS has a production-only monthly long-term backup plan', () => {
  const source = fs.readFileSync(identityResourcesPath, 'utf8');

  // Regression guard: the 7-day automated RDS backup window is a short-term
  // rolling buffer, not a durable monthly recovery point. This asserts the
  // AWS Backup vault/plan/selection exist, are gated on productionIdentityStage
  // (not a raw stage-string check), and use a monthly schedule with a
  // year-long retention.
  assert.match(source, /new aws\.backup\.Vault\(`\$\{resourceBaseName\}-backup-vault`/);
  assert.match(source, /new aws\.backup\.Plan\(`\$\{resourceBaseName\}-backup-plan`/);
  assert.match(source, /new aws\.backup\.Selection\(`\$\{resourceBaseName\}-backup-selection`/);

  assert.match(source, /productionIdentityStage && database && databaseBackupVault/);
  assert.match(
    source,
    /productionIdentityStage && database && databaseBackupPlan && databaseBackupRole/
  );

  assert.match(source, /schedule: 'cron\(0 5 1 \* \? \*\)',/);
  assert.match(source, /deleteAfter: 365,/);

  assert.match(source, /resources: \[database\.arn\],/);
});

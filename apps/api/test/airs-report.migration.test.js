const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../../..');
const migration = fs.readFileSync(
  path.join(repoRoot, 'supabase/migrations/20261027_0003_create_airs_reports.sql'),
  'utf8'
);
const verification = fs.readFileSync(
  path.join(repoRoot, 'supabase/test/airs_reports_verification.sql'),
  'utf8'
);

const TRANSITIONS = [
  'marketplace_submit_airs_report',
  'marketplace_approve_airs_report',
  'marketplace_reject_airs_report',
  'marketplace_cancel_airs_report',
  'marketplace_release_airs_report',
  'marketplace_reverse_airs_report',
  'marketplace_claim_airs_reports',
  'marketplace_lookup_airs_report_recipient',
];

function functionBody(name) {
  const start = migration.indexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const end = migration.indexOf('\n$$;', start);
  return migration.slice(start, end);
}

test('the migration carries no email address and does not seed approvers', () => {
  assert.doesNotMatch(migration, /[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(migration, /insert into public\.airs_report_approvers/i);
  for (const address of verification.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []) {
    assert.match(address, /@example\.test$/i, address);
  }
});

test('every transition is a pinned security-definer function only service_role can run', () => {
  for (const name of TRANSITIONS) {
    const body = functionBody(name);
    assert.match(body, /security definer/);
    assert.match(body, /set search_path = pg_catalog, public/);
    assert.match(
      migration,
      new RegExp(
        `revoke all on function public\\.${name}\\([^)]*\\)\\s+from public, anon, authenticated`
      )
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function public\\.${name}\\([^)]*\\)\\s+to service_role`)
    );
  }
  assert.match(
    migration,
    /revoke all on table public\.airs_reports from public, anon, authenticated/
  );
  assert.doesNotMatch(migration, /create policy/i);
});

test('limits, lock, time zone and ledger key follow the agreed rules', () => {
  assert.match(migration, /values \(true, 100, 300, 'America\/Bogota'\)/);
  assert.match(
    migration,
    /pg_advisory_xact_lock\(\s*pg_catalog\.hashtextextended\('airs-report-recipient:'/
  );
  assert.match(migration, /'airs-report:' \|\| v_before\.id::text \|\| ':recipient'/);
  assert.match(migration, /'admin_airs_report',\s*'admin_airs_report_reward'/);
  assert.match(functionBody('marketplace_claim_airs_reports'), /AIRS_REPORT_CLAIM_NOT_IMPLEMENTED/);
});

test('the SQL verification covers the B15 cases for this cut', () => {
  for (const pattern of [
    /report reaching exactly 100 per day was not auto-approved/,
    /report over 100 per day did not wait for review/,
    /report reaching exactly 300 per month was not auto-approved/,
    /report over 300 per month was auto-approved/,
    /cross-project total over the limit was auto-approved/,
    /pending report was not counted toward the limits/,
    /cross-project submit was not denied/,
    /self-approval was not denied/,
    /non-allowlisted approver was not denied/,
    /approver with an unverified email was not denied/,
    /snapshot update was not blocked/,
    /tampered report was approved/,
    /release of a released report was not idempotent/,
    /unverified account was credited without a claim/,
    /reversed report moved back to approved/,
    /lookup 31 was not rate limited/,
    /set local role authenticated/,
  ]) {
    assert.match(verification, pattern);
  }
  assert.match(verification, /rollback;\s*$/);
});

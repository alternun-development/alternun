// Security regressions for the marketplace access migrations: project clients (private proof
// files, invitations) and project admins by email domain. They read the SQL so a later edit
// cannot silently widen who can call the functions or read the data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (name) =>
  fs.readFileSync(path.resolve(__dirname, '../../../supabase/migrations', name), 'utf8');

const clients = read('20261110_0003_project_clients.sql');
const domains = read('20261110_0004_domain_project_admins.sql');
const cancelAirs = read('20261110_0006_cancel_invitation_cancels_airs.sql');

function functionNames(sql) {
  return [...sql.matchAll(/create or replace function public\.(\w+)\(/g)].map((match) => match[1]);
}

test('every new function runs as definer with a fixed search_path and only for service_role', () => {
  for (const sql of [clients, domains, cancelAirs]) {
    const names = functionNames(sql);
    assert.ok(names.length > 0);
    const definers = sql.match(/security definer\s+set search_path = pg_catalog, public/g) ?? [];
    assert.equal(definers.length, names.length, 'each function pins its search_path');
    for (const name of names) {
      assert.match(
        sql,
        new RegExp(
          `revoke all on function public\\.${name}\\([^)]*\\)\\s+from public, anon, authenticated`
        )
      );
      // RPCs run for the API only; internal helpers are callable by no role at all.
      const granted = new RegExp(
        `grant execute on function public\\.${name}\\([^)]*\\)\\s+to service_role`
      );
      if (name.startsWith('marketplace_')) assert.match(sql, granted);
      else assert.doesNotMatch(sql, granted);
      assert.doesNotMatch(
        sql,
        new RegExp(
          `grant execute on function public\\.${name}\\([^)]*\\)\\s+to (anon|authenticated)`
        )
      );
    }
  }
});

test('client invitations and proof records are server-only tables with row level security', () => {
  for (const table of ['project_client_invitations', 'airs_report_proofs']) {
    assert.match(clients, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(
      clients,
      new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`)
    );
  }
  // The API only reads invitations and adds proofs; changes go through the RPCs.
  assert.match(clients, /grant select on table public\.project_client_invitations to service_role/);
  assert.match(clients, /grant select, insert on table public\.airs_report_proofs to service_role/);
});

test('supporting files live in a private bucket limited to images and PDFs up to 10 MB', () => {
  assert.match(clients, /'airs-report-proofs',\s+'airs-report-proofs',\s+false,\s+10485760/);
  assert.match(clients, /set public = false/);
  assert.match(clients, /array\['image\/jpeg', 'image\/png', 'image\/webp', 'application\/pdf'\]/);
  // Stored paths stay inside a project folder with a generated file name.
  assert.match(
    clients,
    /storage_path ~ '\^\[0-9a-f-\]\{36\}\/\[0-9a-f-\]\{36\}\\\.\(jpg\|png\|webp\|pdf\)\$'/
  );
  assert.match(clients, /sha256 ~ '\^\[0-9a-f\]\{64\}\$'/);
});

test('only project admins and sub admins of the project can invite or cancel, within a daily limit', () => {
  assert.match(clients, /p_actor_roles && array\['partner_operator', 'sub_admin'\]/);
  assert.match(clients, /array\['partner_operator', 'sub_admin'\]\s*\)/);
  assert.match(clients, /c_daily_limit constant integer := 50/);
  assert.match(clients, /CLIENT_INVITE_RATE_LIMITED/);
  // A verified account must be added as a participant, never shadowed by an invitation.
  assert.match(clients, /CLIENT_HAS_ACCOUNT/);
  assert.match(clients, /'client\.invite_denied'/);
});

test('invitations are accepted only for the confirmed email of that same account', () => {
  assert.match(
    clients,
    /not coalesce\(p_email_confirmed, false\)\s+or lower\(btrim\(coalesce\(v_user\.email, ''\)\)\) <> v_email\s+or v_user\.email_verified is distinct from true/
  );
});

test('domain admins need a verified email, never get global roles and keep revocations', () => {
  assert.match(domains, /app_user\.email_verified = true/);
  // Roles a domain may grant are scoped membership roles only.
  assert.match(
    domains,
    /home_role in \('partner_operator', 'sub_admin', 'partner_readonly', 'project_moderator'\)/
  );
  assert.doesNotMatch(domains, /home_role in \([^)]*(platform_owner|internal_admin)/);
  // Global admins are skipped; a revoked domain grant is never re-created.
  assert.match(
    domains,
    /from public\.platform_admins admin\s+where admin\.email = v_email and admin\.is_active/
  );
  assert.match(domains, /or membership\.granted_by_subject = v_grantor/);
  assert.match(domains, /enterprise\.status <> 'archived'/);
  // alternun.io is admin only on the Alternun enterprise and moderator elsewhere.
  assert.match(
    domains,
    /values \('alternun\.io', array\['alternun'\], 'partner_operator', 'project_moderator'\)/
  );
});

test('cancelling an invitation cancels only the Airs still waiting for that person', () => {
  assert.match(cancelAirs, /report\.status in \('awaiting_claim', 'pending_approval'\)/);
  assert.match(cancelAirs, /lower\(report\.recipient_email\) = lower\(btrim\(p_email\)\)/);
  assert.match(cancelAirs, /report\.project_id = p_project_id/);
  // Only Airs assigned up to the cancellation; a later invitation keeps its own.
  assert.match(cancelAirs, /report\.submitted_at <= p_before/);
  assert.match(cancelAirs, /'airs_report\.cancelled'/);
  assert.match(cancelAirs, /p_actor_roles && array\['partner_operator', 'sub_admin'\]/);
});

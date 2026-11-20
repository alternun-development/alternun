const assert = require('node:assert/strict');
const test = require('node:test');

const { MarketplaceApiError } = require('../src/modules/marketplace/marketplace.errors.ts');
const { HonorAwardService } = require('../src/modules/marketplace/honor-award.service.ts');
const {
  claimCodeHint,
  generateClaimCode,
  hashClaimCode,
  normalizeClaimCode,
} = require('../src/modules/marketplace/honor-award-codes.ts');

const ENTERPRISE_ID = '5f51a565-179d-49f9-aba3-a256c1373807';
const PROJECT_ID = '82225501-a047-4494-a33e-bd54f3583dc8';
const code = (expected) => (error) =>
  error instanceof MarketplaceApiError && error.code === expected;

const TORNEO = {
  id: '6a061a6a-b9d0-4934-96b1-5102617bdc76',
  kind: 'medal',
  tier: 'generic',
  audience: 'user',
  title: 'Manglar Verde',
  eventName: 'Tour Callaway Colombia',
  airsAmount: 5,
  isActive: true,
  projectId: PROJECT_ID,
  partnerEnterpriseId: ENTERPRISE_ID,
};

function operator(overrides = {}) {
  return {
    iss: 'issuer',
    aud: 'app',
    sub: 'operator-subject',
    roles: ['partner_operator'],
    organizationIds: [],
    email: 'ops@swinggolf.example',
    emailVerified: true,
    ...overrides,
  };
}

function build({
  recipes = [TORNEO],
  users = {},
  medal = { id: 'medal-1', name: 'Manglar Verde', imageUrl: 'https://cdn.example/m.png' },
  holds = false,
  openReport = false,
  redeem = {
    ok: true,
    recipeId: TORNEO.id,
    airsAmount: 5,
    reportId: 'report-1',
    reportStatus: 'released',
    grantId: 'grant-1',
  },
} = {}) {
  const calls = { audits: [], submits: [], codes: [], redeems: [], notified: [], grants: [] };
  const repository = {
    findRecipe: async (id) => recipes.find((item) => item.id === id) ?? null,
    findUserIdByEmail: async (email) => users[email] ?? null,
    findHonorMedal: async () => medal,
    holdsRecipe: async () => holds,
    hasOpenMedalReport: async () => openReport,
    insertGrant: async (grant) => {
      calls.grants.push(grant);
      return { id: 'grant-x', ...grant };
    },
    insertClaimCode: async (row) => {
      calls.codes.push(row);
      return {
        id: 'code-1',
        recipeId: row.recipeId,
        hint: row.hint,
        maxRedemptions: row.maxRedemptions,
      };
    },
    revokeClaimCode: async (id) => (id === 'code-1' ? { id, revokedAt: 'now' } : null),
    listClaimCodes: async () => [],
    redeemClaimCode: async (...args) => {
      calls.redeems.push(args);
      return redeem;
    },
  };
  const adminRepository = { audit: async (entry) => calls.audits.push(entry) };
  const airsReports = {
    submit: async (principal, requestId, projectId, input) => {
      calls.submits.push({ principal, projectId, input });
      return { report: { id: 'report-1', status: 'released' }, idempotent: false };
    },
    notifyReport: async (id) => calls.notified.push(id),
  };
  return {
    service: new HonorAwardService(repository, adminRepository, airsReports),
    calls,
  };
}

test('codes are 60 random bits shown as XXXX-XXXX-XXXX in Crockford base32', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const value = generateClaimCode();
    assert.match(value, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    seen.add(value);
  }
  assert.equal(seen.size, 200);
});

test('typed codes are normalized before hashing; anything else is refused', () => {
  assert.equal(normalizeClaimCode(' 7k2m-qx9d-4hvt '), '7K2MQX9D4HVT');
  // People confuse O with 0 and I or L with 1.
  assert.equal(normalizeClaimCode('OIL0-1111-2222'), '011011112222');
  assert.equal(normalizeClaimCode('7K2M QX9D 4HVT'), '7K2MQX9D4HVT');
  assert.equal(normalizeClaimCode('7K2M-QX9D-4HV'), null);
  assert.equal(normalizeClaimCode('7K2M-QX9D-4HVU'), null); // U is not in the alphabet
  assert.equal(normalizeClaimCode('x'.repeat(65)), null);
  assert.equal(hashClaimCode('7K2MQX9D4HVT'), hashClaimCode(normalizeClaimCode('7k2m-qx9d-4hvt')));
  assert.match(hashClaimCode('7K2MQX9D4HVT'), /^[0-9a-f]{64}$/);
  assert.equal(claimCodeHint('7K2MQX9D4HVT'), '4HVT');
});

test('sending an award with Airs files an Airs report with its medal and amount', async () => {
  const { service, calls } = build({ users: { 'ada@example.com': 'user-1' } });
  const result = await service.grantFromEnterprise(operator(), 'req', ENTERPRISE_ID, {
    recipeId: TORNEO.id,
    email: ' Ada@Example.com ',
  });
  assert.deepEqual(result, {
    kind: 'airs_report',
    reportId: 'report-1',
    reportStatus: 'released',
    airsAmount: 5,
  });
  const [submit] = calls.submits;
  assert.equal(submit.projectId, PROJECT_ID);
  assert.equal(submit.input.recipientEmail, 'ada@example.com');
  assert.equal(submit.input.amount, 5);
  assert.equal(submit.input.medalId, 'medal-1');
  assert.equal(submit.input.concept, 'Galardón Manglar Verde · Tour Callaway Colombia');
  assert.equal(submit.input.documentNumber, 'GALARDON-6A061A6A');
  assert.equal(calls.grants.length, 0);
  assert.equal(calls.audits.at(-1).action, 'honor_award.sent');
});

test('people without an account can be sent the award with their name', async () => {
  const { service, calls } = build();
  await service.grantFromEnterprise(operator(), 'req', ENTERPRISE_ID, {
    recipeId: TORNEO.id,
    email: 'new@example.com',
    recipientName: ' Ana Pérez ',
    reference: 'FAC-77',
  });
  assert.equal(calls.submits[0].input.recipientName, 'Ana Pérez');
  assert.equal(calls.submits[0].input.documentNumber, 'FAC-77');
});

test('an award with Airs is not sent twice without a reference, nor without its medal', async () => {
  const held = build({ users: { 'ada@example.com': 'user-1' }, holds: true });
  await assert.rejects(
    held.service.grantFromEnterprise(operator(), 'req', ENTERPRISE_ID, {
      recipeId: TORNEO.id,
      email: 'ada@example.com',
    }),
    code('HONOR_AWARD_ALREADY_GRANTED')
  );
  const waiting = build({ openReport: true });
  await assert.rejects(
    waiting.service.grantFromEnterprise(operator(), 'req', ENTERPRISE_ID, {
      recipeId: TORNEO.id,
      email: 'new@example.com',
      recipientName: 'Ana',
    }),
    code('HONOR_AWARD_ALREADY_GRANTED')
  );
  const unlinked = build({ medal: null });
  await assert.rejects(
    unlinked.service.grantFromEnterprise(operator(), 'req', ENTERPRISE_ID, {
      recipeId: TORNEO.id,
      email: 'ada@example.com',
    }),
    code('HONOR_AWARD_AIRS_NOT_CONFIGURED')
  );
  assert.equal(held.calls.submits.length + waiting.calls.submits.length, 0);
});

test('a claim code is shown once and only its hash is stored, with its creator', async () => {
  const { service, calls } = build();
  const before = Date.now();
  const created = await service.createClaimCode(operator(), 'req', ENTERPRISE_ID, {
    recipeId: TORNEO.id,
    label: ' Torneo 21 y 22 ',
    maxRedemptions: 120,
    validDays: 3,
  });
  const [row] = calls.codes;
  assert.match(created.code, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.equal(row.codeHash, hashClaimCode(normalizeClaimCode(created.code)));
  assert.equal(JSON.stringify(row).includes(created.code.replace(/-/g, '')), false);
  assert.equal(row.hint, created.code.slice(-4));
  assert.equal(row.label, 'Torneo 21 y 22');
  assert.equal(row.maxRedemptions, 120);
  const expires = Date.parse(row.expiresAt) - before;
  assert.ok(expires >= 3 * 86_400_000 && expires < 3 * 86_400_000 + 60_000);
  assert.deepEqual(row.creator, {
    issuer: 'issuer',
    subject: 'operator-subject',
    roles: ['partner_operator'],
    email: 'ops@swinggolf.example',
  });
  assert.equal(calls.audits.at(-1).action, 'honor_award.code_created');
  assert.equal(JSON.stringify(calls.audits).includes(created.code), false);
});

test('claim codes need a granting role, a verified creator email and sane limits', async () => {
  const { service } = build();
  const input = { recipeId: TORNEO.id, maxRedemptions: 10, validDays: 7 };
  await assert.rejects(
    service.createClaimCode(operator({ roles: ['project_moderator'] }), 'r', ENTERPRISE_ID, input),
    code('PERMISSION_DENIED')
  );
  await assert.rejects(
    service.createClaimCode(operator({ emailVerified: false }), 'r', ENTERPRISE_ID, input),
    code('HONOR_CODE_CREATOR_EMAIL_REQUIRED')
  );
  for (const bad of [
    { maxRedemptions: 0 },
    { maxRedemptions: 10_001 },
    { validDays: 0 },
    { validDays: 366 },
    { validDays: 1.5 },
  ]) {
    await assert.rejects(
      service.createClaimCode(operator(), 'r', ENTERPRISE_ID, { ...input, ...bad }),
      code('HONOR_AWARD_INPUT_INVALID')
    );
  }
  await assert.rejects(
    service.createClaimCode(operator(), 'r', 'another-enterprise', input),
    code('HONOR_AWARD_NOT_FOUND')
  );
  await assert.rejects(
    service.revokeClaimCode(operator(), 'r', ENTERPRISE_ID, 'missing'),
    code('HONOR_CODE_NOT_FOUND')
  );
});

test('redeeming sends the hash, emails the report and returns the award to claim', async () => {
  const { service, calls } = build();
  const result = await service.redeemClaimCode('user-1', '7k2m qx9d 4hvt', 'req-9');
  assert.deepEqual(calls.redeems[0], ['user-1', hashClaimCode('7K2MQX9D4HVT'), 'req-9']);
  assert.deepEqual(calls.notified, ['report-1']);
  assert.deepEqual(result, {
    recipeId: TORNEO.id,
    airsAmount: 5,
    reportStatus: 'released',
    grantId: 'grant-1',
  });
});

test('a malformed code never reaches the database; refusals keep their reason', async () => {
  const { service, calls } = build({ redeem: { ok: false, reasonCode: 'HONOR_CODE_EXPIRED' } });
  await assert.rejects(service.redeemClaimCode('user-1', 'nope', 'r'), code('HONOR_CODE_INVALID'));
  assert.equal(calls.redeems.length, 0);
  await assert.rejects(
    service.redeemClaimCode('user-1', '7K2M-QX9D-4HVT', 'r'),
    code('HONOR_CODE_EXPIRED')
  );
  assert.deepEqual(calls.notified, []);
});

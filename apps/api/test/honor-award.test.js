const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { MarketplaceApiError } = require('../src/modules/marketplace/marketplace.errors.ts');
const {
  HonorAwardService,
  checkRecipeInput,
  normalizeRecipeInput,
} = require('../src/modules/marketplace/honor-award.service.ts');
const { mapHonorAwardView } = require('../src/modules/marketplace/honor-award.repository.ts');
const { checkMedalHonorRecipe } = require('../src/modules/marketplace/medal.service.ts');

const RECIPE_ID = '50000000-0000-4000-8000-000000000001';
const GRANT_ID = '60000000-0000-4000-8000-000000000001';
const ENTERPRISE_ID = '70000000-0000-4000-8000-000000000001';
const PROJECT_ID = '20000000-0000-4000-8000-000000000001';

function principal(role) {
  return {
    iss: 'issuer',
    aud: 'admin',
    sub: `${role}-subject`,
    roles: [role],
    organizationIds: ['*'],
  };
}

function code(expected) {
  return (error) => error instanceof MarketplaceApiError && error.code === expected;
}

function recipe(overrides = {}) {
  return {
    id: RECIPE_ID,
    kind: 'medal',
    tier: 'gold',
    audience: 'user',
    title: 'Manglar Verde',
    isActive: true,
    projectId: null,
    partnerEnterpriseId: null,
    ...overrides,
  };
}

function build({ recipes = [recipe()], users = {}, enterprises = {}, claimable = true } = {}) {
  const calls = { audits: [], created: [], grants: [], claims: [], listed: [] };
  const repository = {
    listRecipes: async () => recipes,
    findRecipe: async (id) => recipes.find((item) => item.id === id) ?? null,
    createRecipe: async (input) => {
      calls.created.push(input);
      return { ...recipe(), ...input, id: RECIPE_ID };
    },
    updateRecipe: async (id, input) => ({ ...recipes.find((item) => item.id === id), ...input }),
    listGrantsForRecipe: async () => [],
    findGrant: async () => ({ id: GRANT_ID, status: 'pending', enterpriseId: null }),
    revokeGrant: async () => ({ id: GRANT_ID, status: 'revoked', enterpriseId: null }),
    insertGrant: async (grant) => {
      calls.grants.push(grant);
      return {
        id: GRANT_ID,
        recipeId: grant.recipeId,
        recipientType: grant.recipientType,
        userId: grant.userId ?? null,
        enterpriseId: grant.enterpriseId ?? null,
        status: 'pending',
      };
    },
    claimGrant: async (grantId, owner) => {
      calls.claims.push([grantId, owner]);
      return claimable;
    },
    findView: async (grantId) => ({ id: grantId, status: 'claimed' }),
    listViews: async (owner, claimedOnly) => {
      calls.listed.push([owner, claimedOnly]);
      return [];
    },
    findUserIdByEmail: async (email) => users[email] ?? null,
    findEnterprise: async (by) => {
      const key = by.id ?? by.slug;
      return enterprises[key] ?? null;
    },
    projectExists: async (id) => id === PROJECT_ID,
  };
  const adminRepository = {
    audit: async (entry) => calls.audits.push(entry),
    allowedHosts: async () => ['images.example.test'],
  };
  return { service: new HonorAwardService(repository, adminRepository), calls };
}

test('recipe input is trimmed, blank optional text becomes null and limits are enforced', () => {
  const normalized = normalizeRecipeInput({
    title: '  Manglar Verde ',
    purpose: '   ',
    venueName: ' Club ',
  });
  assert.equal(normalized.title, 'Manglar Verde');
  assert.equal(normalized.purpose, null);
  assert.equal(normalized.venueName, 'Club');

  assert.throws(() => checkRecipeInput({ title: '' }), code('HONOR_AWARD_INPUT_INVALID'));
  assert.throws(() => checkRecipeInput({ tier: 'platinum' }), code('HONOR_AWARD_INPUT_INVALID'));
  assert.throws(() => checkRecipeInput({ eventYear: 1999 }), code('HONOR_AWARD_INPUT_INVALID'));
  assert.throws(() => checkRecipeInput({ airsAmount: -1 }), code('HONOR_AWARD_INPUT_INVALID'));
  assert.doesNotThrow(() =>
    checkRecipeInput({ title: 'Ok', tier: 'bronze', eventYear: 2026, airsAmount: 5 })
  );
});

test('only medal managers can handle honor award recipes, and denials are audited', async () => {
  const { service, calls } = build();
  await assert.rejects(
    service.listRecipes(principal('enterprise_admin'), 'req-1'),
    code('PERMISSION_DENIED')
  );
  assert.equal(calls.audits[0].result, 'denied');
  assert.equal((await service.listRecipes(principal('internal_admin'), 'req-2')).length, 1);
});

test('creating a recipe checks the linked project and image host, then audits it', async () => {
  const { service, calls } = build();
  await assert.rejects(
    service.createRecipe(principal('internal_admin'), 'req', { title: 'X', projectId: 'missing' }),
    code('PROJECT_NOT_FOUND')
  );
  await assert.rejects(
    service.createRecipe(principal('internal_admin'), 'req', {
      title: 'X',
      badgeImageUrl: 'https://elsewhere.test/medal.png',
    }),
    code('MEDIA_HOST_NOT_ALLOWED')
  );
  const created = await service.createRecipe(principal('internal_admin'), 'req', {
    title: ' Manglar Verde ',
    projectId: PROJECT_ID,
    badgeImageUrl: 'https://images.example.test/medal.png',
  });
  assert.equal(calls.created[0].title, 'Manglar Verde');
  assert.equal(created.id, RECIPE_ID);
  assert.equal(calls.audits.at(-1).action, 'honor_award_recipe.created');
});

test('granting matches the recipe audience and finds the person by account email', async () => {
  const { service, calls } = build({ users: { 'ada@example.com': 'user-1' } });
  await assert.rejects(
    service.grant(principal('internal_admin'), 'req', RECIPE_ID, {
      recipientType: 'enterprise',
      enterpriseId: ENTERPRISE_ID,
    }),
    code('HONOR_AWARD_AUDIENCE_MISMATCH')
  );
  await assert.rejects(
    service.grant(principal('internal_admin'), 'req', RECIPE_ID, {
      recipientType: 'user',
      email: 'nobody@example.com',
    }),
    code('HONOR_AWARD_RECIPIENT_NOT_FOUND')
  );
  const grant = await service.grant(principal('internal_admin'), 'req', RECIPE_ID, {
    recipientType: 'user',
    email: ' ADA@example.com ',
  });
  assert.equal(grant.userId, 'user-1');
  assert.equal(calls.grants[0].recipientType, 'user');
  assert.equal(calls.audits.at(-1).action, 'honor_award.granted');
});

test('retired recipes cannot be granted; enterprise recipes go to enterprises', async () => {
  const retired = build({ recipes: [recipe({ isActive: false })] });
  await assert.rejects(
    retired.service.grant(principal('internal_admin'), 'req', RECIPE_ID, {
      recipientType: 'user',
      email: 'ada@example.com',
    }),
    code('HONOR_AWARD_NOT_CLAIMABLE')
  );

  const { service } = build({
    recipes: [recipe({ audience: 'enterprise' })],
    enterprises: { [ENTERPRISE_ID]: { id: ENTERPRISE_ID, slug: 'swing', status: 'active' } },
  });
  const grant = await service.grant(principal('internal_admin'), 'req', RECIPE_ID, {
    recipientType: 'enterprise',
    enterpriseId: ENTERPRISE_ID,
  });
  assert.equal(grant.enterpriseId, ENTERPRISE_ID);
});

test('claiming only works on a pending award of the same owner', async () => {
  const ok = build();
  const view = await ok.service.claim({ userId: 'user-1' }, GRANT_ID);
  assert.equal(view.status, 'claimed');
  assert.deepEqual(ok.calls.claims[0], [GRANT_ID, { userId: 'user-1' }]);

  const taken = build({ claimable: false });
  await assert.rejects(
    taken.service.claim({ userId: 'user-2' }, GRANT_ID),
    code('HONOR_AWARD_NOT_CLAIMABLE')
  );
});

test('enterprise pages only show claimed awards of active enterprises', async () => {
  const { service, calls } = build({
    enterprises: {
      swing: { id: ENTERPRISE_ID, slug: 'swing', status: 'active' },
      paused: { id: 'x', slug: 'paused', status: 'paused' },
    },
  });
  await service.listPublicForEnterprise('swing');
  assert.deepEqual(calls.listed[0], [{ enterpriseId: ENTERPRISE_ID }, true]);
  await assert.rejects(service.listPublicForEnterprise('paused'), code('ENTERPRISE_NOT_FOUND'));
});

test('a project medal can only link to an existing recipe for people', async () => {
  const audiences = { [RECIPE_ID]: 'user', other: 'enterprise' };
  const audienceOf = async (id) => audiences[id] ?? null;
  await checkMedalHonorRecipe(undefined, audienceOf);
  await checkMedalHonorRecipe(RECIPE_ID, audienceOf);
  await assert.rejects(checkMedalHonorRecipe('missing', audienceOf), code('HONOR_AWARD_NOT_FOUND'));
  await assert.rejects(
    checkMedalHonorRecipe('other', audienceOf),
    code('HONOR_AWARD_AUDIENCE_MISMATCH')
  );
});

test('award views carry the recipe, the project title and the ally, without admin fields', () => {
  const view = mapHonorAwardView({
    id: GRANT_ID,
    status: 'pending',
    awarded_at: '2026-10-30T00:00:00Z',
    claimed_at: null,
    recipe: {
      id: RECIPE_ID,
      kind: 'medal',
      tier: 'silver',
      audience: 'user',
      title: 'Manglar Verde',
      airs_amount: 10,
      is_active: true,
      sort_order: 1,
      project: {
        id: PROJECT_ID,
        slug: 'fundacion-batis',
        default_locale: 'es',
        content: { es: { title: 'Fundación Batis' } },
      },
      partner: [{ id: ENTERPRISE_ID, slug: 'swing', display_name: 'Swing Golf', logo_url: null }],
    },
  });
  assert.equal(view.recipe.tier, 'silver');
  assert.equal(view.recipe.airsAmount, 10);
  assert.equal('isActive' in view.recipe, false);
  assert.deepEqual(view.project, {
    id: PROJECT_ID,
    slug: 'fundacion-batis',
    title: 'Fundación Batis',
  });
  assert.equal(view.partner.displayName, 'Swing Golf');
});

test('the honor awards migration keeps its tables away from client roles', () => {
  const sql = fs
    .readFileSync(
      path.resolve(__dirname, '../../../supabase/migrations/20261114_0001_honor_awards.sql'),
      'utf8'
    )
    .toLowerCase();
  for (const table of ['honor_award_recipes', 'honor_award_grants']) {
    assert.ok(sql.includes(`alter table public.${table} enable row level security`));
    assert.ok(sql.includes(`revoke all on table public.${table} from public, anon, authenticated`));
  }
  assert.ok(
    sql.includes(
      'revoke all on function public.user_medal_honor_award() from public, anon, authenticated'
    )
  );
  assert.ok(sql.includes('security definer'));
});

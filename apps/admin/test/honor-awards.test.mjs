import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let viteServer;
let copy;
let model;
let page;
let medals;

const recipe = (overrides = {}) => ({
  id: 'r-1',
  kind: 'medal',
  tier: 'gold',
  audience: 'user',
  title: 'Manglar Verde',
  classification: 'Misión de compensación',
  purpose: null,
  eventName: 'Tour Colombia FCG Callaway',
  eventYear: 2026,
  venueName: null,
  venueLocation: null,
  airsAmount: 15,
  badgeImageUrl: null,
  frontImageUrl: null,
  backImageUrl: null,
  projectId: 'p-1',
  partnerEnterpriseId: null,
  isActive: true,
  sortOrder: 1,
  createdAt: 'now',
  updatedAt: 'now',
  ...overrides,
});

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy: copy } = await viteServer.ssrLoadModule('/src/marketplace/copy.ts'));
  model = await viteServer.ssrLoadModule('/src/marketplace/honor-awards.ts');
  medals = await viteServer.ssrLoadModule('/src/marketplace/medals.ts');
  page = await viteServer.ssrLoadModule('/src/pages/marketplace/honor-awards-page.tsx');
});

after(async () => {
  await viteServer?.close();
});

test('a recipe needs a title, valid year, whole Airs and https art', () => {
  const errors = copy.honorAwards.errors;
  const ok = {
    ...model.emptyHonorAwardRecipe,
    title: 'Manglar Verde',
    eventYear: '2026',
    airsAmount: '15',
  };
  assert.deepEqual(model.validateHonorAwardRecipe(ok), {});
  assert.equal(model.validateHonorAwardRecipe({ ...ok, title: ' ' }).title, errors.title);
  assert.equal(
    model.validateHonorAwardRecipe({ ...ok, eventYear: '26' }).eventYear,
    errors.eventYear
  );
  assert.equal(
    model.validateHonorAwardRecipe({ ...ok, airsAmount: '1.5' }).airsAmount,
    errors.airsAmount
  );
  assert.equal(
    model.validateHonorAwardRecipe({ ...ok, badgeImageUrl: 'http://x' }).badgeImageUrl,
    errors.imageUrl
  );
  assert.equal(
    model.validateHonorAwardRecipe({ ...ok, purpose: 'x'.repeat(501) }).purpose,
    errors.tooLong(500)
  );
});

test('the recipe body trims text, sends blanks as null and numbers as numbers', () => {
  const body = model.buildHonorAwardRecipeBody({
    ...model.emptyHonorAwardRecipe,
    title: '  Manglar Verde ',
    eventYear: '2026',
    airsAmount: '10',
    projectId: 'p-1',
  });
  assert.equal(body.title, 'Manglar Verde');
  assert.equal(body.eventYear, 2026);
  assert.equal(body.airsAmount, 10);
  assert.equal(body.purpose, null);
  assert.equal(body.projectId, 'p-1');
  assert.equal(body.partnerEnterpriseId, null);
});

test('a saved recipe round-trips into the form', () => {
  const values = model.recipeToValues(recipe());
  assert.equal(values.eventYear, '2026');
  assert.equal(values.airsAmount, '15');
  assert.equal(values.purpose, '');
});

test('grants go to an account email or an enterprise, as the recipe says', () => {
  const errors = copy.honorAwards.errors;
  const empty = model.emptyHonorAwardGrant;
  assert.equal(model.validateHonorAwardGrant({ audience: 'user' }, empty), errors.email);
  assert.equal(model.validateHonorAwardGrant({ audience: 'enterprise' }, empty), errors.enterprise);
  assert.deepEqual(
    model.buildHonorAwardGrantBody({ audience: 'user' }, { ...empty, email: ' ADA@Example.com ' }),
    { recipientType: 'user', email: 'ada@example.com' }
  );
  assert.deepEqual(
    model.buildHonorAwardGrantBody(
      { audience: 'enterprise' },
      { ...empty, enterpriseId: 'e-1', note: 'Tour' }
    ),
    { recipientType: 'enterprise', enterpriseId: 'e-1', note: 'Tour' }
  );
});

test('active recipes come first, then by order and title', () => {
  const sorted = model.sortHonorAwardRecipes([
    recipe({ id: 'b', isActive: false, sortOrder: 0 }),
    recipe({ id: 'c', sortOrder: 2 }),
    recipe({ id: 'a', sortOrder: 1 }),
  ]);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['a', 'c', 'b']
  );
  assert.equal(model.honorAwardRevokePath('g 1'), '/v1/admin/honor-awards/grants/g%201/revoke');
});

test('the recipe form lists tiers, projects and allies', () => {
  const html = renderToString(
    createElement(page.HonorAwardRecipeForm, {
      values: model.emptyHonorAwardRecipe,
      errors: { title: copy.honorAwards.errors.title },
      editing: false,
      busy: false,
      projects: [
        {
          id: 'p-1',
          slug: 'fundacion-batis',
          defaultLocale: 'es',
          content: { es: { title: 'Fundación Batis' } },
        },
      ],
      enterprises: [{ id: 'e-1', displayName: 'Swing Golf' }],
      onChange: () => {},
      onSubmit: () => {},
      onCancel: () => {},
    })
  );
  for (const text of [
    copy.honorAwards.tiers.gold,
    'Fundación Batis',
    'Swing Golf',
    copy.honorAwards.create,
    copy.honorAwards.errors.title,
  ]) {
    assert.ok(html.includes(text), `missing ${text}`);
  }
});

test('the grants panel asks for an enterprise on ally awards', () => {
  const html = renderToString(
    createElement(page.HonorAwardGrantsPanel, {
      recipe: recipe({ audience: 'enterprise' }),
      enterprises: [{ id: 'e-1', displayName: 'Swing Golf' }],
      onMessage: () => {},
    })
  );
  assert.ok(html.includes(copy.honorAwards.grants.enterprise));
  assert.ok(!html.includes(copy.honorAwards.grants.email));
});

test('a project medal can carry the honor award it also gives', () => {
  const body = medals.buildCreateMedalBody({
    name: 'Oro',
    description: '',
    imageUrl: 'https://images.example.test/oro.png',
    honorRecipeId: 'r-1',
  });
  assert.equal(body.honorRecipeId, 'r-1');
  assert.equal(
    'honorRecipeId' in medals.buildCreateMedalBody({ ...medals.emptyNewMedal, name: 'x' }),
    false
  );
});

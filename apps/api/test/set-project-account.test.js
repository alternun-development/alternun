const assert = require('node:assert/strict');
const test = require('node:test');

async function loadScript() {
  return import('../scripts/set-project-account.mjs');
}

test('project accounts parse as slug=email pairs, normalized and deduplicated', async () => {
  const { parseProjectAccounts } = await loadScript();

  assert.deepEqual(parseProjectAccounts(undefined), []);
  assert.deepEqual(parseProjectAccounts('  '), []);
  assert.deepEqual(
    parseProjectAccounts(' eco-turismo = Account@Example.test , hotel-pilot=hotel@example.test,eco-turismo=account@example.test'),
    [
      { slug: 'eco-turismo', email: 'account@example.test' },
      { slug: 'hotel-pilot', email: 'hotel@example.test' },
    ]
  );
});

test('malformed project account entries are rejected', async () => {
  const { parseProjectAccounts } = await loadScript();

  for (const value of [
    'eco-turismo',
    '=a@example.test',
    'Eco Turismo=a@example.test',
    'eco-turismo=not-an-email',
    'eco-turismo=a@example.test,other',
    'eco-turismo=a@example.test,eco-turismo=b@example.test',
  ]) {
    assert.throws(() => parseProjectAccounts(value), /Invalid project account|two different/, value);
  }
});

function fakePool({ projects = {}, users = {} } = {}) {
  const updates = [];
  return {
    updates,
    query: async (sql, params) => {
      if (sql.includes('from public.projects where slug')) {
        return Object.prototype.hasOwnProperty.call(projects, params[0])
          ? { rowCount: 1, rows: [{ id: 'p' }] }
          : { rowCount: 0, rows: [] };
      }
      if (sql.includes('from public.users')) {
        return users[params[0]] ? { rowCount: 1, rows: [{ id: users[params[0]] }] } : { rowCount: 0, rows: [] };
      }
      updates.push(params);
      return { rowCount: projects[params[0]] === params[1] ? 0 : 1, rows: [] };
    },
  };
}

test('linking sets the verified account once and reports every outcome', async () => {
  const { linkProjectAccounts } = await loadScript();
  const pool = fakePool({
    projects: { 'eco-turismo': null, 'hotel-pilot': 'user-9' },
    users: { 'account@example.test': 'user-1', 'hotel@example.test': 'user-9' },
  });

  const outcomes = await linkProjectAccounts(pool, [
    { slug: 'eco-turismo', email: 'account@example.test' },
    { slug: 'hotel-pilot', email: 'hotel@example.test' },
    { slug: 'missing-project', email: 'account@example.test' },
    { slug: 'eco-turismo', email: 'nobody@example.test' },
  ]);

  assert.deepEqual(
    outcomes.map(({ slug, status }) => `${slug}:${status}`),
    [
      'eco-turismo:linked',
      'hotel-pilot:unchanged',
      'missing-project:project_not_found',
      'eco-turismo:account_not_found',
    ]
  );
  assert.deepEqual(pool.updates, [
    ['eco-turismo', 'user-1'],
    ['hotel-pilot', 'user-9'],
  ]);
});

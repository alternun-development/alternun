const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
require('reflect-metadata');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');

const { UpdateUserAvatarDto, avatarError } = require('../src/modules/airs/me-avatar.controller.ts');
const {
  getAirsLeaderboard,
  getAirsUserAvatar,
  mapAirsUserAvatar,
  setAirsUserAvatar,
} = require('../src/modules/airs/airs.repository.ts');

const ENV = { SUPABASE_URL: 'https://db.example.test/', SUPABASE_SERVICE_ROLE_KEY: 'service' };

function withFetch(handler, run) {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return handler(url, init);
  };
  return Promise.resolve(run(calls)).finally(() => {
    global.fetch = original;
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('avatar errors become 403 / 404 the app can show, others pass through', () => {
  assert.throws(
    () => avatarError(new Error('Supabase RPC failed [400]: AVATAR_NOT_ALLOWED')),
    (error) => error.getStatus() === 403 && error.getResponse().code === 'AVATAR_NOT_ALLOWED'
  );
  assert.throws(
    () => avatarError(new Error('AVATAR_USER_NOT_FOUND')),
    (error) => error.getStatus() === 404 && error.getResponse().code === 'AVATAR_USER_NOT_FOUND'
  );
  const other = new Error('network down');
  assert.throws(
    () => avatarError(other),
    (error) => error === other
  );
  assert.throws(
    () => avatarError('plain failure'),
    (error) => error === 'plain failure'
  );
});

test('the avatar body accepts known kinds, nulls and short refs only', async () => {
  const check = (body) => validate(plainToInstance(UpdateUserAvatarDto, body));
  assert.equal((await check({ kind: 'preset', ref: 'mangrove' })).length, 0);
  assert.equal((await check({ kind: null, ref: null })).length, 0);
  assert.equal((await check({})).length, 0);
  assert.deepEqual(
    (await check({ kind: 'photo-upload' })).map((error) => error.property),
    ['kind']
  );
  assert.deepEqual(
    (await check({ kind: 'preset', ref: 'x'.repeat(81) })).map((error) => error.property),
    ['ref']
  );
  assert.deepEqual(
    (await check({ kind: 'tier', ref: 5 })).map((error) => error.property),
    ['ref']
  );
});

test('avatar payloads are normalized', () => {
  assert.deepEqual(mapAirsUserAvatar(null), { kind: null, ref: null, art: null });
  assert.deepEqual(mapAirsUserAvatar({ kind: 'honor_award', ref: 'g1', art: { tier: 'gold' } }), {
    kind: 'honor_award',
    ref: 'g1',
    art: { tier: 'gold' },
  });
  assert.deepEqual(
    mapAirsUserAvatar({ kind: null, ref: null, art: null, socialUrl: ' https://lh3.test/p ' }),
    {
      kind: null,
      ref: null,
      art: null,
      socialUrl: 'https://lh3.test/p',
    }
  );
  assert.equal(mapAirsUserAvatar({ socialUrl: 'http://insecure.test/p' }).socialUrl, null);
  assert.equal(mapAirsUserAvatar({ socialUrl: null }).socialUrl, null);
  assert.equal('socialUrl' in mapAirsUserAvatar({ kind: 'preset', ref: 'sun' }), false);
  assert.deepEqual(mapAirsUserAvatar({ kind: 3, ref: [], art: 'x' }), {
    kind: null,
    ref: null,
    art: null,
  });
});

test('reading and saving the avatar call the checked RPCs', () =>
  withFetch(
    (url) =>
      json(
        url.endsWith('airs_set_user_avatar')
          ? { kind: 'preset', ref: 'sun', art: null }
          : { kind: null, ref: null, art: null }
      ),
    async (calls) => {
      assert.deepEqual(await getAirsUserAvatar('user-1', ENV), {
        kind: null,
        ref: null,
        art: null,
      });
      assert.deepEqual(
        await setAirsUserAvatar({ userId: 'user-1', kind: 'preset', ref: 'sun' }, ENV),
        { kind: 'preset', ref: 'sun', art: null }
      );
      assert.deepEqual(calls, [
        {
          url: 'https://db.example.test/rest/v1/rpc/airs_get_user_avatar',
          body: { p_user_id: 'user-1' },
        },
        {
          url: 'https://db.example.test/rest/v1/rpc/airs_set_user_avatar',
          body: { p_user_id: 'user-1', p_kind: 'preset', p_ref: 'sun' },
        },
      ]);
    }
  ));

test('a refused badge surfaces as AVATAR_NOT_ALLOWED', () =>
  withFetch(
    () => json({ message: 'AVATAR_NOT_ALLOWED' }, 400),
    async () => {
      await assert.rejects(
        setAirsUserAvatar({ userId: 'user-1', kind: 'tier', ref: 'gold' }, ENV).catch(avatarError),
        (error) => error.getStatus() === 403
      );
    }
  ));

test('leaderboard rows carry the chosen art and nothing for the default', () =>
  withFetch(
    (url) =>
      url.endsWith('airs_get_eligible_users_count')
        ? json([{ count: 2 }])
        : json([
            {
              rank: 1,
              user_id: 'a',
              display_name: 'A****',
              airs_balance: 90,
              airs_lifetime_earned: 90,
              is_me: false,
              avatar_kind: 'honor_award',
              avatar_ref: 'g1',
              avatar_art: { title: 'Manglar Verde', tier: 'gold' },
            },
            {
              rank: 2,
              user_id: 'me',
              display_name: 'Me',
              airs_balance: 10,
              airs_lifetime_earned: 10,
              is_me: true,
              avatar_kind: null,
              avatar_ref: null,
              avatar_art: null,
            },
          ]),
    async () => {
      const result = await getAirsLeaderboard({ requestingUserId: 'me', limit: 7, page: 1 }, ENV);
      assert.deepEqual(result.entries[0].avatar, {
        kind: 'honor_award',
        ref: 'g1',
        art: { title: 'Manglar Verde', tier: 'gold' },
      });
      assert.equal(result.entries[1].avatar, null);
      assert.equal(result.requestingUserEntry.userId, 'me');
    }
  ));

test('the avatar read returns only the person own https photo', () => {
  const sql = fs
    .readFileSync(
      path.resolve(
        __dirname,
        '../../../supabase/migrations/20261114_0004_user_avatar_social_photo.sql'
      ),
      'utf8'
    )
    .toLowerCase();
  assert.ok(sql.includes("'socialurl'"));
  assert.ok(sql.includes("~* '^https://'"));
  assert.ok(sql.includes("to_jsonb(u) ->> 'image'"));
  assert.ok(!sql.includes('airs_get_leaderboard_page'));
  assert.ok(
    sql.includes(
      'revoke all on function public.airs_get_user_avatar(text) from public, anon, authenticated'
    )
  );
  assert.ok(
    sql.includes('grant execute on function public.airs_get_user_avatar(text) to service_role')
  );
});

test('the avatars migration checks ownership and never exposes social photos', () => {
  const sql = fs
    .readFileSync(
      path.resolve(__dirname, '../../../supabase/migrations/20261114_0003_user_avatars.sql'),
      'utf8'
    )
    .toLowerCase();
  for (const fn of [
    'airs_avatar_art(text, text)',
    'airs_get_user_avatar(text)',
    'airs_set_user_avatar(text, text, text)',
    'airs_get_leaderboard_page(text, int, int)',
  ]) {
    assert.ok(sql.includes(`revoke all on function public.${fn} from public, anon, authenticated`));
    assert.ok(sql.includes(`grant execute on function public.${fn} to service_role`));
  }
  assert.ok(sql.includes("raise exception 'avatar_not_allowed'"));
  assert.ok(sql.includes("grant_row.status = 'claimed'"));
  assert.ok(sql.includes('grant_row.user_id = v_user.id::text'));
  assert.ok(
    sql.includes("case when u.avatar_kind = 'social' then null else u.avatar_kind end"),
    'the leaderboard hides social photos'
  );
});

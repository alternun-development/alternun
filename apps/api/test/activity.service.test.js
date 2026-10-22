const assert = require('node:assert/strict');
const test = require('node:test');

const { __activity, ActivityService } = require('../src/modules/activity/activity.service.ts');

test('toLastSeenLabel returns now for recent activity', () => {
  const now = new Date('2026-04-17T12:00:00.000Z');
  assert.equal(__activity.toLastSeenLabel('2026-04-17T11:59:30.000Z', now), 'now');
});

test('toLastSeenLabel returns hours and days labels', () => {
  const now = new Date('2026-04-17T12:00:00.000Z');
  assert.equal(__activity.toLastSeenLabel('2026-04-17T10:00:00.000Z', now), '2h ago');
  assert.equal(__activity.toLastSeenLabel('2026-04-14T12:00:00.000Z', now), '3d ago');
  assert.equal(__activity.toLastSeenLabel(null, now), 'offline');
});

test('toActivityItem maps emoji and actor attribution', () => {
  const row = {
    id: 'act-1',
    user_id: 'user-1',
    activity_type: 'airs_earned',
    message: 'Earned 20 AIRS',
    metadata: { amount: 20 },
    visibility: 'public',
    likes_count: 5,
    comments_count: 2,
    shares_count: 1,
    created_at: '2026-04-17T10:30:00.000Z',
    users: {
      id: 'user-1',
      username: 'ada',
      display_name: 'Ada',
      avatar_url: 'https://example.com/avatar.png',
      last_activity_at: '2026-04-17T10:29:00.000Z',
    },
  };

  const mapped = __activity.toActivityItem(row);
  assert.equal(mapped.icon, '🌱');
  assert.equal(mapped.actor.username, 'ada');
  assert.equal(mapped.actor.displayName, 'Ada');
  assert.equal(mapped.likesCount, 5);
});

test('activity writes fail closed when the internal API key is not configured', async () => {
  const originalKey = process.env.ACTIVITY_INTERNAL_API_KEY;
  delete process.env.ACTIVITY_INTERNAL_API_KEY;

  try {
    await assert.rejects(
      () =>
        new ActivityService().createActivity(
          { userId: 'user-1', type: 'impact', message: 'test' },
          undefined
        ),
      /internal API key is configured/
    );
  } finally {
    if (originalKey === undefined) delete process.env.ACTIVITY_INTERNAL_API_KEY;
    else process.env.ACTIVITY_INTERNAL_API_KEY = originalKey;
  }
});

test('activity writes fail closed when only the public Supabase key is configured', async () => {
  const originalEnv = {
    ACTIVITY_INTERNAL_API_KEY: process.env.ACTIVITY_INTERNAL_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  process.env.ACTIVITY_INTERNAL_API_KEY = 'internal-key';
  process.env.SUPABASE_URL = 'https://supabase.example';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_ANON_KEY = 'anon-key';

  try {
    await assert.rejects(
      () =>
        new ActivityService().createActivity(
          { userId: 'user-1', type: 'impact', message: 'test' },
          'internal-key'
        ),
      /Supabase service-role key is configured/
    );
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

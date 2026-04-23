const assert = require('node:assert/strict');
const test = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');

const { ReferralsService } = require('../src/modules/referrals/referrals.service.ts');

test('ReferralsService can be constructed without Supabase env', () => {
  const originalEnv = { ...process.env };

  try {
    delete process.env.SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    assert.doesNotThrow(() => new ReferralsService());
  } finally {
    process.env = originalEnv;
  }
});

test('ReferralsService.create fails closed when Supabase is unavailable', async () => {
  const originalEnv = { ...process.env };

  try {
    delete process.env.SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    const service = new ReferralsService();

    await assert.rejects(
      service.create('user-123', {
        referred_by_username: 'ada',
        referred_by_email: 'ada@example.com',
        invitation_code: 'invite-123',
      }),
      (error) =>
        error instanceof ServiceUnavailableException &&
        error.getStatus() === 503 &&
        String(error.message).includes('Supabase referrals integration is not configured')
    );
  } finally {
    process.env = originalEnv;
  }
});

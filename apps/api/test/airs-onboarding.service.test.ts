/* eslint-disable */
const assert = require('node:assert/strict');
const test = require('node:test');

const { processAirsOnboarding } = require('../src/modules/airs/airs.service.ts');

test('processAirsOnboarding records the first dashboard visit, awards the bonus, and queues email once', async () => {
  const calls = [];

  const result = await processAirsOnboarding(
    {
      token: 'issuer-session-token',
      locale: 'es-MX',
    },
    {
      verifySessionToken: async (token) => {
        calls.push(['verify', token]);
        return {
          appUserId: 'user-123',
          principalId: 'principal-123',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
          tokenUse: 'access',
          emailVerified: true,
        };
      },
      recordDashboardVisit: async (input) => {
        calls.push(['visit', input]);
        return {
          userId: 'user-123',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          locale: 'es-MX',
          profileComplete: true,
          firstDashboardRecorded: true,
          shouldSendWelcomeEmail: true,
          shouldAwardProfileBonus: true,
          welcomeEmailSentAt: null,
          profileBonusAwardedAt: null,
          profileCompletedAt: '2026-04-17T00:00:00.000Z',
          airsBalance: 0,
          airsLifetimeEarned: 0,
        };
      },
      awardRegistrationBonus: async (input) => {
        calls.push(['registration-bonus', input]);
        return {
          awarded: true,
          airsBalance: 10,
        };
      },
      awardProfileBonus: async (input) => {
        calls.push(['bonus', input]);
        return {
          userId: 'user-123',
          awarded: true,
          airsBalance: 10,
          airsLifetimeEarned: 10,
          ledgerEntryId: 'ledger-1',
        };
      },
      getDashboardSnapshot: async (input) => {
        calls.push(['snapshot', input]);
        return {
          userId: 'user-123',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          locale: 'es-MX',
          profileComplete: true,
          firstDashboardRecorded: true,
          registrationBonusClaimed: true,
          welcomeEmailSentAt: null,
          profileBonusAwardedAt: null,
          profileCompletedAt: '2026-04-17T00:00:00.000Z',
          airsBalance: 20,
          airsLifetimeEarned: 20,
          recentLedgerEntries: [],
        };
      },
      sendWelcomeEmail: async (input) => {
        calls.push(['email', input]);
        return {
          sent: true,
          skipped: false,
        };
      },
      markWelcomeEmailSent: async (input) => {
        calls.push(['email-sent', input]);
        return { marked: true, status: 'marked', welcomeEmailSentAt: '2026-11-20T00:00:00.000Z' };
      },
      renderWelcomeEmail: (input) => ({
        subject: `Bienvenido, ${input.displayName}`,
        preview: 'Preview',
        text: 'text',
        html: '<p>html</p>',
      }),
    }
  );

  assert.equal(result.userId, 'user-123');
  assert.equal(result.profileBonusAwarded, true);
  assert.equal(result.welcomeEmailSent, true);
  assert.equal(result.registrationBonusAwarded, true);
  assert.equal(result.registrationBonusClaimed, true);
  assert.equal(result.airsBalance, 20);
  assert.equal(result.airsLifetimeEarned, 20);
  assert.equal(
    calls.some(([type]) => type === 'registration-bonus'),
    true
  );
  assert.deepEqual(calls[0], ['verify', 'issuer-session-token']);
  assert.equal(
    calls.some(([type]) => type === 'bonus'),
    true
  );
  assert.equal(
    calls.some(([type]) => type === 'email'),
    true
  );
  assert.equal(
    calls.some(([type]) => type === 'email-sent'),
    true
  );
  // The mark is taken before the email goes out.
  assert.ok(
    calls.findIndex(([type]) => type === 'email-sent') <
      calls.findIndex(([type]) => type === 'email')
  );
});

test('processAirsOnboarding is idempotent when the welcome email and bonus are already recorded', async () => {
  const calls = [];

  const result = await processAirsOnboarding(
    {
      token: 'issuer-session-token',
      locale: 'en',
    },
    {
      verifySessionToken: async () => ({
        appUserId: 'user-123',
        principalId: 'principal-123',
        email: 'ada@example.com',
        displayName: 'Ada Lovelace',
        issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
        tokenUse: 'access',
        emailVerified: true,
      }),
      recordDashboardVisit: async (input) => {
        calls.push(['visit', input]);
        return {
          userId: 'user-123',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          locale: 'en',
          profileComplete: true,
          firstDashboardRecorded: false,
          shouldSendWelcomeEmail: false,
          shouldAwardProfileBonus: false,
          welcomeEmailSentAt: '2026-04-17T00:00:00.000Z',
          profileBonusAwardedAt: '2026-04-17T00:00:00.000Z',
          profileCompletedAt: '2026-04-15T00:00:00.000Z',
          airsBalance: 10,
          airsLifetimeEarned: 10,
        };
      },
      awardRegistrationBonus: async (input) => {
        calls.push(['registration-bonus', input]);
        return {
          awarded: false,
          airsBalance: 10,
        };
      },
      awardProfileBonus: async () => {
        calls.push(['bonus']);
        return {
          userId: 'user-123',
          awarded: false,
          airsBalance: 10,
          airsLifetimeEarned: 10,
          ledgerEntryId: 'ledger-1',
        };
      },
      getDashboardSnapshot: async (input) => {
        calls.push(['snapshot', input]);
        return {
          userId: 'user-123',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          locale: 'en',
          profileComplete: true,
          firstDashboardRecorded: false,
          registrationBonusClaimed: true,
          welcomeEmailSentAt: '2026-04-17T00:00:00.000Z',
          profileBonusAwardedAt: '2026-04-17T00:00:00.000Z',
          profileCompletedAt: '2026-04-15T00:00:00.000Z',
          airsBalance: 10,
          airsLifetimeEarned: 10,
          recentLedgerEntries: [],
        };
      },
      sendWelcomeEmail: async () => {
        calls.push(['email']);
        return {
          sent: false,
          skipped: true,
          reason: 'smtp_not_configured',
        };
      },
      markWelcomeEmailSent: async () => {
        calls.push(['email-sent']);
      },
      renderWelcomeEmail: () => ({
        subject: 'Welcome',
        preview: 'Preview',
        text: 'text',
        html: '<p>html</p>',
      }),
    }
  );

  assert.equal(result.profileBonusAwarded, true);
  assert.equal(result.welcomeEmailSent, false);
  assert.equal(result.registrationBonusAwarded, false);
  assert.equal(result.registrationBonusClaimed, true);
  assert.equal(
    calls.some(([type]) => type === 'registration-bonus'),
    true
  );
  assert.equal(
    calls.some(([type]) => type === 'bonus'),
    false
  );
  assert.equal(
    calls.some(([type]) => type === 'email'),
    false
  );
  assert.equal(
    calls.some(([type]) => type === 'email-sent'),
    false
  );
});

test('processAirsOnboarding releases waiting Airs reports before reading the balance', async () => {
  const order = [];
  await processAirsOnboarding(
    { token: 'token', locale: 'es' },
    {
      verifySessionToken: async () => ({
        appUserId: 'user-9',
        principalId: 'user-9',
        email: null,
        displayName: null,
        issuer: 'better-auth',
        tokenUse: 'access',
        emailVerified: true,
      }),
      recordDashboardVisit: async () => ({
        userId: 'user-9',
        email: 'sam@example.test',
        displayName: null,
        locale: 'es',
        profileComplete: false,
        shouldSendWelcomeEmail: false,
        shouldAwardProfileBonus: false,
        profileBonusAwardedAt: null,
      }),
      awardRegistrationBonus: async () => ({ awarded: false }),
      awardProfileBonus: async () => ({ awarded: false, status: 'already_awarded' }),
      claimAirsReports: async (input) => {
        order.push(['claim', input]);
      },
      getDashboardSnapshot: async () => {
        order.push(['snapshot']);
        return { userId: 'user-9', airsBalance: 34 };
      },
      sendWelcomeEmail: async () => ({ sent: false, skipped: true }),
      markWelcomeEmailSent: async () => {},
      renderWelcomeEmail: () => ({ subject: '', preview: '', text: '', html: '' }),
    }
  );
  assert.deepEqual(order, [
    ['claim', { userId: 'user-9', email: 'sam@example.test' }],
    ['snapshot'],
  ]);
});

function welcomeOnboardingDeps(overrides) {
  const calls = [];
  return {
    calls,
    deps: {
      verifySessionToken: async () => ({
        appUserId: 'user-9',
        principalId: 'principal-9',
        email: 'grace@example.com',
        displayName: 'Grace',
        issuer: 'better-auth',
        tokenUse: 'access',
        emailVerified: true,
      }),
      recordDashboardVisit: async () => ({
        userId: 'user-9',
        email: 'grace@example.com',
        displayName: 'Grace',
        locale: 'es',
        profileComplete: false,
        firstDashboardRecorded: false,
        shouldSendWelcomeEmail: true,
        shouldAwardProfileBonus: false,
        welcomeEmailSentAt: null,
        profileBonusAwardedAt: null,
        profileCompletedAt: null,
        airsBalance: 0,
        airsLifetimeEarned: 0,
      }),
      awardRegistrationBonus: async () => ({ awarded: false, airsBalance: 10 }),
      awardProfileBonus: async () => ({ awarded: false }),
      getDashboardSnapshot: async () => {
        calls.push(['snapshot']);
        return {
          userId: 'user-9',
          airsBalance: 10,
          airsLifetimeEarned: 10,
          recentLedgerEntries: [],
        };
      },
      sendWelcomeEmail: async () => {
        calls.push(['email']);
        return { sent: true, skipped: false };
      },
      renderWelcomeEmail: () => ({ subject: 'Hola', preview: '', text: '', html: '' }),
      ...overrides(calls),
    },
  };
}

test('processAirsOnboarding does not send the welcome again when another call took the mark', async () => {
  const { calls, deps } = welcomeOnboardingDeps(() => ({
    markWelcomeEmailSent: async () => ({
      marked: false,
      status: 'already_marked',
      welcomeEmailSentAt: '2026-11-20T00:00:00.000Z',
    }),
  }));

  const result = await processAirsOnboarding({ token: 't' }, deps);

  assert.equal(
    calls.some(([type]) => type === 'email'),
    false
  );
  assert.equal(result.welcomeEmailSent, false);
  assert.equal(result.welcomeEmailSkipped, true);
});

test('processAirsOnboarding finishes without sending when marking the welcome fails', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const { calls, deps } = welcomeOnboardingDeps(() => ({
      markWelcomeEmailSent: async () => {
        throw new Error('Supabase RPC airs_mark_welcome_email_sent failed [404]');
      },
    }));

    const result = await processAirsOnboarding({ token: 't' }, deps);

    assert.equal(
      calls.some(([type]) => type === 'email'),
      false
    );
    assert.equal(
      calls.some(([type]) => type === 'snapshot'),
      true
    );
    assert.equal(result.welcomeEmailSkipped, true);
  } finally {
    console.error = originalError;
  }
});

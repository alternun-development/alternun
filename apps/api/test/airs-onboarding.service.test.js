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
      sendWelcomeEmail: async (input) => {
        calls.push(['email', input]);
        return {
          sent: true,
          skipped: false,
        };
      },
      markWelcomeEmailSent: async (input) => {
        calls.push(['email-sent', input]);
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
  assert.equal(result.airsBalance, 10);
  assert.equal(result.airsLifetimeEarned, 10);
  assert.deepEqual(calls[0], ['verify', 'issuer-session-token']);
  assert.equal(calls.some(([type]) => type === 'bonus'), true);
  assert.equal(calls.some(([type]) => type === 'email'), true);
  assert.equal(calls.some(([type]) => type === 'email-sent'), true);
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
  assert.equal(calls.some(([type]) => type === 'bonus'), false);
  assert.equal(calls.some(([type]) => type === 'email'), false);
  assert.equal(calls.some(([type]) => type === 'email-sent'), false);
});

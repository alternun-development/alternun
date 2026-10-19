/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import { CreateProjectProposalDto } from '../src/modules/marketplace/project-proposal.dto';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import {
  buildProjectProposalEmail,
  ProjectProposalService,
} from '../src/modules/marketplace/project-proposal.service';
import type {
  ProjectProposalInput,
  ProjectProposalRecord,
} from '../src/modules/marketplace/project-proposal.types';

const input: ProjectProposalInput = {
  projectName: 'Community forest',
  location: 'Andes, Colombia',
  category: 'conservation',
  message: 'Restore native forest.',
  contactEmail: 'proposer@example.com',
  contactName: 'Proposal Test',
  language: 'en',
  website: '',
};

const proposal: ProjectProposalRecord = {
  id: '99000000-0000-4000-8000-000000000001',
  projectName: input.projectName,
  location: input.location,
  category: input.category,
  message: input.message ?? null,
  contactEmail: input.contactEmail,
  contactName: input.contactName,
  language: input.language,
  status: 'new',
  createdAt: '2026-10-19T12:00:00.000Z',
};

const env = {
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  MARKETPLACE_CONTACT_EMAIL: 'marketplace@example.com',
};

function fixture(result: { ok: boolean; reasonCode?: string; proposal?: ProjectProposalRecord }) {
  const calls = { stored: [] as unknown[][], emails: [] as unknown[][] };
  const repository = {
    submit: async (...args: unknown[]) => {
      calls.stored.push(args);
      return result;
    },
  };
  const emailSender = async (...args: unknown[]) => {
    calls.emails.push(args);
    return { sent: true, skipped: false };
  };
  return {
    calls,
    service: new ProjectProposalService(repository as never, emailSender as never),
  };
}

test('project proposal DTO validates email, lengths, enums, and rejects extra fields', async () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata = { type: 'body' as const, metatype: CreateProjectProposalDto };

  const transformed = await pipe.transform(
    { ...input, projectName: '  Community forest  ', contactEmail: ' Proposer@Example.com ' },
    metadata
  );
  assert.equal(transformed.projectName, 'Community forest');
  assert.equal(transformed.contactEmail, 'proposer@example.com');

  await assert.rejects(
    pipe.transform({ ...input, contactEmail: 'invalid-email' }, metadata),
    (error: unknown) => error instanceof Error
  );
  await assert.rejects(
    pipe.transform({ ...input, unexpected: 'blocked' }, metadata),
    (error: unknown) => error instanceof Error
  );
});

test('project proposal service stores first and sends to the configured contact mailbox', async () => {
  const testFixture = fixture({ ok: true, proposal });
  const result = await testFixture.service.submit(input, '203.0.113.10', env);

  assert.deepEqual(result, { accepted: true });
  assert.equal(testFixture.calls.stored.length, 1);
  assert.match(String(testFixture.calls.stored[0]?.[1]), /^[0-9a-f]{64}$/);
  assert.equal(testFixture.calls.emails.length, 1);
  const emailInput = testFixture.calls.emails[0]?.[0] as {
    to: string;
    replyTo: string;
  };
  assert.equal(emailInput.to, 'marketplace@example.com');
  assert.equal(emailInput.replyTo, 'proposer@example.com');
});

test('project proposal is kept when the contact mailbox variable is missing', async () => {
  const testFixture = fixture({ ok: true, proposal });
  const result = await testFixture.service.submit(input, '203.0.113.11', {
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  });

  assert.deepEqual(result, { accepted: true });
  assert.equal(testFixture.calls.stored.length, 1);
  assert.equal(testFixture.calls.emails.length, 0);
});

test('project proposal honeypot returns accepted without storing or emailing', async () => {
  const testFixture = fixture({ ok: true, proposal });
  const result = await testFixture.service.submit(
    { ...input, website: 'https://spam.example' },
    '203.0.113.12',
    env
  );

  assert.deepEqual(result, { accepted: true });
  assert.equal(testFixture.calls.stored.length, 0);
  assert.equal(testFixture.calls.emails.length, 0);
});

test('project proposal rate limit maps to HTTP 429', async () => {
  const testFixture = fixture({ ok: false, reasonCode: 'PROJECT_PROPOSAL_RATE_LIMITED' });
  await assert.rejects(
    testFixture.service.submit(input, '203.0.113.13', env),
    (error: unknown) =>
      error instanceof MarketplaceApiError &&
      error.code === 'PROJECT_PROPOSAL_RATE_LIMITED' &&
      error.getStatus() === 429
  );
  assert.equal(testFixture.calls.emails.length, 0);
});

test('project proposal email escapes submitted HTML', () => {
  const email = buildProjectProposalEmail({
    ...proposal,
    projectName: '<script>alert(1)</script>',
    message: '<img src=x onerror=alert(1)>',
  });
  assert.doesNotMatch(email.html, /<script>|<img/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.match(email.text, /<script>alert\(1\)<\/script>/);
});

test('project proposal never sends the raw IP to storage', async () => {
  const testFixture = fixture({ ok: true, proposal });
  await testFixture.service.submit(input, '203.0.113.20', env);
  await testFixture.service.submit(input, '203.0.113.20', env);
  await testFixture.service.submit(input, '198.51.100.7', env);

  const [first, second, third] = testFixture.calls.stored.map((call) => String(call[1]));
  assert.equal(first, second, 'the same IP must map to the same rate-limit bucket');
  assert.notEqual(first, third, 'different IPs must map to different buckets');
  assert.doesNotMatch(JSON.stringify(testFixture.calls.stored), /203\.0\.113\.20|198\.51\.100\.7/);
});

test('project proposal logs no personal data when the notification fails', async () => {
  const { Logger } = require('@nestjs/common');
  const warnings: string[] = [];
  const originalWarn = Logger.prototype.warn;
  Logger.prototype.warn = function (message: unknown) {
    warnings.push(String(message));
  };

  try {
    const repository = { submit: async () => ({ ok: true, proposal }) };
    const failingSender = async () => {
      throw new Error(`SMTP rejected ${proposal.contactEmail}`);
    };
    const service = new ProjectProposalService(repository as never, failingSender as never);
    const result = await service.submit(input, '203.0.113.21', env);

    assert.deepEqual(result, { accepted: true });
    assert.equal(warnings.length, 1);
    const logged = warnings.join('\n');
    for (const value of [
      proposal.contactEmail,
      proposal.contactName,
      proposal.projectName,
      proposal.location,
      env.MARKETPLACE_CONTACT_EMAIL,
      '203.0.113.21',
    ]) {
      assert.ok(!logged.includes(String(value)), `log must not include ${value}`);
    }
  } finally {
    Logger.prototype.warn = originalWarn;
  }
});

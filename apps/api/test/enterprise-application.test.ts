/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateEnterpriseApplicationDto } from '../src/modules/marketplace/enterprise-application.dto';
import { EnterpriseApplicationRepository } from '../src/modules/marketplace/enterprise-application.repository';
import {
  buildEnterpriseApplicationEmail,
  EnterpriseApplicationService,
} from '../src/modules/marketplace/enterprise-application.service';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';

const input = {
  companyName: 'Hoteles Taybo',
  sector: 'Hotelería',
  location: 'Santa Marta, Colombia',
  offer: 'Noches de hospedaje',
  contactName: 'Gloria Castro',
  contactEmail: 'Gloria@Taybo.test',
  language: 'es' as const,
};
const env = {
  SUPABASE_SERVICE_ROLE_KEY: 'secret',
  MARKETPLACE_CONTACT_EMAIL: 'team@alternun.test',
};
const record = {
  id: 'a1',
  companyName: 'Hoteles Taybo',
  legalName: null,
  sector: 'Hotelería',
  location: 'Santa Marta',
  websiteUrl: 'https://taybo.test',
  companySize: '11-50' as const,
  offer: 'Noches <b>',
  interest: null,
  contactName: 'Gloria',
  contactRole: null,
  contactEmail: 'gloria@taybo.test',
  contactPhone: null,
  language: 'es' as const,
  createdAt: '',
};

test('the DTO trims, lowercases the email, treats blank optionals as absent and rejects bad data', () => {
  const ok = plainToInstance(CreateEnterpriseApplicationDto, {
    ...input,
    legalName: '  ',
    websiteUrl: '',
    contactPhone: '+57 300 913 0494',
    companySize: '11-50',
  });
  assert.deepEqual(validateSync(ok), []);
  assert.equal(ok.contactEmail, 'gloria@taybo.test');
  assert.equal(ok.legalName, undefined);
  for (const bad of [
    { companySize: '5000' },
    { websiteUrl: 'javascript:alert(1)' },
    { contactPhone: 'call me' },
    { offer: '' },
    { contactEmail: 'nope' },
  ]) {
    const errors = validateSync(
      plainToInstance(CreateEnterpriseApplicationDto, { ...input, ...bad })
    );
    assert.ok(errors.length > 0, JSON.stringify(bad));
  }
});

test('submissions are stored with a hashed IP, notified to the team, and the honeypot short-circuits', async () => {
  const stored: any[] = [];
  const sent: any[] = [];
  const service = new EnterpriseApplicationService(
    {
      submit: async (data: any, ipHash: string) => (
        stored.push({ data, ipHash }), { ok: true, application: record }
      ),
    } as any,
    (async (message: any) => (sent.push(message), { skipped: false })) as any
  );
  assert.deepEqual(await service.submit({ ...input, faxNumber: 'bot' }, '1.2.3.4', env), {
    accepted: true,
  });
  assert.equal(stored.length, 0);
  assert.deepEqual(await service.submit(input, '1.2.3.4', env), { accepted: true });
  assert.match(stored[0].ipHash, /^[0-9a-f]{64}$/);
  assert.equal(sent[0].to, 'team@alternun.test');
  assert.equal(sent[0].replyTo, 'gloria@taybo.test');
});

test('rate limits surface as API errors and a missing contact email skips the notification', async () => {
  const limited = new EnterpriseApplicationService(
    {
      submit: async () => ({ ok: false, reasonCode: 'ENTERPRISE_APPLICATION_RATE_LIMITED' }),
    } as any,
    (async () => ({})) as any
  );
  await assert.rejects(
    limited.submit(input, '1.2.3.4', env),
    (error: unknown) =>
      error instanceof MarketplaceApiError && error.code === 'ENTERPRISE_APPLICATION_RATE_LIMITED'
  );
  let sent = 0;
  const quiet = new EnterpriseApplicationService(
    { submit: async () => ({ ok: true, application: record }) } as any,
    (async () => (sent++, {})) as any
  );
  await quiet.submit(input, '1.2.3.4', { SUPABASE_SERVICE_ROLE_KEY: 'secret' });
  assert.equal(sent, 0);
});

test('the repository never sends the honeypot to storage and maps the stored row', async () => {
  let params: any;
  const repository = new EnterpriseApplicationRepository({
    rpc: async (_name: string, args: any) => {
      params = args;
      return {
        data: {
          ok: true,
          application: {
            id: 'a1',
            company_name: 'Taybo',
            contact_email: 'g@t.test',
            website_url: null,
          },
        },
        error: null,
      };
    },
  } as any);
  const result = await repository.submit({ ...input, faxNumber: '' }, 'f'.repeat(64));
  assert.equal('faxNumber' in params.p_application, false);
  assert.equal(result.application?.companyName, 'Taybo');
  assert.equal(result.application?.websiteUrl, null);
});

test('the team email lists only filled fields and escapes HTML', () => {
  const email = buildEnterpriseApplicationEmail(record);
  assert.match(email.subject, /Hoteles Taybo/);
  assert.match(email.text, /Sitio web: https:\/\/taybo\.test/);
  assert.doesNotMatch(email.text, /Razón social/);
  assert.match(email.html, /Noches &lt;b&gt;/);
});

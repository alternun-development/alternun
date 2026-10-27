require('reflect-metadata');

const assert = require('node:assert/strict');
const test = require('node:test');
const { validate } = require('class-validator');

const {
  AirsReportProjectAdminController,
  submitRequestId,
} = require('../src/modules/marketplace/airs-report.controller.ts');
const { SubmitAirsReportDto } = require('../src/modules/marketplace/airs-report.dto.ts');

const KEY = '3f2c9a6e-7d41-4c58-9b0e-1a2b3c4d5e6f';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function dto(overrides = {}) {
  return Object.assign(new SubmitAirsReportDto(), {
    recipientEmail: 'guest@example.test',
    amount: 10,
    concept: 'Two nights at the pilot hotel',
    documentNumber: 'INV-1',
    ...overrides,
  });
}

test('a submission uses the key the client sent', () => {
  assert.equal(submitRequestId({ requestKey: KEY }), KEY);
});

test('a submission without a key gets a random one, never a per-process counter', () => {
  const first = submitRequestId({});
  const second = submitRequestId({});

  assert.match(first, UUID_PATTERN);
  assert.match(second, UUID_PATTERN);
  assert.notEqual(first, second);
  assert.doesNotMatch(first, /^req-/);
});

test('the request key must be long enough and use safe characters', async () => {
  assert.equal((await validate(dto())).length, 0);
  assert.equal((await validate(dto({ requestKey: KEY }))).length, 0);

  for (const requestKey of ['req-1', 'short', 'has spaces in the key 12345', `${KEY}\n`, 'a'.repeat(101), '-'.repeat(20)]) {
    const errors = await validate(dto({ requestKey }));
    assert.equal(errors.length, 1, requestKey);
    assert.equal(errors[0].property, 'requestKey');
  }
});

test('the controller submits with the client key, not the Fastify request id', async () => {
  const calls = [];
  const controller = new AirsReportProjectAdminController({
    submit: async (principal, requestId, projectId, body) => {
      calls.push({ requestId, projectId, body });
      return { ok: true };
    },
  });
  const request = { id: 'req-1', headers: {}, adminPrincipal: { sub: 'admin-1', roles: [] } };

  await controller.submit(request, '20000000-0000-4000-8000-00000000000a', dto({ requestKey: KEY }));
  await controller.submit(request, '20000000-0000-4000-8000-00000000000a', dto());
  await controller.submit(request, '20000000-0000-4000-8000-00000000000a', dto());

  assert.equal(calls[0].requestId, KEY);
  assert.match(calls[1].requestId, UUID_PATTERN);
  assert.match(calls[2].requestId, UUID_PATTERN);
  assert.notEqual(calls[1].requestId, calls[2].requestId);
  assert.ok(calls.every((call) => call.requestId !== 'req-1'));
});

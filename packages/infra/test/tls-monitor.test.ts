import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { TLSSocket } from 'node:tls';
import {
  checkExpiry,
  checkEndpoint,
  checkAcmCertificate,
  defaultHosts,
} from '../scripts/check-tls.ts';

void test('default TLS hosts include the public redirect endpoints', () => {
  assert.ok(defaultHosts.includes('air.alternun.co'));
  assert.ok(defaultHosts.includes('alternun.co'));
});

void test('expiry monitor rejects expired, near-expiry and missing certificates', () => {
  const now = Date.parse('2026-09-18T00:00:00Z');
  assert.throws(() => checkExpiry('2026-09-17T23:59:59Z', 30, now), /remaining/);
  assert.throws(() => checkExpiry('2026-09-19T00:00:00Z', 30, now), /remaining/);
  assert.throws(() => checkExpiry(undefined, 30, now), /invalid/);
  assert.match(checkExpiry('2026-11-02T23:59:59Z', 30, now), /2026-11-02/);
});

void test('TLS monitor enforces verification and SNI, and propagates handshake failure', async () => {
  const socket = Object.assign(new EventEmitter(), { destroy() {} });
  const pending = checkEndpoint('airs.alternun.co', {
    connect(options) {
      assert.equal(options.rejectUnauthorized, true);
      assert.equal(options.servername, 'airs.alternun.co');
      return socket as unknown as TLSSocket;
    },
  });
  socket.emit('error', new Error('certificate has expired'));
  await assert.rejects(pending, /certificate has expired/);
});

void test('TLS monitor bounds stalled DNS and handshake and closes socket', async () => {
  let destroyed = false;
  const socket = Object.assign(new EventEmitter(), {
    destroy() {
      destroyed = true;
    },
  });
  await assert.rejects(
    checkEndpoint('airs.alternun.co', {
      timeoutMs: 10,
      connect: () => socket as unknown as TLSSocket,
    }),
    /timed out/
  );
  assert.equal(destroyed, true);
});

const certificate = () => ({
  Type: 'AMAZON_ISSUED',
  Status: 'ISSUED',
  RenewalEligibility: 'ELIGIBLE',
  NotAfter: new Date(Date.now() + 90 * 86400000).toISOString(),
  DomainValidationOptions: [
    {
      DomainName: 'airs.alternun.co',
      ValidationMethod: 'DNS',
      ResourceRecord: {
        Name: '_token.airs.alternun.co.',
        Type: 'CNAME',
        Value: '_target.acm-validations.aws.',
      },
    },
  ],
});

void test('ACM audit detects missing renewal CNAME while original issuance status is successful', async () => {
  await assert.rejects(
    checkAcmCertificate(certificate(), { lookup: () => Promise.resolve([]) }),
    /Incorrect renewal CNAME/
  );
  await assert.rejects(
    checkAcmCertificate(certificate(), {
      lookup: () => Promise.reject(new Error('NXDOMAIN')),
    }),
    /Missing or unresolvable/
  );
});

void test('ACM audit rejects blocked renewals and accepts correct DNS independent of trailing dot', async () => {
  const lookup = () => Promise.resolve(['_target.acm-validations.aws']);
  assert.match(await checkAcmCertificate(certificate(), { lookup }), /verified/);
  await assert.rejects(
    checkAcmCertificate(
      { ...certificate(), RenewalSummary: { RenewalStatus: 'PENDING_VALIDATION' } },
      { lookup }
    ),
    /PENDING_VALIDATION/
  );
  await assert.rejects(
    checkAcmCertificate({ ...certificate(), RenewalEligibility: 'INELIGIBLE' }, { lookup }),
    /not eligible/
  );
});

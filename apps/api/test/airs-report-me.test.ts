/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { after, before, test } from 'node:test';
import { Module, ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AirsReportMeController } from '../src/modules/marketplace/airs-report.controller';
import { AirsReportRepository } from '../src/modules/marketplace/airs-report.repository';
import {
  AIRS_REPORT_NOTIFY_ISSUED,
  AIRS_REPORT_NOTIFY_WORKFLOW,
  AirsReportService,
} from '../src/modules/marketplace/airs-report.service';
import { MarketplaceExceptionFilter } from '../src/modules/marketplace/marketplace.errors';
import { MarketplaceParticipantRepository } from '../src/modules/marketplace/marketplace-participant.repository';
import { MarketplaceParticipantService } from '../src/modules/marketplace/marketplace-participant.service';
import { MarketplaceAdminRepository } from '../src/modules/marketplace/marketplace.repository';
import { ProjectClientRepository } from '../src/modules/marketplace/project-client.repository';
import { ProjectClientService } from '../src/modules/marketplace/project-client.service';
import { ProjectManageAccess } from '../src/modules/marketplace/project-manage.service';

const ISSUER = 'https://sso.example/application/o/alternun-admin/';
const projectId = '20000000-0000-4000-8000-00000000000a';
const reportId = '30000000-0000-4000-8000-000000000001';
const otherReportId = '30000000-0000-4000-8000-000000000002';
const hash = 'a'.repeat(64);

const report = {
  id: reportId,
  projectId,
  status: 'pending_approval',
  recipientEmail: 'guest@example.test',
  recipientName: null,
  recipientUserId: null,
  amount: 150,
  concept: 'Two nights at the pilot hotel',
  medalId: null,
  documentNumber: 'INV-1',
  documentSha256: null,
  snapshotHash: hash,
  submittedBy: { issuer: 'issuer', subject: 'submitter' },
  submittedAt: '2026-11-10T15:00:00.000Z',
  decision: null,
  releasedAt: null,
  ledgerEntryId: null,
  cancelledAt: null,
  cancellationReason: null,
  reversedAt: null,
  reversalReason: null,
  updatedAt: '2026-11-10T15:00:00.000Z',
};
const otherReport = { ...report, id: otherReportId, projectId: 'missing-project' };
const decidedReportId = '30000000-0000-4000-8000-000000000003';
const decidedReport = { ...report, id: decidedReportId, status: 'released' };

// ─── Principal bridge ────────────────────────────────────────────────────────

function approverAccess(email: string | null, globalRole: string | null) {
  const instance = new ProjectManageAccess(
    {
      findVerifiedEmail: async () => email,
      findGlobalRole: async () => globalRole,
    } as any,
    {} as any
  );
  instance.resolveUser = async () => 'user-1';
  instance.env = { ADMIN_AUTH_ISSUER: ISSUER };
  return instance;
}

test('the approver principal comes from the session user and their verified email', async () => {
  const principal = await approverAccess('ana@alternun.io', 'internal_admin').resolveApprover(
    'Bearer t'
  );
  assert.deepEqual(principal, {
    iss: ISSUER,
    aud: 'airs-app',
    sub: 'airs-user:user-1',
    roles: ['internal_admin'],
    organizationIds: [],
    email: 'ana@alternun.io',
    emailVerified: true,
  });

  const plain = await approverAccess('ana@example.test', null).resolveApprover('Bearer t');
  assert.deepEqual(plain.roles, []);
  assert.equal(plain.emailVerified, true);

  // Without a verified email nobody is an approver: the service sees no email.
  const unverified = await approverAccess(null, null).resolveApprover('Bearer t');
  assert.equal(unverified.email, undefined);
  assert.equal(unverified.emailVerified, false);
});

// ─── HTTP ────────────────────────────────────────────────────────────────────

const APPROVERS = ['approver@example.test', 'guest@example.test'];
const state = {
  calls: [] as string[],
  audits: [] as any[],
};

function principalFor(token: string) {
  const email = token.replace(/^Bearer\s+/i, '');
  return {
    iss: ISSUER,
    aud: 'airs-app',
    sub: `airs-user:${email}`,
    roles: [],
    organizationIds: [],
    email: email || undefined,
    emailVerified: Boolean(email),
  };
}

const reportRepository = {
  isApprover: async (approver: { email?: string; emailVerified?: boolean }) =>
    approver.emailVerified === true && APPROVERS.includes(String(approver.email)),
  listByStatus: async () => [report, otherReport],
  find: async (id: string) =>
    [report, otherReport, decidedReport].find((item) => item.id === id) ?? null,
  findSubmitterEmail: async () => 'submitter@example.test',
  recipientTotals: async () => ({
    timeZone: 'America/Bogota',
    day: '2026-11-10',
    month: '2026-11',
    dailyTotal: 150,
    monthlyTotal: 150,
    dailyLimit: 100,
    monthlyLimit: 300,
  }),
  listTimeline: async () => [],
  listRewards: async () => [],
  approve: async (id: string, snapshotHash: string) => {
    state.calls.push(`approve:${id}:${snapshotHash}`);
    return { report: { ...report, status: 'released' }, idempotent: false };
  },
  reject: async (id: string, reason: string) => {
    state.calls.push(`reject:${id}:${reason}`);
    return { report: { ...report, status: 'rejected' }, idempotent: false };
  },
};

const adminRepository = {
  findProject: async (id: string) =>
    id === projectId
      ? {
          id,
          slug: 'hotel-piloto',
          defaultLocale: 'es',
          content: { es: { title: 'Hotel piloto' } },
        }
      : null,
  audit: async (input: unknown) => {
    state.audits.push(input);
  },
};

const clientRepository = {
  proofReportIds: async () => new Set([reportId]),
  readProof: async (id: string) =>
    id === reportId || id === decidedReportId
      ? { bytes: Buffer.from('%PDF-1.4'), contentType: 'application/pdf', fileName: 'soporte.pdf' }
      : null,
};

let app: INestApplication;

class AirsReportMeTestModule {}
Module({
  controllers: [AirsReportMeController],
  providers: [
    AirsReportService,
    ProjectClientService,
    MarketplaceExceptionFilter,
    { provide: AirsReportRepository, useValue: reportRepository },
    { provide: MarketplaceAdminRepository, useValue: adminRepository },
    { provide: ProjectClientRepository, useValue: clientRepository },
    { provide: MarketplaceParticipantService, useValue: {} },
    { provide: MarketplaceParticipantRepository, useValue: {} },
    { provide: AIRS_REPORT_NOTIFY_ISSUED, useValue: async () => {} },
    { provide: AIRS_REPORT_NOTIFY_WORKFLOW, useValue: async () => {} },
    {
      provide: ProjectManageAccess,
      useValue: { resolveApprover: async (token: string) => principalFor(token) },
    },
  ],
})(AirsReportMeTestModule);

before(async () => {
  app = await NestFactory.create(AirsReportMeTestModule, new FastifyAdapter(), { logger: false });
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

after(async () => {
  await app?.close();
});

function inject(method: string, url: string, email?: string, payload?: unknown) {
  return app
    .getHttpAdapter()
    .getInstance()
    .inject({
      method,
      url,
      headers: email === undefined ? {} : { authorization: `Bearer ${email}` },
      ...(payload === undefined ? {} : { payload }),
    });
}

test('without a session the review answers 401', async () => {
  const response = await inject('GET', '/v1/me/airs-reports/access');
  assert.equal(response.statusCode, 401);
});

test('access says whether the person may approve, without an audit entry', async () => {
  state.audits.length = 0;
  const approver = await inject('GET', '/v1/me/airs-reports/access', 'approver@example.test');
  assert.equal(approver.statusCode, 200);
  assert.deepEqual(approver.json(), { canApprove: true });

  const other = await inject('GET', '/v1/me/airs-reports/access', 'someone@example.test');
  assert.equal(other.statusCode, 200);
  assert.deepEqual(other.json(), { canApprove: false });
  assert.equal(state.audits.length, 0);
});

test('non-approvers are refused the queue, the detail and the file', async () => {
  state.audits.length = 0;
  const queue = await inject('GET', '/v1/me/airs-reports', 'someone@example.test');
  assert.equal(queue.statusCode, 403);
  assert.equal(queue.json().code, 'AIRS_REPORT_APPROVER_NOT_ALLOWED');
  assert.equal(state.audits[0]?.reasonCode, 'AIRS_REPORT_APPROVER_NOT_ALLOWED');

  const detail = await inject('GET', `/v1/me/airs-reports/${reportId}`, 'someone@example.test');
  assert.equal(detail.statusCode, 403);

  const proof = await inject(
    'GET',
    `/v1/me/airs-reports/${reportId}/proof`,
    'someone@example.test'
  );
  assert.equal(proof.statusCode, 403);
  assert.equal(proof.json().code, 'AIRS_REPORT_APPROVER_NOT_ALLOWED');
});

test('approvers list the queue with project title and file flag', async () => {
  const response = await inject('GET', '/v1/me/airs-reports', 'approver@example.test');
  assert.equal(response.statusCode, 200);
  const [first, second] = response.json();
  assert.equal(first.id, reportId);
  assert.equal(first.projectTitle, 'Hotel piloto');
  assert.equal(first.hasProof, true);
  assert.equal(second.projectTitle, null);
  assert.equal(second.hasProof, false);
});

test('approvers read the detail with the recipient totals and the file', async () => {
  const detail = await inject('GET', `/v1/me/airs-reports/${reportId}`, 'approver@example.test');
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().report.snapshotHash, hash);
  assert.equal(detail.json().recipientTotals.dailyLimit, 100);

  const proof = await inject(
    'GET',
    `/v1/me/airs-reports/${reportId}/proof`,
    'approver@example.test'
  );
  assert.equal(proof.statusCode, 200);
  assert.equal(proof.headers['content-type'], 'application/pdf');
  assert.equal(proof.headers['cache-control'], 'private, no-store');
  assert.equal(proof.body, '%PDF-1.4');

  const missing = await inject(
    'GET',
    `/v1/me/airs-reports/${otherReportId}/proof`,
    'approver@example.test'
  );
  assert.equal(missing.statusCode, 404);
  // Decided reports keep their file, but approvers no longer read it.
  const decided = await inject(
    'GET',
    `/v1/me/airs-reports/${decidedReportId}/proof`,
    'approver@example.test'
  );
  assert.equal(decided.statusCode, 404);
});

test('approvers approve with the snapshot hash and reject with a reason', async () => {
  state.calls.length = 0;
  const approved = await inject(
    'POST',
    `/v1/me/airs-reports/${reportId}/approve`,
    'approver@example.test',
    { snapshotHash: hash }
  );
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().report.status, 'released');

  const rejected = await inject(
    'POST',
    `/v1/me/airs-reports/${reportId}/reject`,
    'approver@example.test',
    { reason: 'No invoice attached' }
  );
  assert.equal(rejected.statusCode, 200);
  assert.deepEqual(state.calls, [
    `approve:${reportId}:${hash}`,
    `reject:${reportId}:No invoice attached`,
  ]);
});

test('the body is validated before reaching the service', async () => {
  state.calls.length = 0;
  const badHash = await inject(
    'POST',
    `/v1/me/airs-reports/${reportId}/approve`,
    'approver@example.test',
    { snapshotHash: 'nope' }
  );
  assert.equal(badHash.statusCode, 400);
  const longReason = await inject(
    'POST',
    `/v1/me/airs-reports/${reportId}/reject`,
    'approver@example.test',
    { reason: 'x'.repeat(501) }
  );
  assert.equal(longReason.statusCode, 400);
  assert.deepEqual(state.calls, []);
});

test('an approver cannot approve or reject Airs addressed to them', async () => {
  state.calls.length = 0;
  for (const [path, payload] of [
    ['approve', { snapshotHash: hash }],
    ['reject', { reason: 'Mine' }],
  ] as const) {
    const response = await inject(
      'POST',
      `/v1/me/airs-reports/${reportId}/${path}`,
      'guest@example.test',
      payload
    );
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'AIRS_REPORT_SELF_APPROVAL_DENIED');
  }
  assert.deepEqual(state.calls, []);
});

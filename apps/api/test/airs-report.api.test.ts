/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { after, before, test } from 'node:test';
import { Module, ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import { AdminAuthGuard } from '../src/common/admin-auth/admin-auth.nest.guard';
import {
  AirsReportAdminController,
  AirsReportProjectAdminController,
} from '../src/modules/marketplace/airs-report.controller';
import { AirsReportRepository } from '../src/modules/marketplace/airs-report.repository';
import { AirsReportService } from '../src/modules/marketplace/airs-report.service';
import {
  MarketplaceApiError,
  MarketplaceExceptionFilter,
} from '../src/modules/marketplace/marketplace.errors';
import { MarketplaceAdminGuard } from '../src/modules/marketplace/marketplace.guard';
import { MarketplaceAdminRepository } from '../src/modules/marketplace/marketplace.repository';

const projectA = {
  id: '20000000-0000-4000-8000-00000000000a',
  enterpriseId: '10000000-0000-4000-8000-000000000001',
};
const projectB = {
  id: '20000000-0000-4000-8000-00000000000b',
  enterpriseId: '10000000-0000-4000-8000-000000000001',
};
const reportId = '30000000-0000-4000-8000-000000000001';
const hash = 'a'.repeat(64);

const reportJson = {
  id: reportId,
  projectId: projectA.id,
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
  submittedBy: { issuer: 'issuer', subject: 'sub_admin-subject' },
  submittedAt: '2026-10-27T15:00:00.000000Z',
  decision: null,
  releasedAt: null,
  ledgerEntryId: null,
  cancelledAt: null,
  cancellationReason: null,
  reversedAt: null,
  reversalReason: null,
  updatedAt: '2026-10-27T15:00:00.000000Z',
};
const totalsJson = {
  timeZone: 'America/Bogota',
  day: '2026-10-27',
  month: '2026-10',
  dailyTotal: 150,
  monthlyTotal: 150,
  dailyLimit: 100,
  monthlyLimit: 300,
};
const reportRow = {
  id: reportId,
  project_id: projectA.id,
  status: 'pending_approval',
  recipient_email: 'guest@example.test',
  recipient_name: null,
  recipient_user_id: null,
  amount: 150,
  concept: 'Two nights at the pilot hotel',
  medal_id: null,
  document_number: 'INV-1',
  document_sha256: null,
  snapshot_hash: hash,
  submitted_by_issuer: 'issuer',
  submitted_by_subject: 'sub_admin-subject',
  submitted_at: '2026-10-27T15:00:00.000000Z',
  decided_at: null,
  updated_at: '2026-10-27T15:00:00.000000Z',
};

function principal(role: string, email?: string, emailVerified = true): AdminPrincipal {
  return {
    iss: 'issuer',
    aud: 'admin',
    sub: `${role}-subject`,
    roles: [role],
    organizationIds: [],
    ...(email ? { email, emailVerified } : {}),
  };
}

function expectApiError(code: string, status: number) {
  return (error: unknown) =>
    error instanceof MarketplaceApiError && error.code === code && error.getStatus() === status;
}

// Fake Supabase client: records RPC calls and serves queued results.
function fakeClient(
  options: {
    rpc?: Record<string, unknown>;
    rpcError?: boolean;
    approvers?: string[];
    rows?: unknown[];
  } = {}
) {
  const calls: Array<{ name: string; params: Record<string, any> }> = [];
  const client = {
    calls,
    rpc: async (name: string, params: Record<string, any>) => {
      calls.push({ name, params });
      if (options.rpcError) return { data: null, error: { message: 'down' } };
      return { data: options.rpc?.[name] ?? null, error: null };
    },
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query: any = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters[column] = value;
          return query;
        },
        order: () => query,
        limit: () => query,
        maybeSingle: async () => {
          if (table === 'airs_report_approvers') {
            const found = (options.approvers ?? []).includes(String(filters.email));
            return { data: found ? { email: filters.email } : null, error: null };
          }
          const row = (options.rows ?? []).find((item: any) => item.id === filters.id);
          return { data: row ?? null, error: null };
        },
        then: (resolve: (value: unknown) => unknown) =>
          resolve({ data: options.rows ?? [], error: null }),
      };
      return query;
    },
  };
  return client;
}

function adminRepository(scopedProjects: string[] = [projectA.id]) {
  const audits: any[] = [];
  return {
    audits,
    findProject: async (id: string) =>
      [projectA, projectB].find((project) => project.id === id) ?? null,
    actorHasScope: async (
      _actor: unknown,
      _roles: unknown,
      _enterpriseId: string,
      projectId: string | null
    ) => !!projectId && scopedProjects.includes(projectId),
    audit: async (input: unknown) => {
      audits.push(input);
    },
  };
}

// ─── Repository ──────────────────────────────────────────────────────────────

test('submit sends the actor and the report to the database and maps the result', async () => {
  const client = fakeClient({
    rpc: {
      marketplace_submit_airs_report: {
        ok: true,
        idempotent: false,
        report: reportJson,
        autoApproval: { approved: false, blockedReason: 'SELF_REPORT', totals: totalsJson },
      },
    },
  });
  const repository = new AirsReportRepository(client as never);
  const result = await repository.submit(
    projectA.id,
    {
      recipientEmail: 'guest@example.test',
      amount: 150,
      concept: 'Two nights at the pilot hotel',
      documentNumber: 'INV-1',
    },
    { issuer: 'issuer', subject: 'sub_admin-subject', roles: ['sub_admin'] },
    { email: 'moderator@example.test', emailVerified: true },
    'request-1'
  );
  assert.deepEqual(client.calls[0], {
    name: 'marketplace_submit_airs_report',
    params: {
      p_project_id: projectA.id,
      p_recipient_email: 'guest@example.test',
      p_recipient_name: null,
      p_amount: 150,
      p_concept: 'Two nights at the pilot hotel',
      p_medal_id: null,
      p_document_number: 'INV-1',
      p_document_sha256: null,
      p_actor_issuer: 'issuer',
      p_actor_subject: 'sub_admin-subject',
      p_actor_roles: ['sub_admin'],
      p_actor_email: 'moderator@example.test',
      p_actor_email_verified: true,
      p_request_id: 'request-1',
    },
  });
  assert.equal(result.report.status, 'pending_approval');
  assert.equal(result.autoApproval.approved, false);
  assert.equal(result.autoApproval.blockedReason, 'SELF_REPORT');
  assert.deepEqual(result.autoApproval.totals, totalsJson);
});

test('approve and reject pass the verified email used by the approver allowlist', async () => {
  const client = fakeClient({
    rpc: {
      marketplace_approve_airs_report: {
        ok: true,
        idempotent: false,
        report: { ...reportJson, status: 'released' },
      },
      marketplace_reject_airs_report: {
        ok: true,
        idempotent: true,
        report: { ...reportJson, status: 'rejected' },
      },
    },
  });
  const repository = new AirsReportRepository(client as never);
  const actor = { issuer: 'issuer', subject: 'approver', roles: ['internal_admin'] };
  const approved = await repository.approve(
    reportId,
    hash,
    actor,
    { email: 'approver@example.test', emailVerified: true },
    'r1'
  );
  const rejected = await repository.reject(reportId, 'No invoice', actor, {}, 'r2');
  assert.equal(client.calls[0]?.params.p_actor_email, 'approver@example.test');
  assert.equal(client.calls[0]?.params.p_actor_email_verified, true);
  assert.equal(client.calls[0]?.params.p_snapshot_hash, hash);
  assert.equal(client.calls[1]?.params.p_actor_email, null);
  assert.equal(client.calls[1]?.params.p_actor_email_verified, false);
  assert.equal(approved.report.status, 'released');
  assert.equal(rejected.idempotent, true);
});

test('database reason codes map to API errors', async () => {
  for (const [reasonCode, status] of [
    ['AIRS_REPORT_SELF_APPROVAL_DENIED', 403],
    ['AIRS_REPORT_APPROVER_NOT_ALLOWED', 403],
    ['PROJECT_SCOPE_DENIED', 403],
    ['AIRS_REPORT_SNAPSHOT_MISMATCH', 409],
    ['AIRS_REPORT_TRANSITION_INVALID', 409],
    ['AIRS_REPORT_RECIPIENT_NAME_REQUIRED', 422],
    ['AIRS_REPORT_REASON_REQUIRED', 422],
    ['AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED', 422],
    ['AIRS_REPORT_LOOKUP_RATE_LIMITED', 429],
    ['AIRS_REPORT_NOT_FOUND', 404],
  ] as const) {
    const repository = new AirsReportRepository(
      fakeClient({ rpc: { marketplace_approve_airs_report: { ok: false, reasonCode } } }) as never
    );
    await assert.rejects(
      repository.approve(reportId, hash, { issuer: 'i', subject: 's', roles: [] }, {}, 'r'),
      expectApiError(reasonCode, status)
    );
  }
  const unavailable = new AirsReportRepository(fakeClient({ rpcError: true }) as never);
  await assert.rejects(
    unavailable.cancel(reportId, 'reason', { issuer: 'i', subject: 's', roles: [] }, 'r'),
    expectApiError('MARKETPLACE_UNAVAILABLE', 503)
  );
});

// ─── Service ─────────────────────────────────────────────────────────────────

test('the review queue is limited to verified, allowlisted approvers', async () => {
  const approvers = ['approver@example.test'];
  for (const [actor, allowed] of [
    [principal('platform_owner'), false],
    [principal('internal_admin', 'someone@example.test'), false],
    [principal('internal_admin', 'approver@example.test', false), false],
    [principal('internal_admin', 'approver@example.test', true), true],
  ] as const) {
    const admin = adminRepository();
    const service = new AirsReportService(
      new AirsReportRepository(fakeClient({ approvers, rows: [reportRow] }) as never),
      admin as never
    );
    if (allowed) {
      const queue = await service.reviewQueue(actor, 'r');
      assert.equal(queue[0]?.id, reportId);
    } else {
      await assert.rejects(
        service.reviewQueue(actor, 'r'),
        expectApiError('AIRS_REPORT_APPROVER_NOT_ALLOWED', 403)
      );
      assert.equal(admin.audits[0]?.reasonCode, 'AIRS_REPORT_APPROVER_NOT_ALLOWED');
    }
  }
});

test('report detail is visible to approvers and scoped submitters only', async () => {
  const client = fakeClient({
    approvers: ['approver@example.test'],
    rows: [reportRow],
    rpc: { airs_report_recipient_totals: totalsJson },
  });
  const scopedToA = new AirsReportService(
    new AirsReportRepository(client as never),
    adminRepository([projectA.id]) as never
  );
  const scopedToB = new AirsReportService(
    new AirsReportRepository(client as never),
    adminRepository([projectB.id]) as never
  );

  const detail = await scopedToA.detail(principal('sub_admin'), 'r', reportId);
  assert.equal(detail.report.id, reportId);
  assert.deepEqual(detail.recipientTotals, totalsJson);
  assert.equal(
    (await scopedToB.detail(principal('internal_admin'), 'r', reportId)).report.id,
    reportId
  );
  assert.equal(
    (await scopedToB.detail(principal('moderator', 'approver@example.test'), 'r', reportId)).report
      .id,
    reportId
  );
  await assert.rejects(
    scopedToB.detail(principal('sub_admin'), 'r', reportId),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
  await assert.rejects(
    scopedToB.detail(principal('partner_readonly'), 'r', reportId),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
  await assert.rejects(
    scopedToA.detail(principal('sub_admin'), 'r', '30000000-0000-4000-8000-000000000099'),
    expectApiError('AIRS_REPORT_NOT_FOUND', 404)
  );
});

// ─── HTTP ────────────────────────────────────────────────────────────────────

let app: INestApplication;
let httpClient = fakeClient();
let httpAdmin = adminRepository();

class AirsReportHttpTestModule {}
Module({
  controllers: [AirsReportProjectAdminController, AirsReportAdminController],
  providers: [
    AirsReportService,
    MarketplaceAdminGuard,
    MarketplaceExceptionFilter,
    {
      provide: AirsReportRepository,
      useFactory: () => new AirsReportRepository(httpClient as never),
    },
    { provide: MarketplaceAdminRepository, useFactory: () => httpAdmin },
    {
      provide: AdminAuthGuard,
      useValue: {
        canActivate: async (context: any) => {
          const request = context.switchToHttp().getRequest();
          const role = String(request.headers['x-test-role'] ?? '');
          const email = request.headers['x-test-email'];
          request.adminPrincipal = principal(role, email ? String(email) : undefined);
          return true;
        },
      },
    },
  ],
})(AirsReportHttpTestModule);

before(async () => {
  httpClient = fakeClient({
    approvers: ['approver@example.test'],
    rows: [reportRow],
    rpc: {
      marketplace_submit_airs_report: {
        ok: true,
        idempotent: false,
        report: reportJson,
        autoApproval: { approved: false, totals: totalsJson },
      },
      marketplace_approve_airs_report: {
        ok: false,
        reasonCode: 'AIRS_REPORT_SELF_APPROVAL_DENIED',
      },
      marketplace_lookup_airs_report_recipient: {
        ok: false,
        reasonCode: 'AIRS_REPORT_LOOKUP_RATE_LIMITED',
      },
    },
  });
  httpAdmin = adminRepository([projectA.id]);
  app = await NestFactory.create(AirsReportHttpTestModule, new FastifyAdapter(), { logger: false });
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

function inject(method: string, url: string, role: string, payload?: unknown, email?: string) {
  return app
    .getHttpAdapter()
    .getInstance()
    .inject({
      method,
      url,
      headers: { 'x-test-role': role, ...(email ? { 'x-test-email': email } : {}) },
      ...(payload === undefined ? {} : { payload }),
    });
}

const submitBody = {
  recipientEmail: 'guest@example.test',
  amount: 150,
  concept: 'Two nights at the pilot hotel',
  documentNumber: 'INV-1',
};

test('POST submit returns the report for a scoped moderator', async () => {
  const response = await inject(
    'POST',
    `/v1/admin/projects/${projectA.id}/airs-reports`,
    'sub_admin',
    submitBody
  );
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().report.status, 'pending_approval');
  assert.equal(response.json().autoApproval.totals.dailyLimit, 100);
});

test('submit passes the submitter token email so a missing or unverified one cannot skip the self-report rule', async () => {
  const before = httpClient.calls.length;
  await inject(
    'POST',
    `/v1/admin/projects/${projectA.id}/airs-reports`,
    'sub_admin',
    submitBody,
    'moderator@example.test'
  );
  await inject('POST', `/v1/admin/projects/${projectA.id}/airs-reports`, 'sub_admin', submitBody);
  const [withEmail, withoutEmail] = httpClient.calls.slice(before);
  assert.equal(withEmail?.params.p_actor_email, 'moderator@example.test');
  assert.equal(withEmail?.params.p_actor_email_verified, true);
  assert.equal(withoutEmail?.params.p_actor_email, null);
  assert.equal(withoutEmail?.params.p_actor_email_verified, false);

  const unverified = new AirsReportService(
    new AirsReportRepository(httpClient as never),
    adminRepository() as never
  );
  await unverified.submit(
    principal('sub_admin', 'moderator@example.test', false),
    'r',
    projectA.id,
    {
      recipientEmail: 'guest@example.test',
      amount: 10,
      concept: 'Two nights at the pilot hotel',
      documentNumber: 'INV-1',
    }
  );
  const unverifiedCall = httpClient.calls[httpClient.calls.length - 1];
  assert.equal(unverifiedCall?.params.p_actor_email, 'moderator@example.test');
  assert.equal(unverifiedCall?.params.p_actor_email_verified, false);
});

test('submit is denied by role and by project scope before reaching the database', async () => {
  const before = httpClient.calls.length;
  for (const role of ['partner_readonly', 'moderator']) {
    const response = await inject(
      'POST',
      `/v1/admin/projects/${projectA.id}/airs-reports`,
      role,
      submitBody
    );
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  }
  const crossProject = await inject(
    'POST',
    `/v1/admin/projects/${projectB.id}/airs-reports`,
    'sub_admin',
    submitBody
  );
  assert.equal(crossProject.statusCode, 403);
  assert.equal(crossProject.json().code, 'PROJECT_SCOPE_DENIED');
  assert.equal(httpClient.calls.length, before);
});

test('submit without a document number reaches the database, which decides by project type', async () => {
  const before = httpClient.calls.length;
  const { documentNumber: _document, ...withoutDocument } = submitBody;
  const response = await inject(
    'POST',
    `/v1/admin/projects/${projectA.id}/airs-reports`,
    'sub_admin',
    withoutDocument
  );
  assert.equal(response.statusCode, 201);
  assert.equal(httpClient.calls.length, before + 1);
  assert.equal(httpClient.calls.at(-1)?.params.p_document_number, null);
});

test('a blank document number is still rejected before reaching the database', async () => {
  const before = httpClient.calls.length;
  const response = await inject(
    'POST',
    `/v1/admin/projects/${projectA.id}/airs-reports`,
    'sub_admin',
    { ...submitBody, documentNumber: '   ' }
  );
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, 'VALIDATION_FAILED');
  assert.equal(httpClient.calls.length, before);
});

test('submit validates the body', async () => {
  const response = await inject(
    'POST',
    `/v1/admin/projects/${projectA.id}/airs-reports`,
    'sub_admin',
    {
      ...submitBody,
      amount: 0,
      status: 'approved',
    }
  );
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, 'VALIDATION_FAILED');
});

test('approve maps a self-approval denial and validates the snapshot hash', async () => {
  const denied = await inject(
    'POST',
    `/v1/admin/airs-reports/${reportId}/approve`,
    'internal_admin',
    { snapshotHash: hash },
    'approver@example.test'
  );
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.json().code, 'AIRS_REPORT_SELF_APPROVAL_DENIED');
  const invalid = await inject(
    'POST',
    `/v1/admin/airs-reports/${reportId}/approve`,
    'internal_admin',
    {
      snapshotHash: 'not-a-hash',
    }
  );
  assert.equal(invalid.statusCode, 400);
});

test('recipient lookup reports the rate limit as 429', async () => {
  const response = await inject(
    'GET',
    `/v1/admin/projects/${projectA.id}/airs-reports/recipient?email=guest@example.test`,
    'sub_admin'
  );
  assert.equal(response.statusCode, 429);
  assert.equal(response.json().code, 'AIRS_REPORT_LOOKUP_RATE_LIMITED');
});

test('the review queue rejects non-approvers over HTTP', async () => {
  const denied = await inject('GET', '/v1/admin/airs-reports', 'platform_owner');
  assert.equal(denied.statusCode, 403);
  const allowed = await inject(
    'GET',
    '/v1/admin/airs-reports',
    'internal_admin',
    undefined,
    'approver@example.test'
  );
  assert.equal(allowed.statusCode, 200);
  assert.equal(allowed.json()[0].id, reportId);
});

test('OpenAPI documents every User Airs Report route', () => {
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  const paths = document.paths;
  assert.ok(paths['/v1/admin/projects/{projectId}/airs-reports']?.get);
  assert.ok(paths['/v1/admin/projects/{projectId}/airs-reports']?.post);
  assert.ok(paths['/v1/admin/projects/{projectId}/airs-reports/recipient']?.get);
  assert.ok(paths['/v1/admin/airs-reports']?.get);
  assert.ok(paths['/v1/admin/airs-reports/{id}']?.get);
  for (const action of ['approve', 'reject', 'cancel']) {
    assert.ok(paths[`/v1/admin/airs-reports/{id}/${action}`]?.post, action);
  }
});

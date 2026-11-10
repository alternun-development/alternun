/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import {
  MarketplaceApiError,
  marketplaceError,
} from '../src/modules/marketplace/marketplace.errors';
import { renderProjectClientInvitationEmail } from '../src/modules/marketplace/airs-report-emails';
import { ProjectClientService } from '../src/modules/marketplace/project-client.service';

const PROJECT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PROOF = `${PROJECT}/33333333-3333-4333-8333-333333333333.pdf`;

const principal = (roles: string[] = ['partner_operator']) =>
  ({ iss: 'i', aud: 'a', sub: 's', roles, organizationIds: [], email: 'Actor@alternun.io' } as any);

const isError = (code: string) => (error: unknown) =>
  error instanceof MarketplaceApiError && error.code === code;

function setup(
  options: {
    hasAccount?: boolean;
    addError?: string;
    inviteIdempotent?: boolean;
    reportStatus?: string;
    stored?: { contentType: string; sizeBytes: number; sha256: string } | null;
    denied?: string[];
    reports?: any[];
    findStatus?: string;
    resendCount?: number;
  } = {}
) {
  const calls: Record<string, any[]> = {
    authorize: [],
    add: [],
    invite: [],
    submit: [],
    saveProof: [],
    sent: [],
    cancel: [],
    notify: [],
    notices: [],
    audit: [],
  };
  const members: any[] = [];
  const invitations: any[] = [];
  const repository = {
    hasVerifiedAccount: async () => options.hasAccount ?? false,
    listInvitations: async () => invitations,
    listClientNoticeRecipients: async () => [
      { userId: 'u-edward', email: 'edward@alternun.io' },
      { userId: 'u-sgomez', email: 'security-ceo@alternun.example' },
      { userId: 'u-actor', email: 'actor@alternun.io' },
    ],
    createNotifications: async (notices: any[]) => calls.notices.push(...notices),
    countResendsSince: async () => options.resendCount ?? 0,
    findInvitation: async (_projectId: string, id: string) =>
      invitations.find((item) => item.id === id) ?? null,
    invite: async (projectId: string, email: string, name: string) => {
      calls.invite.push({ projectId, email, name });
      const invitation = {
        id: 'inv-1',
        projectId,
        email,
        name,
        status: 'pending',
        invitedAt: '2026-11-09T00:00:00Z',
      };
      invitations.push(invitation);
      return { invitation, idempotent: options.inviteIdempotent ?? false };
    },
    cancelInvitation: async (id: string) => calls.cancel.push(id),
    createProofUpload: async (path: string) => ({ uploadUrl: `https://upload/${path}`, path }),
    inspectProof: async () =>
      options.stored === undefined
        ? { contentType: 'application/pdf', sizeBytes: 2048, sha256: 'a'.repeat(64) }
        : options.stored,
    saveProof: async (reportId: string, proof: any) => calls.saveProof.push({ reportId, proof }),
    proofReportIds: async () => new Set(['rep-1']),
    readProof: async (reportId: string) =>
      reportId === 'rep-1'
        ? { bytes: Buffer.from('%PDF'), contentType: 'application/pdf', fileName: 'soporte.pdf' }
        : null,
  };
  const participants = {
    authorizeProject: async (_p: any, permission: string, _r: string, projectId: string) => {
      calls.authorize.push({ permission, projectId });
      if (options.denied?.includes(projectId)) marketplaceError('PROJECT_SCOPE_DENIED');
    },
    remove: async () => ({ id: 'part-1', status: 'removed', removedAt: 'now' }),
  };
  const participantRepository = {
    list: async () => members,
    add: async (projectId: string, email: string) => {
      calls.add.push({ projectId, email });
      if (options.addError) marketplaceError(options.addError);
      members.push({
        id: 'part-1',
        email,
        displayName: 'Ana',
        addedAt: '2026-11-09T00:00:00Z',
      });
    },
  };
  const reports = {
    submit: async (_p: any, _r: string, projectId: string, input: any, notify: any) => {
      calls.submit.push(input);
      calls.notify.push(notify);
      return {
        report: {
          id: 'rep-1',
          projectId,
          status: options.reportStatus ?? 'awaiting_claim',
          amount: input.amount,
          concept: input.concept,
        },
      };
    },
  };
  const reportRepository = {
    listForProject: async () =>
      options.reports ?? [
        {
          id: 'rep-1',
          recipientEmail: 'Ana@Example.com',
          amount: 40,
          concept: 'Compra',
          status: 'released',
          submittedAt: '2026-11-09T00:00:00Z',
        },
      ],
    find: async (id: string) =>
      id === 'rep-1'
        ? {
            id,
            projectId: PROJECT,
            status: options.findStatus ?? 'released',
            recipientEmail: 'ana@example.com',
            recipientName: 'Ana',
            amount: 40,
            concept: 'Compra',
          }
        : { id, projectId: OTHER },
  };
  const adminRepository = {
    audit: async (input: any) => calls.audit.push(input),
    findProject: async (id: string) => ({
      id,
      slug: 'rio',
      defaultLocale: 'es',
      content: { es: { title: 'Río <Gaira>' } },
    }),
    listProjects: async () => [
      {
        id: PROJECT,
        slug: 'rio',
        status: 'published',
        defaultLocale: 'es',
        content: { es: { title: 'Río' } },
      },
      { id: OTHER, slug: 'otro', status: 'published', defaultLocale: 'es', content: {} },
      { id: 'archived', slug: 'old', status: 'archived', defaultLocale: 'es', content: {} },
    ],
  };
  const service = new ProjectClientService(
    repository as any,
    participants as any,
    participantRepository as any,
    reports as any,
    reportRepository as any,
    adminRepository as any
  );
  service.env = { AIRS_DASHBOARD_URL: 'https://airs.test' };
  service.send = async (to, email) => {
    calls.sent.push({ to, email });
    return true;
  };
  return { service, calls, members, invitations };
}

test('a client with an account becomes a participant, with its Airs listed', async () => {
  const { service, calls } = setup({ hasAccount: true });
  const result = await service.add(principal(), 'req', PROJECT, { email: ' Ana@Example.com ' });
  assert.deepEqual(calls.authorize[0], { permission: 'participants:manage', projectId: PROJECT });
  assert.deepEqual(calls.add, [{ projectId: PROJECT, email: 'ana@example.com' }]);
  assert.equal(calls.invite.length, 0);
  assert.equal(result.alreadyClient, false);
  assert.equal(result.invitationSent, false);
  assert.equal(result.reportStatus, null);
  assert.equal(result.client.kind, 'member');
  assert.deepEqual(result.client.reports, [
    {
      id: 'rep-1',
      amount: 40,
      concept: 'Compra',
      status: 'released',
      submittedAt: '2026-11-09T00:00:00Z',
      hasProof: true,
    },
  ]);
});

test('an existing client only receives the new Airs', async () => {
  const { service, members, calls } = setup({ hasAccount: true, addError: 'PARTICIPANT_CONFLICT' });
  members.push({ id: 'part-1', email: 'ana@example.com', displayName: 'Ana', addedAt: 'x' });
  const result = await service.add(principal(), 'req', PROJECT, {
    email: 'ana@example.com',
    airs: { amount: 10, concept: 'Compra de café' },
  });
  assert.equal(result.alreadyClient, true);
  assert.equal(calls.submit.length, 1);
  assert.equal(calls.submit[0].recipientName, undefined);
});

test('a new person needs a name and is invited by email', async () => {
  const missing = setup();
  await assert.rejects(
    missing.service.add(principal(), 'req', PROJECT, { email: 'new@example.com' }),
    isError('CLIENT_NAME_REQUIRED')
  );
  assert.equal(missing.calls.invite.length, 0);

  const { service, calls } = setup();
  const result = await service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: ' Nueva Persona ',
  });
  assert.deepEqual(calls.invite, [
    { projectId: PROJECT, email: 'new@example.com', name: 'Nueva Persona' },
  ]);
  assert.equal(result.invitationSent, true);
  assert.equal(result.client.kind, 'invitation');
  assert.equal(calls.sent[0].to, 'new@example.com');
  assert.match(calls.sent[0].email.subject, /Río <Gaira> te invita a Airs/);
  assert.match(calls.sent[0].email.html, /Río &lt;Gaira&gt;/);
  assert.match(calls.sent[0].email.text, /https:\/\/airs\.test\//);
});

test('a new person gets one invitation email with the Airs waiting for them', async () => {
  const { service, calls } = setup({ reportStatus: 'awaiting_claim' });
  const result = await service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: 'Nueva',
    airs: { amount: 50, concept: 'Compra', documentNumber: ' F-12 ', proofPath: PROOF },
  });
  assert.equal(result.reportStatus, 'awaiting_claim');
  assert.equal(result.invitationSent, true);
  // The report's own "claim your Airs" email is skipped: the invitation carries the details.
  assert.deepEqual(calls.notify, [{ recipient: false }]);
  assert.equal(calls.sent.filter((item: any) => item.to === 'new@example.com').length, 1);
  assert.match(calls.sent[0].email.text, /tienes 50 Airs esperando por ti/);
  assert.match(calls.sent[0].email.text, /Motivo: Compra/);
  assert.match(calls.sent[0].email.text, /Proyecto: Río <Gaira>/);
  assert.match(calls.sent[0].email.subject, /te invita a Airs/);
  assert.deepEqual(calls.submit[0], {
    recipientEmail: 'new@example.com',
    recipientName: 'Nueva',
    amount: 50,
    concept: 'Compra',
    documentNumber: 'F-12',
    documentSha256: 'a'.repeat(64),
  });
  assert.equal(calls.saveProof[0].reportId, 'rep-1');
  assert.equal(calls.saveProof[0].proof.path, PROOF);

  // Airs in review are left out of the invitation: their approval sends the claim email.
  const pending = setup({ reportStatus: 'pending_approval' });
  const later = await pending.service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: 'Nueva',
    airs: { amount: 500, concept: 'Compra grande' },
  });
  assert.equal(later.invitationSent, true);
  assert.doesNotMatch(pending.calls.sent[0].email.text, /500 Airs/);

  // Someone already invited who gets new Airs is written to again, with those Airs.
  const again = setup({ inviteIdempotent: true, reportStatus: 'awaiting_claim' });
  const repeat = await again.service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: 'Nueva',
    airs: { amount: 7, concept: 'Segunda compra' },
  });
  assert.equal(repeat.alreadyClient, true);
  assert.match(again.calls.sent[0].email.text, /7 Airs/);
});

test('existing accounts keep the usual Airs email and failed invitations are not fatal', async () => {
  const { service, calls } = setup({ hasAccount: true });
  await service.add(principal(), 'req', PROJECT, {
    email: 'ana@example.com',
    airs: { amount: 5, concept: 'Compra de café' },
  });
  assert.deepEqual(calls.notify, [{ recipient: true }]);
  assert.equal(calls.sent.filter((item: any) => !item.to.endsWith('@alternun.io')).length, 0);

  const failing = setup();
  failing.service.send = async () => {
    throw new Error('smtp down');
  };
  const result = await failing.service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: 'Nueva',
  });
  assert.equal(result.invitationSent, false);
  assert.equal(result.client.kind, 'invitation');
});

test('a repeated invitation sends no email and the proof must be a valid file of the project', async () => {
  const repeated = setup({ inviteIdempotent: true });
  const result = await repeated.service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: 'Nueva',
  });
  assert.equal(result.alreadyClient, true);
  assert.equal(repeated.calls.sent.length, 0);

  for (const [proofPath, stored] of [
    [`${OTHER}/33333333-3333-4333-8333-333333333333.pdf`, undefined],
    [`${PROJECT}/../x.pdf`, undefined],
    [PROOF, null],
    [PROOF, { contentType: 'text/html', sizeBytes: 10, sha256: 'b'.repeat(64) }],
    [
      PROOF,
      { contentType: 'application/pdf', sizeBytes: 11 * 1024 * 1024, sha256: 'b'.repeat(64) },
    ],
  ] as const) {
    const { service, calls } = setup({ stored: stored as any });
    await assert.rejects(
      service.add(principal(), 'req', PROJECT, {
        email: 'new@example.com',
        name: 'Nueva',
        airs: { amount: 5, concept: 'Compra', proofPath },
      }),
      isError('CLIENT_PROOF_INVALID')
    );
    assert.equal(calls.submit.length, 0);
    assert.equal(calls.invite.length, 0);
  }
});

test('proof uploads go to the project folder and need the right to assign Airs', async () => {
  const { service } = setup();
  const upload = await service.createProofUpload(principal(), 'req', PROJECT, 'application/pdf');
  assert.match(upload.path, new RegExp(`^${PROJECT}/[0-9a-f-]{36}\\.pdf$`));
  await assert.rejects(
    service.createProofUpload(principal(), 'req', PROJECT, 'text/html'),
    isError('CLIENT_PROOF_INVALID')
  );
  await assert.rejects(
    service.createProofUpload(principal(['project_moderator']), 'req', PROJECT, 'image/png'),
    isError('PERMISSION_DENIED')
  );
});

test('a proof is only handed to the project team, as bytes and never as a URL', async () => {
  const { service, calls } = setup();
  const file = await service.proofFile(principal(), 'req', PROJECT, 'rep-1');
  assert.equal(file.contentType, 'application/pdf');
  assert.equal(file.fileName, 'soporte.pdf');
  assert.equal(file.bytes.toString(), '%PDF');
  assert.equal(calls.authorize[0].permission, 'participants:read');
  // A report of another project is not found from this project.
  await assert.rejects(
    service.proofFile(principal(), 'req', PROJECT, 'rep-2'),
    isError('CLIENT_NOT_FOUND')
  );
});

test('invitations are cancelled only within their project; members are removed with a reason', async () => {
  const { service, invitations, calls } = setup();
  invitations.push({ id: 'inv-9', email: 'x@example.com', name: 'X', invitedAt: 'x' });
  await service.cancelInvitation(principal(), 'req', PROJECT, 'inv-9');
  assert.deepEqual(calls.cancel, ['inv-9']);
  await assert.rejects(
    service.cancelInvitation(principal(), 'req', PROJECT, 'missing'),
    isError('CLIENT_NOT_FOUND')
  );
  assert.deepEqual(
    await service.remove(principal(), 'req', PROJECT, 'part-1', 'Ya no es cliente'),
    {
      id: 'part-1',
      status: 'removed',
      removedAt: 'now',
    }
  );
});

test('the enterprise list gathers the readable projects and skips archived or out-of-scope ones', async () => {
  const { service, invitations } = setup({ denied: [OTHER], reports: [] });
  invitations.push({
    id: 'inv-1',
    email: 'x@example.com',
    name: 'X',
    status: 'pending',
    invitedAt: 'x',
  });
  const result = await service.listForEnterprise(principal(), 'req', 'ent-1');
  assert.deepEqual(result.projects, [{ id: PROJECT, title: 'Río' }]);
  assert.equal(result.clients.length, 1);
  assert.equal(result.clients[0].projectId, PROJECT);
  assert.deepEqual(result.clients[0].reports, []);
});

test('the invitation email speaks of Airs and positive impact in both languages', () => {
  const email = renderProjectClientInvitationEmail({
    name: 'Ana María',
    projectName: null,
    appUrl: 'https://airs.test',
  });
  assert.match(email.subject, /Un proyecto aliado te invita a Airs/);
  assert.match(email.text, /Hola Ana:/);
  assert.match(email.text, /impacto positivo/);
  assert.match(email.text, /positive impact/);
  assert.doesNotMatch(email.text, /AIRS/);
});

test('emails go through Tláo: local .env mailbox fallback and Postmark refused', async () => {
  const { isRetiredSmtpHost, smtpConfigFromEnv } = await import('../src/modules/airs/airs.email');
  assert.equal(smtpConfigFromEnv({}), null);
  const config = smtpConfigFromEnv({
    ALTERNUN_NOTIFICATIONS_EMAIL: 'notifications@alternun.co',
    ALTERNUN_NOTIFICATIONS_PASSWORD: 'secret',
  });
  assert.equal(config?.host, 'mail.xn--tlo-fla.com');
  assert.equal(config?.port, 587);
  assert.equal(config?.from, 'notifications@alternun.co');
  assert.equal(config?.requireTls, true);
  assert.equal(isRetiredSmtpHost('smtp.postmarkapp.com'), true);
  assert.equal(isRetiredSmtpHost('mail.xn--tlo-fla.com'), false);
});

test('Postmark stays out of the API and infrastructure code', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const roots = [
    path.resolve(__dirname, '../src'),
    path.resolve(__dirname, '../../../packages/infra/modules'),
    path.resolve(__dirname, '../../../packages/infra/config'),
    path.resolve(__dirname, '../../../packages/infra/infra.config.ts'),
  ];
  const offenders: string[] = [];
  const visit = (target: string): void => {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target)) visit(path.join(target, entry));
      return;
    }
    if (!/\.(ts|js|mjs|cjs|json)$/.test(target)) return;
    const source = fs.readFileSync(target, 'utf8');
    // The guard itself names Postmark to refuse it.
    const lines = source
      .split('\n')
      .filter((line) => /postmark/i.test(line) && !/retired/i.test(line));
    if (lines.length > 0) offenders.push(path.relative(process.cwd(), target));
  };
  roots.forEach(visit);
  assert.deepEqual(offenders, []);
});

test('clients carry their invitation history and cancelled invitations stay listed', async () => {
  const { service, invitations, members } = setup({ reports: [] });
  invitations.push(
    {
      id: 'inv-3',
      email: 'ana@example.com',
      name: 'Ana',
      status: 'pending',
      invitedAt: '2026-11-10T03:46:58Z',
      cancelledAt: null,
      acceptedAt: null,
    },
    {
      id: 'inv-2',
      email: 'ana@example.com',
      name: 'Ana',
      status: 'cancelled',
      invitedAt: '2026-11-10T03:23:46Z',
      cancelledAt: '2026-11-10T03:46:05Z',
      acceptedAt: null,
    },
    {
      id: 'inv-1',
      email: 'luis@example.com',
      name: 'Luis',
      status: 'cancelled',
      invitedAt: '2026-11-09T10:00:00Z',
      cancelledAt: '2026-11-09T11:00:00Z',
      acceptedAt: null,
    },
    {
      id: 'inv-0',
      email: 'eva@example.com',
      name: 'Eva',
      status: 'accepted',
      invitedAt: '2026-11-08T10:00:00Z',
      cancelledAt: null,
      acceptedAt: '2026-11-08T12:00:00Z',
    }
  );
  members.push({ id: 'part-9', email: 'Eva@example.com', displayName: 'Eva', addedAt: 'x' });

  const clients = await service.list(principal(), 'req', PROJECT);
  assert.deepEqual(
    clients.map((client) => [
      client.kind,
      client.id,
      client.invitations.map((item) => item.status),
    ]),
    [
      ['invitation', 'inv-3', ['pending', 'cancelled']],
      ['member', 'part-9', ['accepted']],
      ['cancelled', 'inv-1', ['cancelled']],
    ]
  );
  assert.equal(clients[0].invitations[1].cancelledAt, '2026-11-10T03:46:05Z');
});

test('global and project admins hear about a new client by email and in the app', async () => {
  const { service, calls } = setup({ reportStatus: 'pending_approval' });
  await service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: 'Nueva',
    airs: { amount: 500, concept: 'Compra grande' },
  });
  // Whoever made the change is not notified.
  assert.deepEqual(
    calls.notices.map((notice: any) => notice.userId),
    ['u-edward', 'u-sgomez']
  );
  const notice = calls.notices[0];
  assert.equal(notice.eventType, 'project_client_added');
  assert.equal(notice.severity, 'warning');
  assert.deepEqual(notice.payload, {
    projectId: PROJECT,
    projectName: 'Río <Gaira>',
    clientName: 'Nueva',
    clientEmail: 'new@example.com',
    clientKind: 'invitation',
    amount: 500,
    concept: 'Compra grande',
    reportStatus: 'pending_approval',
    link: `/manage/${PROJECT}`,
  });
  assert.equal(notice.dedupeKey, 'project-client:inv-1:rep-1');
  const adminEmails = calls.sent.filter((item: any) => item.to.endsWith('@alternun.io'));
  assert.deepEqual(
    adminEmails.map((item: any) => item.to),
    ['edward@alternun.io', 'security-ceo@alternun.example']
  );
  assert.match(adminEmails[0].email.subject, /Airs en revisión para un cliente de Río <Gaira>/);
  assert.match(adminEmails[0].email.text, /espera la aprobación de un admin global/);
  assert.match(adminEmails[0].email.text, /Agregado por: actor@alternun\.io/);
  assert.match(adminEmails[0].email.text, new RegExp(`/manage/${PROJECT}`));
});

test('a plain new client is an informative notice, and nothing new means no notice', async () => {
  const { service, calls } = setup({ hasAccount: true });
  await service.add(principal(), 'req', PROJECT, { email: 'ana@example.com' });
  assert.equal(calls.notices[0].severity, 'info');
  assert.equal(calls.notices[0].payload.amount, undefined);
  assert.match(calls.sent[0].email.subject, /Nuevo cliente en Río <Gaira>: Ana/);

  const again = setup({ hasAccount: true, addError: 'PARTICIPANT_CONFLICT' });
  again.members.push({ id: 'part-1', email: 'ana@example.com', displayName: 'Ana', addedAt: 'x' });
  await again.service.add(principal(), 'req', PROJECT, { email: 'ana@example.com' });
  assert.equal(again.calls.notices.length, 0);
});

test('pending steps can be sent again: the invitation to the client, a reminder to admins', async () => {
  // Airs waiting for sign-up: the invitation goes again to the person, with those Airs.
  const waiting = setup({ findStatus: 'awaiting_claim' });
  assert.deepEqual(await waiting.service.resendReport(principal(), 'req', PROJECT, 'rep-1'), {
    sentTo: 'client',
  });
  assert.equal(waiting.calls.sent[0].to, 'ana@example.com');
  assert.match(waiting.calls.sent[0].email.text, /tienes 40 Airs esperando por ti/);
  assert.equal(waiting.calls.audit[0].action, 'client.resend');
  assert.equal(waiting.calls.audit[0].targetId, 'rep-1');

  // Airs in review: admins get a new notice, marked as a reminder.
  const review = setup({ findStatus: 'pending_approval', hasAccount: true });
  review.members.push({ id: 'part-1', email: 'ana@example.com', displayName: 'Ana', addedAt: 'x' });
  assert.deepEqual(await review.service.resendReport(principal(), 'req', PROJECT, 'rep-1'), {
    sentTo: 'admins',
  });
  assert.match(review.calls.notices[0].dedupeKey, /^project-client:part-1:rep-1:reminder:\d+$/);
  assert.match(review.calls.sent[0].email.subject, /^Recordatorio: Airs en revisión/);

  // Nothing pending to send for credited Airs, and one resend every 10 minutes.
  await assert.rejects(
    setup().service.resendReport(principal(), 'req', PROJECT, 'rep-1'),
    isError('CLIENT_RESEND_NOT_APPLICABLE')
  );
  await assert.rejects(
    setup({ findStatus: 'awaiting_claim', resendCount: 1 }).service.resendReport(
      principal(),
      'req',
      PROJECT,
      'rep-1'
    ),
    isError('CLIENT_RESEND_TOO_SOON')
  );
  await assert.rejects(
    setup().service.resendReport(principal(), 'req', PROJECT, 'rep-2'),
    isError('CLIENT_NOT_FOUND')
  );
});

test('a pending invitation can be sent again, only while it is pending', async () => {
  const { service, invitations, calls } = setup({
    reports: [
      {
        id: 'rep-9',
        recipientEmail: 'luis@example.com',
        amount: 12,
        concept: 'Visita guiada',
        status: 'awaiting_claim',
        submittedAt: 'x',
      },
    ],
  });
  invitations.push(
    { id: 'inv-5', email: 'luis@example.com', name: 'Luis', status: 'pending', invitedAt: 'x' },
    { id: 'inv-4', email: 'eva@example.com', name: 'Eva', status: 'cancelled', invitedAt: 'x' }
  );
  assert.deepEqual(await service.resendInvitation(principal(), 'req', PROJECT, 'inv-5'), {
    sentTo: 'client',
  });
  assert.equal(calls.sent[0].to, 'luis@example.com');
  assert.match(calls.sent[0].email.text, /12 Airs/);
  await assert.rejects(
    service.resendInvitation(principal(), 'req', PROJECT, 'inv-4'),
    isError('CLIENT_INVITATION_NOT_PENDING')
  );
});

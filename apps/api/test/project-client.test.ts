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
  ({ iss: 'i', aud: 'a', sub: 's', roles, organizationIds: [] } as any);

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
  };
  const members: any[] = [];
  const invitations: any[] = [];
  const repository = {
    hasVerifiedAccount: async () => options.hasAccount ?? false,
    listPendingInvitations: async () => invitations,
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
    proofUrl: async (reportId: string) => (reportId === 'rep-1' ? 'https://signed/rep-1' : null),
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
    submit: async (_p: any, _r: string, projectId: string, input: any) => {
      calls.submit.push(input);
      return {
        report: { id: 'rep-1', projectId, status: options.reportStatus ?? 'awaiting_claim' },
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
      id === 'rep-1' ? { id, projectId: PROJECT } : { id, projectId: OTHER },
  };
  const adminRepository = {
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

test('Airs waiting to be claimed already invite the person, so no second email goes out', async () => {
  const { service, calls } = setup({ reportStatus: 'awaiting_claim' });
  const result = await service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: 'Nueva',
    airs: { amount: 50, concept: 'Compra', documentNumber: ' F-12 ', proofPath: PROOF },
  });
  assert.equal(result.reportStatus, 'awaiting_claim');
  assert.equal(result.invitationSent, false);
  assert.equal(calls.sent.length, 0);
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

  const pending = setup({ reportStatus: 'pending_approval' });
  const later = await pending.service.add(principal(), 'req', PROJECT, {
    email: 'new@example.com',
    name: 'Nueva',
    airs: { amount: 500, concept: 'Compra grande' },
  });
  assert.equal(later.invitationSent, true);
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

test('a proof is read only through a signed URL of a report of the same project', async () => {
  const { service, calls } = setup();
  assert.deepEqual(await service.proofUrl(principal(), 'req', PROJECT, 'rep-1'), {
    url: 'https://signed/rep-1',
  });
  assert.equal(calls.authorize[0].permission, 'participants:read');
  await assert.rejects(
    service.proofUrl(principal(), 'req', PROJECT, 'rep-2'),
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
  invitations.push({ id: 'inv-1', email: 'x@example.com', name: 'X', invitedAt: 'x' });
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

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ManageClientsSection } from '../ManageClientsSection';
import { ProjectManageView } from '../ProjectManageView';
import { EnterpriseManageView, enterpriseTabs } from '../EnterpriseManageView';
import { ManageRequestError } from '../../../utils/projectManage';
import type { ClientsClient, ClientsListing } from '../../../utils/projectClients';

jest.mock('@alternun/ui', () => ({
  // SearchFilterBar only reads colors from the theme.
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
  ToastSystem: () => null,
}));

jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string, _p?: unknown, fallback?: string) => fallback ?? key,
  }),
}));

const palette = {
  background: '#000',
  surface: '#111',
  border: '#222',
  text: '#fff',
  muted: '#999',
  primary: '#0f0',
  primaryDeep: '#0a0',
  fill: '#070',
  mist: '#030',
};
const t = ((key: string, params?: { name?: string }) =>
  params?.name ? `${key}:${params.name}` : key) as never;

const listing: ClientsListing = {
  projects: [
    { id: 'p1', title: 'Río' },
    { id: 'p2', title: 'Bosque' },
  ],
  clients: [
    {
      id: 'm1',
      kind: 'member',
      projectId: 'p1',
      email: 'ana@x.test',
      name: 'Ana',
      since: '',
      reports: [
        {
          id: 'r1',
          amount: 40,
          concept: 'Compra',
          status: 'released',
          submittedAt: '',
          hasProof: true,
        },
      ],
    },
    {
      id: 'i1',
      kind: 'invitation',
      projectId: 'p2',
      email: 'luis@x.test',
      name: 'Luis',
      since: '2026-11-10T03:46:58Z',
      reports: [],
      invitations: [
        {
          id: 'i1',
          status: 'pending',
          invitedAt: '2026-11-10T03:46:58Z',
          cancelledAt: null,
          acceptedAt: null,
        },
        {
          id: 'i0',
          status: 'cancelled',
          invitedAt: '2026-11-10T03:23:46Z',
          cancelledAt: '2026-11-10T03:46:05Z',
          acceptedAt: null,
        },
      ],
    },
    {
      id: 'c1',
      kind: 'cancelled',
      projectId: 'p1',
      email: 'eva@x.test',
      name: 'Eva',
      since: '2026-11-09T10:00:00Z',
      reports: [],
      invitations: [
        {
          id: 'c1',
          status: 'cancelled',
          invitedAt: '2026-11-09T10:00:00Z',
          cancelledAt: '2026-11-09T11:00:00Z',
          acceptedAt: null,
        },
      ],
    },
  ],
};

function clientsClient(extra: Partial<ClientsClient> = {}): ClientsClient {
  return {
    list: jest.fn(async () => listing),
    lookup: jest.fn(async (_p: string, email: string) => ({
      email: email.trim().toLowerCase(),
      hasAccount: false,
      displayName: null,
    })),
    add: jest.fn(async () => ({
      client: listing.clients[1],
      alreadyClient: false,
      invitationSent: true,
      reportStatus: 'pending_approval' as const,
    })),
    cancelInvitation: jest.fn(async () => ({ cancelledAirs: 0 })),
    remove: jest.fn(async () => undefined),
    proofFile: jest.fn(async () => ({ type: 'image/png', size: 10 } as never)),
    resendReport: jest.fn(async () => ({ sentTo: 'client' as const })),
    resendInvitation: jest.fn(async () => ({ sentTo: 'client' as const })),
    ...extra,
  };
}

async function render(element: React.JSX.Element): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(element);
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer!;
}

const byId = (r: ReactTestRenderer, id: string) => r.root.findAll((n) => n.props.testID === id);
const input = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onChangeText === 'function')[0];
const pressable = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0];
const texts = (r: ReactTestRenderer): string =>
  r.root
    .findAll(
      (n) =>
        typeof n.props.children === 'string' ||
        (Array.isArray(n.props.children) &&
          n.props.children.every((part: unknown) => typeof part === 'string'))
    )
    .map((n) => [n.props.children].flat().join(''))
    .join('|');

async function press(r: ReactTestRenderer, id: string): Promise<void> {
  await act(async () => {
    pressable(r, id).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function type(r: ReactTestRenderer, id: string, value: string): Promise<void> {
  await act(async () => {
    input(r, id).props.onChangeText(value);
  });
}

describe('ManageClientsSection', () => {
  it('lists clients with their Airs and lets moderators only look', async () => {
    const c = clientsClient();
    const r = await render(
      <ManageClientsSection client={c} can={{}} palette={palette} t={t} canPickFiles />
    );
    expect(byId(r, 'manage-client-m1').length).toBeGreaterThan(0);
    expect(texts(r)).toContain('40 Airs · Compra');
    expect(texts(r)).toContain('manage.clients.status.released · manage.clients.assignedOn');
    // Each client says when it joined, was invited or was cancelled.
    expect(byId(r, 'manage-client-date-m1').length).toBeGreaterThan(0);
    expect(texts(r)).toContain('manage.clients.kind.cancelled');
    expect(byId(r, 'manage-clients-form')).toHaveLength(0);
    expect(byId(r, 'manage-client-remove-m1')).toHaveLength(0);
    expect(texts(r)).toContain('manage.clients.readOnly');

    await type(r, 'manage-clients-search-search-input', 'luis');
    expect(byId(r, 'manage-client-m1')).toHaveLength(0);
    expect(byId(r, 'manage-client-i1').length).toBeGreaterThan(0);
    await type(r, 'manage-clients-search-search-input', 'nadie');
    expect(texts(r)).toContain('manage.clients.noMatch');

    // The shared filter narrows the list by kind or by assigned Airs.
    await type(r, 'manage-clients-search-search-input', '');
    await press(r, 'manage-clients-search-filter-button');
    await press(r, 'manage-clients-search-filter-withAirs');
    expect(byId(r, 'manage-client-m1').length).toBeGreaterThan(0);
    expect(byId(r, 'manage-client-i1')).toHaveLength(0);
    await press(r, 'manage-clients-search-filter-button');
    await press(r, 'manage-clients-search-filter-invitation');
    expect(byId(r, 'manage-client-m1')).toHaveLength(0);
    expect(byId(r, 'manage-client-i1').length).toBeGreaterThan(0);
  });

  it('shows a supporting file inside the view, from a local copy released on close', async () => {
    const c = clientsClient();
    const toLocalUrl = jest.fn(async () => 'data:image/png;base64,AAAA');
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{}}
        palette={palette}
        t={t}
        canPickFiles
        toLocalUrl={toLocalUrl}
      />
    );
    await press(r, 'manage-client-proof-r1');
    expect(c.proofFile).toHaveBeenCalledWith('p1', 'r1');
    const image = r.root.findAll((n) => n.props.testID === 'manage-client-proof-image')[0];
    expect(image.props.source).toEqual({ uri: 'data:image/png;base64,AAAA' });
    expect(texts(r)).toContain('manage.clients.proof.private');
    await press(r, 'manage-client-proof-close');
    expect(byId(r, 'manage-client-proof-image')).toHaveLength(0);
  });

  it('explains when a supporting file cannot be loaded', async () => {
    const c = clientsClient({
      proofFile: jest.fn(async () => {
        throw new ManageRequestError(404, 'PROOF_UNAVAILABLE');
      }),
    });
    const onToast = jest.fn();
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{}}
        palette={palette}
        t={t}
        canPickFiles
        onToast={onToast}
      />
    );
    await press(r, 'manage-client-proof-r1');
    expect(texts(r)).toContain('manage.clients.proof.error');
    expect(onToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('invites a new person with Airs and a supporting file', async () => {
    const c = clientsClient();
    const onToast = jest.fn();
    const proof = { type: 'application/pdf', size: 100, name: 'factura.pdf' };
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{ editClients: true, assignAirs: true }}
        palette={palette}
        t={t}
        canPickFiles
        pickFile={async () => proof as never}
        multiProject
        onToast={onToast}
      />
    );
    expect(texts(r)).toContain('ana@x.test · Río');
    await press(r, 'manage-clients-project-p2');
    await type(r, 'manage-clients-email-search-input', ' Nueva@X.test ');
    expect(pressable(r, 'manage-clients-add').props.disabled).toBe(true);
    await press(r, 'manage-clients-lookup');
    expect(c.lookup).toHaveBeenCalledWith('p2', 'Nueva@X.test');
    expect(texts(r)).toContain('manage.clients.newPerson');

    await type(r, 'manage-clients-name', 'Nueva');
    await press(r, 'manage-clients-assign');
    await type(r, 'manage-clients-amount', '25');
    await type(r, 'manage-clients-concept', 'Compra de café');
    await type(r, 'manage-clients-document', 'F-9');
    await press(r, 'manage-clients-proof');
    expect(texts(r)).toContain('factura.pdf');
    await press(r, 'manage-clients-add');

    expect(c.add).toHaveBeenCalledWith(
      'p2',
      {
        email: 'Nueva@X.test',
        name: 'Nueva',
        airs: { amount: 25, concept: 'Compra de café', documentNumber: 'F-9' },
      },
      proof
    );
    expect(texts(r)).toContain(
      'manage.clients.notices.invited manage.clients.notices.pendingApproval'
    );
    expect(onToast).toHaveBeenCalledWith({
      type: 'success',
      title: 'manage.clients.toasts.invitedTitle',
      message: 'manage.clients.notices.invited manage.clients.notices.pendingApproval',
    });
    expect(c.list).toHaveBeenCalledTimes(2);
  });

  it('explains why a client cannot be added yet, field by field', async () => {
    const c = clientsClient();
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{ editClients: true, assignAirs: true }}
        palette={palette}
        t={t}
        canPickFiles={false}
      />
    );
    // A malformed email is explained instead of being looked up.
    await type(r, 'manage-clients-email-search-input', 'nueva@');
    expect(texts(r)).toContain('manage.clients.lookupFirst');
    await press(r, 'manage-clients-lookup');
    expect(c.lookup).not.toHaveBeenCalled();
    expect(texts(r)).toContain('manage.clients.errors.email');

    await type(r, 'manage-clients-email-search-input', 'nueva@x.test');
    await press(r, 'manage-clients-lookup');
    await press(r, 'manage-clients-assign');
    await type(r, 'manage-clients-amount', '0');
    await type(r, 'manage-clients-concept', 'pago');
    // The concept shows how far it is from the minimum while typing.
    expect(byId(r, 'manage-clients-concept-count').length).toBeGreaterThan(0);
    await press(r, 'manage-clients-add');
    expect(c.add).not.toHaveBeenCalled();
    for (const field of ['name', 'amount', 'concept'])
      expect(byId(r, `manage-clients-${field}-error`).length).toBeGreaterThan(0);
    expect(texts(r)).toContain('manage.clients.errors.conceptShort');
    expect(texts(r)).toContain('manage.clients.errors.review');

    // Fixing a field clears its message.
    await type(r, 'manage-clients-amount', '22');
    expect(byId(r, 'manage-clients-amount-error')).toHaveLength(0);
  });

  it('shows the API validation on its field, a spinner while adding and an error toast', async () => {
    let fail: (error: Error) => void = () => undefined;
    const c = clientsClient({
      add: jest.fn(
        () =>
          new Promise<never>((_resolve, reject) => {
            fail = reject;
          })
      ),
    });
    const onToast = jest.fn();
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{ editClients: true, assignAirs: true }}
        palette={palette}
        t={t}
        canPickFiles={false}
        onToast={onToast}
      />
    );
    await type(r, 'manage-clients-email-search-input', 'nueva@x.test');
    await press(r, 'manage-clients-lookup');
    await type(r, 'manage-clients-name', 'Nueva');
    await press(r, 'manage-clients-assign');
    await type(r, 'manage-clients-amount', '22');
    await type(r, 'manage-clients-concept', 'Pago de factura');
    await press(r, 'manage-clients-add');
    expect(texts(r)).toContain('manage.clients.busy.add');
    expect(pressable(r, 'manage-clients-add').props.disabled).toBe(true);

    await act(async () => {
      fail(
        new ManageRequestError(400, 'VALIDATION_FAILED', [
          'airs.concept must be longer than or equal to 10 characters',
        ])
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(texts(r)).not.toContain('manage.clients.busy.add');
    expect(byId(r, 'manage-clients-concept-error').length).toBeGreaterThan(0);
    expect(onToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'manage.clients.toasts.errorTitle',
      message: 'manage.error',
    });
  });

  it('adds an existing account without asking the name, and explains refusals', async () => {
    const c = clientsClient({
      lookup: jest.fn(async () => ({
        email: 'ana2@x.test',
        hasAccount: true,
        displayName: 'Ana Dos',
      })),
      add: jest.fn(async () => {
        throw new ManageRequestError(422, 'AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED');
      }),
    });
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{ editClients: true }}
        palette={palette}
        t={t}
        canPickFiles={false}
      />
    );
    await type(r, 'manage-clients-email-search-input', 'ana2@x.test');
    // Enter on the email field searches too.
    await act(async () => {
      input(r, 'manage-clients-email-search-input').props.onSubmitEditing();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(texts(r)).toContain('manage.clients.hasAccount:Ana Dos');
    expect(byId(r, 'manage-clients-name')).toHaveLength(0);
    expect(byId(r, 'manage-clients-assign')).toHaveLength(0);
    await press(r, 'manage-clients-add');
    expect(c.add).toHaveBeenCalledWith('p1', { email: 'ana2@x.test' }, null);
    expect(texts(r)).toContain('manage.clients.errors.documentRequired');
  });

  it('assigns Airs to a listed client, removes members and cancels invitations', async () => {
    const c = clientsClient({
      add: jest.fn(async () => ({
        client: listing.clients[0],
        alreadyClient: true,
        invitationSent: false,
        reportStatus: 'released' as const,
      })),
    });
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{ editClients: true, assignAirs: true }}
        palette={palette}
        t={t}
        canPickFiles={false}
      />
    );
    await press(r, 'manage-client-assign-m1');
    expect(input(r, 'manage-clients-email-search-input').props.value).toBe('ana@x.test');
    await type(r, 'manage-clients-amount', '5');
    await type(r, 'manage-clients-concept', 'Visita guiada');
    await press(r, 'manage-clients-add');
    expect(c.add).toHaveBeenCalledWith(
      'p1',
      { email: 'ana@x.test', airs: { amount: 5, concept: 'Visita guiada', documentNumber: '' } },
      null
    );
    expect(texts(r)).toContain('manage.clients.notices.airsAdded');

    await press(r, 'manage-client-remove-m1');
    expect(c.remove).toHaveBeenCalledWith('p1', 'm1', 'manage.clients.removeReason');
    await press(r, 'manage-client-remove-i1');
    expect(c.cancelInvitation).toHaveBeenCalledWith('p2', 'i1');
  });

  it('shows the invitation history and invites a cancelled client again', async () => {
    const c = clientsClient();
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{ editClients: true, assignAirs: true }}
        palette={palette}
        t={t}
        canPickFiles={false}
      />
    );
    expect(byId(r, 'manage-client-invitation-i0')).toHaveLength(0);
    await press(r, 'manage-client-history-i1');
    expect(byId(r, 'manage-client-invitation-i0').length).toBeGreaterThan(0);
    expect(texts(r)).toContain(
      'manage.clients.invitationStatus.cancelled · manage.clients.sentOn · manage.clients.cancelledAt'
    );
    await press(r, 'manage-client-history-i1');
    expect(byId(r, 'manage-client-invitation-i0')).toHaveLength(0);

    // A cancelled client cannot be removed again; it can be invited again from the form.
    expect(byId(r, 'manage-client-remove-c1')).toHaveLength(0);
    await press(r, 'manage-client-reinvite-c1');
    expect(input(r, 'manage-clients-email-search-input').props.value).toBe('eva@x.test');
    expect(input(r, 'manage-clients-name').props.value).toBe('Eva');

    await press(r, 'manage-clients-search-filter-button');
    await press(r, 'manage-clients-search-filter-cancelled');
    expect(byId(r, 'manage-client-c1').length).toBeGreaterThan(0);
    expect(byId(r, 'manage-client-m1')).toHaveLength(0);
  });

  it('sends pending steps again from the list, with feedback', async () => {
    const pendingListing: ClientsListing = {
      projects: listing.projects,
      clients: [
        {
          ...listing.clients[1],
          reports: [
            {
              id: 'r-wait',
              amount: 20,
              concept: 'Recibo pago',
              status: 'awaiting_claim',
              submittedAt: '',
              hasProof: false,
            },
            {
              id: 'r-review',
              amount: 100,
              concept: 'Pago factura',
              status: 'pending_approval',
              submittedAt: '',
              hasProof: false,
            },
            {
              id: 'r-done',
              amount: 5,
              concept: 'Visita',
              status: 'released',
              submittedAt: '',
              hasProof: false,
            },
          ],
        },
      ],
    };
    const c = clientsClient({
      list: jest.fn(async () => pendingListing),
      resendReport: jest
        .fn()
        .mockResolvedValueOnce({ sentTo: 'client' })
        .mockResolvedValueOnce({ sentTo: 'admins' })
        .mockRejectedValueOnce(new ManageRequestError(429, 'CLIENT_RESEND_TOO_SOON')),
    });
    const onToast = jest.fn();
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{ editClients: true, assignAirs: true }}
        palette={palette}
        t={t}
        canPickFiles={false}
        onToast={onToast}
      />
    );
    // Only steps with something pending can be sent again.
    expect(texts(r)).toContain('manage.clients.resendEmail');
    expect(texts(r)).toContain('manage.clients.remindAdmins');
    expect(byId(r, 'manage-client-resend-r-done')).toHaveLength(0);

    await press(r, 'manage-client-resend-r-wait');
    expect(c.resendReport).toHaveBeenCalledWith('p2', 'r-wait');
    expect(onToast).toHaveBeenLastCalledWith({
      type: 'success',
      title: 'manage.clients.toasts.resentTitle',
      message: 'luis@x.test',
    });
    await press(r, 'manage-client-resend-r-review');
    expect(onToast).toHaveBeenLastCalledWith({
      type: 'success',
      title: 'manage.clients.toasts.remindedTitle',
      message: 'manage.clients.toasts.remindedBody',
    });
    await press(r, 'manage-client-resend-r-wait');
    expect(texts(r)).toContain('manage.clients.errors.resendTooSoon');

    await press(r, 'manage-client-resend-invitation-i1');
    expect(c.resendInvitation).toHaveBeenCalledWith('p2', 'i1');

    // Airs in review for an invited person: both the admins and the invitation can go again.
    expect(byId(r, 'manage-client-resend-invitation-r-review').length).toBeGreaterThan(0);
    expect(byId(r, 'manage-client-resend-invitation-r-wait')).toHaveLength(0);
    await press(r, 'manage-client-resend-invitation-r-review');
    expect(c.resendInvitation).toHaveBeenCalledTimes(2);
  });

  it('pages long client lists and folds long Airs histories', async () => {
    const many: ClientsListing = {
      projects: listing.projects,
      clients: Array.from({ length: 12 }, (_, index) => ({
        id: `m${index}`,
        kind: 'member' as const,
        projectId: 'p1',
        email: `persona${index}@x.test`,
        name: `Persona ${index}`,
        since: '',
        reports:
          index === 0
            ? Array.from({ length: 5 }, (__, n) => ({
                id: `r${n}`,
                amount: n + 1,
                concept: `Compra ${n}`,
                status: 'released' as const,
                submittedAt: '',
                hasProof: false,
              }))
            : [],
      })),
    };
    const r = await render(
      <ManageClientsSection
        client={clientsClient({ list: jest.fn(async () => many) })}
        can={{}}
        palette={palette}
        t={t}
        canPickFiles={false}
      />
    );
    expect(byId(r, 'manage-client-m0').length).toBeGreaterThan(0);
    expect(byId(r, 'manage-client-m10')).toHaveLength(0);
    // The first client shows its 3 latest assignments until asked for all.
    expect(texts(r)).toContain('1 Airs · Compra 0');
    expect(texts(r)).not.toContain('5 Airs · Compra 4');
    await press(r, 'manage-client-reports-m0');
    expect(texts(r)).toContain('5 Airs · Compra 4');

    await press(r, 'manage-clients-page-next');
    expect(byId(r, 'manage-client-m10').length).toBeGreaterThan(0);
    expect(byId(r, 'manage-client-m0')).toHaveLength(0);
    // A new search starts again on the first page.
    await type(r, 'manage-clients-search-search-input', 'persona1');
    expect(byId(r, 'manage-client-m1').length).toBeGreaterThan(0);
  });

  it('asks before cancelling an invitation with waiting Airs and keeps cancelled ones quiet', async () => {
    const withAirs: ClientsListing = {
      projects: listing.projects,
      clients: [
        {
          ...listing.clients[1],
          reports: [
            {
              id: 'r-wait',
              amount: 100,
              concept: 'Pago factura',
              status: 'pending_approval',
              submittedAt: '',
              hasProof: false,
            },
            {
              id: 'r-old',
              amount: 22,
              concept: 'Pago anterior',
              status: 'cancelled',
              submittedAt: '',
              hasProof: false,
            },
          ],
        },
      ],
    };
    const c = clientsClient({
      list: jest.fn(async () => withAirs),
      cancelInvitation: jest.fn(async () => ({ cancelledAirs: 1 })),
    });
    const onToast = jest.fn();
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{ editClients: true, assignAirs: true }}
        palette={palette}
        t={t}
        canPickFiles={false}
        onToast={onToast}
      />
    );
    // A cancelled assignment shows its state and offers nothing to send.
    expect(texts(r)).toContain('manage.clients.status.cancelled');
    expect(byId(r, 'manage-client-resend-r-old')).toHaveLength(0);
    expect(byId(r, 'manage-client-resend-r-wait').length).toBeGreaterThan(0);

    await press(r, 'manage-client-remove-i1');
    expect(c.cancelInvitation).not.toHaveBeenCalled();
    expect(texts(r)).toContain('manage.clients.confirmCancel');
    await press(r, 'manage-client-keep-i1');
    expect(texts(r)).not.toContain('manage.clients.confirmCancel');

    await press(r, 'manage-client-remove-i1');
    await press(r, 'manage-client-remove-i1');
    expect(c.cancelInvitation).toHaveBeenCalledWith('p2', 'i1');
    expect(onToast).toHaveBeenLastCalledWith({
      type: 'success',
      title: 'manage.clients.toasts.cancelledTitle',
      message: 'manage.clients.toasts.cancelledAirs',
    });
  });

  it('shows an error when the list cannot load', async () => {
    const c = clientsClient({
      list: jest.fn(async () => {
        throw new Error('down');
      }),
    });
    const r = await render(
      <ManageClientsSection client={c} can={{}} palette={palette} t={t} canPickFiles />
    );
    expect(byId(r, 'manage-clients-error').length).toBeGreaterThan(0);
  });
});

describe('Clients tab', () => {
  const projectOverview = {
    project: {
      id: 'p1',
      slug: 'rio',
      status: 'published',
      defaultLocale: 'es',
      content: {
        es: { title: 'Río', location: '', theme: '', description: '', waysToContribute: [] },
      },
    },
    roles: ['project_moderator'],
    isGlobalAdmin: false,
    can: {
      editContent: false,
      editProfile: false,
      media: false,
      team: false,
      comments: false,
      clients: true,
    },
  };

  it('appears in the project view when the person can see clients', async () => {
    const r = await render(
      <ProjectManageView
        client={{ overview: jest.fn(async () => projectOverview) } as never}
        clientsClient={clientsClient()}
        palette={palette}
        t={t}
        onBack={jest.fn()}
        canPickFiles
      />
    );
    expect(byId(r, 'project-manage-tab-clients').length).toBeGreaterThan(0);
    expect(byId(r, 'manage-clients').length).toBeGreaterThan(0);
  });

  it('appears in the enterprise view with every project of the enterprise', async () => {
    expect(
      enterpriseTabs({
        editInfo: false,
        images: false,
        products: false,
        team: false,
        clients: true,
      })
    ).toEqual([]);
    expect(
      enterpriseTabs(
        { editInfo: false, images: false, products: false, team: false, clients: true },
        true
      )
    ).toEqual(['clients']);
    const overview = {
      enterprise: { id: 'e1', slug: 'e', displayName: 'Empresa' },
      roles: ['partner_operator'],
      isGlobalAdmin: false,
      can: {
        editInfo: false,
        images: false,
        products: false,
        team: false,
        clients: true,
        editClients: true,
      },
    };
    const r = await render(
      <EnterpriseManageView
        client={{ overview: jest.fn(async () => overview) } as never}
        clientsClient={clientsClient()}
        palette={palette}
        t={t}
        onBack={jest.fn()}
        canPickFiles
      />
    );
    expect(byId(r, 'manage-clients-project-p2').length).toBeGreaterThan(0);
  });
});

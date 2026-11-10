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
      since: '',
      reports: [],
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
    cancelInvitation: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
    proofUrl: jest.fn(async () => 'https://signed/r1'),
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
    expect(texts(r)).toContain('40 Airs · Compra · manage.clients.status.released');
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

  it('opens a supporting file through its signed URL', async () => {
    const c = clientsClient();
    const openUrl = jest.fn(async () => undefined);
    const r = await render(
      <ManageClientsSection
        client={c}
        can={{}}
        palette={palette}
        t={t}
        canPickFiles
        openUrl={openUrl}
      />
    );
    await press(r, 'manage-client-proof-r1');
    expect(c.proofUrl).toHaveBeenCalledWith('p1', 'r1');
    expect(openUrl).toHaveBeenCalledWith('https://signed/r1');
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

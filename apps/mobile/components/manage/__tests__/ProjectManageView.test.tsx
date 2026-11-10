/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ProjectManageView, visibleTabs } from '../ProjectManageView';
import { infoPatch } from '../ManageInfoSection';
import { commentActions } from '../ManageCommentsSection';
import { ManageImagesSection, uploadErrorKey } from '../ManageImagesSection';
import {
  ManageRequestError,
  type ManageClient,
  type ManageOverview,
} from '../../../utils/projectManage';

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
const t = ((key: string, _p?: unknown, fallback?: string) => fallback ?? key) as never;

const project = {
  id: 'p1',
  slug: 'fundacion-rio-gaira',
  status: 'published',
  defaultLocale: 'es',
  content: {
    es: {
      title: 'Río Gaira',
      location: 'Santa Marta',
      theme: 'Río',
      description: 'Limpieza',
      waysToContribute: ['Conoce'],
    },
  },
  locationDetails: { municipality: 'Santa Marta' },
  publicContact: { web: 'POR CONFIRMAR' },
};

function overview(roles: string[], can: Partial<ManageOverview['can']>): ManageOverview {
  return {
    project,
    roles,
    isGlobalAdmin: false,
    can: {
      editContent: false,
      editProfile: false,
      media: false,
      team: false,
      comments: false,
      ...can,
    },
  };
}

function client(over: ManageOverview, extra: Partial<ManageClient> = {}): ManageClient {
  return {
    overview: jest.fn(async () => over),
    updateProject: jest.fn(async () => project as never),
    listMedia: jest.fn(async () => []),
    uploadImage: jest.fn(async () => ({} as never)),
    retireMedia: jest.fn(async () => undefined),
    listTeam: jest.fn(async () => [
      { id: 'm1', role: 'sub_admin', status: 'active', memberEmail: 'sub@x.test' },
      { id: 'm2', role: 'partner_operator', status: 'active', memberEmail: 'owner@x.test' },
    ]),
    addTeamMember: jest.fn(async () => undefined),
    revokeTeamMember: jest.fn(async () => undefined),
    listComments: jest.fn(async () => [
      { id: 'c1', authorDisplayName: 'Ana', body: 'Hola', status: 'pending', createdAt: '' },
    ]),
    moderateComment: jest.fn(async () => undefined),
    ...extra,
  } as ManageClient;
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
// The TextInput itself (the ManageField wrapper shares its testID).
const input = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onChangeText === 'function')[0];

async function press(r: ReactTestRenderer, id: string): Promise<void> {
  await act(async () => {
    byId(r, id)[0].props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('ProjectManageView', () => {
  it('shows only the tabs the role allows', () => {
    expect(visibleTabs(overview([], { comments: true, media: true }).can)).toEqual([
      'images',
      'comments',
    ]);
    expect(
      visibleTabs(overview([], { editContent: true, media: true, team: true, comments: true }).can)
    ).toEqual(['info', 'images', 'team', 'comments']);
  });

  it('shows the denied state when the API refuses access', async () => {
    const c = client(overview([], {}), {
      overview: jest.fn(async () => {
        throw new ManageRequestError(403, 'PROJECT_SCOPE_DENIED');
      }),
    });
    const r = await render(
      <ProjectManageView client={c} palette={palette} t={t} onBack={jest.fn()} canPickFiles />
    );
    expect(byId(r, 'project-manage-denied').length).toBeGreaterThan(0);
  });

  it('lets a project admin save info and manage the team', async () => {
    const c = client(
      overview(['partner_operator'], {
        editContent: true,
        editProfile: true,
        media: true,
        team: true,
        comments: true,
      })
    );
    const r = await render(
      <ProjectManageView client={c} palette={palette} t={t} onBack={jest.fn()} canPickFiles />
    );
    expect(byId(r, 'project-manage-tab-team').length).toBeGreaterThan(0);

    await act(async () => input(r, 'manage-info-title').props.onChangeText('Fundación Río Gaira'));
    await press(r, 'manage-info-save');
    const patch = (c.updateProject as jest.Mock).mock.calls[0][0];
    expect(patch.content.es.title).toBe('Fundación Río Gaira');
    expect(patch.publicContact).toEqual({ web: 'POR CONFIRMAR' });

    await press(r, 'project-manage-tab-team');
    // The owner (partner_operator) cannot be removed by another project admin.
    expect(byId(r, 'manage-team-remove-m1').length).toBeGreaterThan(0);
    expect(byId(r, 'manage-team-remove-m2')).toHaveLength(0);
    await act(async () => input(r, 'manage-team-email').props.onChangeText('mod@x.test'));
    await press(r, 'manage-team-role-project_moderator');
    await press(r, 'manage-team-add');
    expect(c.addTeamMember).toHaveBeenCalledWith('mod@x.test', 'project_moderator');
    await press(r, 'manage-team-remove-m1');
    expect(c.revokeTeamMember).toHaveBeenCalledWith('m1', 'manage.team.removeReason');
  });

  it('shows the saved values right away, without waiting for the refetch', async () => {
    let resolveRefetch: (value: ManageOverview) => void = () => undefined;
    const first = overview(['partner_operator'], { editContent: true, editProfile: true });
    const saved = {
      ...project,
      updatedAt: '2026-11-10T00:00:00Z',
      content: { es: { ...project.content.es, title: 'Fundación Batiss' } },
    };
    const c = client(first, {
      overview: jest
        .fn()
        .mockResolvedValueOnce(first)
        // The refetch after saving hangs, like a slow network.
        .mockImplementation(
          () => new Promise<ManageOverview>((resolve) => (resolveRefetch = resolve))
        ),
      updateProject: jest.fn(async () => saved as never),
    });
    const r = await render(
      <ProjectManageView client={c} palette={palette} t={t} onBack={jest.fn()} canPickFiles />
    );
    await act(async () => input(r, 'manage-info-title').props.onChangeText('Fundación Batiss'));
    await press(r, 'manage-info-save');
    const title = r.root.findAll(
      (n) => n.props.testID === 'project-manage-title' && typeof n.props.children === 'string'
    )[0];
    expect(title.props.children).toBe('Fundación Batiss');
    expect(input(r, 'manage-info-title').props.value).toBe('Fundación Batiss');
    expect(JSON.stringify(r.toJSON())).not.toContain('manage.loading');
    resolveRefetch({ ...first, project: saved as never });
  });

  it('keeps location fields the form does not show when saving', () => {
    const stored = { ...project, locationDetails: { municipality: 'Santa Marta', note: 'Gaira' } };
    const patch = infoPatch(
      stored as never,
      {
        title: 'T',
        theme: 'Th',
        location: 'L',
        description: 'D',
        ways: 'a',
        alternateName: '',
        locationDetails: {
          municipality: 'Santa Marta',
          department: 'Magdalena',
          address: '',
          coverage: '',
        },
        publicContact: { web: '', email: '', phone: '', whatsapp: '', instagram: '', facebook: '' },
      },
      true
    );
    expect(patch.locationDetails).toEqual({
      municipality: 'Santa Marta',
      note: 'Gaira',
      department: 'Magdalena',
    });
  });

  it('lets a project moderator moderate comments, with a reason to reject', async () => {
    const c = client(overview(['project_moderator'], { media: true, comments: true }));
    const r = await render(
      <ProjectManageView client={c} palette={palette} t={t} onBack={jest.fn()} canPickFiles />
    );
    expect(byId(r, 'project-manage-tab-info')).toHaveLength(0);
    await press(r, 'project-manage-tab-comments');
    await press(r, 'manage-comment-c1-reject');
    expect(c.moderateComment).not.toHaveBeenCalled();
    await press(r, 'manage-comment-c1-approve');
    expect(c.moderateComment).toHaveBeenCalledWith('c1', 'approve', undefined);
  });
});

describe('manage helpers', () => {
  it('sends only content for roles that cannot edit the profile', () => {
    const draft = {
      title: ' T ',
      theme: 'Th',
      location: 'L',
      description: 'D',
      ways: 'a\n\n b ',
      alternateName: 'X',
      locationDetails: { municipality: 'M', department: '', address: '', coverage: '' },
      publicContact: {
        web: '',
        email: 'e@x.test',
        phone: '',
        whatsapp: '',
        instagram: '',
        facebook: '',
      },
    };
    const contentOnly = infoPatch(project, draft, false);
    expect(Object.keys(contentOnly)).toEqual(['content']);
    expect((contentOnly.content as any).es.waysToContribute).toEqual(['a', 'b']);
    const full = infoPatch(project, draft, true);
    expect(full.locationDetails).toEqual({ municipality: 'M' });
    expect(full.publicContact).toEqual({ email: 'e@x.test' });
  });

  it('offers moderation actions by status and maps upload errors', () => {
    expect(commentActions('pending')).toEqual(['approve', 'reject']);
    expect(commentActions('visible')).toEqual(['hide']);
    expect(commentActions('hidden')).toEqual(['restore']);
    expect(uploadErrorKey(new ManageRequestError(400, 'UPLOAD_SIZE'))).toBe('manage.images.size');
    expect(uploadErrorKey(new Error('x'))).toBe('manage.error');
  });

  it('uploads a banner replacing the current one, and needs a description first', async () => {
    const current = {
      id: 'old',
      kind: 'cover',
      url: 'https://cdn.test/old.png',
      altText: {},
      sortOrder: 0,
      isActive: true,
    };
    const c = client(overview(['partner_operator'], { media: true }), {
      listMedia: jest.fn(async () => [current]),
    });
    const pickFile = jest.fn(async () => ({ type: 'image/png', size: 10 } as never));
    const r = await render(
      <ManageImagesSection
        client={c}
        overview={await c.overview()}
        palette={palette}
        t={t}
        onChanged={jest.fn()}
        canPickFiles
        pickFile={pickFile}
      />
    );
    await press(r, 'manage-images-upload-cover');
    expect(pickFile).not.toHaveBeenCalled();
    await act(async () => input(r, 'manage-images-alt').props.onChangeText('Río Gaira'));
    await press(r, 'manage-images-upload-cover');
    expect(c.uploadImage).toHaveBeenCalledWith(
      'cover',
      { type: 'image/png', size: 10 },
      'Río Gaira'
    );
    expect(c.retireMedia).toHaveBeenCalledWith('old');
  });

  it('explains that uploads need the web app on native', async () => {
    const c = client(overview([], { media: true }));
    const r = await render(
      <ManageImagesSection
        client={c}
        overview={await c.overview()}
        palette={palette}
        t={t}
        onChanged={jest.fn()}
        canPickFiles={false}
      />
    );
    expect(byId(r, 'manage-images-web-only').length).toBeGreaterThan(0);
    expect(byId(r, 'manage-images-upload-logo')).toHaveLength(0);
  });
});

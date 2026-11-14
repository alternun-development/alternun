/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { Linking } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ExplorarScreen, {
  buildShowcase,
  loadMarketplaceProjects,
  MarketplaceProjectBrowser,
} from '../explore';

jest.mock('@alternun/ui', () => ({
  // SearchFilterBar only reads colors from the theme.
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
}));

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
let mockUser: unknown = null;
const originalMarketplaceContactEmail = process.env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../components/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../components/settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ themeMode: 'light', language: 'en' }),
}));

jest.mock('../../components/auth/AppAuthProvider', () => ({
  useAuth: () => ({ user: mockUser, client: { getSessionToken: () => Promise.resolve(null) } }),
}));

jest.mock('../../components/common/ScreenShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../components/marketplace/MarketplaceEnterpriseDirectory', () => ({
  MarketplaceEnterpriseBrowser: 'MockEnterpriseBrowser',
}));

const palette = {
  background: '#fff',
  surface: '#fff',
  surfaceStrong: '#fff',
  border: '#ddd',
  text: '#111',
  muted: '#666',
  primary: '#087f63',
  primaryDeep: '#075440',
  fill: '#0f766e',
  mist: '#eee',
  hero: '#eee',
};

const productiveProject = {
  id: 'project-1',
  slug: 'productive-project',
  title: 'Productive project',
  place: 'Colombia',
  categoryCode: 'productive_enterprise',
  status: 'active' as const,
  theme: 'Local economy',
  description: 'Productive description',
  waysToContribute: ['Visit'],
  imageUrl: null,
  videoUrl: null,
  canvaUrl: null,
};

const conservationProject = {
  ...productiveProject,
  id: 'project-2',
  slug: 'conservation-project',
  title: 'Conservation project',
  categoryCode: 'conservation',
};

const publishedProject = {
  id: productiveProject.id,
  slug: productiveProject.slug,
  status: 'published',
  categoryCode: productiveProject.categoryCode,
  title: productiveProject.title,
  location: productiveProject.place,
  theme: productiveProject.theme,
  description: productiveProject.description,
  waysToContribute: productiveProject.waysToContribute,
  media: [
    { kind: 'cover', url: 'http://unsafe.example/cover.png', isActive: true },
    { kind: 'gallery_image', url: 'https://cdn.example/gallery.png', isActive: true },
  ],
};

const publishedProjectWithPresentations = {
  ...publishedProject,
  media: [
    ...publishedProject.media,
    {
      kind: 'canva',
      url: 'https://www.canva.com/design/abc/view?embed',
      embedUrl: null,
      isActive: true,
    },
    {
      kind: 'video',
      url: 'https://cdn.example/promo.mp4',
      embedUrl: null,
      isActive: true,
    },
  ],
};

const t = ((key: string): string => key) as never;
let mountedScreen: ReactTestRenderer | undefined;

function pressableWithText(renderer: ReactTestRenderer, text: string) {
  const candidates = renderer.root.findAll(
    (node) =>
      typeof node.props.onPress === 'function' &&
      node.findAll((child) => child.props.children === text).length > 0
  );
  const candidate = candidates[candidates.length - 1];
  if (!candidate) throw new Error(`No pressable found for ${text}.`);
  return candidate;
}

async function renderBrowser(
  loader: React.ComponentProps<typeof MarketplaceProjectBrowser>['loader'],
  onOpenProject: NonNullable<
    React.ComponentProps<typeof MarketplaceProjectBrowser>['onOpenProject']
  > = () => undefined
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceProjectBrowser
        locale='es'
        palette={palette}
        t={t}
        loader={loader}
        onOpenProject={onOpenProject}
      />
    );
    await Promise.resolve();
  });
  return renderer!;
}

async function openProjectForm(renderer: ReactTestRenderer): Promise<void> {
  // The proposal form starts as a call-to-action card.
  await act(async () => {
    renderer.root.findAllByProps({ testID: 'explorer-project-cta-open' })[0].props.onPress();
    await Promise.resolve();
  });
}

async function renderExplorerScreen(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<ExplorarScreen />);
    await Promise.resolve();
    await Promise.resolve();
  });
  mountedScreen = renderer!;
  return mountedScreen;
}

describe('Explorer admin entry point', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
  });

  afterEach(() => {
    mockUser = null;
    global.fetch = originalFetch;
    if (mountedScreen) {
      void act(() => mountedScreen?.unmount());
      mountedScreen = undefined;
    }
  });

  it('shows the Alternun admin panel only to global admins', async () => {
    let screen = await renderExplorerScreen();
    expect(screen.root.findAllByProps({ testID: 'explorer-admin-panel' })).toHaveLength(0);
    void act(() => screen.unmount());

    mockUser = { metadata: { rawClaims: { alternun_roles: ['sub_admin'] } } };
    screen = await renderExplorerScreen();
    expect(screen.root.findAllByProps({ testID: 'explorer-admin-panel' })).toHaveLength(0);
    void act(() => screen.unmount());

    mockUser = { metadata: { rawClaims: { alternun_roles: ['platform_owner'] } } };
    screen = await renderExplorerScreen();
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const [button] = screen.root.findAllByProps({ testID: 'explorer-admin-panel' });
    // Icon-only button in the Explorer title row.
    expect(button.props.accessibilityLabel).toBe('explorer.admin.openPanel');
    void act(() => button.props.onPress());
    expect(openUrl.mock.calls[0][0]).toMatch(/\/marketplace$/);
    openUrl.mockRestore();
  });

  it('reloads the projects from the header reload button', async () => {
    const screen = await renderExplorerScreen();
    const calls = (global.fetch as jest.Mock).mock.calls.length;
    await act(async () => {
      screen.root.findAllByProps({ testID: 'explorer-reload' })[0].props.onPress();
      await Promise.resolve();
    });
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(calls);
  });
});

describe('Explorer hero showcase', () => {
  it('keeps only projects with a presentation, video or banner, in random order', () => {
    const base = { ...productiveProject, canvaUrl: null, videoUrl: null, imageUrl: null };
    const projects = [
      { ...base, id: 'a', imageUrl: 'https://cdn.test/a.png' },
      { ...base, id: 'b' },
      { ...base, id: 'c', canvaUrl: 'https://www.canva.com/design/c/view?embed' },
      { ...base, id: 'd', videoUrl: 'https://cdn.test/d.mp4' },
    ];
    expect(buildShowcase(projects, () => 0.999).map((p) => p.id)).toEqual(['a', 'c', 'd']);
    expect(buildShowcase(projects, () => 0).map((p) => p.id)).toEqual(['c', 'd', 'a']);
    expect(buildShowcase([base])).toEqual([]);
  });
});

describe('Explorer marketplace projects', () => {
  afterEach(() => {
    if (mountedScreen) {
      void act(() => mountedScreen?.unmount());
      mountedScreen = undefined;
    }
    jest.restoreAllMocks();
    mockPush.mockReset();
    if (originalMarketplaceContactEmail === undefined) {
      delete process.env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL;
    } else {
      process.env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL = originalMarketplaceContactEmail;
    }
  });

  it('loads published projects and selects the first safe image URL', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [publishedProject] }),
    } as Response);

    await expect(loadMarketplaceProjects('en')).resolves.toEqual([
      { ...productiveProject, imageUrl: 'https://cdn.example/gallery.png', logoUrl: null },
    ]);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/v1/projects?locale=en');
  });

  it('puts the project logo in the card mark, never as the card image', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              ...publishedProject,
              media: [
                { kind: 'logo', url: 'https://cdn.example/logo.png', isActive: true, sortOrder: 0 },
              ],
            },
          ],
        }),
    } as Response);
    const [loaded] = await loadMarketplaceProjects('en');
    expect(loaded.imageUrl).toBeNull();
    expect(loaded.logoUrl).toBe('https://cdn.example/logo.png');

    const renderer = await renderBrowser(() => Promise.resolve([loaded]));
    const logos = renderer.root.findAll((node) => node.props.testID === 'explorer-project-logo');
    expect(logos[0].props.source).toEqual({ uri: 'https://cdn.example/logo.png' });
  });

  it('resolves canva and direct-video media for the featured banner', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [publishedProjectWithPresentations] }),
    } as Response);

    await expect(loadMarketplaceProjects('en')).resolves.toEqual([
      {
        ...productiveProject,
        imageUrl: 'https://cdn.example/gallery.png',
        logoUrl: null,
        canvaUrl: 'https://www.canva.com/design/abc/view?embed',
        videoUrl: 'https://cdn.example/promo.mp4',
      },
    ]);
  });

  it('rejects malformed marketplace responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ ...publishedProject, title: null }] }),
    } as Response);

    await expect(loadMarketplaceProjects('en')).rejects.toThrow('Marketplace response is invalid.');
  });

  it('renders two projects returned by the API loader', async () => {
    const renderer = await renderBrowser(() =>
      Promise.resolve([productiveProject, conservationProject])
    );

    expect(renderer.root.findByProps({ testID: 'explorer-project-project-1' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'explorer-project-project-2' })).toBeTruthy();
  });

  it('keeps the admin-defined order from the API in the loader and the list', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { ...publishedProject, id: 'project-b', slug: 'project-b' },
            { ...publishedProject, id: 'project-a', slug: 'project-a' },
          ],
        }),
    } as Response);
    const loaded = await loadMarketplaceProjects('en');
    expect(loaded.map(({ id }) => id)).toEqual(['project-b', 'project-a']);

    const renderer = await renderBrowser(() =>
      Promise.resolve([conservationProject, productiveProject])
    );
    const rendered = renderer.root
      .findAll(
        (node) =>
          typeof node.props.testID === 'string' &&
          node.props.testID.startsWith('explorer-project-') &&
          typeof node.type === 'string'
      )
      .map((node) => node.props.testID as string);
    expect([...new Set(rendered)]).toEqual([
      `explorer-project-${conservationProject.id}`,
      `explorer-project-${productiveProject.id}`,
    ]);
  });

  it('renders the empty state for an empty published list', async () => {
    const renderer = await renderBrowser(() => Promise.resolve([]));

    expect(renderer.root.findByProps({ testID: 'explorer-empty' })).toBeTruthy();
  });

  it('renders a network error and retries without fallback projects', async () => {
    let calls = 0;
    const loader: NonNullable<
      React.ComponentProps<typeof MarketplaceProjectBrowser>['loader']
    > = () => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error('offline'))
        : Promise.resolve([productiveProject]);
    };
    const renderer = await renderBrowser(loader);

    expect(renderer.root.findByProps({ testID: 'explorer-error' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'explorer-project-project-1' })).toHaveLength(0);

    await act(async () => {
      renderer.root.findByProps({ testID: 'explorer-retry' }).props.onPress();
      await Promise.resolve();
    });

    expect(calls).toBe(2);
    expect(renderer.root.findByProps({ testID: 'explorer-project-project-1' })).toBeTruthy();
  });

  it('filters the loaded list by mapped category from the search filter menu', async () => {
    const renderer = await renderBrowser(() =>
      Promise.resolve([productiveProject, conservationProject])
    );
    void act(() => {
      renderer.root.findByProps({ testID: 'project-filter-button' }).props.onPress();
    });

    const categoryFilters = new Set(
      renderer.root
        .findAll(
          (node) =>
            typeof node.props.testID === 'string' &&
            /^project-filter-(?!button)/.test(node.props.testID)
        )
        .map((node) => {
          const testId = node.props.testID as unknown;
          return typeof testId === 'string' ? testId : '';
        })
    );
    expect(categoryFilters.size).toBe(3);
    expect(renderer.root.findByProps({ testID: 'project-filter-all' })).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'project-filter-productive_enterprise' })
    ).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-filter-conservation' })).toBeTruthy();

    void act(() => {
      renderer.root.findByProps({ testID: 'project-filter-conservation' }).props.onPress();
    });

    expect(renderer.root.findAllByProps({ testID: 'explorer-project-project-1' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'explorer-project-project-2' })).toBeTruthy();
  });

  it('searches project text and renders the filtered empty state', async () => {
    const renderer = await renderBrowser(() =>
      Promise.resolve([productiveProject, conservationProject])
    );
    const search = renderer.root.findByProps({ placeholder: 'explorer.searchPlaceholder' });

    await act(() => search.props.onChangeText('Conservation'));
    expect(renderer.root.findAllByProps({ testID: 'explorer-project-project-1' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'explorer-project-project-2' })).toBeTruthy();

    await act(() => search.props.onChangeText('No matching project'));
    expect(renderer.root.findByProps({ testID: 'explorer-empty' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'explorer.empty.description' })).toBeTruthy();
  });

  it('opens project detail from the project card and its action', async () => {
    const onOpenProject = jest.fn();
    const renderer = await renderBrowser(() => Promise.resolve([productiveProject]), onOpenProject);

    await act(() =>
      renderer.root.findByProps({ testID: 'explorer-project-project-1' }).props.onPress()
    );
    await act(() => pressableWithText(renderer, 'explorer.participateAndEarn').props.onPress());

    expect(onOpenProject).toHaveBeenNthCalledWith(1, 'productive-project');
    expect(onOpenProject).toHaveBeenNthCalledWith(2, 'productive-project');
  });

  it('renders the hero showcase and proposal card and navigates to projects and enterprises', async () => {
    process.env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL = 'marketplace@example.com';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [publishedProject] }),
    } as Response);
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const renderer = await renderExplorerScreen();

    expect(renderer.root.findByProps({ testID: 'explorer-heading-title' }).props.children).toBe(
      'explorer.title'
    );
    expect(renderer.root.findAllByProps({ children: 'explorer.heroTitle' })).toHaveLength(0);
    expect(renderer.root.findByProps({ children: 'explorer.cta.project.title' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'project-proposal-form' })).toHaveLength(0);
    await openProjectForm(renderer);
    expect(
      renderer.root.findAllByProps({ testID: 'project-proposal-form' }).length
    ).toBeGreaterThan(0);

    await act(() =>
      renderer.root.findByProps({ testID: 'explorer-project-project-1' }).props.onPress()
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/explore/[slug]',
      params: { slug: 'productive-project' },
    });

    await act(() =>
      renderer.root.findByProps({ testID: 'explorer-directory-enterprises' }).props.onPress()
    );
    // Each tab ends with its own enrolment card.
    expect(
      renderer.root.findAllByProps({ testID: 'explorer-enterprise-cta' }).length
    ).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: 'explorer-project-cta' })).toHaveLength(0);
    const enterpriseBrowser = renderer.root.findByType('MockEnterpriseBrowser' as never);
    await act(async () => {
      renderer.root.findByProps({ testID: 'explorer-enterprise-list' }).props.onLayout({
        nativeEvent: { layout: { y: 640 } },
      });
      await Promise.resolve();
    });
    expect(() => enterpriseBrowser.props.onListNavigate()).not.toThrow();
    await act(() => enterpriseBrowser.props.onOpenEnterprise('forest-enterprise'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/explore/enterprise/[slug]',
      params: { slug: 'forest-enterprise' },
    });

    // The hero showcases projects with media; each slide opens its project.
    mockPush.mockClear();
    await act(() =>
      renderer.root.findAllByProps({ testID: 'explorer-hero-open-project-1' })[0].props.onPress()
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/explore/[slug]',
      params: { slug: 'productive-project' },
    });
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('explains each intent in a guide with its next steps, also from a deep link', async () => {
    process.env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL = 'marketplace@example.com';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [publishedProject] }),
    } as Response);
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const renderer = await renderExplorerScreen();
    const guide = (key: string) =>
      renderer.root.findAllByProps({ testID: `explorer-intent-guide-${key}` });

    expect(guide('collaborate')).toHaveLength(0);
    await act(() =>
      renderer.root.findAllByProps({ testID: 'explorer-intent-collaborate' })[0].props.onPress()
    );
    expect(guide('collaborate').length).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ children: 'explorer.intents.collaborate.guide.step2' }).length
    ).toBeGreaterThan(0);
    await act(() => guide('contact')[0].props.onPress());
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('mailto:marketplace@example.com'));
    await act(() => guide('projects')[0].props.onPress());
    expect(guide('collaborate')).toHaveLength(0);
    openUrl.mockRestore();

    await act(() => {
      renderer.unmount();
    });
    mockParams = { intent: 'propose' };
    const linked = await renderExplorerScreen();
    mockParams = {};
    expect(
      linked.root.findAllByProps({ testID: 'explorer-intent-guide-propose' }).length
    ).toBeGreaterThan(0);
    await act(() =>
      linked.root.findAllByProps({ testID: 'explorer-intent-guide-form' })[0].props.onPress()
    );
    expect(linked.root.findAllByProps({ testID: 'explorer-intent-guide-propose' })).toHaveLength(0);
    expect(linked.root.findAllByProps({ testID: 'project-proposal-form' }).length).toBeGreaterThan(
      0
    );
  });

  it('submits a valid project proposal and shows the sent state', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/v1/project-proposals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accepted: true }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [publishedProject] }),
      } as Response);
    });
    const renderer = await renderExplorerScreen();
    await openProjectForm(renderer);

    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.projectName' })
        .props.onChangeText('Community forest')
    );
    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.location' })
        .props.onChangeText('Andes')
    );
    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.contactName' })
        .props.onChangeText('Proposal Test')
    );
    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.contactEmail' })
        .props.onChangeText('Proposer@Example.com')
    );
    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.message' })
        .props.onChangeText('Restore native forest.')
    );
    await act(() => pressableWithText(renderer, 'explorer.form.conservation').props.onPress());
    await act(async () => {
      renderer.root.findByProps({ testID: 'explorer-project-proposal-submit' }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer.root.findByProps({ testID: 'explorer-project-proposal-sent' })).toBeTruthy();
    const postCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/v1/project-proposals')
    );
    expect(postCall?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      projectName: 'Community forest',
      category: 'conservation',
      contactEmail: 'proposer@example.com',
      contactName: 'Proposal Test',
      language: 'en',
      website: '',
    });
  });

  it('validates a project proposal before sending it', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);
    const renderer = await renderExplorerScreen();
    await openProjectForm(renderer);

    await act(() =>
      renderer.root.findByProps({ testID: 'explorer-project-proposal-submit' }).props.onPress()
    );

    expect(renderer.root.findByProps({ testID: 'explorer-project-proposal-error' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'explorer.form.validationError' })).toBeTruthy();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/v1/project-proposals'))
    ).toBe(false);
  });

  it('shows a friendly error when project proposal submission fails', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/v1/project-proposals')) {
        return Promise.resolve({ ok: false } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) } as Response);
    });
    const renderer = await renderExplorerScreen();
    await openProjectForm(renderer);

    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.projectName' })
        .props.onChangeText('Community forest')
    );
    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.location' })
        .props.onChangeText('Andes')
    );
    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.contactName' })
        .props.onChangeText('Proposal Test')
    );
    await act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'explorer.form.contactEmail' })
        .props.onChangeText('proposer@example.com')
    );
    await act(async () => {
      renderer.root.findByProps({ testID: 'explorer-project-proposal-submit' }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer.root.findByProps({ testID: 'explorer-project-proposal-error' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'explorer.form.submitError' })).toBeTruthy();
  });
});

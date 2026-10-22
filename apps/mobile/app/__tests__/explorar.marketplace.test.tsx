/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { Linking } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ExplorarScreen, { loadMarketplaceProjects, MarketplaceProjectBrowser } from '../explorar';

const mockPush = jest.fn();
const originalMarketplaceContactEmail = process.env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../components/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../components/settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ themeMode: 'light', language: 'en' }),
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
      { ...productiveProject, imageUrl: 'https://cdn.example/gallery.png' },
    ]);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/v1/projects?locale=en');
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

  it('filters the loaded list by mapped category', async () => {
    const renderer = await renderBrowser(() =>
      Promise.resolve([productiveProject, conservationProject])
    );

    const categoryFilters = new Set(
      renderer.root
        .findAll(
          (node) =>
            typeof node.props.testID === 'string' &&
            node.props.testID.startsWith('explorer-filter-')
        )
        .map((node) => {
          const testId = node.props.testID as unknown;
          return typeof testId === 'string' ? testId : '';
        })
    );
    expect(categoryFilters.size).toBe(3);
    expect(renderer.root.findByProps({ testID: 'explorer-filter-all' })).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'explorer-filter-productive_enterprise' })
    ).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'explorer-filter-conservation' })).toBeTruthy();

    void act(() => {
      renderer.root.findByProps({ testID: 'explorer-filter-conservation' }).props.onPress();
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

  it('renders the hero and proposal form and navigates to projects and enterprises', async () => {
    process.env.EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL = 'marketplace@example.com';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [publishedProject] }),
    } as Response);
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const renderer = await renderExplorerScreen();

    expect(renderer.root.findByProps({ children: 'explorer.heroTitle' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'explorer.form.title' })).toBeTruthy();

    await act(() =>
      renderer.root.findByProps({ testID: 'explorer-project-project-1' }).props.onPress()
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/explorar/[slug]',
      params: { slug: 'productive-project' },
    });

    await act(() =>
      renderer.root.findByProps({ testID: 'explorer-directory-enterprises' }).props.onPress()
    );
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
      pathname: '/explorar/empresa/[slug]',
      params: { slug: 'forest-enterprise' },
    });

    await act(() => pressableWithText(renderer, 'explorer.collaborate').props.onPress());
    await act(() => pressableWithText(renderer, 'explorer.submitProject').props.onPress());
    expect(openUrl).toHaveBeenCalledTimes(2);
    expect(openUrl).toHaveBeenNthCalledWith(1, 'mailto:marketplace@example.com');
    expect(openUrl).toHaveBeenNthCalledWith(2, 'mailto:marketplace@example.com');
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

    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.projectName' })
        .props.onChangeText('Community forest')
    );
    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.location' })
        .props.onChangeText('Andes')
    );
    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.contactName' })
        .props.onChangeText('Proposal Test')
    );
    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.contactEmail' })
        .props.onChangeText('Proposer@Example.com')
    );
    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.message' })
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

    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.projectName' })
        .props.onChangeText('Community forest')
    );
    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.location' })
        .props.onChangeText('Andes')
    );
    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.contactName' })
        .props.onChangeText('Proposal Test')
    );
    await act(() =>
      renderer.root
        .findByProps({ placeholder: 'explorer.form.contactEmail' })
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

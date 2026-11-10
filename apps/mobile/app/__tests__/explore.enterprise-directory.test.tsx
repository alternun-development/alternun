/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  MarketplaceEnterpriseBrowser,
  loadMarketplaceEnterprises,
} from '../../components/marketplace/MarketplaceEnterpriseDirectory';
import {
  MarketplaceEnterpriseDetailView,
  MarketplaceEnterpriseRequestError,
  loadMarketplaceEnterprise,
} from '../../components/marketplace/MarketplaceEnterpriseDetail';
import type {
  MarketplaceEnterprise,
  MarketplaceEnterpriseDetail,
} from '../../components/marketplace/types';

jest.mock('@alternun/ui', () => ({
  // SearchFilterBar only reads colors from the theme.
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
}));

jest.mock('../../components/onboarding/AirsIntroVideoCard', () => ({
  __esModule: true,
  default: 'MockVideoCard',
}));

jest.mock('../../components/marketplace/MarketplaceProjectComments', () => ({
  __esModule: true,
  default: () => null,
}));

const palette = {
  background: '#fff',
  surface: '#fff',
  border: '#ddd',
  text: '#111',
  muted: '#666',
  primary: '#087f63',
  primaryDeep: '#075440',
  fill: '#0f766e',
  mist: '#eee',
};
const t = ((key: string): string => key) as never;
const enterprise: MarketplaceEnterprise = {
  id: 'enterprise-1',
  slug: 'forest-hotel',
  displayName: 'Forest Hotel',
  logo: { url: 'https://cdn.example/logo.png', altText: 'Forest Hotel logo' },
  countryCode: 'CO',
  websiteUrl: 'https://forest.example',
  projectCount: 1,
};
const detail: MarketplaceEnterpriseDetail = {
  ...enterprise,
  projects: [
    {
      id: 'project-1',
      slug: 'forest-stay',
      status: 'published',
      categoryCode: 'hospitality_ecotourism',
      locale: 'en',
      availableLocales: ['en'],
      title: 'Forest stay',
      location: 'Colombia',
      theme: 'Conservation',
      description: 'A regenerative experience.',
      waysToContribute: ['Visit'],
      enterprise: { slug: enterprise.slug, displayName: enterprise.displayName },
      media: [],
    },
  ],
};

async function renderDirectory(
  loader: React.ComponentProps<typeof MarketplaceEnterpriseBrowser>['loader'],
  onOpenEnterprise = jest.fn()
): Promise<{ renderer: ReactTestRenderer; onOpenEnterprise: jest.Mock }> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceEnterpriseBrowser
        locale='en'
        palette={palette}
        t={t}
        loader={loader}
        onOpenEnterprise={onOpenEnterprise}
      />
    );
    await Promise.resolve();
  });
  return { renderer: renderer!, onOpenEnterprise };
}

async function renderDetail(
  loader: React.ComponentProps<typeof MarketplaceEnterpriseDetailView>['loader'],
  onOpenProject = jest.fn(),
  openUrl = jest.fn().mockResolvedValue(undefined)
): Promise<{ renderer: ReactTestRenderer; onOpenProject: jest.Mock; openUrl: jest.Mock }> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceEnterpriseDetailView
        slug={enterprise.slug}
        locale='en'
        palette={palette}
        t={t}
        loader={loader}
        onBack={() => undefined}
        onOpenProject={onOpenProject}
        openUrl={openUrl}
      />
    );
    await Promise.resolve();
  });
  return { renderer: renderer!, onOpenProject, openUrl };
}

describe('Explorer enterprise directory', () => {
  afterEach(() => jest.restoreAllMocks());

  it('loads the API list, normalizes unsafe optional URLs, and renders a card', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ ...enterprise, logo: { url: 'http://unsafe/logo.png', altText: 'Logo' } }],
        }),
    } as Response);
    const loaded = await loadMarketplaceEnterprises('en');
    expect(loaded[0].logo).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/enterprises?locale=en&perPage=50');

    const onOpenEnterprise = jest.fn();
    const { renderer } = await renderDirectory(
      () => Promise.resolve([enterprise]),
      onOpenEnterprise
    );
    void act(() =>
      renderer.root.findByProps({ testID: 'explorer-enterprise-enterprise-1' }).props.onPress()
    );
    expect(onOpenEnterprise).toHaveBeenCalledWith('forest-hotel');
  });

  it('filters companies and events from the search menu, which hides when there is one kind', async () => {
    const event = {
      ...enterprise,
      id: 'enterprise-2',
      slug: 'golf-cup',
      displayName: 'Golf Cup',
      kind: 'event' as const,
      sector: 'Golf',
    };
    const { renderer } = await renderDirectory(() => Promise.resolve([enterprise, event]));
    const cards = () =>
      new Set(
        renderer.root
          .findAll(
            (node) =>
              typeof node.props.testID === 'string' &&
              /^explorer-enterprise-enterprise-\d$/.test(node.props.testID)
          )
          .map((node) => node.props.testID as string)
      );
    expect(cards().size).toBe(2);
    void act(() =>
      renderer.root.findByProps({ testID: 'enterprise-filter-button' }).props.onPress()
    );
    void act(() =>
      renderer.root.findByProps({ testID: 'enterprise-filter-event' }).props.onPress()
    );
    expect([...cards()]).toEqual(['explorer-enterprise-enterprise-2']);
    // Search also matches the sector.
    void act(() =>
      renderer.root.findByProps({ testID: 'enterprise-filter-button' }).props.onPress()
    );
    void act(() => renderer.root.findByProps({ testID: 'enterprise-filter-all' }).props.onPress());
    void act(() =>
      renderer.root.findByProps({ testID: 'enterprise-search-input' }).props.onChangeText('golf')
    );
    expect([...cards()]).toEqual(['explorer-enterprise-enterprise-2']);

    const single = await renderDirectory(() => Promise.resolve([enterprise]));
    expect(
      single.renderer.root.findAllByProps({ testID: 'enterprise-filter-button' })
    ).toHaveLength(0);
  });

  it('opens the in-app enterprise manage view from a button in the top-right corner', async () => {
    const onManageEnterprise = jest.fn();
    const openUrl = jest.fn().mockResolvedValue(undefined);
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <MarketplaceEnterpriseDetailView
          slug={enterprise.slug}
          locale='en'
          palette={palette}
          t={t}
          loader={() => Promise.resolve(detail)}
          onBack={() => undefined}
          onOpenProject={jest.fn()}
          openUrl={openUrl}
          onManageEnterprise={onManageEnterprise}
          adminAccess={{
            isGlobalAdmin: false,
            canOpenAdminPanel: true,
            roles: ['partner_operator'],
            scopes: [
              {
                role: 'partner_operator',
                enterpriseId: enterprise.id,
                enterpriseSlug: enterprise.slug,
                projectId: null,
                projectSlug: null,
              },
            ],
          }}
        />
      );
      await Promise.resolve();
    });
    const button = renderer!.root.findAll(
      (node) => node.props.testID === 'enterprise-detail-admin' && node.props.floating === true
    )[0];
    expect(button).toBeTruthy();
    await act(async () => {
      await button.props.openUrl(button.props.url);
    });
    expect(onManageEnterprise).toHaveBeenCalledWith(enterprise.id);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('renders the empty state', async () => {
    const { renderer } = await renderDirectory(() => Promise.resolve([]));
    expect(renderer.root.findByProps({ testID: 'enterprise-directory-empty' })).toBeTruthy();
  });

  it('renders an error and retries', async () => {
    let calls = 0;
    const { renderer } = await renderDirectory(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve([enterprise]);
    });
    expect(renderer.root.findByProps({ testID: 'enterprise-directory-error' })).toBeTruthy();
    await act(async () => {
      renderer.root.findByProps({ testID: 'enterprise-directory-retry' }).props.onPress();
      await Promise.resolve();
    });
    expect(calls).toBe(2);
    expect(renderer.root.findByProps({ testID: 'explorer-enterprise-enterprise-1' })).toBeTruthy();
  });

  it('loads enterprise detail and navigates to a project', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    } as Response);
    expect((await loadMarketplaceEnterprise(enterprise.slug, 'en')).displayName).toBe(
      'Forest Hotel'
    );
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/enterprises/forest-hotel?locale=en');

    const onOpenProject = jest.fn();
    const { renderer, openUrl } = await renderDetail(() => Promise.resolve(detail), onOpenProject);
    expect(renderer.root.findByProps({ testID: 'enterprise-detail-logo' })).toBeTruthy();
    void act(() =>
      renderer.root.findByProps({ testID: 'enterprise-detail-project-project-1' }).props.onPress()
    );
    expect(onOpenProject).toHaveBeenCalledWith('forest-stay');
    await act(async () => {
      renderer.root.findByProps({ testID: 'enterprise-detail-website' }).props.onPress();
      await Promise.resolve();
    });
    expect(openUrl).toHaveBeenCalledWith('https://forest.example');
  });

  it('shows the unavailable state for a 404', async () => {
    const { renderer } = await renderDetail(() =>
      Promise.reject(new MarketplaceEnterpriseRequestError(404))
    );
    expect(renderer.root.findByProps({ testID: 'enterprise-detail-not-found' })).toBeTruthy();
  });

  it('retries an enterprise detail request after an error', async () => {
    let calls = 0;
    const { renderer } = await renderDetail(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(detail);
    });
    expect(renderer.root.findByProps({ testID: 'enterprise-detail-error' })).toBeTruthy();
    await act(async () => {
      renderer.root.findByProps({ testID: 'enterprise-detail-retry' }).props.onPress();
      await Promise.resolve();
    });
    expect(calls).toBe(2);
    expect(renderer.root.findByProps({ testID: 'enterprise-detail-logo' })).toBeTruthy();
  });
});

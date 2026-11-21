/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  MarketplaceEnterpriseDetailView,
  loadMarketplaceEnterprise,
} from '../MarketplaceEnterpriseDetail';
import type { MarketplaceEnterpriseDetail } from '../types';

jest.mock('@alternun/ui', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
}));
jest.mock('../../onboarding/AirsIntroVideoCard', () => ({
  __esModule: true,
  default: 'MockVideoCard',
}));
jest.mock('../MarketplaceProjectComments', () => ({ __esModule: true, default: () => null }));
// Honor awards load on their own and have their own tests.
jest.mock('../../honorAwards/HonorAwardsSection', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../honorAwards/HonorAwardCatalogSection', () => ({
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
const detail: MarketplaceEnterpriseDetail = {
  id: 'enterprise-1',
  slug: 'swing-golf-colombia',
  displayName: 'Swing Golf Colombia',
  logo: null,
  countryCode: 'CO',
  websiteUrl: null,
  projectCount: 1,
  projects: [],
};

async function renderDetail(enterprise: MarketplaceEnterpriseDetail): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceEnterpriseDetailView
        slug={enterprise.slug}
        locale='es'
        palette={palette}
        t={t}
        loader={() => Promise.resolve(enterprise)}
        onBack={() => undefined}
        onOpenProject={jest.fn()}
      />
    );
    await Promise.resolve();
  });
  return renderer!;
}

describe('Enterprise page gallery', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps only safe https photos from the API, and accepts responses without a gallery', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ...detail,
          gallery: [
            { url: 'https://cdn.example/salida.jpg', altText: 'Salida del hoyo 1' },
            { url: 'http://cdn.example/insegura.jpg', altText: 'Insegura' },
          ],
        }),
    } as Response);
    expect((await loadMarketplaceEnterprise(detail.slug, 'en')).gallery).toEqual([
      { url: 'https://cdn.example/salida.jpg', altText: 'Salida del hoyo 1' },
    ]);
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/enterprises/swing-golf-colombia?locale=en');

    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(detail) } as Response);
    expect((await loadMarketplaceEnterprise(detail.slug, 'es')).gallery).toEqual([]);
  });

  it('shows the photos in order, named after the enterprise when they have no description', async () => {
    const renderer = await renderDetail({
      ...detail,
      gallery: [
        { url: 'https://cdn.example/salida.jpg', altText: 'Salida del hoyo 1' },
        { url: 'https://cdn.example/green.jpg', altText: '' },
      ],
    });
    const gallery = renderer.root.findByProps({ testID: 'enterprise-detail-gallery' });
    const photos = gallery.findAll(
      (node) => (node.type as unknown) === 'Image' && node.props.source?.uri
    );
    expect(photos.map((node) => [node.props.source.uri, node.props.accessibilityLabel])).toEqual([
      ['https://cdn.example/salida.jpg', 'Salida del hoyo 1'],
      ['https://cdn.example/green.jpg', 'Swing Golf Colombia'],
    ]);
  });

  it('hides the gallery when there are no photos', async () => {
    const renderer = await renderDetail({ ...detail, gallery: [] });
    expect(renderer.root.findAllByProps({ testID: 'enterprise-detail-gallery' })).toHaveLength(0);
  });
});

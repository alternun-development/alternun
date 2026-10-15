/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  MarketplaceProjectDetailView,
  MarketplaceProjectRequestError,
  type MarketplacePublicProject,
} from '../../components/marketplace/MarketplaceProjectDetail';

jest.mock('../../components/onboarding/AirsIntroVideoCard', () => ({
  __esModule: true,
  default: () => null,
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
  mist: '#eee',
};
const t = ((key: string): string => key) as never;
const project: MarketplacePublicProject = {
  id: 'project-1',
  slug: 'forest-hotel',
  status: 'published',
  categoryCode: 'hospitality_ecotourism',
  locale: 'es',
  availableLocales: ['es', 'en'],
  title: 'Hotel del bosque',
  location: 'Colombia',
  theme: 'Naturaleza',
  description: 'Descanso que protege.',
  waysToContribute: ['Visitar'],
  enterprise: { displayName: 'Bosque Vivo' },
  media: [
    {
      id: 'logo',
      kind: 'logo',
      url: 'https://cdn.example/logo.png',
      embedUrl: null,
      altText: { es: 'Logo' },
      caption: {},
      sortOrder: 0,
      isActive: true,
    },
    {
      id: 'cover',
      kind: 'cover',
      url: 'https://cdn.example/cover.png',
      embedUrl: null,
      altText: { es: 'Bosque' },
      caption: {},
      sortOrder: 0,
      isActive: true,
    },
    {
      id: 'gallery',
      kind: 'gallery_image',
      url: 'https://cdn.example/gallery.png',
      embedUrl: null,
      altText: { es: 'Sendero' },
      caption: {},
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 'video',
      kind: 'video',
      url: 'https://cdn.example/video.mp4',
      embedUrl: null,
      altText: {},
      caption: {},
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 'canva',
      kind: 'canva',
      url: 'https://www.canva.com/design/example',
      embedUrl: null,
      altText: {},
      caption: {},
      sortOrder: 3,
      isActive: true,
    },
  ],
};

async function render(
  loader: React.ComponentProps<typeof MarketplaceProjectDetailView>['loader']
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceProjectDetailView
        slug='forest-hotel'
        locale='es'
        palette={palette}
        t={t}
        loader={loader}
        onBack={() => undefined}
      />
    );
    await Promise.resolve();
  });
  return renderer!;
}

describe('Marketplace project detail', () => {
  it('renders all supported media', async () => {
    const renderer = await render(() => Promise.resolve(project));
    expect(renderer.root.findByProps({ testID: 'project-detail-cover' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-detail-logo' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-detail-gallery' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-detail-video' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-detail-canva' })).toBeTruthy();
  });

  it('omits media sections when none are available', async () => {
    const renderer = await render(() => Promise.resolve({ ...project, media: [] }));
    expect(renderer.root.findAllByProps({ testID: 'project-detail-gallery' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'project-detail-video' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'project-detail-canva' })).toHaveLength(0);
  });

  it('shows the unavailable state for a 404', async () => {
    const renderer = await render(() => Promise.reject(new MarketplaceProjectRequestError(404)));
    expect(renderer.root.findByProps({ testID: 'project-detail-not-found' })).toBeTruthy();
  });

  it('retries a failed request', async () => {
    let calls = 0;
    const renderer = await render(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(project);
    });
    expect(renderer.root.findByProps({ testID: 'project-detail-error' })).toBeTruthy();
    await act(async () => {
      renderer.root.findByProps({ testID: 'project-detail-retry' }).props.onPress();
      await Promise.resolve();
    });
    expect(calls).toBe(2);
    expect(renderer.root.findByProps({ testID: 'project-detail-cover' })).toBeTruthy();
  });

  it('ignores non-https media URLs', async () => {
    const insecure = project.media.map((item) => ({
      ...item,
      url: item.kind === 'cover' ? 'http://cdn.example/cover.png' : item.url,
    }));
    const renderer = await render(() => Promise.resolve({ ...project, media: insecure }));
    expect(renderer.root.findAllByProps({ testID: 'project-detail-cover' })).toHaveLength(0);
  });
});

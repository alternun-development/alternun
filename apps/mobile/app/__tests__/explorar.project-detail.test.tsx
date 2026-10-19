/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { Linking, Platform } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  canvaEmbedUrl,
  MarketplaceProjectDetailView,
  MarketplaceProjectRequestError,
} from '../../components/marketplace/MarketplaceProjectDetail';
import type { MarketplacePublicProject } from '../../components/marketplace/types';

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
  enterprise: { slug: 'bosque-vivo', displayName: 'Bosque Vivo' },
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
      url: 'https://cdn.example/video.mp4?signature=example',
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
  it('uses the video player for a direct video file', async () => {
    const renderer = await render(() => Promise.resolve(project));
    expect(renderer.root.findByProps({ testID: 'project-detail-cover' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-detail-logo' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-detail-gallery' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'project-detail-video' })).toBeTruthy();
    expect(renderer.root.findAllByType('MockVideoCard' as never)).toHaveLength(1);
    expect(renderer.root.findAllByProps({ testID: 'project-detail-video-external' })).toHaveLength(
      0
    );
    expect(renderer.root.findByProps({ testID: 'project-detail-canva' })).toBeTruthy();
  });

  it('opens the enterprise detail from the project', async () => {
    const onOpenEnterprise = jest.fn();
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <MarketplaceProjectDetailView
          slug='forest-hotel'
          locale='es'
          palette={palette}
          t={t}
          loader={() => Promise.resolve(project)}
          onBack={() => undefined}
          onOpenEnterprise={onOpenEnterprise}
        />
      );
      await Promise.resolve();
    });
    void act(() =>
      renderer!.root.findByProps({ testID: 'project-detail-enterprise' }).props.onPress()
    );
    expect(onOpenEnterprise).toHaveBeenCalledWith('bosque-vivo');
  });

  it('opens a non-file video in the system browser', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const externalVideo = project.media.map((item) =>
      item.kind === 'video'
        ? {
            ...item,
            url: 'https://www.youtube.com/watch?v=example',
            embedUrl: 'https://www.youtube.com/embed/example',
          }
        : item
    );
    const renderer = await render(() => Promise.resolve({ ...project, media: externalVideo }));
    expect(renderer.root.findAllByType('MockVideoCard' as never)).toHaveLength(0);
    await act(async () => {
      renderer.root.findByProps({ testID: 'project-detail-video-external' }).props.onPress();
      await Promise.resolve();
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.youtube.com/watch?v=example');
    jest.restoreAllMocks();
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
      url: item.kind === 'video' ? 'http://cdn.example/video.mp4' : item.url,
    }));
    const renderer = await render(() => Promise.resolve({ ...project, media: insecure }));
    expect(renderer.root.findAllByProps({ testID: 'project-detail-video' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'project-detail-video-external' })).toHaveLength(
      0
    );
  });
});

describe('Marketplace project detail Canva presentation', () => {
  const originalOs = Platform.OS;
  const embedUrl = 'https://www.canva.com/design/example/view?embed';

  function setPlatform(os: string): void {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  }

  function withCanva(url: string, embed: string | null = null): MarketplacePublicProject {
    return {
      ...project,
      media: project.media.map((item) =>
        item.kind === 'canva' ? { ...item, url, embedUrl: embed } : item
      ),
    };
  }

  afterEach(() => setPlatform(originalOs));

  it('embeds an allowed Canva link on web in a sandboxed, lazy iframe', async () => {
    setPlatform('web');
    const renderer = await render(() =>
      Promise.resolve(withCanva('https://www.canva.com/design/example/view', embedUrl))
    );

    const frame = renderer.root.findByType('iframe' as never);
    expect(frame.props.src).toBe(embedUrl);
    expect(frame.props.title).toBe('explorer.detail.presentationTitle');
    expect(frame.props.loading).toBe('lazy');
    expect(frame.props.sandbox).toBe(
      'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
    );
    expect(frame.props.sandbox).not.toMatch(/allow-top-navigation|allow-forms|allow-modals/);
    expect(renderer.root.findByProps({ testID: 'project-detail-canva-embed' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'project-detail-canva' })).toHaveLength(0);
  });

  it('falls back to the button on web when the host is not allowed', async () => {
    setPlatform('web');
    const renderer = await render(() =>
      Promise.resolve(withCanva('https://canva.example.com/design/example/view?embed'))
    );

    expect(renderer.root.findAllByType('iframe' as never)).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'project-detail-canva' })).toBeTruthy();
  });

  it('falls back to the button on web when the link is not an embed link', async () => {
    setPlatform('web');
    const renderer = await render(() => Promise.resolve(project));

    expect(renderer.root.findAllByType('iframe' as never)).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'project-detail-canva' })).toBeTruthy();
  });

  it('renders neither embed nor button on web without Canva media', async () => {
    setPlatform('web');
    const renderer = await render(() =>
      Promise.resolve({
        ...project,
        media: project.media.filter((item) => item.kind !== 'canva'),
      })
    );

    expect(renderer.root.findAllByType('iframe' as never)).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'project-detail-canva' })).toHaveLength(0);
  });

  it('keeps the button on native even for an allowed embed link', async () => {
    setPlatform('ios');
    const renderer = await render(() =>
      Promise.resolve(withCanva('https://www.canva.com/design/example/view', embedUrl))
    );

    expect(renderer.root.findAllByType('iframe' as never)).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'project-detail-canva' })).toBeTruthy();
  });

  it('accepts only HTTPS embed links on the allowed Canva hosts', () => {
    const media = project.media.find((item) => item.kind === 'canva')!;
    const check = (url: string, embed: string | null = null): string | null =>
      canvaEmbedUrl({ ...media, url, embedUrl: embed });

    expect(check('https://canva.com/design/x/view?embed')).toBe(
      'https://canva.com/design/x/view?embed'
    );
    expect(check('https://www.canva.com/design/x/view', embedUrl)).toBe(embedUrl);
    expect(check('http://www.canva.com/design/x/view?embed')).toBeNull();
    expect(check('https://www.canva.com.evil.example/design/x/view?embed')).toBeNull();
    expect(check('https://user:pass@www.canva.com/design/x/view?embed')).toBeNull();
    expect(check('https://www.canva.com:8443/design/x/view?embed')).toBeNull();
    expect(check('ftp://www.canva.com/design/x/view?embed')).toBeNull();
    expect(canvaEmbedUrl(undefined)).toBeNull();
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { EnterpriseManageView, enterpriseTabs } from '../EnterpriseManageView';
import { enterpriseInfoPatch } from '../EnterpriseInfoSection';
import { EnterpriseImagesSection } from '../EnterpriseImagesSection';
import { ManageRequestError } from '../../../utils/projectManage';
import type {
  EnterpriseManageClient,
  EnterpriseManageOverview,
} from '../../../utils/enterpriseManage';

// Toasts the view shows right now.
const mockToasts: Array<{ type: string; title: string }> = [];
jest.mock('@alternun/ui', () => ({
  // SearchFilterBar only reads colors from the theme.
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
  ToastSystem: ({ toasts }: { toasts: Array<{ type: string; title: string }> }) => {
    mockToasts.splice(0, mockToasts.length, ...toasts);
    return null;
  },
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
const t = ((key: string) => key) as never;

const overview: EnterpriseManageOverview = {
  enterprise: {
    id: 'e1',
    slug: 'hoteles-taybo',
    displayName: 'Hoteles Taybo',
    sector: 'Hotelería',
    description: null,
    location: { municipality: 'Santa Marta' },
    publicContact: { email: 'comercial@taybo.test' },
    logoUrl: 'https://cdn.test/logo.png',
    bannerUrl: null,
  },
  roles: ['partner_operator'],
  isGlobalAdmin: false,
  can: { editInfo: true, images: true, products: true, team: true },
};

function client(extra: Partial<EnterpriseManageClient> = {}): EnterpriseManageClient {
  return {
    overview: jest.fn(async () => overview),
    updateEnterprise: jest.fn(async () => overview.enterprise),
    uploadImage: jest.fn(async () => undefined),
    removeImage: jest.fn(async () => undefined),
    addGalleryImage: jest.fn(async () => undefined),
    removeGalleryImage: jest.fn(async () => undefined),
    listProducts: jest.fn(async () => [
      {
        id: 'p1',
        name: 'Noche',
        description: null,
        airsMin: 5,
        airsMax: null,
        airsNote: 'por noche',
        isActive: true,
      },
    ]),
    createProduct: jest.fn(async () => ({} as never)),
    updateProduct: jest.fn(async () => ({} as never)),
    deleteProduct: jest.fn(async () => undefined),
    listTeam: jest.fn(async () => []),
    addTeamMember: jest.fn(async () => undefined),
    revokeTeamMember: jest.fn(async () => undefined),
    ...extra,
  };
}

// Unmounted after each test, so pending toast timers do not fire after the suite.
const mounted: ReactTestRenderer[] = [];
afterEach(() => {
  act(() => mounted.splice(0).forEach((renderer) => renderer.unmount()));
});

async function render(element: React.JSX.Element): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(element);
    await Promise.resolve();
    await Promise.resolve();
  });
  mounted.push(renderer!);
  return renderer!;
}
const pressable = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0];
const input = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onChangeText === 'function')[0];
async function press(r: ReactTestRenderer, id: string): Promise<void> {
  await act(async () => {
    pressable(r, id).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('EnterpriseManageView', () => {
  it('shows the tabs the role allows', () => {
    expect(enterpriseTabs({ editInfo: true, images: true, products: false, team: false })).toEqual([
      'info',
      'images',
    ]);
  });

  it('adds the honor awards tab last when the screen provides its client', () => {
    expect(
      enterpriseTabs({ editInfo: true, images: false, products: false, team: false }, false, true)
    ).toEqual(['info', 'honors']);
  });

  it('shows the denied state for people without access', async () => {
    const c = client({
      overview: jest.fn(async () => {
        throw new ManageRequestError(403, 'ENTERPRISE_SCOPE_DENIED');
      }),
    });
    const r = await render(
      <EnterpriseManageView client={c} palette={palette} t={t} onBack={jest.fn()} canPickFiles />
    );
    expect(
      r.root.findAll((n) => n.props.testID === 'enterprise-manage-denied').length
    ).toBeGreaterThan(0);
  });

  it('saves the profile and manages products', async () => {
    const c = client();
    const r = await render(
      <EnterpriseManageView client={c} palette={palette} t={t} onBack={jest.fn()} canPickFiles />
    );
    await act(async () =>
      input(r, 'enterprise-manage-description').props.onChangeText('Hoteles en El Rodadero')
    );
    // Discarding brings back the saved text; the change is typed again before saving.
    expect(
      r.root.findAll((n) => n.props.testID === 'enterprise-manage-discard').length
    ).toBeGreaterThan(0);
    await press(r, 'enterprise-manage-discard');
    expect(input(r, 'enterprise-manage-description').props.value).not.toBe(
      'Hoteles en El Rodadero'
    );
    await act(async () =>
      input(r, 'enterprise-manage-description').props.onChangeText('Hoteles en El Rodadero')
    );
    await press(r, 'enterprise-manage-save');
    expect((c.updateEnterprise as jest.Mock).mock.calls[0][0]).toMatchObject({
      displayName: 'Hoteles Taybo',
      description: 'Hoteles en El Rodadero',
      location: { municipality: 'Santa Marta' },
    });
    // The confirmation is a toast, visible wherever the person is on the page.
    expect(mockToasts).toEqual([
      expect.objectContaining({ type: 'success', title: 'manage.saved' }),
    ]);

    await press(r, 'enterprise-manage-tab-products');
    await act(async () => input(r, 'enterprise-product-p1-airsMax').props.onChangeText('10'));
    await press(r, 'enterprise-product-p1-submit');
    expect(c.updateProduct).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ airsMin: 5, airsMax: 10 })
    );

    await act(async () => input(r, 'enterprise-product-new-name').props.onChangeText('Desayuno'));
    await act(async () => input(r, 'enterprise-product-new-airsMin').props.onChangeText('2x'));
    await press(r, 'enterprise-product-new-submit');
    // Non-digits are stripped while typing.
    expect(c.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Desayuno', airsMin: 2 })
    );
    await press(r, 'enterprise-product-p1-delete');
    expect(c.deleteProduct).toHaveBeenCalledWith('p1');
  });

  it('edits the English profile and product text without touching the Spanish one', async () => {
    const c = client({
      overview: jest.fn(async () => ({
        ...overview,
        enterprise: { ...overview.enterprise, translations: { en: { sector: 'Hotels' } } },
      })),
    });
    const r = await render(
      <EnterpriseManageView client={c} palette={palette} t={t} onBack={jest.fn()} canPickFiles />
    );
    const hint = () => r.root.findAll((n) => n.props.testID === 'enterprise-manage-locale-hint');
    expect(hint()).toHaveLength(0);
    await press(r, 'enterprise-manage-locale-en');
    expect(hint().length).toBeGreaterThan(0);
    expect(input(r, 'enterprise-manage-sector').props.value).toBe('Hotels');
    await act(async () =>
      input(r, 'enterprise-manage-description').props.onChangeText(' Hotels in El Rodadero ')
    );
    await press(r, 'enterprise-manage-locale-es');
    expect(input(r, 'enterprise-manage-sector').props.value).toBe('Hotelería');
    await press(r, 'enterprise-manage-save');
    expect((c.updateEnterprise as jest.Mock).mock.calls[0][0]).toMatchObject({
      sector: 'Hotelería',
      description: '',
      translations: { en: { sector: 'Hotels', description: 'Hotels in El Rodadero' } },
    });

    await press(r, 'enterprise-manage-tab-products');
    await press(r, 'enterprise-products-locale-en');
    // New products start in Spanish.
    expect(r.root.findAll((n) => n.props.testID === 'enterprise-product-new')).toHaveLength(0);
    expect(input(r, 'enterprise-product-p1-name').props.value).toBe('');
    await act(async () => input(r, 'enterprise-product-p1-name').props.onChangeText('Night'));
    await act(async () => input(r, 'enterprise-product-p1-airsMax').props.onChangeText('9'));
    await press(r, 'enterprise-product-p1-submit');
    expect(c.updateProduct).toHaveBeenCalledWith('p1', {
      name: 'Noche',
      description: null,
      airsMin: 5,
      airsMax: 9,
      airsNote: 'por noche',
      translations: { en: { name: 'Night' } },
    });
  });
});

describe('enterprise helpers', () => {
  it('compacts the profile patch and merges the English text into the translations', () => {
    expect(
      enterpriseInfoPatch(
        {
          displayName: ' Taybo ',
          sector: '',
          description: 'D',
          location: { municipality: 'SM', address: ' ' },
          publicContact: { web: '' },
          en: { sector: ' ', description: ' Hotels ' },
        },
        { translations: { en: { sector: 'Hotels' }, th: { description: 'โรงแรม' } } }
      )
    ).toEqual({
      displayName: 'Taybo',
      sector: '',
      description: 'D',
      location: { municipality: 'SM' },
      publicContact: {},
      // A blank English field is cleared, so readers get the Spanish one.
      translations: { en: { description: 'Hotels' }, th: { description: 'โรงแรม' } },
    });
  });

  it('adds gallery photos with their description and removes them', async () => {
    const c = client();
    const file = { type: 'image/jpeg', size: 10 } as never;
    const onChanged = jest.fn();
    const withGallery = {
      ...overview,
      enterprise: {
        ...overview.enterprise,
        gallery: [{ url: 'https://cdn.test/hoyo-1.jpg', altText: 'Hoyo 1' }],
      },
    };
    const r = await render(
      <EnterpriseImagesSection
        client={c}
        overview={withGallery}
        palette={palette}
        t={t}
        onChanged={onChanged}
        canPickFiles
        pickFile={jest.fn(async () => file)}
      />
    );
    await act(async () =>
      input(r, 'enterprise-manage-gallery-alt').props.onChangeText('Premiación')
    );
    await press(r, 'enterprise-manage-images-upload-gallery');
    expect(c.addGalleryImage).toHaveBeenCalledWith(file, 'Premiación');
    expect(input(r, 'enterprise-manage-gallery-alt').props.value).toBe('');
    await press(r, 'enterprise-manage-gallery-remove-0');
    expect(c.removeGalleryImage).toHaveBeenCalledWith('https://cdn.test/hoyo-1.jpg');
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('stops offering uploads once the gallery is full', async () => {
    const full = {
      ...overview,
      enterprise: {
        ...overview.enterprise,
        gallery: Array.from({ length: 12 }, (_, index) => ({
          url: `https://cdn.test/${index}.jpg`,
          altText: '',
        })),
      },
    };
    const r = await render(
      <EnterpriseImagesSection
        client={client()}
        overview={full}
        palette={palette}
        t={t}
        onChanged={jest.fn()}
        canPickFiles
      />
    );
    expect(pressable(r, 'enterprise-manage-gallery-remove-11')).toBeTruthy();
    expect(pressable(r, 'enterprise-manage-images-upload-gallery')).toBeUndefined();
  });

  it('uploads and removes the logo and banner', async () => {
    const c = client();
    const pickFile = jest.fn(async () => ({ type: 'image/png', size: 10 } as never));
    const onChanged = jest.fn();
    const r = await render(
      <EnterpriseImagesSection
        client={c}
        overview={overview}
        palette={palette}
        t={t}
        onChanged={onChanged}
        canPickFiles
        pickFile={pickFile}
      />
    );
    await press(r, 'enterprise-manage-images-upload-banner');
    expect(c.uploadImage).toHaveBeenCalledWith('banner', { type: 'image/png', size: 10 });
    await press(r, 'enterprise-manage-images-remove-logo');
    expect(c.removeImage).toHaveBeenCalledWith('logo');
    expect(onChanged).toHaveBeenCalledTimes(2);
  });
});

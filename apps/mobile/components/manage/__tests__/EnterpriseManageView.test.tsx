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

async function render(element: React.JSX.Element): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(element);
    await Promise.resolve();
    await Promise.resolve();
  });
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
    await press(r, 'enterprise-manage-save');
    expect((c.updateEnterprise as jest.Mock).mock.calls[0][0]).toMatchObject({
      displayName: 'Hoteles Taybo',
      description: 'Hoteles en El Rodadero',
      location: { municipality: 'Santa Marta' },
    });

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
});

describe('enterprise helpers', () => {
  it('compacts the profile patch', () => {
    expect(
      enterpriseInfoPatch({
        displayName: ' Taybo ',
        sector: '',
        description: 'D',
        location: { municipality: 'SM', address: ' ' },
        publicContact: { web: '' },
      })
    ).toEqual({
      displayName: 'Taybo',
      sector: '',
      description: 'D',
      location: { municipality: 'SM' },
      publicContact: {},
    });
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

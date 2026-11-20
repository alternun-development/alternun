import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import HonorAwardCatalogSection from '../HonorAwardCatalogSection';
import HonorAwardInspectModal from '../HonorAwardInspectModal';
import { honorHowToEarn } from '../honorAwardTheme';
import { fetchPublicHonorCatalog } from '../../../utils/honorAwards';

jest.mock('@alternun/ui', () => ({
  SectionContainer: ({ title, subtitle, children }) => {
    const { createElement: mockCreate, Fragment: MockFragment } = require('react');
    const { Text: MockText } = require('react-native');
    return mockCreate(
      MockFragment,
      null,
      mockCreate(MockText, null, title),
      mockCreate(MockText, null, subtitle),
      children
    );
  },
}));
jest.mock('../HonorAwardEmblem', () => ({ __esModule: true, default: () => null }));
jest.mock('../HonorAwardInspectModal', () => ({ __esModule: true, default: jest.fn(() => null) }));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ locale: 'es', t: (_key, _params, fallback) => fallback }),
}));

const t = (_key, _params, fallback) => fallback;
const c = { text: '#000', muted: '#666', accent: '#0b5a5f' };

function item(id, overrides = {}) {
  return {
    recipe: {
      id,
      kind: 'medal',
      tier: 'generic',
      title: 'Manglar Verde',
      eventName: 'Tour Callaway Colombia',
      airsAmount: 5,
      badgeImageUrl: null,
      artPreset: 'golf_mangrove',
      ...overrides,
    },
    project: null,
    partner: { slug: 'swing-golf', displayName: 'Swing Golf Colombia' },
  };
}

async function render(load) {
  let tree;
  await act(async () => {
    tree = renderer.create(
      <HonorAwardCatalogSection source={{ kind: 'enterprise', slug: 'swing-golf' }} c={c} load={load} />
    );
  });
  return tree;
}

const texts = (tree) =>
  tree.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(''));

afterEach(() => jest.clearAllMocks());

it('lists the medals to earn and opens one in grey with how to earn it', async () => {
  const load = jest.fn(() => Promise.resolve([item('r1'), item('r2', { eventName: null })]));
  const tree = await render(load);
  expect(load).toHaveBeenCalledWith({ kind: 'enterprise', slug: 'swing-golf' });
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['Medallas para obtener', 'Tour Callaway Colombia', '+5 Airs'])
  );
  const first = tree.root.findAll(
    (node) =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === 'Manglar Verde · Tour Callaway Colombia: ver cómo obtenerla'
  )[0];
  await act(async () => first.props.onPress());
  const modal = HonorAwardInspectModal.mock.calls.at(-1)[0];
  expect(modal.award.id).toBe('locked-r1');
  expect(modal.locked).toBe(true);
  expect(modal.initialStage).toBe('mission');
  expect(modal.howToEarn).toContain('Se obtiene en Tour Callaway Colombia, con Swing Golf Colombia.');
  await act(async () => modal.onClose());
  expect(HonorAwardInspectModal.mock.calls.at(-1)[0].award).toBeNull();
});

it('shows nothing without medals or when they cannot be loaded', async () => {
  expect((await render(() => Promise.resolve([]))).toJSON()).toBeNull();
  expect((await render(() => Promise.reject(new Error('down')))).toJSON()).toBeNull();
});

it('explains how to earn a medal from its ally and event', () => {
  expect(honorHowToEarn(t, item('a'))).toMatch(
    /^Se obtiene en Tour Callaway Colombia, con Swing Golf Colombia\. Te la entregan por correo o con un código/
  );
  expect(honorHowToEarn(t, item('b', { eventName: null }))).toMatch(
    /^Se obtiene con Swing Golf Colombia\. /
  );
  expect(honorHowToEarn(t, { ...item('c'), partner: null })).toMatch(/^Te la entregan/);
});

it('reads the public catalog of an ally or a project', async () => {
  const fetcher = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([item('r1')]) })
  );
  const items = await fetchPublicHonorCatalog(
    { kind: 'project', slug: 'fundacion-batis' },
    fetcher,
    'https://api.example.test/'
  );
  expect(items).toHaveLength(1);
  expect(fetcher.mock.calls[0][0]).toBe(
    'https://api.example.test/v1/projects/fundacion-batis/honor-awards/catalog'
  );
  const failing = jest.fn(() => Promise.resolve({ ok: false, status: 404 }));
  await expect(
    fetchPublicHonorCatalog({ kind: 'enterprise', slug: 'x' }, failing, 'https://api.example.test')
  ).rejects.toMatchObject({ status: 404 });
  const odd = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
  expect(
    await fetchPublicHonorCatalog({ kind: 'enterprise', slug: 'x' }, odd, 'https://api.example.test')
  ).toEqual([]);
});

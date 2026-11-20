import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import HonorAwardsSection from '../HonorAwardsSection';
import HonorAwardClaimCinematic from '../HonorAwardClaimCinematic';
import HonorAwardInspectModal from '../HonorAwardInspectModal';
import HonorAwardsInfoModal from '../HonorAwardsInfoModal';
import HonorAwardRedeemModal from '../HonorAwardRedeemModal';

jest.mock('@alternun/ui', () => ({
  // The header action (info button) renders before the content, as in the real container.
  SectionContainer: ({ children, trailing }) => {
    const { createElement: mockCreate, Fragment: MockFragment } = require('react');
    return mockCreate(MockFragment, null, trailing, children);
  },
}));
jest.mock('../HonorAwardEmblem', () => ({ __esModule: true, default: () => null }));
jest.mock('../HonorAwardClaimCinematic', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('../HonorAwardInspectModal', () => ({ __esModule: true, default: jest.fn(() => null) }));
jest.mock('../HonorAwardsInfoModal', () => ({ __esModule: true, default: jest.fn(() => null) }));
jest.mock('../HonorAwardRedeemModal', () => ({ __esModule: true, default: jest.fn(() => null) }));
jest.mock('../../settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ motionLevel: 'off' }),
}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ locale: 'es', t: (_key, _params, fallback) => fallback }),
}));

const c = { text: '#fff', muted: '#999' };

function award(id, status, overrides = {}) {
  return {
    id,
    status,
    awardedAt: '2026-10-30T00:00:00Z',
    claimedAt: status === 'claimed' ? '2026-10-30T00:00:00Z' : null,
    recipe: {
      id: 'r',
      kind: 'medal',
      tier: 'gold',
      audience: 'user',
      title: 'Manglar Verde',
      classification: null,
      purpose: null,
      eventName: null,
      eventYear: 2026,
      venueName: null,
      venueLocation: null,
      airsAmount: 15,
      badgeImageUrl: null,
      frontImageUrl: null,
      backImageUrl: null,
    },
    project: null,
    partner: {
      id: 'p',
      slug: 'swing',
      displayName: 'Swing Golf',
      description: null,
      logoUrl: null,
      websiteUrl: null,
    },
    ...overrides,
  };
}

function makeClient({
  awards = [],
  canClaim = true,
  fail = false,
  claimFails = false,
  catalog,
} = {}) {
  return {
    canClaim,
    ...(catalog ? { catalog: jest.fn(catalog) } : {}),
    list: jest.fn(() => (fail ? Promise.reject(new Error('down')) : Promise.resolve(awards))),
    claim: jest.fn((id) =>
      claimFails ? Promise.reject(new Error('nope')) : Promise.resolve(award(id, 'claimed'))
    ),
  };
}

async function render(props) {
  let tree;
  await act(async () => {
    tree = renderer.create(<HonorAwardsSection scope={{ kind: 'me' }} c={c} {...props} />);
  });
  return tree;
}

const texts = (tree) => tree.root.findAllByType(Text).map((node) => node.props.children);
const pressables = (tree) =>
  tree.root.findAll(
    (node) => typeof node.props.onPress === 'function' && node.props.accessibilityRole === 'button'
  );
const awardButton = (tree, label) =>
  pressables(tree).find((node) => node.props.accessibilityLabel === label);

beforeEach(() => {
  HonorAwardClaimCinematic.mockClear();
  HonorAwardInspectModal.mockClear();
});

it('shows the awards and empty placeholders up to a full row', async () => {
  const tree = await render({ client: makeClient({ awards: [award('a', 'claimed')] }) });
  expect(texts(tree)).toContain('Swing Golf');
  expect(texts(tree).filter((value) => value === 'Espacio disponible')).toHaveLength(4);
});

it('draws pending and locked medals in greyscale, claimed ones in color', async () => {
  const Emblem = require('../HonorAwardEmblem').default;
  const lockedRecipe = { ...award('x', 'claimed').recipe, id: 'r2', title: 'Coral Vivo' };
  const tree = await render({
    client: makeClient({
      awards: [
        award('p', 'pending'),
        award('c', 'claimed', { recipe: { ...award('c', 'claimed').recipe, id: 'r3' } }),
      ],
      catalog: () => Promise.resolve([{ recipe: lockedRecipe, project: null, partner: null }]),
    }),
  });
  const gray = tree.root
    .findAllByType(Emblem)
    .filter((node) => !node.props.placeholder)
    .map((node) => [node.props.title, Boolean(node.props.grayscale)]);
  expect(gray).toEqual([
    ['Manglar Verde', true],
    ['Manglar Verde', false],
    ['Coral Vivo', true],
  ]);
});

it('claims a pending award and plays the claim animation with it', async () => {
  const client = makeClient({ awards: [award('a', 'pending')] });
  const tree = await render({ client });
  expect(texts(tree)).toContain('Reclamar');
  expect(texts(tree)).toContain('Galardones por reclamar: 1');
  await act(async () => {
    awardButton(tree, 'Manglar Verde').props.onPress();
  });
  expect(client.claim).toHaveBeenCalledWith('a');
  const lastCinematic = HonorAwardClaimCinematic.mock.calls.at(-1)[0];
  expect(lastCinematic.award.id).toBe('a');
  expect(lastCinematic.award.status).toBe('claimed');
  expect(texts(tree)).not.toContain('Reclamar');

  await act(async () => lastCinematic.onInspect(lastCinematic.award));
  expect(HonorAwardInspectModal.mock.calls.at(-1)[0].award.id).toBe('a');
  expect(HonorAwardClaimCinematic.mock.calls.at(-1)[0].award).toBeNull();
});

it('opens the medal view for a claimed award', async () => {
  const tree = await render({ client: makeClient({ awards: [award('a', 'claimed')] }) });
  await act(async () => awardButton(tree, 'Manglar Verde').props.onPress());
  expect(HonorAwardInspectModal.mock.calls.at(-1)[0].award.id).toBe('a');
  expect(HonorAwardInspectModal.mock.calls.at(-1)[0].initialStage).toBe('medal');
});

it('tells the person when a claim fails', async () => {
  const tree = await render({
    client: makeClient({ awards: [award('a', 'pending')], claimFails: true }),
  });
  await act(async () => awardButton(tree, 'Manglar Verde').props.onPress());
  expect(texts(tree)).toContain('No pudimos reclamar el galardón. Inténtalo de nuevo.');
});

it('offers a retry when the awards do not load', async () => {
  const client = makeClient({ fail: true });
  const tree = await render({ client });
  expect(texts(tree)).toContain('No pudimos cargar los galardones. Toca para reintentar.');
  client.list.mockImplementation(() => Promise.resolve([]));
  const retry = pressables(tree).find(
    (node) =>
      node.findAll(
        (child) =>
          child.type === Text &&
          child.props.children === 'No pudimos cargar los galardones. Toca para reintentar.'
      ).length > 0
  );
  await act(async () => retry.props.onPress());
  expect(client.list).toHaveBeenCalledTimes(2);
});

it('public pages stay hidden until the ally has an award, and never offer claims', async () => {
  const empty = await render({ client: makeClient({ canClaim: false }), hideWhenEmpty: true });
  expect(empty.toJSON()).toBeNull();
  const shown = await render({
    client: makeClient({ canClaim: false, awards: [award('a', 'claimed')] }),
    hideWhenEmpty: true,
  });
  expect(texts(shown)).toContain('Swing Golf');
  expect(texts(shown)).not.toContain('Reclamar');
});

it('opens the explanation from the info button', async () => {
  const tree = await render({ client: makeClient() });
  expect(HonorAwardsInfoModal.mock.calls.at(-1)[0].visible).toBe(false);
  await act(async () => awardButton(tree, '¿Qué es el legado?').props.onPress());
  const info = HonorAwardsInfoModal.mock.calls.at(-1)[0];
  expect(info.visible).toBe(true);
  expect(info.audience).toBe('person');
});

it('shows the sample medal first when the person has none, and previews it', async () => {
  const tree = await render({ client: makeClient() });
  expect(texts(tree)).toContain('Toca la medalla de ejemplo para ver cómo se ve.');
  const sample = awardButton(tree, 'Medalla de ejemplo: ver demostración');
  // The other placeholders are plain: nothing happens on them.
  expect(texts(tree).filter((value) => value === 'Espacio disponible')).toHaveLength(4);
  expect(
    pressables(tree).filter((node) => node.props.accessibilityLabel?.startsWith('Espacio'))
  ).toHaveLength(0);
  await act(async () => sample.props.onPress());
  const preview = HonorAwardClaimCinematic.mock.calls.at(-1)[0];
  expect(preview.demo).toBe(true);
  expect(preview.award.recipe.tier).toBe('generic');
  expect(preview.award.recipe.artPreset).toBe('golf_mangrove');

  await act(async () => preview.onInspect(preview.award));
  const inspect = HonorAwardInspectModal.mock.calls.at(-1)[0];
  expect(inspect.demo).toBe(true);
  expect(inspect.initialStage).toBe('mission');
  expect(inspect.award.id).toBe('demo-generic');
});

it('shows the medals still to earn as locked and opens them without sharing', async () => {
  const lockedItem = {
    ...award('x', 'claimed'),
    recipe: { ...award('x', 'claimed').recipe, id: 'r2', title: 'Coral Vivo' },
  };
  const client = makeClient({
    awards: [award('a', 'claimed')],
    catalog: () => Promise.resolve([{ recipe: lockedItem.recipe, project: null, partner: null }]),
  });
  const tree = await render({ client });
  expect(client.catalog).toHaveBeenCalled();
  expect(texts(tree)).not.toContain('Toca la medalla de ejemplo para ver cómo se ve.');
  expect(awardButton(tree, 'Medalla de ejemplo: ver demostración')).toBeUndefined();
  await act(async () => awardButton(tree, 'Coral Vivo: medalla por obtener').props.onPress());
  const inspect = HonorAwardInspectModal.mock.calls.at(-1)[0];
  expect(inspect.locked).toBe(true);
  expect(inspect.demo).toBe(false);
  expect(inspect.award.id).toBe('locked-r2');
  expect(texts(tree).filter((value) => value === 'Espacio disponible')).toHaveLength(3);
});

it('still shows the person their medals when the catalog fails', async () => {
  const tree = await render({
    client: makeClient({
      awards: [award('a', 'claimed')],
      catalog: () => Promise.reject(new Error('down')),
    }),
  });
  expect(texts(tree)).toContain('Swing Golf');
  expect(texts(tree).filter((value) => value === 'Espacio disponible')).toHaveLength(4);
});

it('lets allies preview the sample from an empty slot', async () => {
  const tree = await render({
    client: makeClient(),
    scope: { kind: 'enterprise-manage', enterpriseId: 'e' },
  });
  const slots = pressables(tree).filter(
    (node) => node.props.accessibilityLabel === 'Espacio disponible: ver demostración'
  );
  expect(slots).toHaveLength(5);
  await act(async () => slots[0].props.onPress());
  expect(HonorAwardClaimCinematic.mock.calls.at(-1)[0].demo).toBe(true);
});

it('explains honor awards to allies on their pages', async () => {
  await render({
    client: makeClient({ canClaim: false }),
    scope: { kind: 'enterprise-public', slug: 'swing' },
  });
  expect(HonorAwardsInfoModal.mock.calls.at(-1)[0].audience).toBe('ally');
});

describe('claiming a medal with a code', () => {
  it('opens the code modal and plays the claim of the medal it gave', async () => {
    const given = award('g-new', 'pending');
    const client = makeClient();
    client.redeem = jest.fn(() => Promise.resolve({}));
    // First load: nothing; after the code: the new medal waiting to be claimed.
    client.list.mockResolvedValueOnce([]).mockResolvedValueOnce([given]);
    const tree = await render({ client });
    const button = pressables(tree).find(
      (node) =>
        node.findAll((child) => child.type === Text && child.props.children === 'Reclamar medalla')
          .length > 0
    );
    act(() => button.props.onPress());
    const modal = HonorAwardRedeemModal.mock.calls.at(-1)[0];
    expect(modal.visible).toBe(true);
    await modal.redeem('ABCD-EFGH-JKMN');
    expect(client.redeem).toHaveBeenCalledWith('ABCD-EFGH-JKMN');
    await act(async () => {
      modal.onRedeemed({
        recipeId: 'r',
        airsAmount: 5,
        reportStatus: 'released',
        grantId: 'g-new',
      });
    });
    expect(client.claim).toHaveBeenCalledWith('g-new');
    expect(HonorAwardClaimCinematic.mock.calls.at(-1)[0].award.id).toBe('g-new');
  });

  it('only reloads when the medal waits for an approver, and is absent for allies', async () => {
    const client = makeClient();
    client.redeem = jest.fn();
    const tree = await render({ client });
    const modal = HonorAwardRedeemModal.mock.calls.at(-1)[0];
    await act(async () => {
      modal.onRedeemed({
        recipeId: 'r',
        airsAmount: 5,
        reportStatus: 'pending_approval',
        grantId: null,
      });
    });
    expect(client.list).toHaveBeenCalledTimes(2);
    expect(client.claim).not.toHaveBeenCalled();
    act(() => tree.unmount());

    HonorAwardRedeemModal.mockClear();
    const ally = await render({
      scope: { kind: 'enterprise-manage', enterpriseId: 'e' },
      client: makeClient(),
    });
    expect(texts(ally)).not.toContain('Reclamar medalla');
    expect(HonorAwardRedeemModal).not.toHaveBeenCalled();
  });
});

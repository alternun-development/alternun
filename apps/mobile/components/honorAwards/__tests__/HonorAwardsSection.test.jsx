import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import HonorAwardsSection from '../HonorAwardsSection';
import HonorAwardClaimCinematic from '../HonorAwardClaimCinematic';
import HonorAwardInspectModal from '../HonorAwardInspectModal';
import HonorAwardsInfoModal from '../HonorAwardsInfoModal';

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

function makeClient({ awards = [], canClaim = true, fail = false, claimFails = false } = {}) {
  return {
    canClaim,
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

it('opens the card view for a claimed award', async () => {
  const tree = await render({ client: makeClient({ awards: [award('a', 'claimed')] }) });
  await act(async () => awardButton(tree, 'Manglar Verde').props.onPress());
  expect(HonorAwardInspectModal.mock.calls.at(-1)[0].award.id).toBe('a');
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
  await act(async () => awardButton(tree, '¿Qué son los galardones de honor?').props.onPress());
  const info = HonorAwardsInfoModal.mock.calls.at(-1)[0];
  expect(info.visible).toBe(true);
  expect(info.audience).toBe('person');
});

it('previews the claim of a sample golf medal from an empty slot', async () => {
  const tree = await render({ client: makeClient() });
  expect(texts(tree)).toContain('Toca un espacio disponible para ver una demostración.');
  const slots = pressables(tree).filter(
    (node) => node.props.accessibilityLabel === 'Espacio disponible: ver demostración'
  );
  expect(slots).toHaveLength(5);
  await act(async () => slots[1].props.onPress());
  const preview = HonorAwardClaimCinematic.mock.calls.at(-1)[0];
  expect(preview.demo).toBe(true);
  expect(preview.award.recipe.tier).toBe('silver');
  expect(preview.award.recipe.artPreset).toBe('golf_mangrove');

  await act(async () => preview.onInspect(preview.award));
  const inspect = HonorAwardInspectModal.mock.calls.at(-1)[0];
  expect(inspect.demo).toBe(true);
  expect(inspect.award.id).toBe('demo-silver');
});

it('explains honor awards to allies on their pages', async () => {
  await render({
    client: makeClient({ canClaim: false }),
    scope: { kind: 'enterprise-public', slug: 'swing' },
  });
  expect(HonorAwardsInfoModal.mock.calls.at(-1)[0].audience).toBe('ally');
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import HonorAwardsSection from '../HonorAwardsSection';
import HonorAwardClaimCinematic from '../HonorAwardClaimCinematic';
import HonorAwardInspectModal from '../HonorAwardInspectModal';

jest.mock('@alternun/ui', () => ({ SectionContainer: ({ children }) => children }));
jest.mock('../HonorAwardEmblem', () => ({ __esModule: true, default: () => null }));
jest.mock('../HonorAwardClaimCinematic', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('../HonorAwardInspectModal', () => ({ __esModule: true, default: jest.fn(() => null) }));
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
  const retry = pressables(tree)[0];
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

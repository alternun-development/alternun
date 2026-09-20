import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import AchievementCollection from '../AchievementCollection';
import { AchievementBadge, ACHIEVEMENT_CATALOG } from '../AchievementBadge';
import SearchFilterBar from '../../common/SearchFilterBar';

jest.mock('@alternun/ui', () => ({ SectionContainer: ({ children }) => children }));
jest.mock('../../common/SearchFilterBar', () => ({ __esModule: true, default: () => null }));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (_key, params, fallback) =>
      fallback.replace(/{{(\w+)}}/g, (_, key) => String(params?.[key])),
  }),
}));
const c = { text: '#123', muted: '#567', border: '#ccc' };
let tree;
beforeEach(() => {
  act(() => {
    tree = renderer.create(
      <AchievementCollection
        achievements={[{ key: 'account_confirmed', unlocked: true, unlockedAt: null }]}
        score={30}
        c={c}
      />
    );
  });
});
afterEach(() => act(() => tree.unmount()));
const keys = () => tree.root.findAllByType(AchievementBadge).map((node) => node.props.def.key);
const next = () =>
  tree.root
    .findAllByType(TouchableOpacity)
    .find((node) => node.props.accessibilityLabel === 'Next page');

it('shows completed badges first, account badges first within each state, and reaches every entry', () => {
  expect(keys().slice(0, 4)).toEqual([
    'account_confirmed',
    'first_10_airs',
    'profile_complete',
    'bio_added',
  ]);
  const seen = [...keys()];
  while (!next().props.disabled) {
    act(() => next().props.onPress());
    seen.push(...keys());
  }
  expect(seen).toHaveLength(Object.keys(ACHIEVEMENT_CATALOG).length);
  expect(new Set(seen).size).toBe(seen.length);
});

it('resets pagination when changing type and includes all eight numbered AIRS badges', () => {
  act(() => next().props.onPress());
  act(() => tree.root.findByType(SearchFilterBar).props.onChangeFilter('airs'));
  expect(keys()).toEqual([
    'first_10_airs',
    'fifty_airs',
    'first_100_airs',
    'first_500_airs',
    'first_1000_airs',
    'first_5000_airs',
    'first_10000_airs',
    'first_50000_airs',
  ]);
  expect(next().props.disabled).toBe(true);
});

it('searches labels without accents, combines search with category, and recovers from no results', () => {
  act(() => tree.root.findByType(SearchFilterBar).props.onChangeText('biografia'));
  expect(keys()).toEqual(['bio_added']);
  act(() => tree.root.findByType(SearchFilterBar).props.onChangeFilter('airs'));
  expect(keys()).toEqual([]);
  expect(next().props.disabled).toBe(true);
  act(() => tree.root.findByType(SearchFilterBar).props.onChangeText(''));
  expect(keys()).toHaveLength(8);
});

it('finds milestone numbers without thousands separators and by their artwork abbreviation', () => {
  act(() => tree.root.findByType(SearchFilterBar).props.onChangeText('5000'));
  expect(keys()).toEqual(['first_5000_airs', 'first_50000_airs']);
  act(() => tree.root.findByType(SearchFilterBar).props.onChangeText('50k'));
  expect(keys()).toEqual(['first_50000_airs']);
});

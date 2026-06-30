import { LayoutAnimation } from 'react-native';

export type RankScope = 'global' | 'country' | 'city';

export function changeLeaderboardScope(
  nextScope: RankScope,
  currentScope: RankScope,
  setScope: (scope: RankScope) => void,
  configureNext?: (config: unknown) => void
): void {
  if (nextScope === currentScope) {
    return;
  }

  const animateLayout = configureNext ?? LayoutAnimation.configureNext;
  if (typeof animateLayout === 'function') {
    animateLayout(LayoutAnimation.Presets.easeInEaseOut);
  }

  setScope(nextScope);
}

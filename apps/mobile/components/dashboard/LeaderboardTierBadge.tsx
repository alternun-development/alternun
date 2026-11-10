import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveTier, TIERS } from '@alternun/ui';
import { STATUS_BADGES } from '../profile/badgeAssets';
import type { LeaderboardTierBadgeProps } from './LeaderboardTierBadge.types';

/**
 * Status tier badge after a name in Top AIRS (same tier rule as the profile). Icon only; the tier
 * name expands on hover (web) or on press, and a second press collapses it.
 */
export function LeaderboardTierBadge({
  score,
  testID,
}: LeaderboardTierBadgeProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const tier = resolveTier(Number.isFinite(score) ? score : 0);
  const spec = TIERS[tier];
  const artwork = STATUS_BADGES[tier];
  const expanded = hovered || pinned;
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={spec.label}
      accessibilityState={{ expanded }}
      hitSlop={6}
      onPress={() => setPinned((value) => !value)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.badge,
        expanded && styles.badgeExpanded,
        { borderColor: `${spec.color}66`, backgroundColor: `${spec.color}1f` },
      ]}
    >
      {artwork ? (
        <Image source={artwork} style={styles.artwork} resizeMode='contain' />
      ) : (
        <View style={[styles.dot, { backgroundColor: spec.color }]} />
      )}
      {expanded ? <Text style={[styles.label, { color: spec.color }]}>{spec.label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 3,
    flexShrink: 0,
  },
  badgeExpanded: { paddingRight: 8 },
  artwork: { width: 16, height: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 10, fontWeight: '800' },
});

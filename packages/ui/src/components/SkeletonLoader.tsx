import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Single shimmer skeleton block. Pulses between base and highlight colors
 * using the active theme's skeleton tokens — no external deps required.
 */
export function SkeletonLoader({ width, height, borderRadius = 8, style }: SkeletonLoaderProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const highlight = opacity.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.skeletonBase, theme.skeletonHighlight],
  });

  return (
    <View
      style={[
        styles.wrapper,
        { width: width as number, height, borderRadius, backgroundColor: theme.skeletonBase },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius, backgroundColor: highlight as unknown as string },
        ]}
      />
    </View>
  );
}

// ── Preset skeleton shapes ────────────────────────────────────────────────

/** Full skeleton for a StatCard (matches StatCard dimensions) */
export function StatCardSkeleton() {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.statCardSkeleton,
        { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
      ]}
    >
      <View style={styles.skeletonCardTop}>
        <SkeletonLoader width={32} height={32} borderRadius={8} />
        <SkeletonLoader width={40} height={20} borderRadius={10} />
      </View>
      <SkeletonLoader width={80} height={28} borderRadius={6} style={{ marginBottom: 6 }} />
      <SkeletonLoader width={100} height={12} borderRadius={4} />
    </View>
  );
}

/** Full skeleton for an AIRS ledger entry row */
export function LedgerRowSkeleton() {
  return (
    <View style={styles.ledgerRow}>
      <SkeletonLoader width={36} height={36} borderRadius={10} />
      <View style={styles.ledgerRowText}>
        <SkeletonLoader width={140} height={13} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonLoader width={90} height={11} borderRadius={4} />
      </View>
      <SkeletonLoader width={48} height={18} borderRadius={6} />
    </View>
  );
}

/** Full skeleton for a section header */
export function SectionHeaderSkeleton() {
  return (
    <View style={styles.sectionHeaderSkeleton}>
      <View>
        <SkeletonLoader width={120} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonLoader width={80} height={12} borderRadius={4} />
      </View>
      <SkeletonLoader width={60} height={28} borderRadius={14} />
    </View>
  );
}

/** Skeleton for a pill/badge row (filter pills) */
export function PillRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.pillRow}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} width={60 + i * 10} height={30} borderRadius={15} />
      ))}
    </View>
  );
}

/** Skeleton for score number only */
export function ScoreNumberSkeleton() {
  return <SkeletonLoader width={140} height={52} borderRadius={8} />;
}

/** Skeleton for status tier badge */
export function StatusBadgeSkeleton() {
  return <SkeletonLoader width={130} height={30} borderRadius={999} />;
}

/** Skeleton for progress numbers (e.g., "0 / 1,000 Airs") */
export function ProgressNumbersSkeleton() {
  return <SkeletonLoader width={88} height={13} borderRadius={4} />;
}

/** Skeleton for progress percentage */
export function ProgressPercentageSkeleton() {
  return <SkeletonLoader width={32} height={13} borderRadius={4} />;
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  statCardSkeleton: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  skeletonCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  ledgerRowText: {
    flex: 1,
  },
  sectionHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  heroPanelSkeleton: {
    gap: 8,
  },
  scoreRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  progressSectionSkeleton: {
    gap: 8,
  },
});

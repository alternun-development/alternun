import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { StatCardSkeleton } from './SkeletonLoader';
import { radius, fontSize, spacing } from '../tokens/spacing';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  accentColor: string;
  /** Pass a lucide-react-native icon component */
  icon: React.ReactNode;
  isLoading?: boolean;
  style?: ViewStyle;
}

export function StatCard({
  label,
  value,
  delta = '+0',
  deltaPositive = true,
  accentColor,
  icon,
  isLoading = false,
  style,
}: StatCardProps): React.ReactNode {
  const { theme } = useTheme();

  // Entrance animations
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
      Animated.spring(opacityAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, slideAnim]);

  if (isLoading) {
    return <StatCardSkeleton />;
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconBg, { backgroundColor: `${accentColor}18` }]}>{icon}</View>
        <Animated.View
          style={[
            styles.deltaBadge,
            deltaPositive ? styles.deltaPositive : styles.deltaNegative,
            {
              opacity: opacityAnim,
            },
          ]}
        >
          <Text style={[styles.deltaText, { color: deltaPositive ? '#1ccba1' : '#ef4444' }]}>
            {delta}
          </Text>
        </Animated.View>
      </View>

      <Text style={[styles.value, { color: theme.textPrimary }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing[4],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  deltaPositive: {
    backgroundColor: 'rgba(28,203,161,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.3)',
  },
  deltaNegative: {
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  deltaText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  value: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});

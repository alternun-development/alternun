import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../tokens/spacing';

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger';
type Size = 'sm' | 'md' | 'lg';
type Trend = 'up' | 'down' | 'flat';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number | string;
  trend?: Trend;
  caption?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  size?: Size;
  compact?: boolean;
  style?: ViewStyle;
}

const toneStyles: Record<Tone, { bg: string; value: string; deltaUp: string; deltaDown: string }> =
  {
    default: {
      bg: 'rgba(113, 113, 122, 0.08)',
      value: '#18181b',
      deltaUp: '#16a34a',
      deltaDown: '#dc2626',
    },
    primary: {
      bg: 'rgba(59, 130, 246, 0.08)',
      value: '#1e40af',
      deltaUp: '#16a34a',
      deltaDown: '#dc2626',
    },
    success: {
      bg: 'rgba(34, 197, 94, 0.08)',
      value: '#15803d',
      deltaUp: '#15803d',
      deltaDown: '#dc2626',
    },
    warning: {
      bg: 'rgba(251, 146, 60, 0.08)',
      value: '#b45309',
      deltaUp: '#16a34a',
      deltaDown: '#dc2626',
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.08)',
      value: '#b91c1c',
      deltaUp: '#16a34a',
      deltaDown: '#b91c1c',
    },
  };

const sizeStyles: Record<
  Size,
  { pad: number; label: number; value: number; caption: number; icon: number }
> = {
  sm: {
    pad: spacing[3],
    label: 12,
    value: 18,
    caption: 11,
    icon: 16,
  },
  md: {
    pad: spacing[4],
    label: 14,
    value: 24,
    caption: 12,
    icon: 20,
  },
  lg: {
    pad: spacing[6],
    label: 14,
    value: 32,
    caption: 14,
    icon: 24,
  },
};

export function KpiCard({
  label,
  value,
  delta,
  trend = 'flat',
  caption,
  icon,
  tone = 'primary',
  size = 'md',
  style,
}: KpiCardProps): React.ReactNode {
  const { theme } = useTheme();
  const toneStyle = toneStyles[tone as Tone];
  const sizeStyle = sizeStyles[size as Size];

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;

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

  const deltaValue = typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${delta}%` : delta;

  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  const deltaColor = isUp ? toneStyle.deltaUp : isDown ? toneStyle.deltaDown : '#71717a';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: toneStyle.bg,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          borderColor: theme.cardBorder,
          paddingHorizontal: sizeStyle.pad,
          paddingVertical: sizeStyle.pad,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Text
            style={[
              styles.label,
              {
                color: '#71717a',
                fontSize: sizeStyle.label,
              },
            ]}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.value,
              {
                color: toneStyle.value,
                fontSize: sizeStyle.value,
              },
            ]}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Text>
          {caption ? (
            <Text
              style={[
                styles.caption,
                {
                  color: '#a1a1a6',
                  fontSize: sizeStyle.caption,
                },
              ]}
            >
              {caption}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSection}>
          {deltaValue ? (
            <View style={styles.deltaContainer}>
              <TrendIcon size={14} color={deltaColor} strokeWidth={2.2} />
              <Text
                style={[
                  styles.deltaValue,
                  {
                    color: deltaColor,
                    fontSize: sizeStyle.label,
                  },
                ]}
              >
                {deltaValue}
              </Text>
            </View>
          ) : null}
          {icon ? (
            <View
              style={[
                styles.iconContainer,
                {
                  width: sizeStyle.icon + 8,
                  height: sizeStyle.icon + 8,
                },
              ]}
            >
              {icon}
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.baseline, { backgroundColor: `${deltaColor}40` }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  leftSection: {
    flex: 1,
    gap: spacing[1],
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  value: {
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  caption: {
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deltaValue: {
    fontWeight: '700',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  baseline: {
    height: 2,
    borderRadius: 1,
    width: 40,
    marginTop: spacing[3],
    opacity: 0.5,
  },
});

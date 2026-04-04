import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../tokens/spacing';

interface GlassCardProps {
  children: ReactNode;
  /** Visual variant */
  variant?: 'default' | 'teal' | 'gold' | 'danger';
  padding?: number;
  style?: ViewStyle;
}

const VARIANT_BORDERS = {
  default: 'rgba(255,255,255,0.10)',
  teal: 'rgba(28,203,161,0.28)',
  gold: 'rgba(212,185,106,0.28)',
  danger: 'rgba(248,113,113,0.28)',
};

const VARIANT_GLOW = {
  default: 'rgba(255,255,255,0.02)',
  teal: 'rgba(28,203,161,0.06)',
  gold: 'rgba(212,185,106,0.06)',
  danger: 'rgba(248,113,113,0.06)',
};

/**
 * Glass-morphism card surface.
 * On mobile we approximate the effect with semi-transparent background + border.
 * Wrap with expo-blur's BlurView in the consuming app for full glass effect.
 */
export function GlassCard({ children, variant = 'default', padding, style }: GlassCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.isDark ? 'rgba(13,13,31,0.88)' : 'rgba(255,255,255,0.88)',
          borderColor: VARIANT_BORDERS[variant],
          shadowColor: VARIANT_GLOW[variant],
          padding: padding ?? spacing[4],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Compact inline glass surface — for status badges, chips, etc.
 */
export function GlassChip({
  children,
  variant = 'default',
  style,
}: {
  children: ReactNode;
  variant?: GlassCardProps['variant'];
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        styles.chip,
        { borderColor: VARIANT_BORDERS[variant], backgroundColor: VARIANT_GLOW[variant] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius['2xl'],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

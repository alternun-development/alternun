import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { radius } from '../tokens/spacing';

interface IconBadgeProps {
  /** lucide-react-native icon element */
  icon: ReactNode;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZE_MAP = {
  sm: { container: 28, borderRadius: radius.sm },
  md: { container: 36, borderRadius: radius.md },
  lg: { container: 48, borderRadius: radius.lg },
};

/**
 * Colored icon container — the translucent circle/square behind icons.
 * Tint is automatically derived from the accent color (18% opacity).
 */
export function IconBadge({ icon, color, size = 'md', style }: IconBadgeProps) {
  const { container, borderRadius } = SIZE_MAP[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: container,
          height: container,
          borderRadius,
          backgroundColor: `${color}20`,
          borderColor: `${color}30`,
        },
        style,
      ]}
    >
      {icon}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

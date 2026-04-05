/**
 * Divider — Alternun Design System
 *
 * A 1 px horizontal line using the theme's divider token.
 * Use `spacing` prop for vertical margin above and below.
 *
 * Usage:
 *   <Divider />
 *   <Divider spacing={16} />           // 16 px margin top+bottom
 *   <Divider color="rgba(0,0,0,0.1)" /> // custom color
 */

import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface DividerProps {
  /** Vertical margin applied equally above and below. Default: 0. */
  spacing?: number;
  color?: string;
  style?: ViewStyle;
}

export function Divider({ spacing = 0, color, style }: DividerProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: color ?? theme.divider,
          marginVertical: spacing,
        },
        style,
      ]}
    />
  );
}

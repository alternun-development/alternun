/**
 * Avatar — Alternun Design System
 *
 * Circular avatar displaying initials derived from a display name,
 * with theme-aware teal tint background.
 *
 * Usage:
 *   <Avatar name="José Santiago" size={32} />
 *   <Avatar name="Ed" size={44} isDark={false} />
 *   <Avatar size={28} />   // renders "U" when no name given
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface AvatarProps {
  name?: string;
  size?: number;
}

function getInitials(name?: string): string {
  if (!name?.trim()) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function Avatar({ name, size = 32 }: AvatarProps) {
  const { theme } = useTheme();
  const initials = useMemo(() => getInitials(name), [name]);
  const fontSize = Math.round(size * 0.38);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.accentMuted,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize, color: theme.accent }]}>{initials}</Text>
    </View>
  );
}

/** Helper — extract initials string without rendering */
export { getInitials };

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

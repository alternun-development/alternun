import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, fontSize, spacing } from '../tokens/spacing';
import { palette } from '../tokens/colors';

// ── Status Pill ──────────────────────────────────────────────────────────────

const STATUS_PRESETS = {
  Free: { bg: 'rgba(28,203,161,0.14)', text: '#1ccba1', border: 'rgba(28,203,161,0.3)' },
  Deposited: { bg: 'rgba(245,158,11,0.14)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  Consumed: { bg: 'rgba(248,113,113,0.14)', text: '#f87171', border: 'rgba(248,113,113,0.3)' },
  Open: { bg: 'rgba(28,203,161,0.14)', text: '#1ccba1', border: 'rgba(28,203,161,0.3)' },
  Closed: { bg: 'rgba(129,140,248,0.14)', text: '#818cf8', border: 'rgba(129,140,248,0.3)' },
  GOLD: { bg: 'rgba(212,185,106,0.14)', text: '#d4b96a', border: 'rgba(212,185,106,0.3)' },
  PLATINUM: { bg: 'rgba(155,169,196,0.14)', text: '#9ba9c4', border: 'rgba(155,169,196,0.3)' },
  SILVER: { bg: 'rgba(168,184,204,0.14)', text: '#a8b8cc', border: 'rgba(168,184,204,0.3)' },
} as const;

export type StatusPreset = keyof typeof STATUS_PRESETS;

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function StatusPill({ status, size = 'md', style }: StatusPillProps) {
  const preset = STATUS_PRESETS[status as StatusPreset] ?? {
    bg: 'rgba(255,255,255,0.08)',
    text: '#e8e8ff',
    border: 'rgba(255,255,255,0.15)',
  };

  return (
    <View
      style={[
        styles.statusPill,
        size === 'sm' && styles.statusPillSm,
        { backgroundColor: preset.bg, borderColor: preset.border },
        style,
      ]}
    >
      <Text
        style={[styles.statusText, size === 'sm' && styles.statusTextSm, { color: preset.text }]}
      >
        {status}
      </Text>
    </View>
  );
}

// ── Filter Pill ──────────────────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function FilterPill({ label, active, onPress, style }: FilterPillProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.filterPill,
        active
          ? { backgroundColor: theme.accent, borderColor: theme.accent }
          : { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
        style,
      ]}
    >
      <Text style={[styles.filterText, { color: active ? theme.accentText : theme.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Count Badge ──────────────────────────────────────────────────────────────

interface CountBadgeProps {
  count: number;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function CountBadge({ count, color = palette.teal, style, textStyle }: CountBadgeProps) {
  return (
    <View
      style={[
        styles.countBadge,
        { backgroundColor: `${color}22`, borderColor: `${color}44` },
        style,
      ]}
    >
      <Text style={[styles.countText, { color }, textStyle]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusPillSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusTextSm: {
    fontSize: fontSize.xs,
  },
  filterPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});

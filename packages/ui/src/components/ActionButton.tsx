/**
 * ActionButton — Alternun Design System
 *
 * A compact rounded pill button with an optional leading icon.
 * Used for inline actions in cards (Deposit, Retire, Transfer, etc.)
 *
 * Variants:
 *   filled   — solid accent fill (primary action)
 *   outlined — border only (secondary action)
 *   ghost    — no border, subtle background on press
 *
 * Usage:
 *   <ActionButton label="Deposit" onPress={handleDeposit} variant="filled" />
 *   <ActionButton label="Retire"  onPress={handleRetire}  variant="outlined" />
 *   <ActionButton label="Transfer" onPress={handleTransfer} variant="ghost" icon={<ArrowRight size={12} />} />
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, fontSize, spacing } from '../tokens/spacing';

export type ActionButtonVariant = 'filled' | 'outlined' | 'ghost';

export interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: ActionButtonVariant;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

export function ActionButton({
  label,
  onPress,
  variant = 'outlined',
  icon,
  trailingIcon,
  disabled = false,
  style,
}: ActionButtonProps) {
  const { theme } = useTheme();

  const bg =
    variant === 'filled'
      ? theme.primaryBtnBg
      : variant === 'ghost'
      ? 'transparent'
      : theme.secondaryBtnBg;

  const border =
    variant === 'filled'
      ? 'transparent'
      : variant === 'ghost'
      ? 'transparent'
      : theme.secondaryBtnBorder;

  const textColor = variant === 'filled' ? theme.primaryBtnText : theme.textSecondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {trailingIcon ? <View style={styles.iconSlot}>{trailingIcon}</View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing[3],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

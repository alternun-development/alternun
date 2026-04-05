/**
 * Button — Alternun Design System
 *
 * Variants:
 *   primary   — filled teal background (default)
 *   secondary — ghost border, transparent background
 *   danger    — red border / text for destructive actions
 *
 * Sizes:
 *   sm  — compact (paddingVertical: 6)
 *   md  — default (paddingVertical: 10)
 *   lg  — large  (paddingVertical: 14)
 *
 * Usage:
 *   <Button title="Sign In" onPress={handleSignIn} />
 *   <Button title="Cancel" variant="secondary" size="sm" onPress={onCancel} />
 *   <Button title="Delete" variant="danger" onPress={onDelete} />
 *   <Button title="Loading…" onPress={noop} disabled />
 *   <Button title="With icon" onPress={fn} icon={<LogIn size={14} color="#050510" />} />
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { palette } from '../tokens/colors';
import { radius, fontSize, spacing } from '../tokens/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Optional icon rendered before the title */
  icon?: React.ReactNode;
  /** Optional icon rendered after the title */
  trailingIcon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const VERTICAL: Record<ButtonSize, number> = { sm: 6, md: 10, lg: 14 };
const HORIZONTAL: Record<ButtonSize, number> = { sm: 12, md: 18, lg: 24 };
const FONT: Record<ButtonSize, number> = {
  sm: fontSize.sm,
  md: fontSize.base,
  lg: fontSize.md,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  trailingIcon,
  style,
  fullWidth = false,
}: ButtonProps) {
  const { theme } = useTheme();

  const bg =
    variant === 'primary'
      ? disabled
        ? theme.isDark
          ? 'rgba(28,203,161,0.35)'
          : 'rgba(13,148,136,0.35)'
        : theme.primaryBtnBg
      : 'transparent';

  const borderColor =
    variant === 'primary'
      ? 'transparent'
      : variant === 'danger'
      ? palette.error
      : theme.secondaryBtnBorder;

  const textColor =
    variant === 'primary'
      ? theme.primaryBtnText
      : variant === 'danger'
      ? palette.error
      : disabled
      ? theme.textMuted
      : theme.secondaryBtnText;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          paddingVertical: VERTICAL[size],
          paddingHorizontal: HORIZONTAL[size],
          opacity: disabled && variant !== 'primary' ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size='small' color={textColor} />
      ) : (
        <View style={styles.inner}>
          {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
          <Text style={[styles.label, { fontSize: FONT[size], color: textColor }]}>{title}</Text>
          {trailingIcon ? <View style={styles.iconSlot}>{trailingIcon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

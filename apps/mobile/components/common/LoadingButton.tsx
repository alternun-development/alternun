import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useAppPalette } from '../theme/useAppPalette';

type ButtonVariant = 'primary' | 'secondary';

export interface LoadingButtonProps {
  /**
   * Button label/text (shown when not loading)
   */
  label: string;
  /**
   * Loading text (shown when isLoading is true)
   */
  loadingLabel?: string;
  /**
   * Whether the button is in loading state
   */
  isLoading?: boolean;
  /**
   * Callback when button is pressed
   */
  onPress?: () => void;
  /**
   * Whether button is disabled
   */
  disabled?: boolean;
  /**
   * Visual style variant
   */
  variant?: ButtonVariant;
  /**
   * Optional left icon (lucide icon component)
   */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  /**
   * Custom button container style
   */
  containerStyle?: ViewStyle;
}

/**
 * LoadingButton
 *
 * Reusable button component that displays a spinner + text when loading.
 * Automatically manages disabled state during loading.
 *
 * Usage:
 * ```tsx
 * <LoadingButton
 *   variant="primary"
 *   label="Sign In"
 *   loadingLabel="Signing In..."
 *   isLoading={isSubmitting}
 *   onPress={handleSignIn}
 * />
 *
 * <LoadingButton
 *   variant="secondary"
 *   label="Sign in with Google"
 *   loadingLabel="Redirecting..."
 *   isLoading={isRedirecting}
 *   icon={GoogleIcon}
 *   onPress={handleGoogleSignIn}
 * />
 * ```
 */
export default function LoadingButton({
  label,
  loadingLabel,
  isLoading = false,
  onPress,
  disabled = false,
  variant = 'primary',
  icon: Icon,
  containerStyle,
}: LoadingButtonProps): JSX.Element {
  const p = useAppPalette();
  const isDisabled = disabled || isLoading;

  const baseButtonStyle =
    variant === 'primary'
      ? { backgroundColor: p.primaryBtnBg }
      : { backgroundColor: p.secondaryBtnBg, borderColor: p.secondaryBtnBorder };

  const baseTextColor = variant === 'primary' ? p.primaryBtnText : p.secondaryBtnText;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        baseButtonStyle,
        isDisabled && styles.buttonDisabled,
        containerStyle,
      ]}
    >
      {isLoading ? (
        <>
          <ActivityIndicator color={baseTextColor} size='small' />
          <Text style={[styles.buttonText, { color: baseTextColor }]}>{loadingLabel ?? label}</Text>
        </>
      ) : (
        <>
          {Icon ? <Icon size={16} color={baseTextColor} /> : null}
          <Text style={[styles.buttonText, { color: baseTextColor }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

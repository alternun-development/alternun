import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, } from 'react-native';
import { useAppPalette, } from '../theme/useAppPalette';

export interface LoadingOverlayProps {
  /**
   * Whether the overlay is visible
   */
  visible: boolean;
  /**
   * Main loading message (e.g., "Redirecting to Google...")
   */
  message: string;
  /**
   * Optional secondary message (e.g., "Please wait...")
   */
  subtitle?: string;
  /**
   * Spinner size - defaults to 'large'
   */
  spinnerSize?: 'small' | 'large';
  /**
   * Custom overlay background color (overrides palette default)
   */
  overlayBackgroundColor?: string;
}

/**
 * LoadingOverlay
 *
 * Full-screen loading indicator with spinner and customizable text.
 * Used for redirects, long-running operations, and async actions.
 *
 * Usage:
 * ```tsx
 * <LoadingOverlay
 *   visible={isLoading}
 *   message="Signing in with Google..."
 *   subtitle="Redirecting to Google..."
 * />
 * ```
 */
export default function LoadingOverlay({
  visible,
  message,
  subtitle,
  spinnerSize = 'large',
  overlayBackgroundColor,
}: LoadingOverlayProps,): JSX.Element | null {
  const p = useAppPalette();

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents='none'
      style={[styles.overlay, { backgroundColor: overlayBackgroundColor ?? p.overlay, },]}
    >
      <View style={styles.container}>
        <ActivityIndicator size={spinnerSize} color='#1ccba1' />
        <Text style={[styles.message, { color: p.textPrimary, },]}>{message}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: p.textSecondary, },]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,16,0.92)',
    zIndex: 9999,
  },
  container: {
    alignItems: 'center',
    gap: 16,
  },
  message: {
    color: '#e8e8ff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  subtitle: {
    color: 'rgba(232,232,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
},);

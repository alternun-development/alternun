import React, { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
interface GlassCardProps {
  children: ReactNode;
  /** Visual variant */
  variant?: 'default' | 'teal' | 'gold' | 'danger';
  padding?: number;
  style?: ViewStyle;
}
/**
 * Glass-morphism card surface.
 * On mobile we approximate the effect with semi-transparent background + border.
 * Wrap with expo-blur's BlurView in the consuming app for full glass effect.
 */
export declare function GlassCard({
  children,
  variant,
  padding,
  style,
}: GlassCardProps): React.JSX.Element;
/**
 * Compact inline glass surface — for status badges, chips, etc.
 */
export declare function GlassChip({
  children,
  variant,
  style,
}: {
  children: ReactNode;
  variant?: GlassCardProps['variant'];
  style?: ViewStyle;
}): React.JSX.Element;
export {};

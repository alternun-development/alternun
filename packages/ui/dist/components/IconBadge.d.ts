import React, { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
interface IconBadgeProps {
  /** lucide-react-native icon element */
  icon: ReactNode;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}
/**
 * Colored icon container — the translucent circle/square behind icons.
 * Tint is automatically derived from the accent color (18% opacity).
 */
export declare function IconBadge({ icon, color, size, style }: IconBadgeProps): React.JSX.Element;
export {};

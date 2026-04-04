import React from 'react';
import { type ViewStyle } from 'react-native';
interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
  trailingLabel?: string;
  animate?: boolean;
  style?: ViewStyle;
}
export declare function ProgressBar({
  progress,
  color,
  height,
  showLabel,
  label,
  trailingLabel,
  animate,
  style,
}: ProgressBarProps): React.JSX.Element;
export {};

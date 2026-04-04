import React, { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
interface SectionContainerProps {
  title: string;
  subtitle?: string;
  /** Optional badge count or action element */
  trailing?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}
export declare function SectionContainer({
  title,
  subtitle,
  trailing,
  children,
  isLoading,
  style,
  contentStyle,
}: SectionContainerProps): React.JSX.Element;
export {};

import React from 'react';
import { type ViewStyle } from 'react-native';
interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  accentColor: string;
  /** Pass a lucide-react-native icon component */
  icon: React.ReactNode;
  isLoading?: boolean;
  style?: ViewStyle;
}
export declare function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  accentColor,
  icon,
  isLoading,
  style,
}: StatCardProps): React.JSX.Element;
export {};

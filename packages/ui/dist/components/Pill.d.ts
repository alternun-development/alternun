import React from 'react';
import { type ViewStyle, type TextStyle } from 'react-native';
declare const STATUS_PRESETS: {
  readonly Free: {
    readonly bg: 'rgba(28,203,161,0.14)';
    readonly text: '#1ccba1';
    readonly border: 'rgba(28,203,161,0.3)';
  };
  readonly Deposited: {
    readonly bg: 'rgba(245,158,11,0.14)';
    readonly text: '#f59e0b';
    readonly border: 'rgba(245,158,11,0.3)';
  };
  readonly Consumed: {
    readonly bg: 'rgba(248,113,113,0.14)';
    readonly text: '#f87171';
    readonly border: 'rgba(248,113,113,0.3)';
  };
  readonly Open: {
    readonly bg: 'rgba(28,203,161,0.14)';
    readonly text: '#1ccba1';
    readonly border: 'rgba(28,203,161,0.3)';
  };
  readonly Closed: {
    readonly bg: 'rgba(129,140,248,0.14)';
    readonly text: '#818cf8';
    readonly border: 'rgba(129,140,248,0.3)';
  };
  readonly GOLD: {
    readonly bg: 'rgba(212,185,106,0.14)';
    readonly text: '#d4b96a';
    readonly border: 'rgba(212,185,106,0.3)';
  };
  readonly PLATINUM: {
    readonly bg: 'rgba(155,169,196,0.14)';
    readonly text: '#9ba9c4';
    readonly border: 'rgba(155,169,196,0.3)';
  };
  readonly SILVER: {
    readonly bg: 'rgba(168,184,204,0.14)';
    readonly text: '#a8b8cc';
    readonly border: 'rgba(168,184,204,0.3)';
  };
};
export type StatusPreset = keyof typeof STATUS_PRESETS;
interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}
export declare function StatusPill({ status, size, style }: StatusPillProps): React.JSX.Element;
interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
}
export declare function FilterPill({
  label,
  active,
  onPress,
  style,
}: FilterPillProps): React.JSX.Element;
interface CountBadgeProps {
  count: number;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}
export declare function CountBadge({
  count,
  color,
  style,
  textStyle,
}: CountBadgeProps): React.JSX.Element;
export {};

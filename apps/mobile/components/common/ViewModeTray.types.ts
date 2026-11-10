import type React from 'react';
import type { LucideProps } from 'lucide-react-native';

export interface ViewModeOption<T extends string> {
  key: T;
  label: string;
  icon: React.FC<LucideProps>;
}

export interface ViewModeTrayProps<T extends string> {
  options: readonly ViewModeOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  /** Test ID prefix: `${idPrefix}-view-switcher` and `${idPrefix}-view-<key>`. */
  idPrefix: string;
  /** Active option background and icon color; inactive icon color; tray border/background. */
  activeColor: string;
  activeIconColor: string;
  inactiveIconColor: string;
  borderColor: string;
  backgroundColor: string;
}

/** The subset of a web keyboard event the tray reacts to. */
export interface ViewModeKeyEvent {
  nativeEvent: { key: string };
  preventDefault?: () => void;
}

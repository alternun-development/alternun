// ── Design tokens ─────────────────────────────────────────────────────────────
export { palette } from './tokens/colors';
export type { PaletteKey } from './tokens/colors';
export { spacing, radius, fontSize } from './tokens/spacing';

// ── Theme system ───────────────────────────────────────────────────────────────
export { darkTheme, lightTheme } from './theme/themes';
export type { AlternunTheme } from './theme/themes';
export { ThemeProvider, useTheme } from './theme/ThemeContext';

// ── Primitives ─────────────────────────────────────────────────────────────────
export { Avatar, getInitials } from './components/Avatar';
export type { AvatarProps } from './components/Avatar';

export { Divider } from './components/Divider';
export type { DividerProps } from './components/Divider';

export { InfoRow } from './components/InfoRow';
export type { InfoRowProps } from './components/InfoRow';

export { Modal } from './components/Modal';
export type { ModalProps } from './components/Modal';

export { ActionButton } from './components/ActionButton';
export type { ActionButtonProps, ActionButtonVariant } from './components/ActionButton';

export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

// ── Data display ───────────────────────────────────────────────────────────────
export { HeroPanel, resolveTier, TIERS } from './components/HeroPanel';
export type { HeroPanelProps, AirsTier, TierSpec } from './components/HeroPanel';

export { StatCard } from './components/StatCard';
export { SectionContainer } from './components/SectionContainer';
export { GlassCard, GlassChip } from './components/GlassCard';
export { IconBadge } from './components/IconBadge';
export { ProgressBar } from './components/ProgressBar';

// ── Pill / badge ──────────────────────────────────────────────────────────────
export { StatusPill, FilterPill, CountBadge } from './components/Pill';
export type { StatusPreset } from './components/Pill';

// ── Feedback ──────────────────────────────────────────────────────────────────
export { Toast, ToastSystem } from './components/Toast';
export type { ToastItem, ToastType } from './components/Toast';

// ── Skeleton loaders ───────────────────────────────────────────────────────────
export {
  SkeletonLoader,
  StatCardSkeleton,
  LedgerRowSkeleton,
  SectionHeaderSkeleton,
  PillRowSkeleton,
} from './components/SkeletonLoader';

// ── Changelog ─────────────────────────────────────────────────────────────────
export { ChangelogDrawer, parseChangelog } from './components/ChangelogDrawer';
export type {
  ChangelogDrawerProps,
  ChangelogEntry,
  ChangelogSection,
  ChangelogItem,
} from './components/ChangelogDrawer';

// ── Policies ──────────────────────────────────────────────────────────────────
export { PolicyDrawer } from './components/PolicyDrawer';
export type { PolicyDrawerProps } from './components/PolicyDrawer';

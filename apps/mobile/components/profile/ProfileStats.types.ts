import type { ColorPalette } from './AchievementBadge';

/** One figure of the profile header (Airs, projects, CO₂) with its explanation. */
export interface ProfileStatItem {
  key: string;
  label: string;
  value: string;
  info: { title: string; description: string };
}

export interface ProfileStatsProps {
  items: readonly ProfileStatItem[];
  isDark: boolean;
  c: Pick<ColorPalette, 'text' | 'muted'>;
  /** Accessible label of each info button, given the figure label. */
  openInfoLabel: (label: string) => string;
  closeInfoLabel: string;
}

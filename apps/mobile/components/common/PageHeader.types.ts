import type React from 'react';

export interface PageHeaderPalette {
  text: string;
  muted: string;
  /** Background of the icon mark. */
  fill: string;
}

export interface PageHeaderProps {
  title: string;
  /** One short line under the title; never repeat the title. */
  subtitle?: string;
  /** Icon inside the mark on the left (ignored when `leading` is given). */
  icon?: React.ReactNode;
  /** Replaces the icon mark, e.g. a back button. */
  leading?: React.ReactNode;
  /** Right-aligned icon buttons. */
  actions?: React.ReactNode;
  palette: PageHeaderPalette;
  testID?: string;
}

export interface SectionHeadingProps {
  title: string;
  /** Optional right-aligned control or caption. */
  trailing?: React.ReactNode;
  color: string;
  testID?: string;
}

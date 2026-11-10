import type React from 'react';
import type { Translator } from '@alternun/i18n';
import type { LucideProps } from 'lucide-react-native';
import type { EnterpriseApplicationRequest } from '../../services/enterpriseApplication';

/** Colors the Explorer sections read; the Explorer palette satisfies it. */
export interface ExplorePalette {
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDeep: string;
  fill: string;
  mist: string;
}

export type Translate = Translator['t'];

export interface ExpandableCtaCardProps {
  testID: string;
  title: string;
  description: string;
  actionLabel: string;
  closeLabel: string;
  icon: React.FC<LucideProps>;
  palette: ExplorePalette;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** The full form, rendered only while expanded. */
  children: React.ReactNode;
}

export interface Tip {
  key: string;
  title: string;
  text: string;
  icon: React.FC<LucideProps>;
  action?: { label: string; onPress: () => void };
}

export interface TipsSliderProps {
  tips: readonly Tip[];
  palette: ExplorePalette;
  t: Translate;
  /** Milliseconds per tip; 0 disables auto-advance (tests). */
  intervalMs?: number;
}

export interface EnterpriseApplicationFormProps {
  language: string;
  palette: ExplorePalette;
  t: Translate;
  submit?: (input: EnterpriseApplicationRequest) => Promise<void>;
}

export type EnterpriseTextField = Exclude<
  keyof EnterpriseApplicationRequest,
  'companySize' | 'language'
>;

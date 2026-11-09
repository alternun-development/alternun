import type { FC } from 'react';
import {
  CircleUserRound,
  LayoutDashboard,
  Leaf,
  ShieldCheck,
  type LucideProps,
} from 'lucide-react-native';

const LayoutDashboardIcon = LayoutDashboard as FC<LucideProps>;
const LeafIcon = Leaf as FC<LucideProps>;
const ShieldCheckIcon = ShieldCheck as FC<LucideProps>;
const CircleUserRoundIcon = CircleUserRound as FC<LucideProps>;

export interface NavSection {
  key: string;
  label: string;
  icon: FC<LucideProps>;
  comingSoon?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { key: 'explore', label: 'Explorer', icon: LeafIcon },
  { key: 'portfolio', label: 'Portfolio', icon: ShieldCheckIcon, comingSoon: true },
  { key: 'profile', label: 'My Profile', icon: CircleUserRoundIcon },
];

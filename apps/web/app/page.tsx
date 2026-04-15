'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import TopBar from '@/components/TopBar';
import NavBar from '@/components/NavBar';
import HeroSection from '@/components/HeroSection';
import LandingFooter from '@/components/LandingFooter';

gsap.registerPlugin(useGSAP);

const MOCK_USER = {
  userName: 'José Santiago',
  airsBalance: 12088,
  airsScore: 12480,
  updatedAt: '14 / FEB / 2026',
  status: 'GOLD' as const,
  statusExpiry: '31 / DIC / 2026',
  progressPercent: 62,
  progressCurrent: 12480,
  progressTarget: 20000,
  nextTier: 'Platinum',
};

export default function HomePage() {
  return (
    <div className='flex flex-col min-h-screen bg-navy'>
      <TopBar />
      <NavBar userName={MOCK_USER.userName} airsBalance={MOCK_USER.airsBalance} />
      <main className='flex-1'>
        <HeroSection
          userName={MOCK_USER.userName}
          airsScore={MOCK_USER.airsScore}
          updatedAt={MOCK_USER.updatedAt}
          status={MOCK_USER.status}
          statusExpiry={MOCK_USER.statusExpiry}
          progressPercent={MOCK_USER.progressPercent}
          progressCurrent={MOCK_USER.progressCurrent}
          progressTarget={MOCK_USER.progressTarget}
          nextTier={MOCK_USER.nextTier}
        />
      </main>
      <LandingFooter />
    </div>
  );
}

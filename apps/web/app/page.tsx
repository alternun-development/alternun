'use client';

import { useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import TopBar from '@/components/TopBar';
import NavBar from '@/components/NavBar';
import HeroSection from '@/components/HeroSection';
import LandingFooter from '@/components/LandingFooter';
import Sidebar from '@/components/Sidebar';

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
  const [activeKey, setActiveKey] = useState('dashboard');

  return (
    <div className='flex flex-col min-h-screen bg-navy'>
      <TopBar />
      <NavBar userName={MOCK_USER.userName} airsBalance={MOCK_USER.airsBalance} />

      {/* Body: sidebar + content side by side on desktop */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Sidebar — hidden on mobile (md: show) */}
        <div className='hidden md:flex h-full' style={{ minHeight: 'calc(100vh - 112px)' }}>
          <Sidebar activeKey={activeKey} onNavigate={setActiveKey} defaultPinned={false} />
        </div>

        <main className='flex-1 overflow-auto'>
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
          <LandingFooter />
        </main>
      </div>
    </div>
  );
}

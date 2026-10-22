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

export default function HomePage() {
  const [activeKey, setActiveKey] = useState('dashboard');

  return (
    <div className='flex flex-col min-h-screen bg-navy'>
      <TopBar />
      <NavBar />

      {/* Body: sidebar + content side by side on desktop */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Sidebar — hidden on mobile (md: show) */}
        <div className='hidden md:flex h-full' style={{ minHeight: 'calc(100vh - 112px)' }}>
          <Sidebar activeKey={activeKey} onNavigate={setActiveKey} defaultPinned={false} />
        </div>

        <main className='flex-1 overflow-auto'>
          <HeroSection />
          <LandingFooter />
        </main>
      </div>
    </div>
  );
}

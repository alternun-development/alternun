'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);
import { HelpCircle, Globe, ExternalLink } from 'lucide-react';

export default function TopBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(barRef.current, {
        y: -40,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
      });
    },
    { scope: barRef }
  );

  return (
    <div
      ref={barRef}
      className='w-full flex items-center justify-end gap-6 px-6 py-2 text-sm'
      style={{
        background: 'rgba(10, 60, 55, 0.95)',
        borderBottom: '1px solid rgba(28,203,161,0.15)',
      }}
    >
      <a
        href='#'
        className='flex items-center gap-1.5 text-white/70 hover:text-teal transition-colors'
      >
        <HelpCircle size={14} />
        Centro de ayuda
      </a>
      <a
        href='#'
        className='flex items-center gap-1.5 text-white/70 hover:text-teal transition-colors'
      >
        <Globe size={14} />
        Español
      </a>
      <a
        href='#'
        className='flex items-center gap-1.5 text-white/70 hover:text-teal transition-colors'
      >
        <ExternalLink size={14} />
        Ir a alternun.io
      </a>
    </div>
  );
}

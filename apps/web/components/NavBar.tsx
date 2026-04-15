'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);
import { ChevronDown } from 'lucide-react';
import UserMenu from './UserMenu';

const NAV_LINKS = ['Home', 'El proyecto', 'Cómo funciona', 'Beneficios'];

interface NavBarProps {
  userName: string;
  airsBalance: number;
}

export default function NavBar({ userName, airsBalance }: NavBarProps) {
  const navRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('Home');

  useGSAP(
    () => {
      gsap.from('.nav-pill', {
        y: -30,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        delay: 0.2,
      });
      gsap.from('.nav-logo', {
        x: -30,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.1,
      });
    },
    { scope: navRef }
  );

  return (
    <nav
      ref={navRef}
      className='relative w-full flex items-center justify-between px-6 py-4'
      style={{
        background: 'rgba(4, 15, 30, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <div className='nav-logo flex items-center gap-2 flex-shrink-0'>
        <div
          className='flex items-center justify-center w-10 h-10 rounded-full'
          style={{ background: 'linear-gradient(135deg, #1ccba1, #0fa880)' }}
        >
          <svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
            <path d='M12 2L4 20h16L12 2z' fill='rgba(0,0,0,0.9)' />
            <circle cx='12' cy='8' r='2.5' fill='rgba(0,0,0,0.7)' />
          </svg>
        </div>
        <div>
          <div className='font-bold text-white text-base leading-tight'>Airs</div>
          <div className='text-[11px] text-teal leading-tight tracking-wide'>Alternun</div>
        </div>
      </div>

      {/* Centered pill container with nav links + user */}
      <div
        className='nav-pill hidden md:flex items-center gap-0 rounded-full'
        style={{
          background: 'linear-gradient(135deg, rgba(28,203,161,0.18), rgba(28,203,161,0.08))',
          border: '1px solid rgba(28,203,161,0.3)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Nav links inside pill */}
        <div className='flex items-center'>
          {NAV_LINKS.map((link) => (
            <button
              key={link}
              onClick={() => setActiveLink(link)}
              className='nav-link-item px-5 py-3 text-sm font-medium transition-all duration-300 relative'
              style={{
                color: activeLink === link ? '#ffffff' : 'rgba(255,255,255,0.7)',
                background: activeLink === link ? 'rgba(28,203,161,0.25)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (activeLink !== link) {
                  gsap.to(e.currentTarget, {
                    backgroundColor: 'rgba(28,203,161,0.12)',
                    duration: 0.2,
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (activeLink !== link) {
                  gsap.to(e.currentTarget, {
                    backgroundColor: 'transparent',
                    duration: 0.2,
                  });
                }
              }}
            >
              {link}
              {activeLink === link && (
                <div
                  className='absolute bottom-0 left-5 right-5 h-0.5 rounded-full'
                  style={{
                    background: 'linear-gradient(90deg, transparent, #1ccba1, transparent)',
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className='h-6 w-px mx-2' style={{ background: 'rgba(28,203,161,0.3)' }} />

        {/* User avatar button - larger and integrated */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className='nav-user-btn flex items-center justify-center p-1 mr-1 rounded-full transition-all duration-300'
          style={{
            background: menuOpen ? 'rgba(4,15,30,0.8)' : 'rgba(4,15,30,0.6)',
            border: '1px solid rgba(28,203,161,0.4)',
            width: '50px',
            height: '50px',
          }}
          title={`${userName} - ${airsBalance.toLocaleString('es-ES')} Airs`}
        >
          {/* Avatar circle */}
          <div
            className='w-11 h-11 rounded-full flex items-center justify-center text-base font-bold transition-all duration-300'
            style={{
              background: 'linear-gradient(135deg, #1ccba1, #0d8a6e)',
              color: '#041119',
              boxShadow: menuOpen ? '0 0 16px rgba(28,203,161,0.4)' : 'none',
            }}
          >
            {userName.charAt(0)}
          </div>

          {/* User info tooltip on hover - visible on medium screens and up */}
          <div className='absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap'>
            <div className='bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-3 py-2 rounded-lg border border-teal/30'>
              <div>{userName}</div>
              <div className='text-teal text-[11px]'>
                {airsBalance.toLocaleString('es-ES')} Airs
              </div>
            </div>
          </div>
        </button>

        <UserMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>

      {/* Mobile menu toggle */}
      <div className='md:hidden text-teal'>
        <button className='p-2'>☰</button>
      </div>
    </nav>
  );
}

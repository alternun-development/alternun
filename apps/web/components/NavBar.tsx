'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);
import { Bell, CheckCircle, ChevronDown } from 'lucide-react';
import UserMenu from './UserMenu';

const NAV_LINKS = ['Acumula Airs', 'Usa tus Airs', 'Aliados', 'Programa Platino'];

interface NavBarProps {
  userName: string;
  airsBalance: number;
}

export default function NavBar({ userName, airsBalance }: NavBarProps) {
  const navRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useGSAP(
    () => {
      gsap.from('.nav-link-item', {
        y: -20,
        opacity: 0,
        stagger: 0.08,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.3,
      });
      gsap.from('.nav-logo', {
        x: -24,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.1,
      });
      gsap.from('.nav-user', {
        x: 24,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.25,
      });
    },
    { scope: navRef }
  );

  return (
    <nav
      ref={navRef}
      className='relative w-full flex items-center justify-between px-6 py-3'
      style={{
        background: 'rgba(4, 15, 30, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <div className='nav-logo flex items-center gap-2'>
        <div
          className='flex items-center justify-center w-9 h-9 rounded-full'
          style={{ background: 'linear-gradient(135deg, #1ccba1, #0fa880)' }}
        >
          <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
            <path d='M12 2L4 20h16L12 2z' fill='rgba(0,0,0,0.9)' />
            <circle cx='12' cy='8' r='2.5' fill='rgba(0,0,0,0.7)' />
          </svg>
        </div>
        <div>
          <div className='font-bold text-white text-base leading-none'>Airs</div>
          <div className='text-[10px] text-teal leading-none tracking-wide'>By Alternun</div>
        </div>
      </div>

      {/* Nav links */}
      <ul className='hidden md:flex items-center gap-1'>
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <button
              className={`nav-link-item px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                link === 'Programa Platino'
                  ? 'text-white bg-teal/20 border border-teal/30 hover:bg-teal/30'
                  : 'text-white/75 hover:text-white hover:bg-white/08'
              }`}
              style={link === 'Programa Platino' ? { color: '#1ccba1' } : {}}
            >
              {link}
            </button>
          </li>
        ))}
      </ul>

      {/* User badge */}
      <div className='nav-user relative'>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className='flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 hover:bg-white/05'
          style={{
            background: 'rgba(28,203,161,0.12)',
            border: '1px solid rgba(28,203,161,0.3)',
          }}
        >
          {/* Avatar */}
          <div
            className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold'
            style={{ background: 'linear-gradient(135deg, #1ccba1, #0d8a6e)', color: '#041119' }}
          >
            {userName.charAt(0)}
          </div>

          <div className='hidden sm:block text-left'>
            <div className='text-white text-xs font-semibold leading-none'>{userName}</div>
            <div className='text-teal text-[11px] leading-none mt-0.5'>
              {airsBalance.toLocaleString('es-ES')} Airs
            </div>
          </div>

          {/* Badges */}
          <div className='flex items-center gap-1 ml-1'>
            <span
              className='flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold'
              style={{ background: 'rgba(28,203,161,0.25)', color: '#1ccba1' }}
            >
              3
            </span>
            <CheckCircle size={14} className='text-teal' />
          </div>

          <ChevronDown
            size={12}
            className={`text-white/50 transition-transform duration-200 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <UserMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    </nav>
  );
}

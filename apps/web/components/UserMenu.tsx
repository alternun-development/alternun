'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);
import {
  LayoutDashboard,
  Banknote,
  Layers,
  FolderOpen,
  Gift,
  Trophy,
  Wallet,
  UserCircle,
  Settings,
  X,
} from 'lucide-react';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { key: 'compensaciones', label: 'Compensaciones', icon: Banknote },
  { key: 'atn', label: 'Mis ATN', icon: Layers },
  { key: 'proyectos', label: 'Proyectos', icon: FolderOpen },
  { key: 'beneficios', label: 'Beneficios', icon: Gift },
  { key: 'ranking', label: 'Ranking', icon: Trophy },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'perfil', label: 'Mi Perfil', icon: UserCircle },
  { key: 'config', label: 'Configuración', icon: Settings },
];

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserMenu({ isOpen, onClose }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLLIElement[]>([]);

  useGSAP(
    () => {
      if (!menuRef.current) return;

      if (isOpen) {
        gsap.fromTo(
          menuRef.current,
          { opacity: 0, scale: 0.92, y: -12 },
          { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'back.out(1.4)' }
        );
        gsap.fromTo(
          itemsRef.current,
          { opacity: 0, x: -16 },
          {
            opacity: 1,
            x: 0,
            duration: 0.22,
            stagger: 0.04,
            ease: 'power2.out',
            delay: 0.08,
          }
        );
      } else {
        gsap.to(menuRef.current, {
          opacity: 0,
          scale: 0.92,
          y: -8,
          duration: 0.18,
          ease: 'power2.in',
        });
      }
    },
    { scope: menuRef, dependencies: [isOpen] }
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 z-40' onClick={onClose} />

      {/* Glass menu panel */}
      <div
        ref={menuRef}
        className='absolute top-14 right-0 z-50 w-64 rounded-2xl py-2 overflow-hidden'
        style={{
          background: 'rgba(8, 22, 44, 0.82)',
          backdropFilter: 'blur(28px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
          border: '1px solid rgba(28, 203, 161, 0.18)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Top close row */}
        <div className='flex items-center justify-between px-4 py-2 mb-1'>
          <span className='text-xs font-mono text-teal uppercase tracking-widest opacity-70'>
            Menu
          </span>
          <button onClick={onClose} className='text-white/40 hover:text-white transition-colors'>
            <X size={14} />
          </button>
        </div>

        <ul className='px-2'>
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={item.key}
                ref={(el) => {
                  if (el) itemsRef.current[i] = el;
                }}
              >
                <button
                  className={`menu-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left ${
                    item.active ? 'active text-white' : 'text-white/75 hover:text-white'
                  }`}
                >
                  <span
                    className='flex items-center justify-center w-8 h-8 rounded-lg'
                    style={{
                      background: item.active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon size={15} className={item.active ? 'text-indigo-300' : 'text-white/60'} />
                  </span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Bottom glow accent */}
        <div
          className='mt-2 mx-4 h-px'
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(28,203,161,0.25), transparent)',
          }}
        />
        <div className='px-4 py-3 text-xs text-white/30 text-center font-mono'>
          Airs by Alternun · v2.0
        </div>
      </div>
    </>
  );
}

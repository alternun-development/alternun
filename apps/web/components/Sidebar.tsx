'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Leaf,
  CircleUserRound,
  Settings,
  Pin,
  PinOff,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  key: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  badge?: number;
}

const TOP_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'portafolio', label: 'Portfolio', icon: ShieldCheck },
  { key: 'explorar', label: 'Explore', icon: Leaf },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: 'mi-perfil', label: 'Profile', icon: CircleUserRound },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activeKey?: string;
  onNavigate?: (key: string) => void;
  /** If provided, sidebar starts pinned open */
  defaultPinned?: boolean;
}

export default function Sidebar({
  activeKey = 'dashboard',
  onNavigate,
  defaultPinned = false,
}: SidebarProps) {
  const [pinned, setPinned] = useState(defaultPinned);
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expanded = pinned || hovered;
  const COLLAPSED_W = 60;
  const EXPANDED_W = 216;

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => setHovered(false), 160);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        transition: 'width 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'width',
      }}
      className='relative flex flex-col h-full shrink-0 overflow-hidden'
    >
      {/* Background */}
      <div
        className='absolute inset-0 pointer-events-none'
        style={{
          background: 'rgba(10,10,24,0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      />

      <div className='relative flex flex-col h-full'>
        {/* Logo area */}
        <div
          className='flex items-center h-16 px-3 gap-3 shrink-0'
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className='shrink-0 flex items-center justify-center rounded-xl'
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #1EE6B5 0%, #0d9488 100%)',
              boxShadow: '0 0 16px rgba(30,230,181,0.25)',
            }}
          >
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
              <path d='M12 2L4 20h16L12 2z' fill='rgba(5,5,16,0.9)' />
              <circle cx='12' cy='8.5' r='2.5' fill='rgba(5,5,16,0.7)' />
            </svg>
          </div>

          <div
            className='overflow-hidden whitespace-nowrap'
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? 'translateX(0)' : 'translateX(-8px)',
              transition: 'opacity 200ms ease, transform 200ms ease',
              transitionDelay: expanded ? '60ms' : '0ms',
            }}
          >
            <div className='font-bold text-white text-sm leading-tight tracking-tight'>Airs</div>
            <div
              className='text-[10px] leading-tight'
              style={{ color: '#1EE6B5', letterSpacing: '0.06em' }}
            >
              Alternun
            </div>
          </div>

          {/* Pin toggle */}
          <button
            onClick={() => setPinned((v) => !v)}
            className='ml-auto shrink-0 flex items-center justify-center rounded-lg transition-colors duration-150'
            style={{
              width: 28,
              height: 28,
              color: pinned ? '#1EE6B5' : 'rgba(232,232,255,0.35)',
              opacity: expanded ? 1 : 0,
              pointerEvents: expanded ? 'auto' : 'none',
              transition: 'opacity 160ms ease, color 160ms ease, background-color 160ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(30,230,181,0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
          >
            {pinned ? <Pin size={14} strokeWidth={2.2} /> : <PinOff size={14} strokeWidth={2.2} />}
          </button>
        </div>

        {/* Top nav items */}
        <nav className='flex flex-col gap-1 p-2 flex-1'>
          {TOP_ITEMS.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              isActive={activeKey === item.key}
              expanded={expanded}
              onPress={() => onNavigate?.(item.key)}
            />
          ))}
        </nav>

        {/* Bottom nav items */}
        <div
          className='flex flex-col gap-1 p-2'
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {BOTTOM_ITEMS.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              isActive={activeKey === item.key}
              expanded={expanded}
              onPress={() => onNavigate?.(item.key)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  isActive,
  expanded,
  onPress,
}: {
  item: NavItem;
  isActive: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  const IconComponent = item.icon;

  return (
    <button
      onClick={onPress}
      className='relative flex items-center gap-3 rounded-xl text-left w-full transition-colors duration-150'
      style={{
        height: 40,
        padding: '0 10px',
        backgroundColor: isActive ? 'rgba(30,230,181,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(30,230,181,0.22)' : '1px solid transparent',
        color: isActive ? '#1EE6B5' : 'rgba(232,232,255,0.5)',
        outline: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(232,232,255,0.85)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(232,232,255,0.5)';
        }
      }}
    >
      {/* Active left bar */}
      {isActive && (
        <div
          className='absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full'
          style={{ width: 3, height: 20, backgroundColor: '#1EE6B5' }}
        />
      )}

      <span className='shrink-0'>
        <IconComponent size={18} strokeWidth={isActive ? 2.3 : 1.8} />
      </span>

      <span
        className='whitespace-nowrap overflow-hidden text-sm font-semibold tracking-tight'
        style={{
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
          transition: 'opacity 180ms ease, transform 180ms ease',
          transitionDelay: expanded ? '40ms' : '0ms',
          maxWidth: expanded ? 140 : 0,
        }}
      >
        {item.label}
      </span>

      {item.badge != null && item.badge > 0 && (
        <span
          className='ml-auto shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5'
          style={{
            backgroundColor: '#1EE6B5',
            color: '#050510',
            opacity: expanded ? 1 : 0,
            transition: 'opacity 160ms ease',
          }}
        >
          {item.badge}
        </span>
      )}

      {!expanded && (
        <span
          className='absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 z-50'
          style={{
            backgroundColor: 'rgba(10,10,24,0.96)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(232,232,255,0.9)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {item.label}
        </span>
      )}
    </button>
  );
}

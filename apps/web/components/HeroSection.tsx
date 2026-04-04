'use client';

import { useRef, useEffect, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);
import { Info } from 'lucide-react';

interface HeroSectionProps {
  userName: string;
  airsScore: number;
  updatedAt: string;
  status: 'GOLD' | 'PLATINUM' | 'SILVER';
  statusExpiry: string;
  progressPercent: number;
  progressCurrent: number;
  progressTarget: number;
  nextTier: string;
}

function useCountUp(target: number, duration: number, shouldStart: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    const obj = { val: 0 };
    const tween = gsap.to(obj, {
      val: target,
      duration,
      ease: 'power2.out',
      delay: 0.8,
      onUpdate: () => setValue(Math.round(obj.val)),
    });
    return () => {
      tween.kill();
    };
  }, [target, duration, shouldStart]);
  return value;
}

const STATUS_COLORS: Record<string, string> = {
  GOLD: '#d4b96a',
  PLATINUM: '#9ba9c4',
  SILVER: '#a8b8cc',
};

export default function HeroSection({
  userName,
  airsScore,
  updatedAt,
  status,
  statusExpiry,
  progressPercent,
  progressCurrent,
  progressTarget,
  nextTier,
}: HeroSectionProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const displayScore = useCountUp(airsScore, 1.8, started);

  useGSAP(
    () => {
      const tl = gsap.timeline({ onStart: () => setStarted(true) });

      // Greeting slides up
      tl.from('.hero-greeting', {
        y: 40,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
      })
        // Subtitle
        .from(
          '.hero-subtitle',
          {
            y: 24,
            opacity: 0,
            duration: 0.55,
            ease: 'power2.out',
          },
          '-=0.4'
        )
        // Score row
        .from(
          '.hero-score-row',
          {
            y: 30,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
          },
          '-=0.35'
        )
        // Updated at
        .from(
          '.hero-meta',
          {
            y: 16,
            opacity: 0,
            duration: 0.45,
            ease: 'power2.out',
          },
          '-=0.3'
        )
        // Status badge
        .from(
          '.hero-status',
          {
            scale: 0.85,
            opacity: 0,
            duration: 0.45,
            ease: 'back.out(1.6)',
          },
          '-=0.2'
        )
        // Progress section
        .from(
          '.hero-progress',
          {
            y: 20,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
          },
          '-=0.15'
        );

      // Animate progress bar width
      tl.fromTo(
        progressBarRef.current,
        { width: '0%' },
        { width: `${progressPercent}%`, duration: 1.4, ease: 'power3.out' },
        '-=0.3'
      );
    },
    { scope: heroRef }
  );

  const statusColor = STATUS_COLORS[status] ?? STATUS_COLORS.GOLD;
  const firstName = userName.split(' ')[0];

  return (
    <div
      ref={heroRef}
      className='relative w-full min-h-[520px] flex flex-col justify-end overflow-hidden'
    >
      {/* Background image */}
      <div
        className='absolute inset-0 bg-cover bg-center bg-no-repeat'
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1551632811-561732d1e306?w=1600&q=80')`,
        }}
      />

      {/* Gradient overlays */}
      <div
        className='absolute inset-0'
        style={{
          background:
            'linear-gradient(to bottom, rgba(4,15,30,0.45) 0%, rgba(4,15,30,0.25) 30%, rgba(4,15,30,0.72) 70%, rgba(4,15,30,0.92) 100%)',
        }}
      />
      <div
        className='absolute inset-0'
        style={{
          background: 'linear-gradient(to right, rgba(4,15,30,0.6) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div className='relative z-10 px-8 pb-10 pt-16 max-w-3xl'>
        {/* Greeting */}
        <h1
          className='hero-greeting text-4xl md:text-5xl font-bold mb-2'
          style={{ color: '#d4b96a', textShadow: '0 2px 20px rgba(212,185,106,0.3)' }}
        >
          Hola {firstName}
        </h1>

        <p className='hero-subtitle text-white/80 text-base font-medium mb-3'>
          Tu puntuación regenerativa es:
        </p>

        {/* Score */}
        <div className='hero-score-row flex items-center gap-3 mb-3'>
          <div
            className='flex items-center justify-center w-12 h-12 rounded-full'
            style={{
              background: 'linear-gradient(135deg, #1ccba1, #0a6e5a)',
              boxShadow: '0 0 24px rgba(28,203,161,0.4)',
            }}
          >
            <svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
              <path d='M12 2L4 20h16L12 2z' fill='rgba(0,0,0,0.85)' />
              <circle cx='12' cy='8.5' r='2.5' fill='rgba(0,0,0,0.7)' />
            </svg>
          </div>
          <span
            className='airs-score text-6xl md:text-7xl font-extrabold tracking-tight text-white'
            style={{ textShadow: '0 2px 32px rgba(28,203,161,0.25)' }}
          >
            {displayScore.toLocaleString('es-ES')}
          </span>
        </div>

        {/* Updated at */}
        <div className='hero-meta flex items-center gap-1.5 text-white/55 text-sm mb-5'>
          <span>Actualizado al {updatedAt}</span>
          <button className='hover:text-white/80 transition-colors'>
            <Info size={14} />
          </button>
        </div>

        {/* Status badge */}
        <div
          className='hero-status inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-6'
          style={{
            background: 'rgba(10, 18, 32, 0.75)',
            border: `1px solid ${statusColor}40`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <span
            className='pulse-dot w-3 h-3 rounded-full'
            style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
          />
          <span className='font-semibold text-white text-sm'>
            Status <span style={{ color: statusColor }}>{status}</span>
          </span>
          <span className='text-white/45 text-xs'>Válido hasta {statusExpiry}</span>
        </div>

        {/* Progress bar */}
        <div className='hero-progress w-full max-w-lg'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-white font-semibold text-sm'>
              Progreso a {nextTier} – <span style={{ color: '#1ccba1' }}>{progressPercent}%</span>
            </span>
            <span className='text-white/55 text-sm'>
              {progressCurrent.toLocaleString('es-ES')} / {progressTarget.toLocaleString('es-ES')}{' '}
              Airs
            </span>
          </div>

          {/* Track */}
          <div
            className='w-full h-2.5 rounded-full overflow-hidden'
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <div
              ref={progressBarRef}
              className='h-full rounded-full progress-shimmer'
              style={{ width: 0 }}
            />
          </div>

          <p className='mt-2 text-white/50 text-xs'>
            Te faltan{' '}
            <strong className='text-white/80'>
              {(progressTarget - progressCurrent).toLocaleString('es-ES')} Airs
            </strong>{' '}
            para alcanzar {nextTier} y desbloquear beneficios exclusivos
          </p>
        </div>
      </div>
    </div>
  );
}

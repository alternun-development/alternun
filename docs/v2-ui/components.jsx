/* Alternun Airs · Design System v2 · React components
   Mirrors @alternun/ui primitives. Light/dark aware via CSS vars. */

const { useState, useEffect, useRef, useMemo } = React;

/* ─── Icons (minimal line set) ─────────────────────────────────────────── */
const Ic = {
  leaf: (p) => <svg viewBox="0 0 24 24" width={p.size||18} height={p.size||18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>,
  trend: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>,
  wallet: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 100 4h4v-4z"/></svg>,
  info: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  bell: (p) => <svg viewBox="0 0 24 24" width={p.size||18} height={p.size||18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" width={p.size||18} height={p.size||18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  menu: (p) => <svg viewBox="0 0 24 24" width={p.size||18} height={p.size||18} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  home: (p) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z"/></svg>,
  chart: (p) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>,
  compass: (p) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z"/></svg>,
  user: (p) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  refresh: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  x: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  arrowUp: (p) => <svg viewBox="0 0 24 24" width={p.size||12} height={p.size||12} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>,
  arrowDown: (p) => <svg viewBox="0 0 24 24" width={p.size||12} height={p.size||12} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 7L7 17M17 17H7V7"/></svg>,
  arrowRight: (p) => <svg viewBox="0 0 24 24" width={p.size||12} height={p.size||12} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  chev: (p) => <svg viewBox="0 0 24 24" width={p.size||12} height={p.size||12} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>,
  lock: (p) => p.open
    ? <svg viewBox="0 0 24 24" width={p.size||12} height={p.size||12} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>
    : <svg viewBox="0 0 24 24" width={p.size||12} height={p.size||12} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  plus: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  mountain: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3L1 20h14L8 3z" opacity=".6"/><path d="M14 11l-3 9h12L14 11z"/></svg>,
  moon: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  sun: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
};

/* ─── Brand mark (Airs triangle) ───────────────────────────────────────── */
function AirsMark({ size = 44, fill = 'var(--accent)', bg = '#050f0c' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size/2,
      background: `linear-gradient(135deg, ${fill}, color-mix(in oklab, ${fill} 60%, #000))`,
      display: 'grid', placeItems: 'center',
      boxShadow: '0 0 24px rgba(30,230,181,0.28), inset 0 0 0 1px rgba(255,255,255,0.12)',
    }}>
      <svg width={size*0.45} height={size*0.45} viewBox="0 0 24 24">
        <path d="M12 3L3 20h18L12 3z" fill={bg} />
        <circle cx="12" cy="9" r="2.2" fill={bg} opacity=".55" />
      </svg>
    </div>
  );
}

/* ─── Avatar ───────────────────────────────────────────────────────────── */
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return 'U';
  return ((parts[0][0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}
function Avatar({ name, size = 32, tone = 'accent' }) {
  const bg = tone === 'accent'
    ? 'linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 55%, #000))'
    : 'var(--bg-inset)';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: 'var(--text-inverse)',
      display: 'grid', placeItems: 'center',
      fontWeight: 700, fontSize: size * 0.42,
      letterSpacing: '-0.01em',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
    }}>{getInitials(name)}</div>
  );
}

/* ─── Button ───────────────────────────────────────────────────────────── */
function Button({
  title, onPress, variant = 'primary', size = 'md',
  disabled, loading, icon, trailingIcon, fullWidth, as = 'button'
}) {
  const sizes = {
    sm: { h: 34, px: 14, fs: 13 },
    md: { h: 44, px: 18, fs: 15 },
    lg: { h: 52, px: 22, fs: 16 },
  }[size];
  const base = {
    height: sizes.h, padding: `0 ${sizes.px}px`, fontSize: sizes.fs,
    borderRadius: 'var(--r-full)', fontWeight: 600, letterSpacing: '-0.01em',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: `transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)`,
    opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : undefined, whiteSpace: 'nowrap',
  };
  const variants = {
    primary: { background: 'var(--accent)', color: 'var(--accent-text)', boxShadow: 'var(--e1)' },
    secondary: { background: 'transparent', color: 'var(--text-primary)', boxShadow: 'inset 0 0 0 1px var(--border-input)' },
    ghost: { background: 'var(--accent-muted)', color: 'var(--accent)' },
    danger: { background: 'var(--p-error)', color: '#fff' },
  };
  return (
    <button
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      {loading ? <Spinner size={14} /> : icon}
      <span>{title}</span>
      {trailingIcon}
    </button>
  );
}

function Spinner({ size = 16 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid currentColor`, borderTopColor: 'transparent',
      animation: 'spin 0.8s linear infinite', opacity: 0.8,
    }} />
  );
}

/* ─── ActionButton ─────────────────────────────────────────────────────── */
function ActionButton({ label, onPress, variant = 'filled', icon, trailingIcon }) {
  const variants = {
    filled: { background: 'var(--accent)', color: 'var(--accent-text)' },
    outlined: { background: 'transparent', color: 'var(--text-primary)', boxShadow: 'inset 0 0 0 1px var(--border-input)' },
    ghost: { background: 'var(--accent-muted)', color: 'var(--accent)' },
  };
  return (
    <button onClick={onPress} style={{
      height: 32, padding: '0 12px', borderRadius: 'var(--r-full)',
      fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      transition: 'transform var(--dur-fast) var(--ease-out)',
      ...variants[variant],
    }}>
      {icon}{label}{trailingIcon}
    </button>
  );
}

/* ─── Pills ────────────────────────────────────────────────────────────── */
const STATUS_PRESETS = {
  Free:      { bg: 'rgba(129,140,248,0.16)', border: 'rgba(129,140,248,0.32)', text: '#a5b4fc' },
  Deposited: { bg: 'var(--accent-muted)',    border: 'var(--border-accent)', text: 'var(--accent)' },
  Consumed:  { bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.28)', text: 'var(--text-muted)' },
  Open:      { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.32)', text: '#34d399' },
  Closed:    { bg: 'var(--error-bg)',        border: 'var(--error-border)',   text: 'var(--error-text)' },
  BRONZE:    { bg: 'rgba(205,127,50,0.14)',  border: 'rgba(205,127,50,0.32)', text: '#cd7f32' },
  SILVER:    { bg: 'rgba(168,184,204,0.14)', border: 'rgba(168,184,204,0.32)', text: '#a8b8cc' },
  GOLD:      { bg: 'rgba(212,185,106,0.14)', border: 'rgba(212,185,106,0.36)', text: '#d4b96a' },
  PLATINUM:  { bg: 'rgba(155,169,196,0.14)', border: 'rgba(155,169,196,0.32)', text: '#9ba9c4' },
};
function StatusPill({ status, dot = true }) {
  const p = STATUS_PRESETS[status] || STATUS_PRESETS.Free;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 'var(--r-full)',
      background: p.bg, color: p.text,
      boxShadow: `inset 0 0 0 1px ${p.border}`,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.text }} />}
      {status}
    </span>
  );
}
function FilterPill({ label, active, onPress, count }) {
  return (
    <button onClick={onPress} style={{
      height: 32, padding: '0 12px', borderRadius: 'var(--r-full)',
      fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
      boxShadow: active ? 'none' : 'inset 0 0 0 1px var(--border-input)',
      transition: 'all var(--dur-fast) var(--ease-out)',
    }}>
      {label}
      {count != null && (
        <span style={{
          background: active ? 'rgba(0,0,0,0.15)' : 'var(--bg-inset)',
          padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700,
        }}>{count}</span>
      )}
    </button>
  );
}

/* ─── ProgressBar ──────────────────────────────────────────────────────── */
function ProgressBar({ progress = 0, color = 'var(--accent)', height = 7, shimmer = true }) {
  return (
    <div style={{
      width: '100%', height, borderRadius: 999, overflow: 'hidden',
      background: 'var(--bg-inset)',
      boxShadow: 'inset 0 0 0 1px var(--border-hairline)',
    }}>
      <div style={{
        height: '100%', width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
        background: shimmer
          ? `linear-gradient(90deg, ${color} 0%, color-mix(in oklab, ${color} 70%, #fff) 50%, ${color} 100%)`
          : color,
        backgroundSize: '200% 100%',
        animation: shimmer ? 'shimmer 2.8s linear infinite' : 'none',
        borderRadius: 999,
        transition: 'width 1.4s var(--ease-out)',
      }} />
    </div>
  );
}

/* ─── IconBadge ────────────────────────────────────────────────────────── */
function IconBadge({ icon, color = 'var(--accent)', size = 'md' }) {
  const s = { sm: 28, md: 36, lg: 48 }[size];
  return (
    <div style={{
      width: s, height: s, borderRadius: '50%',
      background: `color-mix(in oklab, ${color} 18%, transparent)`,
      color, display: 'grid', placeItems: 'center',
      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 32%, transparent)`,
    }}>{icon}</div>
  );
}

/* ─── Card / GlassCard / InfoRow / Divider ─────────────────────────────── */
function Card({ children, padding = 16, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)',
      boxShadow: 'var(--e1)', padding, ...style,
    }}>{children}</div>
  );
}
function GlassCard({ children, variant = 'default', padding = 16, style = {} }) {
  const variants = {
    default: 'var(--border-card)',
    teal: 'var(--border-accent)',
    gold: 'rgba(212,185,106,0.32)',
    danger: 'var(--error-border)',
  };
  return (
    <div style={{
      background: 'var(--bg-card)', backdropFilter: 'blur(24px) saturate(160%)',
      WebkitBackdropFilter: 'blur(24px) saturate(160%)',
      borderRadius: 'var(--r-2xl)', padding,
      boxShadow: `inset 0 0 0 1px ${variants[variant]}, var(--e1)`,
      ...style,
    }}>{children}</div>
  );
}
function Divider({ spacing = 0 }) {
  return <div style={{ height: 1, background: 'var(--divider)', margin: `${spacing}px 0` }} />;
}
function InfoRow({ label, value, valueAccent, valueBold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{
        color: valueAccent ? 'var(--accent)' : 'var(--text-primary)',
        fontWeight: valueBold ? 700 : 500, fontSize: 14,
      }}>{value}</span>
    </div>
  );
}

/* ─── Tier resolver ─────────────────────────────────────────────────────── */
const TIERS = {
  bronze:   { label: 'Bronze',   color: '#cd7f32', min: 0,      max: 1000,   next: 'Silver' },
  silver:   { label: 'Silver',   color: '#a8b8cc', min: 1000,   max: 5000,   next: 'Gold' },
  gold:     { label: 'Gold',     color: '#d4b96a', min: 5000,   max: 20000,  next: 'Platinum' },
  platinum: { label: 'Platinum', color: '#9ba9c4', min: 20000,  max: null,   next: null },
};
function resolveTier(score) {
  if (score >= 20000) return 'platinum';
  if (score >= 5000) return 'gold';
  if (score >= 1000) return 'silver';
  return 'bronze';
}

/* ─── HeroPanel (v2) — landing-match forest background ─────────────────── */
function HeroPanel({ displayName = 'José Santiago', score = 12480, isDark = true }) {
  const tier = resolveTier(score);
  const spec = TIERS[tier];
  const first = displayName.split(/\s+/)[0];
  const pct = spec.max ? Math.min((score - spec.min) / (spec.max - spec.min), 1) : 1;
  const remaining = spec.max ? spec.max - score : 0;

  const heroBg = isDark ? '#050f0c' : '#eaf8f3';
  const textMain = isDark ? '#ffffff' : '#0b2d31';
  const textDim = isDark ? 'rgba(255,255,255,0.62)' : 'rgba(11,45,49,0.62)';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.10)';

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: 'var(--r-2xl)',
      background: heroBg,
      padding: '24px 20px 22px',
      boxShadow: isDark
        ? 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 12px 40px -12px rgba(0,0,0,0.5)'
        : 'inset 0 0 0 1px rgba(11,45,49,0.08), 0 10px 30px -12px rgba(11,45,49,0.18)',
    }}>
      {/* ambient orbs */}
      <div style={{
        position: 'absolute', top: -110, right: -90, width: 300, height: 300,
        borderRadius: '50%', pointerEvents: 'none',
        background: isDark ? 'radial-gradient(circle, rgba(30,230,181,0.18), transparent 65%)'
                           : 'radial-gradient(circle, rgba(13,148,136,0.12), transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -70, width: 240, height: 240,
        borderRadius: '50%', pointerEvents: 'none',
        background: isDark ? 'radial-gradient(circle, rgba(11,90,95,0.30), transparent 60%)'
                           : 'radial-gradient(circle, rgba(11,90,95,0.08), transparent 60%)',
      }} />

      {/* reload */}
      <button style={{
        position: 'absolute', top: 18, right: 18,
        width: 34, height: 34, borderRadius: 17,
        background: isDark ? 'rgba(30,230,181,0.08)' : 'rgba(13,148,136,0.08)',
        boxShadow: `inset 0 0 0 1px ${isDark ? 'rgba(30,230,181,0.16)' : 'rgba(13,148,136,0.18)'}`,
        display: 'grid', placeItems: 'center',
        color: isDark ? 'var(--p-teal)' : 'var(--p-teal-dark)',
      }}>
        <Ic.refresh size={14} />
      </button>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: textMain, marginBottom: 4 }}>
          Hola, {first}
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: textDim, marginBottom: 14, letterSpacing: '0.02em' }}>
          Tu puntuación regenerativa es:
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <AirsMark size={40} fill={isDark ? 'var(--p-teal)' : 'var(--p-teal-dark)'} bg={heroBg} />
          <div className="mono tabular" style={{
            fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em',
            lineHeight: 1, color: textMain,
          }}>{score.toLocaleString('es-ES')}</div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 999,
            boxShadow: `inset 0 0 0 1px ${spec.color}44`,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: spec.color, boxShadow: `0 0 8px ${spec.color}` }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: spec.color }}>
              Status {spec.label.toUpperCase()}
            </span>
          </div>
          <div style={{ color: textDim }}><Ic.info size={14} /></div>
        </div>

        <div style={{ height: 1, background: divider, margin: '4px 0 14px' }} />

        {spec.max && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: textMain, letterSpacing: '-0.01em' }}>
                Progreso a {spec.next} — <span style={{ color: spec.color }}>{Math.round(pct * 100)}%</span>
              </div>
              <div className="mono tabular" style={{ fontSize: 11, color: textDim, fontWeight: 500 }}>
                {score.toLocaleString('es-ES')} / {spec.max.toLocaleString('es-ES')}
              </div>
            </div>
            <ProgressBar progress={pct} color={spec.color} height={7} />
            <div style={{ fontSize: 11, color: textDim, marginTop: 8, lineHeight: 1.45 }}>
              Te faltan <span className="mono" style={{ color: textMain, fontWeight: 700 }}>{remaining.toLocaleString('es-ES')}</span> Airs para alcanzar {spec.next}.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── StatCard ─────────────────────────────────────────────────────────── */
function StatCard({ label, value, delta, deltaPositive = true, icon, accentColor = 'var(--accent)' }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--r-xl)',
      padding: 14, boxShadow: 'var(--e1)',
      display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBadge icon={icon} color={accentColor} size="sm" />
        {delta && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: deltaPositive ? '#34d399' : 'var(--error-text)',
            display: 'inline-flex', alignItems: 'center', gap: 2,
          }}>
            {deltaPositive ? <Ic.arrowUp size={10}/> : <Ic.arrowDown size={10}/>}
            {delta}
          </span>
        )}
      </div>
      <div>
        <div className="mono tabular" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.05 }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginTop: 3, letterSpacing: '0.01em' }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Toast ────────────────────────────────────────────────────────────── */
function Toast({ type = 'success', title, message }) {
  const types = {
    success: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.32)', icon: <Ic.check/> },
    error:   { color: 'var(--error-text)', bg: 'var(--error-bg)', border: 'var(--error-border)', icon: <Ic.x/> },
    info:    { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.32)', icon: <Ic.info/> },
    warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.32)', icon: <Ic.info/> },
  }[type];
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '12px 14px',
      background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
      borderRadius: 'var(--r-lg)',
      boxShadow: `inset 0 0 0 1px ${types.border}, var(--e2)`,
      alignItems: 'flex-start', maxWidth: 340,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: types.bg, color: types.color,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>{types.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        {message && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{message}</div>}
      </div>
    </div>
  );
}

Object.assign(window, {
  Ic, AirsMark, Avatar, Button, ActionButton, StatusPill, FilterPill,
  ProgressBar, IconBadge, Card, GlassCard, Divider, InfoRow,
  HeroPanel, StatCard, Toast, Spinner, TIERS, resolveTier, getInitials,
});

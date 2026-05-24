'use client';

import { RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';

type ThemeMode = 'light' | 'dark';

export interface ReleaseUpdateToastProps {
  eyebrow?: string;
  title: string;
  message: string;
  laterLabel?: string;
  reloadLabel?: string;
  bottomOffset?: number;
  theme: ThemeMode;
  onLater: () => void;
  onReload: () => void;
}

const THEME_TOKENS: Record<
  ThemeMode,
  {
    cardBg: string;
    cardBorder: string;
    shadow: string;
    accent: string;
    accentMuted: string;
    accentBorder: string;
    textPrimary: string;
    textMuted: string;
    primaryBtnBg: string;
    primaryBtnText: string;
    secondaryBtnBg: string;
    secondaryBtnBorder: string;
    secondaryBtnText: string;
  }
> = {
  dark: {
    cardBg: 'rgba(5,5,16,0.94)',
    cardBorder: 'rgba(255,255,255,0.08)',
    shadow: 'rgba(0,0,0,0.32)',
    accent: '#1EE6B5',
    accentMuted: 'rgba(30,230,181,0.12)',
    accentBorder: 'rgba(30,230,181,0.24)',
    textPrimary: 'rgba(255,255,255,0.96)',
    textMuted: 'rgba(232,232,255,0.72)',
    primaryBtnBg: '#1EE6B5',
    primaryBtnText: '#03110d',
    secondaryBtnBg: 'rgba(255,255,255,0.04)',
    secondaryBtnBorder: 'rgba(255,255,255,0.20)',
    secondaryBtnText: 'rgba(255,255,255,0.92)',
  },
  light: {
    cardBg: 'rgba(255,255,255,0.96)',
    cardBorder: 'rgba(15,23,42,0.10)',
    shadow: 'rgba(15,23,42,0.18)',
    accent: '#0d9488',
    accentMuted: 'rgba(13,148,136,0.10)',
    accentBorder: 'rgba(13,148,136,0.22)',
    textPrimary: '#0f172a',
    textMuted: '#475569',
    primaryBtnBg: '#0d9488',
    primaryBtnText: '#ffffff',
    secondaryBtnBg: 'rgba(15,23,42,0.03)',
    secondaryBtnBorder: 'rgba(15,23,42,0.16)',
    secondaryBtnText: '#0f172a',
  },
};

export default function ReleaseUpdateToast({
  eyebrow = 'Update available',
  title,
  message,
  laterLabel = 'Later',
  reloadLabel = 'Reload',
  bottomOffset = 24,
  theme,
  onLater,
  onReload,
}: ReleaseUpdateToastProps) {
  const tokens = THEME_TOKENS[theme];

  const rootStyle: CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: bottomOffset,
    zIndex: 80,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 12px',
    pointerEvents: 'none',
  };

  const cardStyle: CSSProperties = {
    width: '100%',
    maxWidth: 720,
    pointerEvents: 'auto',
    borderRadius: 24,
    border: `1px solid ${tokens.cardBorder}`,
    background: tokens.cardBg,
    boxShadow: `0 18px 45px ${tokens.shadow}`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: 16,
  };

  const actionButtonBase: CSSProperties = {
    minWidth: 112,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'solid',
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    cursor: 'pointer',
    transition: 'transform 160ms ease, opacity 160ms ease, background-color 160ms ease',
  };

  return (
    <div style={rootStyle}>
      <div role='alert' aria-live='polite' style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: tokens.accentMuted,
              border: `1px solid ${tokens.accentBorder}`,
              color: tokens.accent,
            }}
          >
            <RotateCcw size={18} strokeWidth={2.25} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: tokens.accent,
                marginBottom: 4,
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                fontSize: 17,
                lineHeight: 1.3,
                fontWeight: 700,
                color: tokens.textPrimary,
                marginBottom: 4,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: tokens.textMuted,
              }}
            >
              {message}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <button
            type='button'
            onClick={onLater}
            style={{
              ...actionButtonBase,
              flex: '1 1 112px',
              background: tokens.secondaryBtnBg,
              borderColor: tokens.secondaryBtnBorder,
              color: tokens.secondaryBtnText,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.opacity = '0.92';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.opacity = '1';
            }}
          >
            {laterLabel}
          </button>

          <button
            type='button'
            onClick={onReload}
            style={{
              ...actionButtonBase,
              flex: '1 1 112px',
              background: tokens.primaryBtnBg,
              borderColor: tokens.primaryBtnBg,
              color: tokens.primaryBtnText,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {reloadLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

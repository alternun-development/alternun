'use client';

import { useReleaseUpdate } from '@alternun/update';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: currentVersion } = require('../../package.json') as { version: string };

const styles = {
  root: {
    position: 'fixed' as const,
    left: '50%',
    bottom: 16,
    zIndex: 60,
    width: 'min(720px, calc(100vw - 24px))',
    transform: 'translateX(-50%)',
    border: '1px solid rgba(28, 203, 161, 0.24)',
    borderRadius: 18,
    background: 'rgba(5, 5, 16, 0.92)',
    boxShadow: '0 18px 60px rgba(0, 0, 0, 0.35)',
    color: '#f5f7fa',
    backdropFilter: 'blur(18px)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '16px 18px',
    flexWrap: 'wrap' as const,
  },
  copy: {
    minWidth: 220,
    flex: '1 1 280px',
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    lineHeight: '16px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#73f0c8',
  },
  title: {
    margin: '6px 0 0',
    fontSize: 16,
    lineHeight: '22px',
    fontWeight: 700,
  },
  body: {
    margin: '6px 0 0',
    fontSize: 14,
    lineHeight: '20px',
    color: 'rgba(245, 247, 250, 0.82)',
  },
  actions: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  secondaryButton: {
    appearance: 'none' as const,
    border: '1px solid rgba(245, 247, 250, 0.18)',
    borderRadius: 999,
    background: 'transparent',
    color: '#f5f7fa',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
    padding: '10px 14px',
    cursor: 'pointer',
  },
  primaryButton: {
    appearance: 'none' as const,
    border: '1px solid rgba(28, 203, 161, 0.25)',
    borderRadius: 999,
    background: '#1ccba1',
    color: '#071018',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: '20px',
    padding: '10px 16px',
    cursor: 'pointer',
  },
};

export default function ReleaseUpdateBanner() {
  const state = useReleaseUpdate({
    currentVersion,
    mode: process.env.NEXT_PUBLIC_RELEASE_UPDATE_MODE ?? 'auto',
  });

  if (!state.enabled || !state.available) {
    return null;
  }

  return (
    <div aria-live='polite' role='status' style={styles.root}>
      <div style={styles.inner}>
        <div style={styles.copy}>
          <p style={styles.eyebrow}>Update available</p>
          <p style={styles.title}>
            Release {state.remoteVersion ?? state.currentVersion} is ready.
          </p>
          <p style={styles.body}>Reload now to pick up the latest app and worker bundle.</p>
        </div>
        <div style={styles.actions}>
          <button onClick={state.dismiss} style={styles.secondaryButton} type='button'>
            Later
          </button>
          <button onClick={state.reload} style={styles.primaryButton} type='button'>
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

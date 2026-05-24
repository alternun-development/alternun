import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { BrowserFrame } from '../components/BrowserFrame';

export const LoginScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const zoomIn = interpolate(frame, [150, 300], [1.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f0f0f' }}>
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: fadeIn,
          transform: `scale(${zoomIn})`,
          transformOrigin: 'center',
        }}
      >
        <BrowserFrame
          title='AIRS by Alternun'
          url='https://testnet.airs.alternun.co'
          showCursor={true}
          content={<LoginContent frame={frame} />}
        />
      </div>
    </AbsoluteFill>
  );
};

const LoginContent: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          fontWeight: 700,
          marginBottom: '40px',
          color: '#00d9ff',
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        AIRS
      </div>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          opacity: interpolate(frame, [60, 120], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <button
          style={{
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          Connect Wallet
        </button>
        <button
          style={{
            padding: '12px 32px',
            background: 'transparent',
            color: '#00d9ff',
            border: '1px solid #00d9ff',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign Up
        </button>
      </div>

      <div
        style={{
          marginTop: '60px',
          fontSize: '14px',
          color: '#888',
          opacity: interpolate(frame, [100, 150], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Gold-backed digital assets. Regenerative finance.
      </div>
    </div>
  );
};

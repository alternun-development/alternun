import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f0f1e 0%, #0a0a15 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Logo zoom out transition */}
      <div
        style={{
          fontSize: '120px',
          fontWeight: 900,
          color: '#00d9ff',
          textShadow: '0 0 30px rgba(0, 217, 255, 0.5), 0 0 60px rgba(0, 217, 255, 0.3)',
          letterSpacing: '8px',
          opacity: interpolate(frame, [0, 60], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          }),
          transform: `scale(${interpolate(frame, [0, 60], [1.2, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          })})`,
          marginBottom: '40px',
        }}
      >
        AIRS
      </div>

      {/* Main tagline */}
      <h2
        style={{
          fontSize: '44px',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '20px',
          opacity: interpolate(frame, [60, 140], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          }),
          transform: `translateY(${
            interpolate(frame, [60, 140], [20, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }) * -1
          }px)`,
        }}
      >
        Built by Alternun
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '24px',
          color: '#a0a0a0',
          textAlign: 'center',
          marginBottom: '60px',
          opacity: interpolate(frame, [100, 180], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          }),
        }}
      >
        The Future of Regenerative Finance
      </p>

      {/* CTA Button */}
      <button
        style={{
          padding: '16px 40px',
          background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: '40px',
          opacity: interpolate(frame, [150, 230], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          }),
          transform: `scale(${interpolate(frame, [150, 230], [0.9, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })})`,
        }}
      >
        Join the Revolution
      </button>

      {/* URL */}
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#00d9ff',
          letterSpacing: '0.5px',
          opacity: interpolate(frame, [180, 260], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        testnet.airs.alternun.co
      </div>

      {/* Fade to black */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          opacity: interpolate(frame, [450, 600], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.in(Easing.cubic),
          }),
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

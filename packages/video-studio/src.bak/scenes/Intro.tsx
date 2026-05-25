import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing, fade } from 'remotion';
import { CinematicText } from '../components/CinematicText';
import { GradientBackground } from '../components/GradientBackground';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const titleOpacity = interpolate(frame, [90, 180], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const subtitleOpacity = interpolate(frame, [150, 240], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const scaleOut = interpolate(frame, [300, 450], [1, 0.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f0f0f', overflow: 'hidden' }}>
      <GradientBackground />

      {/* Logo */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: logoOpacity,
          fontSize: '120px',
          fontWeight: 900,
          color: '#00d9ff',
          textShadow: '0 0 30px rgba(0, 217, 255, 0.5), 0 0 60px rgba(0, 217, 255, 0.3)',
          letterSpacing: '8px',
        }}
      >
        AIRS
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: titleOpacity,
          fontSize: '48px',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '2px',
        }}
      >
        by Alternun
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: subtitleOpacity,
          fontSize: '28px',
          fontWeight: 300,
          color: '#a0a0a0',
          letterSpacing: '1px',
        }}
      >
        Regenerative Finance Infrastructure
      </div>

      {/* Fade to dashboard transition */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#0f0f0f',
          opacity: interpolate(frame, [350, 450], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.in(Easing.cubic),
          }),
        }}
      />
    </AbsoluteFill>
  );
};

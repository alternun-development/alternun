import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export const GradientBackground: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(
            circle at ${50 + Math.sin(frame / 100) * 20}% ${50 + Math.cos(frame / 100) * 20}%,
            rgba(0, 217, 255, 0.15) 0%,
            rgba(0, 153, 204, 0.08) 40%,
            transparent 80%
          )
        `,
        pointerEvents: 'none',
      }}
    />
  );
};

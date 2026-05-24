import React from 'react';
import { interpolate, Easing, useCurrentFrame } from 'remotion';

interface CinematicTextProps {
  text: string;
  startFrame: number;
  endFrame: number;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const CinematicText: React.FC<CinematicTextProps> = ({
  text,
  startFrame,
  endFrame,
  fontSize = 32,
  color = '#ffffff',
  style,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const translateY = interpolate(frame, [startFrame, startFrame + 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        fontSize: `${fontSize}px`,
        color,
        opacity,
        transform: `translateY(${translateY}px)`,
        transition: 'all 0.3s ease',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

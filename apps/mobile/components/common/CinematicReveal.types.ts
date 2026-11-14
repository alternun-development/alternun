import type React from 'react';

export interface CinematicRevealProps {
  /** A new key replays the whole sequence. */
  playKey: string;
  /** Color of the light rays, the flash and the sparks. */
  glow: string;
  accessibilityLabel: string;
  /** Draws the medal or badge at the given size. */
  renderArt: (size: number) => React.ReactNode;
  onRequestClose: () => void;
  /** Revealed under the art once it lands (titles, text, buttons). */
  children: React.ReactNode;
}

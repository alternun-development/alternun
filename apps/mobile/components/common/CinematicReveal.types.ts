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
  /** The turning light rays behind the art (on by default). */
  showRays?: boolean;
  /** Revealed under the art once it lands (titles, text, buttons). */
  children: React.ReactNode;
}

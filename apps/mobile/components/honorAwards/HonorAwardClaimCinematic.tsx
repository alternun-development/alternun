import React from 'react';
import CinematicReveal from '../common/CinematicReveal';
import HonorAwardMedalPocket, { HonorMedalActions } from './HonorAwardMedalPocket';
import { HONOR_TIER_PALETTES } from './honorAwardTheme';
import type { HonorAwardClaimCinematicProps } from './honorAwards.types';

/**
 * The reveal of a legacy medal (on claim, or as a demo from an empty slot): the medal on its
 * holographic pocket spins in, then sharing and the mission are offered, as in the design.
 */
export default function HonorAwardClaimCinematic({
  award,
  onInspect,
  onClose,
  demo = false,
}: HonorAwardClaimCinematicProps): React.JSX.Element | null {
  if (!award) return null;
  return (
    <CinematicReveal
      playKey={`${award.id}-${demo ? 'demo' : 'claim'}`}
      glow={HONOR_TIER_PALETTES[award.recipe.tier].glow}
      accessibilityLabel={award.recipe.title}
      onRequestClose={onClose}
      showRays={false}
      renderArt={(size) => <HonorAwardMedalPocket award={award} width={size * 1.2} />}
    >
      <HonorMedalActions
        award={award}
        demo={demo}
        onViewMission={() => onInspect(award)}
        onClose={onClose}
      />
    </CinematicReveal>
  );
}

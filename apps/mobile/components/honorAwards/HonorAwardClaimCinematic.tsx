import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CinematicReveal, { cinematicCopyStyles as copy } from '../common/CinematicReveal';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import { HONOR_TIER_PALETTES, honorText } from './honorAwardTheme';
import type { HonorAwardClaimCinematicProps } from './honorAwards.types';

/** The claim moment of an honor award, played with the shared cinematic reveal. */
export default function HonorAwardClaimCinematic({
  award,
  onInspect,
  onClose,
  demo = false,
}: HonorAwardClaimCinematicProps): React.JSX.Element | null {
  const { t } = useAppTranslation('mobile');
  if (!award) return null;
  const palette = HONOR_TIER_PALETTES[award.recipe.tier];
  const tierLabel =
    award.recipe.tier === 'generic'
      ? honorText(
          t,
          `profile.honorAwards.kinds.${award.recipe.kind}`,
          award.recipe.kind === 'trophy' ? 'Trofeo' : 'Medalla'
        )
      : honorText(
          t,
          `profile.honorAwards.tiers.${award.recipe.tier}`,
          { gold: 'Medalla de oro', silver: 'Medalla de plata', bronze: 'Medalla de bronce' }[
            award.recipe.tier
          ]
        );

  return (
    <CinematicReveal
      playKey={`${award.id}-${demo ? 'demo' : 'claim'}`}
      glow={palette.glow}
      accessibilityLabel={award.recipe.title}
      onRequestClose={onClose}
      renderArt={(size) => (
        <HonorAwardEmblem
          tier={award.recipe.tier}
          kind={award.recipe.kind}
          title={award.recipe.title}
          imageUrl={award.recipe.badgeImageUrl}
          artPreset={award.recipe.artPreset}
          size={size}
        />
      )}
    >
      {demo ? (
        <View style={styles.demoRibbon}>
          <Text style={styles.demoRibbonText}>
            {honorText(t, 'profile.honorAwards.demo.ribbon', 'Demostración')}
          </Text>
        </View>
      ) : null}
      <Text style={copy.headline}>
        {demo
          ? honorText(t, 'profile.honorAwards.demo.headline', 'Así se ve al obtener un galardón')
          : honorText(t, 'profile.honorAwards.claim.headline', '¡Galardón desbloqueado!')}
      </Text>
      <Text style={[copy.title, { color: palette.glow }]}>{award.recipe.title}</Text>
      <Text style={copy.subtitle}>
        {[tierLabel, award.partner?.displayName].filter(Boolean).join(' · ')}
      </Text>
      {award.recipe.airsAmount > 0 ? (
        <View style={[copy.chip, { backgroundColor: palette.frame }]}>
          <Text style={copy.chipText}>
            {honorText(t, 'profile.honorAwards.airsAmount', '+{{amount}} Airs', {
              amount: award.recipe.airsAmount,
            })}
          </Text>
        </View>
      ) : null}
      <View style={copy.actions}>
        <Pressable accessibilityRole='button' onPress={() => onInspect(award)} style={copy.primary}>
          <Text style={copy.primaryText}>
            {honorText(t, 'profile.honorAwards.claim.inspect', 'Inspeccionar')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole='button' onPress={onClose} style={copy.secondary}>
          <Text style={copy.secondaryText}>
            {honorText(t, 'profile.honorAwards.claim.continue', 'Continuar')}
          </Text>
        </Pressable>
      </View>
    </CinematicReveal>
  );
}

const styles = StyleSheet.create({
  demoRibbon: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 4,
  },
  demoRibbonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

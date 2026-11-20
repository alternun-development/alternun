import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { TIERS } from '@alternun/ui';
import CinematicReveal, { cinematicCopyStyles as copy } from '../common/CinematicReveal';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { STATUS_BADGES, STATUS_DETAIL_BADGES } from './badgeAssets';
import type { TierRevealCinematicProps } from './TierRevealCinematic.types';

const TIER_FALLBACK_LABELS = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  platinum: 'Platino',
} as const;

const BODY_FALLBACK = {
  bronze:
    'Tu trayectoria en Airs empieza aquí. Cada acción de impacto positivo suma Airs y construye tu reputación.',
  silver:
    'Tu trayectoria crece: Plata reconoce las acciones de impacto positivo que te trajeron hasta aquí.',
  gold: 'Un hito en tu trayectoria: Oro hace visible tu compromiso con el impacto positivo.',
  platinum:
    'El nivel más alto de Airs: Platino reconoce una trayectoria amplia de impacto positivo, construida con el tiempo.',
} as const;

/**
 * Shows a person the metal version of their Airs tier badge with the same cinematic reveal as
 * honor awards, a short explanation of the tier and how far the next one is.
 */
export default function TierRevealCinematic({
  tier,
  score,
  onClose,
}: TierRevealCinematicProps): React.JSX.Element | null {
  const { t, locale } = useAppTranslation('mobile');
  if (!tier) return null;
  const spec = TIERS[tier];
  const art = STATUS_DETAIL_BADGES[tier] ?? STATUS_BADGES[tier] ?? STATUS_DETAIL_BADGES.gold;
  const label = (key: keyof typeof TIER_FALLBACK_LABELS) =>
    t(`profile.tierLabels.${key}`, undefined, TIER_FALLBACK_LABELS[key]);
  const tierLabel = label(tier);
  const next = spec.next;
  const remaining = next ? Math.max(0, TIERS[next].min - score) : 0;
  const progress = next
    ? t(
        'profile.tierReveal.next',
        { amount: remaining.toLocaleString(locale), next: label(next) },
        `Te faltan ${remaining.toLocaleString(locale)} Airs para llegar a ${label(next)}.`
      )
    : t('profile.tierReveal.top', undefined, 'Alcanzaste el nivel más alto de Airs.');

  return (
    <CinematicReveal
      playKey={`tier-${tier}`}
      glow={spec.color}
      accessibilityLabel={tierLabel}
      onRequestClose={onClose}
      renderArt={(size) => (
        <Image source={art} style={{ width: size, height: size }} resizeMode='contain' />
      )}
    >
      <Text style={copy.headline}>
        {t('profile.tierReveal.headline', undefined, '¡Felicitaciones!')}
      </Text>
      <Text style={[copy.title, { color: spec.color }]}>
        {t('profile.tierReveal.title', { tier: tierLabel }, `Eres nivel ${tierLabel}`)}
      </Text>
      <Text style={copy.body}>
        {t(`profile.tierReveal.body.${tier}`, undefined, BODY_FALLBACK[tier])}
      </Text>
      <View style={[copy.chip, { backgroundColor: spec.color }]}>
        <Text style={[copy.chipText, { color: '#050510' }]}>
          {t(
            'profile.tierReveal.score',
            { score: score.toLocaleString(locale) },
            `${score.toLocaleString(locale)} Airs`
          )}
        </Text>
      </View>
      <Text style={copy.subtitle}>{progress}</Text>
      <View style={copy.actions}>
        <Pressable accessibilityRole='button' onPress={onClose} style={copy.primary}>
          <Text style={copy.primaryText}>
            {t('profile.tierReveal.continue', undefined, 'Continuar')}
          </Text>
        </Pressable>
      </View>
    </CinematicReveal>
  );
}

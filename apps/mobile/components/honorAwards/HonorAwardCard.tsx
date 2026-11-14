import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { HonorAward } from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import { formatHonorDate, HOLO_STOPS, HONOR_TIER_PALETTES, honorText } from './honorAwardTheme';
import type { HonorAwardCardProps } from './honorAwards.types';

const NAVY = '#2b2f7a';
const MINT = '#1de9b6';
export const HONOR_CARD_RATIO = 1.4;

/** Pastel holographic foil with a white sheen band, drawn behind the card content. */
export function HolographicFoil({ id }: { id: string }): React.JSX.Element {
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio='none' viewBox='0 0 100 140'>
      <Defs>
        <LinearGradient id={`${id}-foil`} x1='0' y1='0' x2='1' y2='1'>
          {HOLO_STOPS.map((color, index) => (
            <Stop key={color} offset={index / (HOLO_STOPS.length - 1)} stopColor={color} />
          ))}
        </LinearGradient>
        <LinearGradient id={`${id}-sheen`} x1='0' y1='0.2' x2='1' y2='0.6'>
          <Stop offset='0.35' stopColor='#ffffff' stopOpacity='0' />
          <Stop offset='0.5' stopColor='#ffffff' stopOpacity='0.55' />
          <Stop offset='0.65' stopColor='#ffffff' stopOpacity='0' />
        </LinearGradient>
      </Defs>
      <Rect x='0' y='0' width='100' height='140' fill={`url(#${id}-foil)`} />
      <Rect x='0' y='0' width='100' height='140' fill={`url(#${id}-sheen)`} />
    </Svg>
  );
}

function tierLabelKey(tier: HonorAward['recipe']['tier']): string | null {
  return tier === 'generic' ? null : `profile.honorAwards.tiers.${tier}`;
}

const TIER_FALLBACK: Record<string, string> = {
  gold: 'Medalla de oro',
  silver: 'Medalla de plata',
  bronze: 'Medalla de bronce',
};

/** One face of the award card, as in the "Galardones de honor" design. */
export default function HonorAwardCard({
  award,
  side,
  width,
}: HonorAwardCardProps): React.JSX.Element {
  const { t, locale } = useAppTranslation('mobile');
  const { recipe, partner } = award;
  const palette = HONOR_TIER_PALETTES[recipe.tier];
  const height = width * HONOR_CARD_RATIO;
  const scale = width / 280;
  const tierKey = tierLabelKey(recipe.tier);
  const missionLabel = t('profile.honorAwards.missionLabel', undefined, 'Misión:');
  const frameStyle = {
    width,
    height,
    borderColor: palette.frame,
    borderRadius: 20 * scale,
    borderWidth: Math.max(2, 4 * scale),
  };

  if (side === 'front' && recipe.frontImageUrl) {
    return (
      <View style={[styles.card, frameStyle]}>
        <Image source={{ uri: recipe.frontImageUrl }} style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  if (side === 'front') {
    return (
      <View style={[styles.card, frameStyle]}>
        <HolographicFoil id={`front-${award.id}`} />
        <View style={[styles.frontBody, { padding: 16 * scale }]}>
          <Text style={[styles.overline, { fontSize: 11 * scale }]}>
            {missionLabel.toUpperCase()}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.title, { color: palette.ink, fontSize: 22 * scale }]}
          >
            {recipe.title}
          </Text>
          {tierKey ? (
            <Text style={[styles.tierLabel, { fontSize: 10 * scale }]}>
              {t(tierKey, undefined, TIER_FALLBACK[recipe.tier]).toUpperCase()}
            </Text>
          ) : null}
          <View style={styles.emblemWrap}>
            <HonorAwardEmblem
              tier={recipe.tier}
              kind={recipe.kind}
              title={recipe.title}
              imageUrl={recipe.badgeImageUrl}
              artPreset={recipe.artPreset}
              size={150 * scale}
            />
          </View>
          {partner ? (
            <Text numberOfLines={1} style={[styles.partner, { fontSize: 20 * scale }]}>
              {partner.displayName}
            </Text>
          ) : null}
          {recipe.eventName ? (
            <View style={[styles.divider, { marginTop: 6 * scale }]}>
              <Text numberOfLines={2} style={[styles.event, { fontSize: 10 * scale }]}>
                {recipe.eventName.toUpperCase()}
              </Text>
              {recipe.eventYear ? (
                <Text style={[styles.event, { fontSize: 10 * scale }]}>• {recipe.eventYear} •</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  const obtained = formatHonorDate(award.claimedAt ?? award.awardedAt, locale);
  return (
    <View style={[styles.card, frameStyle]}>
      <HolographicFoil id={`back-${award.id}`} />
      <View style={[styles.backHeader, { height: height * 0.24 }]}>
        {recipe.backImageUrl ? (
          <Image source={{ uri: recipe.backImageUrl }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1f5f3a' }]} />
        )}
        <View style={styles.backHeaderShade} />
        <Text style={[styles.backOverline, { fontSize: 10 * scale }]}>
          {missionLabel.toUpperCase()}
        </Text>
        <Text numberOfLines={1} style={[styles.backTitle, { fontSize: 20 * scale }]}>
          {recipe.title}
        </Text>
      </View>
      {partner ? (
        <View style={styles.supportStrip}>
          <Text style={[styles.supportText, { fontSize: 9 * scale }]}>
            {t('profile.honorAwards.supportedBy', undefined, 'Con el apoyo de:')}
          </Text>
        </View>
      ) : null}
      <View
        style={[styles.backBody, { paddingHorizontal: 14 * scale, paddingVertical: 8 * scale }]}
      >
        {partner ? (
          <Text numberOfLines={1} style={[styles.partner, { fontSize: 18 * scale }]}>
            {partner.displayName}
          </Text>
        ) : null}
        {recipe.classification ? (
          <Text style={[styles.classification, { fontSize: 12 * scale }]}>
            {recipe.classification}:
          </Text>
        ) : null}
        {recipe.purpose ? (
          <Text numberOfLines={4} style={[styles.purpose, { fontSize: 9.5 * scale }]}>
            {recipe.purpose}
          </Text>
        ) : null}
        <View style={{ flex: 1 }} />
        {recipe.venueName ? (
          <View style={styles.divider}>
            <Text style={[styles.venue, { fontSize: 11 * scale }]}>{recipe.venueName}</Text>
            {recipe.venueLocation ? (
              <Text style={[styles.venueLocation, { fontSize: 10 * scale }]}>
                {recipe.venueLocation}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.metaRow, { marginTop: 6 * scale }]}>
          {recipe.airsAmount > 0 ? (
            <View style={[styles.airsChip, { backgroundColor: palette.frame }]}>
              <Text style={[styles.airsChipText, { fontSize: 11 * scale }]}>
                {honorText(t, 'profile.honorAwards.airsAmount', '+{{amount}} Airs', {
                  amount: recipe.airsAmount,
                })}
              </Text>
            </View>
          ) : null}
          {obtained ? (
            <Text style={[styles.obtained, { fontSize: 9 * scale }]}>
              {honorText(t, 'profile.honorAwards.obtained', 'Obtenida: {{date}}', {
                date: obtained,
              })}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.brand, { fontSize: 14 * scale }]}>Airs</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: '#e9e1ff' },
  frontBody: { flex: 1, alignItems: 'center' },
  overline: { color: NAVY, fontWeight: '600', letterSpacing: 0.4 },
  title: { fontWeight: '800', textAlign: 'center' },
  tierLabel: { color: '#6b4e1f', fontWeight: '800', marginTop: 2, letterSpacing: 0.4 },
  emblemWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  partner: { color: '#14162b', fontWeight: '800', textAlign: 'center' },
  divider: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(43,47,122,0.45)',
    paddingTop: 4,
  },
  event: { color: NAVY, fontWeight: '700', textAlign: 'center' },
  backHeader: { justifyContent: 'flex-end', padding: 12, overflow: 'hidden' },
  backHeaderShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  backOverline: { color: '#ffffff', fontWeight: '600' },
  backTitle: { color: MINT, fontWeight: '800' },
  supportStrip: { backgroundColor: NAVY, paddingVertical: 3, alignItems: 'center' },
  supportText: { color: '#ffffff', fontWeight: '700' },
  backBody: { flex: 1, alignItems: 'center' },
  classification: { color: NAVY, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  purpose: { color: NAVY, textAlign: 'center', marginTop: 4, lineHeight: 13 },
  venue: { color: NAVY, fontWeight: '800', textAlign: 'center' },
  venueLocation: { color: NAVY, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  airsChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  airsChipText: { color: '#ffffff', fontWeight: '800' },
  obtained: { color: '#14162b' },
  brand: { color: '#0b6b5a', fontWeight: '800', marginTop: 4 },
});

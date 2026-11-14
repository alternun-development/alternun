import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import HonorAwardPartnerMark from './HonorAwardPartnerMark';
import HonorAwardStamp from './HonorAwardStamp';
import { HONOR_AIRS_LOGO, HONOR_FOIL, presetBack } from './honorAwardArt';
import { formatObtainedDate, HONOR_CARD_COLORS, honorText } from './honorAwardTheme';
import type { HonorAwardCardProps } from './honorAwards.types';

const NAVY = '#2b2f7a';
const MINT = '#1de9b6';
/** Height / width of the card templates (316 × 440). */
export const HONOR_CARD_RATIO = 1.4;
/** Width the templates are drawn at; every size scales from it. */
const TEMPLATE_WIDTH = 316;

const TIER_FALLBACK: Record<string, string> = {
  gold: 'Medalla de oro',
  silver: 'Medalla de plata',
  bronze: 'Medalla de bronce',
};

/**
 * One face of an honor award card, laid out like the "Galardones de honor" templates.
 * Every element comes from the recipe, its ally and the grant, so new missions only need
 * data: mission name, tier, medal art, ally logo, event, back photo, purpose, venue, Airs
 * and the obtained date. Missing pieces fall back to the bundled art of the preset.
 */
export default function HonorAwardCard({
  award,
  side,
  width,
}: HonorAwardCardProps): React.JSX.Element {
  const { t, locale } = useAppTranslation('mobile');
  const { recipe, partner } = award;
  const colors = HONOR_CARD_COLORS[recipe.tier];
  const s = width / TEMPLATE_WIDTH;
  const height = width * HONOR_CARD_RATIO;
  const radius = 24 * s;
  const frame = {
    width,
    height,
    borderRadius: radius,
    borderWidth: Math.max(2, 5 * s),
    borderColor: colors.frame,
  };
  const missionLabel = honorText(t, 'profile.honorAwards.missionLabel', 'Misión:').toUpperCase();

  if (side === 'front' && recipe.frontImageUrl) {
    return (
      <View style={[styles.card, frame]}>
        <Image source={{ uri: recipe.frontImageUrl }} style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  if (side === 'front') {
    const tierLabel =
      recipe.tier === 'generic'
        ? null
        : honorText(t, `profile.honorAwards.tiers.${recipe.tier}`, TIER_FALLBACK[recipe.tier]);
    return (
      <View style={[styles.card, frame]}>
        <Image source={HONOR_FOIL} style={StyleSheet.absoluteFill} resizeMode='cover' />
        <View
          style={[
            styles.front,
            { paddingTop: 20 * s, paddingHorizontal: 18 * s, paddingBottom: 12 * s },
          ]}
        >
          <Text style={[styles.overline, { fontSize: 12.5 * s, letterSpacing: 0.6 * s }]}>
            {missionLabel}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.title, { color: colors.title, fontSize: 25 * s, lineHeight: 29 * s }]}
          >
            {recipe.title}
          </Text>
          {tierLabel ? (
            <Text
              style={[
                styles.tierLabel,
                { color: colors.tierLabel, fontSize: 10.5 * s, letterSpacing: 0.4 * s },
              ]}
            >
              {tierLabel.toUpperCase()}
            </Text>
          ) : null}
          <View style={styles.emblem}>
            <HonorAwardEmblem
              tier={recipe.tier}
              kind={recipe.kind}
              title={recipe.title}
              imageUrl={recipe.badgeImageUrl}
              artPreset={recipe.artPreset}
              size={212 * s}
            />
          </View>
          {partner ? (
            <HonorAwardPartnerMark partner={partner} width={width} locale={locale} />
          ) : null}
          {recipe.eventName ? (
            <View style={[styles.divider, { marginTop: 6 * s, paddingTop: 5 * s }]}>
              <Text
                numberOfLines={2}
                style={[styles.event, { fontSize: 11.5 * s, letterSpacing: 0.2 * s }]}
              >
                {recipe.eventName.toUpperCase()}
              </Text>
              {recipe.eventYear ? (
                <Text
                  style={[styles.event, { fontSize: 11 * s }]}
                >{`• ${recipe.eventYear} •`}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  const backPhoto = recipe.backImageUrl
    ? { uri: recipe.backImageUrl }
    : presetBack(recipe.artPreset);
  const obtained = formatObtainedDate(award.claimedAt ?? award.awardedAt, locale);
  const stampText = honorText(
    t,
    'profile.honorAwards.card.stamp',
    '• Proyecto Airs {{year}} • Impacto positivo ambiental',
    { year: recipe.eventYear ?? new Date(award.awardedAt).getUTCFullYear() }
  ).toUpperCase();
  return (
    <View style={[styles.card, frame]}>
      <Image source={HONOR_FOIL} style={StyleSheet.absoluteFill} resizeMode='cover' />
      <View style={[styles.header, { height: height * 0.25 }]}>
        {backPhoto ? (
          <Image source={backPhoto} style={StyleSheet.absoluteFill} resizeMode='cover' />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1f5f3a' }]} />
        )}
        <View style={styles.headerShade} />
        <View style={{ position: 'absolute', left: 18 * s, bottom: 8 * s }}>
          <Text style={[styles.headerOverline, { fontSize: 11 * s }]}>{missionLabel}</Text>
          <Text numberOfLines={1} style={[styles.headerTitle, { fontSize: 21 * s }]}>
            {recipe.title}
          </Text>
        </View>
        <View style={{ position: 'absolute', top: 4 * s, right: 4 * s }}>
          <HonorAwardStamp text={stampText} size={92 * s} />
        </View>
      </View>
      {partner ? (
        <View style={[styles.supportStrip, { paddingVertical: 3 * s }]}>
          <Text style={[styles.supportText, { fontSize: 8.5 * s }]}>
            {honorText(t, 'profile.honorAwards.supportedBy', 'Con el apoyo de:')}
          </Text>
        </View>
      ) : null}
      <View style={[styles.back, { paddingHorizontal: 20 * s, paddingVertical: 9 * s }]}>
        {partner ? (
          <View style={[styles.underline, { paddingBottom: 5 * s, marginBottom: 6 * s }]}>
            <HonorAwardPartnerMark partner={partner} width={width} locale={locale} />
          </View>
        ) : null}
        {recipe.classification ? (
          <Text style={[styles.classification, { fontSize: 13.5 * s }]}>
            {`${recipe.classification}:`}
          </Text>
        ) : null}
        {recipe.purpose ? (
          <Text
            numberOfLines={4}
            style={[styles.purpose, { fontSize: 9.4 * s, lineHeight: 12.5 * s, marginTop: 2 * s }]}
          >
            {recipe.purpose}
          </Text>
        ) : null}
        <View style={{ flex: 1 }} />
        {recipe.venueName ? (
          <View style={[styles.divider, { paddingTop: 5 * s }]}>
            <Text style={[styles.venue, { fontSize: 12 * s }]}>{recipe.venueName}</Text>
            {recipe.venueLocation ? (
              <Text style={[styles.venueLocation, { fontSize: 12 * s }]}>
                {recipe.venueLocation}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.metaRow, { marginTop: 6 * s, gap: 6 * s }]}>
          {recipe.airsAmount > 0 ? (
            <View
              style={[
                styles.airsChip,
                {
                  backgroundColor: colors.frame,
                  paddingHorizontal: 14 * s,
                  paddingVertical: 3 * s,
                },
              ]}
            >
              <Text style={[styles.airsChipText, { fontSize: 13 * s }]}>
                {honorText(t, 'profile.honorAwards.airsAmount', '+{{amount}} Airs', {
                  amount: recipe.airsAmount,
                })}
              </Text>
            </View>
          ) : null}
          {obtained ? (
            <View style={[styles.obtainedBox, { paddingBottom: 2 * s }]}>
              <Text numberOfLines={1} style={[styles.obtained, { fontSize: 9.5 * s }]}>
                <Text style={styles.obtainedLabel}>
                  {honorText(t, 'profile.honorAwards.card.obtainedLabel', 'Obtenida:')}
                </Text>
                {` ${obtained}`}
              </Text>
            </View>
          ) : null}
        </View>
        <Image
          accessibilityLabel='Airs'
          source={HONOR_AIRS_LOGO}
          style={{ width: 92 * s, height: 32 * s, marginTop: 6 * s }}
          resizeMode='contain'
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: '#e9e1ff' },
  front: { flex: 1, alignItems: 'center' },
  overline: { color: NAVY, fontWeight: '600' },
  title: { fontWeight: '800', textAlign: 'center' },
  tierLabel: { fontWeight: '800', marginTop: 1 },
  emblem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divider: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(43,47,122,0.5)',
  },
  underline: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(43,47,122,0.5)',
  },
  event: { color: NAVY, fontWeight: '800', textAlign: 'center' },
  header: { overflow: 'hidden' },
  headerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  headerOverline: { color: '#ffffff', fontWeight: '600' },
  headerTitle: { color: MINT, fontWeight: '800' },
  supportStrip: { backgroundColor: NAVY, alignItems: 'center' },
  supportText: { color: '#ffffff', fontWeight: '700' },
  back: { flex: 1, alignItems: 'center' },
  classification: { color: NAVY, fontWeight: '800', textAlign: 'center' },
  purpose: { color: NAVY, textAlign: 'center' },
  venue: { color: NAVY, fontWeight: '800', textAlign: 'center' },
  venueLocation: { color: NAVY, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  airsChip: { borderRadius: 999 },
  airsChipText: { color: '#ffffff', fontWeight: '800' },
  obtainedBox: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(43,47,122,0.5)',
  },
  obtained: { color: '#14162b' },
  obtainedLabel: { fontWeight: '800' },
});

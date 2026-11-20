import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import HonorAwardPartnerMark from './HonorAwardPartnerMark';
import HonorAwardStamp from './HonorAwardStamp';
import { HONOR_AIRS_LOGO, HONOR_FOIL, presetArt, presetBack } from './honorAwardArt';
import { formatObtainedDate, HONOR_CARD_COLORS, honorText } from './honorAwardTheme';
import type { HonorAwardCardProps } from './honorAwards.types';

const NAVY = '#34377d';
const MINT = '#1de9b6';
/** Title on a dark front (the community medal's grass). */
const LIGHT_TITLE = '#6ce3b7';
/** Height / width of the card templates (316 × 440). */
export const HONOR_CARD_RATIO = 1.4;
/** Width the templates are drawn at; every size scales from it. */
const TEMPLATE_WIDTH = 316;

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
  grayscale = false,
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
    const art = presetArt(recipe.artPreset);
    const light = art?.frontInk === 'light';
    const ink = light ? { color: '#ffffff' } : null;
    return (
      <View style={[styles.card, frame]}>
        <Image
          source={art?.front ?? HONOR_FOIL}
          style={StyleSheet.absoluteFill}
          resizeMode='cover'
        />
        <View
          style={[
            styles.front,
            { paddingTop: 20 * s, paddingHorizontal: 18 * s, paddingBottom: 12 * s },
          ]}
        >
          <Text style={[styles.overline, ink, { fontSize: 12.5 * s, letterSpacing: 0.6 * s }]}>
            {missionLabel}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              { color: light ? LIGHT_TITLE : colors.title, fontSize: 25 * s, lineHeight: 29 * s },
            ]}
          >
            {recipe.title}
          </Text>
          <View style={styles.emblem}>
            <HonorAwardEmblem
              tier={recipe.tier}
              kind={recipe.kind}
              title={recipe.title}
              imageUrl={recipe.badgeImageUrl}
              artPreset={recipe.artPreset}
              size={212 * s}
              grayscale={grayscale}
            />
          </View>
          {partner ? (
            <HonorAwardPartnerMark
              partner={partner}
              width={width}
              locale={locale}
              light={light}
              artPreset={recipe.artPreset}
            />
          ) : null}
          {recipe.eventName ? (
            <View
              style={[
                styles.divider,
                light ? styles.dividerLight : null,
                { marginTop: 6 * s, paddingTop: 5 * s },
              ]}
            >
              <Text
                numberOfLines={2}
                style={[styles.event, ink, { fontSize: 11.5 * s, letterSpacing: 0.2 * s }]}
              >
                {recipe.eventName.toUpperCase()}
              </Text>
              {recipe.eventYear ? (
                <Text
                  style={[styles.event, ink, { fontSize: 11 * s }]}
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
  const obtainedAt = award.claimedAt ?? award.awardedAt;
  // Medals of a year (the community medal) show only the year they were obtained.
  const obtainedYear = new Date(obtainedAt).getUTCFullYear();
  const obtained =
    recipe.eventYear && obtainedAt && !Number.isNaN(obtainedYear)
      ? String(obtainedYear)
      : formatObtainedDate(obtainedAt, locale);
  // The event dates when the recipe has them ("Fecha:"), otherwise when it was obtained.
  const dateLine = recipe.eventDates
    ? {
        label: honorText(t, 'profile.honorAwards.card.dateLabel', 'Fecha:'),
        value: recipe.eventDates,
      }
    : obtained
    ? {
        label: honorText(t, 'profile.honorAwards.card.obtainedLabel', 'Obtenida:'),
        value: obtained,
      }
    : null;
  const stampText = honorText(
    t,
    'profile.honorAwards.card.stamp',
    '• Proyecto Airs {{year}} • Impacto positivo ambiental',
    {
      year:
        recipe.eventYear ??
        (new Date(award.awardedAt).getUTCFullYear() || new Date().getUTCFullYear()),
    }
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
            <HonorAwardPartnerMark
              partner={partner}
              width={width}
              locale={locale}
              artPreset={recipe.artPreset}
            />
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
          {dateLine ? (
            <View style={[styles.obtainedBox, { paddingVertical: 3 * s, paddingLeft: 6 * s }]}>
              <Text numberOfLines={1} style={[styles.obtained, { fontSize: 9.5 * s }]}>
                <Text style={styles.obtainedLabel}>{dateLine.label}</Text>
                {` ${dateLine.value}`}
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
  overline: { color: NAVY, fontFamily: 'Sculpin-Medium' },
  title: { fontFamily: 'Sculpin-Bold', textAlign: 'center' },
  emblem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divider: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(52,55,125,0.5)',
  },
  dividerLight: { borderTopColor: 'rgba(255,255,255,0.85)' },
  underline: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52,55,125,0.5)',
  },
  event: { color: NAVY, fontFamily: 'Sculpin-Bold', textAlign: 'center' },
  header: { overflow: 'hidden' },
  headerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  headerOverline: { color: '#ffffff', fontFamily: 'Sculpin-Medium' },
  headerTitle: { color: MINT, fontFamily: 'Sculpin-Bold' },
  supportStrip: { backgroundColor: NAVY, alignItems: 'center' },
  supportText: { color: '#ffffff', fontWeight: '700' },
  back: { flex: 1, alignItems: 'center' },
  classification: { color: NAVY, fontFamily: 'Sculpin-Bold', textAlign: 'center' },
  purpose: { color: NAVY, fontFamily: 'Sculpin-Medium', textAlign: 'center' },
  venue: { color: NAVY, fontFamily: 'Sculpin-Bold', textAlign: 'center' },
  venueLocation: { color: NAVY, fontFamily: 'Sculpin-Regular', textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  airsChip: { borderRadius: 999 },
  airsChipText: { color: '#ffffff', fontFamily: 'Sculpin-Bold' },
  // "Fecha:" / "Obtenida:" sits between two rules, as in the V4 cards.
  obtainedBox: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(52,55,125,0.6)',
  },
  obtained: { color: '#14162b' },
  obtainedLabel: { fontWeight: '800' },
});

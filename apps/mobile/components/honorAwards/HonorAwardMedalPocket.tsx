import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FileText, X } from 'lucide-react-native';
import ShareButton from '../share/ShareButton';
import ShareSheet from '../share/ShareSheet';
import type { ShareContent } from '../share/share.types';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import HonorAwardSharePreview from './HonorAwardSharePreview';
import { HONOR_FOIL } from './honorAwardArt';
import { honorShareContent } from './honorAwardShare';
import { honorPartnerLine, honorText } from './honorAwardTheme';
import type { HonorMedalActionsProps, HonorMedalPocketProps } from './honorAwards.types';

const MINT = '#1de9b6';
const NAVY = '#2b2f7a';
const LILAC = '#5b5fc7';
/** A medal not held yet: a silver card instead of the foil. */
const GRAY_STOPS = ['#eceef1', '#c9ccd3', '#e4e6ea', '#b9bdc6'] as const;
/** Medal size relative to the card width. */
const EMBLEM = 0.62;

/**
 * The medal on its holographic card with the mission and the ally. The card is a rectangle and
 * its text flows inside it (wrapping, then making the card taller), so it never leaves the card.
 */
export default function HonorAwardMedalPocket({
  award,
  width,
  grayscale = false,
}: HonorMedalPocketProps): React.JSX.Element {
  const { recipe, partner } = award;
  const partnerLine = honorPartnerLine(partner);
  const s = width / 256;
  // Ids per state: several cards can be on screen (the medal view and the share preview).
  const id = grayscale ? 'honor-pocket-gray' : 'honor-pocket-foil';
  return (
    <View
      accessibilityLabel={recipe.title}
      style={[
        styles.pocket,
        {
          width,
          borderRadius: 18 * s,
          paddingTop: 14 * s,
          paddingHorizontal: 16 * s,
          paddingBottom: 16 * s,
        },
      ]}
    >
      {grayscale ? null : (
        // The same holographic foil as the cards.
        <Image source={HONOR_FOIL} style={StyleSheet.absoluteFill} resizeMode='cover' />
      )}
      <View style={StyleSheet.absoluteFill} pointerEvents='none'>
        <Svg width='100%' height='100%'>
          <Defs>
            <LinearGradient id={`${id}-gray`} x1='0' y1='0' x2='1' y2='1'>
              {GRAY_STOPS.map((color, index) => (
                <Stop
                  key={`${color}-${index}`}
                  offset={String(index / (GRAY_STOPS.length - 1))}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
            <LinearGradient id={`${id}-sheen`} x1='0' y1='0' x2='1' y2='0.6'>
              <Stop offset='0.25' stopColor='#ffffff' stopOpacity={0} />
              <Stop offset='0.45' stopColor='#ffffff' stopOpacity={0.45} />
              <Stop offset='0.6' stopColor='#ffffff' stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {grayscale ? (
            <Rect x='0' y='0' width='100%' height='100%' fill={`url(#${id}-gray)`} />
          ) : null}
          <Rect x='0' y='0' width='100%' height='100%' fill={`url(#${id}-sheen)`} />
        </Svg>
      </View>
      <HonorAwardEmblem
        tier={recipe.tier}
        kind={recipe.kind}
        title={recipe.title}
        imageUrl={recipe.badgeImageUrl}
        artPreset={recipe.artPreset}
        size={width * EMBLEM}
        grayscale={grayscale}
      />
      <Text
        numberOfLines={2}
        style={[
          styles.title,
          grayscale && styles.grayText,
          { fontSize: 19 * s, lineHeight: 23 * s, marginTop: 6 * s },
        ]}
      >
        {recipe.title}
      </Text>
      {partnerLine ? (
        <Text
          numberOfLines={2}
          style={[
            styles.partner,
            grayscale && styles.grayText,
            { fontSize: 12.5 * s, lineHeight: 15 * s, marginTop: 2 * s },
          ]}
        >
          {partnerLine}
        </Text>
      ) : null}
    </View>
  );
}

/** Share and "Ver misión" under the medal card, and the close button. */
export function HonorMedalActions({
  award,
  demo,
  locked = false,
  holderName,
  onViewMission,
  onClose,
}: HonorMedalActionsProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  // Made once per opening, so the preview and the shared file are the same drawn image.
  const [sharing, setSharing] = useState<ShareContent | null>(null);

  return (
    <View style={styles.actionsBox}>
      {demo ? (
        <Text style={styles.demoNote}>
          {honorText(
            t,
            'profile.honorAwards.demo.note',
            'Demostración: así se verá tu medalla cuando la obtengas.'
          )}
        </Text>
      ) : null}
      {locked ? (
        <Text style={styles.demoNote}>
          {honorText(
            t,
            'profile.honorAwards.locked.note',
            'Aún no tienes esta medalla: participa en la misión para obtenerla.'
          )}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {demo || locked ? null : (
          <ShareButton
            label={honorText(t, 'profile.honorAwards.inspect.share', 'Compartir')}
            onPress={() => setSharing(honorShareContent(award, t, holderName))}
          />
        )}
        <Pressable
          accessibilityRole='button'
          onPress={onViewMission}
          style={[styles.pill, styles.missionPill]}
        >
          <FileText size={14} color={MINT} />
          <Text style={[styles.pillText, { color: MINT }]}>
            {honorText(t, 'profile.honorAwards.inspect.viewMission', 'Ver misión')}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={honorText(t, 'profile.honorAwards.inspect.close', 'Cerrar')}
        onPress={onClose}
        style={styles.close}
      >
        <X size={16} color='#ffffff' />
      </Pressable>
      <ShareSheet
        visible={sharing !== null}
        content={sharing}
        preview={
          <HonorAwardSharePreview
            image={sharing?.image}
            label={award.recipe.title}
            fallback={<HonorAwardMedalPocket award={award} width={200} />}
          />
        }
        onClose={() => setSharing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pocket: { alignItems: 'center', overflow: 'hidden' },
  // Stretch so the text wraps inside the card (centered text otherwise grows past it on web).
  title: { alignSelf: 'stretch', color: NAVY, fontFamily: 'Sculpin-Bold', textAlign: 'center' },
  partner: {
    alignSelf: 'stretch',
    color: LILAC,
    fontFamily: 'Sculpin-Medium',
    textAlign: 'center',
  },
  grayText: { color: '#5d616b' },
  actionsBox: { alignItems: 'center', alignSelf: 'stretch', maxWidth: 320 },
  demoNote: {
    alignSelf: 'stretch',
    color: MINT,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  missionPill: { height: 32, backgroundColor: '#06352c', borderColor: MINT },
  pillText: { fontWeight: '700', fontSize: 13 },
  close: {
    marginTop: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

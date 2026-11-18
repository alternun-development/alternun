import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { FileText, X } from 'lucide-react-native';
import ShareButton from '../share/ShareButton';
import ShareSheet from '../share/ShareSheet';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import { honorShareContent } from './honorAwardShare';
import { HOLO_STOPS, honorPartnerLine, honorText } from './honorAwardTheme';
import type { HonorMedalActionsProps, HonorMedalPocketProps } from './honorAwards.types';

const MINT = '#1de9b6';
const NAVY = '#2b2f7a';
const LILAC = '#5b5fc7';
/** Holographic pocket (100 × 100): rounded on top, pointed at the bottom. */
const POCKET =
  'M8 0 H92 Q100 0 100 8 V58 Q100 63 96 66.5 L57 96 Q50 101 43 96 L4 66.5 Q0 63 0 58 V8 Q0 0 8 0 Z';
/** Medal size and how far it rises over the pocket, relative to the pocket width. */
const EMBLEM = 0.66;
const RISE = 0.12;

/** Height of the pocket with the medal rising over it, for a given width. */
export function honorPocketHeight(width: number): number {
  return width * (1 + RISE);
}

/** The medal on its holographic pocket with the mission and the ally, as in the design. */
export default function HonorAwardMedalPocket({
  award,
  width,
}: HonorMedalPocketProps): React.JSX.Element {
  const { recipe, partner } = award;
  const partnerLine = honorPartnerLine(partner);
  const rise = width * RISE;
  const s = width / 256;
  return (
    <View accessibilityLabel={recipe.title} style={{ width, height: honorPocketHeight(width) }}>
      <View style={[styles.pocket, { top: rise }]}>
        <Svg width={width} height={width} viewBox='0 0 100 100' preserveAspectRatio='none'>
          <Defs>
            <LinearGradient id='honor-pocket-holo' x1='0' y1='0' x2='1' y2='1'>
              {HOLO_STOPS.map((color, index) => (
                <Stop
                  key={color}
                  offset={String(index / (HOLO_STOPS.length - 1))}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
            <LinearGradient id='honor-pocket-sheen' x1='0' y1='0' x2='1' y2='0.6'>
              <Stop offset='0.25' stopColor='#ffffff' stopOpacity={0} />
              <Stop offset='0.45' stopColor='#ffffff' stopOpacity={0.55} />
              <Stop offset='0.6' stopColor='#ffffff' stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={POCKET} fill='url(#honor-pocket-holo)' />
          <Path d={POCKET} fill='url(#honor-pocket-sheen)' />
        </Svg>
        <View style={[styles.copy, { top: width * 0.62 }]}>
          <Text numberOfLines={2} style={[styles.title, { fontSize: 19 * s }]}>
            {recipe.title}
          </Text>
          {partnerLine ? (
            <Text numberOfLines={1} style={[styles.partner, { fontSize: 14 * s }]}>
              {partnerLine}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.emblem}>
        <HonorAwardEmblem
          tier={recipe.tier}
          kind={recipe.kind}
          title={recipe.title}
          imageUrl={recipe.badgeImageUrl}
          artPreset={recipe.artPreset}
          size={width * EMBLEM}
        />
      </View>
    </View>
  );
}

/** Share and "Ver misión" under the pocket, and the close button. */
export function HonorMedalActions({
  award,
  demo,
  locked = false,
  onViewMission,
  onClose,
}: HonorMedalActionsProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');

  const [sharing, setSharing] = useState(false);

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
            onPress={() => setSharing(true)}
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
        visible={sharing}
        content={sharing ? honorShareContent(award, t) : null}
        preview={<HonorAwardMedalPocket award={award} width={200} />}
        onClose={() => setSharing(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pocket: { position: 'absolute', left: 0, right: 0 },
  emblem: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  copy: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  title: { color: NAVY, fontWeight: '800', textAlign: 'center' },
  partner: { color: LILAC, fontWeight: '600', textAlign: 'center' },
  actionsBox: { alignItems: 'center' },
  demoNote: { color: MINT, fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },
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

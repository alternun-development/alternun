import React from 'react';
import { Image, Text, View } from 'react-native';
import { presetArt } from './honorAwardArt';
import { honorCountryName } from './honorAwardTheme';
import type { HonorAwardPartnerMarkProps } from './honorAwards.types';

const INK = '#111318';
const GREEN = '#5a854c';
/** The bundled mark is drawn 225 × 58.6 on the 316-wide template (Swing Golf, V4 design). */
const MARK_RATIO = 422 / 110;

/**
 * The ally on the card: the mark bundled with the card art (drawn for it, in ink or white); then
 * the ally's logo; otherwise a wordmark in the style of the templates (last word in green, e.g. "Swing Golf")
 * with its country underneath.
 */
export default function HonorAwardPartnerMark({
  partner,
  width,
  light = false,
  artPreset,
}: HonorAwardPartnerMarkProps): React.JSX.Element {
  const ink = light ? '#ffffff' : INK;
  const scale = width / 316;
  const mark = presetArt(artPreset)?.partnerMark;
  if (mark) {
    return (
      <Image
        accessibilityLabel={partner.displayName}
        source={light ? mark.light : mark.dark}
        style={{ width: 225 * scale, height: (225 * scale) / MARK_RATIO }}
        resizeMode='contain'
      />
    );
  }
  if (partner.logoUrl) {
    return (
      <Image
        accessibilityLabel={partner.displayName}
        source={{ uri: partner.logoUrl }}
        style={{ width: 200 * scale, height: 58 * scale }}
        resizeMode='contain'
      />
    );
  }
  const words = partner.displayName.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() ?? '' : '';
  const country = honorCountryName(partner.countryCode);
  return (
    <View accessibilityLabel={partner.displayName} style={{ alignItems: 'center' }}>
      <Text numberOfLines={1} style={{ fontSize: 27 * scale, fontWeight: '900', color: ink }}>
        {words.join(' ')}
        {last ? <Text style={{ color: light ? ink : GREEN }}>{` ${last}`}</Text> : null}
      </Text>
      {country ? (
        <Text
          style={{ fontSize: 13 * scale, fontWeight: '700', color: ink, marginTop: -2 * scale }}
        >
          {country}
        </Text>
      ) : null}
    </View>
  );
}

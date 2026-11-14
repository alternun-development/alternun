import React from 'react';
import { Image, Text, View } from 'react-native';
import { honorCountryName } from './honorAwardTheme';
import type { HonorAwardPartnerMarkProps } from './honorAwards.types';

const INK = '#111318';
const GREEN = '#4a9a3a';

/**
 * The ally on the card: its logo when it has one; otherwise a wordmark in the style of the
 * templates (last word in green, e.g. "Swing Golf") with its country underneath.
 */
export default function HonorAwardPartnerMark({
  partner,
  width,
}: HonorAwardPartnerMarkProps): React.JSX.Element {
  const scale = width / 316;
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
      <Text numberOfLines={1} style={{ fontSize: 27 * scale, fontWeight: '900', color: INK }}>
        {words.join(' ')}
        {last ? <Text style={{ color: GREEN }}>{` ${last}`}</Text> : null}
      </Text>
      {country ? (
        <Text
          style={{ fontSize: 13 * scale, fontWeight: '700', color: INK, marginTop: -2 * scale }}
        >
          {country}
        </Text>
      ) : null}
    </View>
  );
}

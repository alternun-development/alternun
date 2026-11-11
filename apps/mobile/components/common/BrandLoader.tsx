import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { BrandLoaderProps } from './BrandLoader.types';

/** The Airs symbol variants; the loader shows them one after another in random order. */
// Metro bundles static assets through require().
/* eslint-disable @typescript-eslint/no-var-requires */
export const BRAND_SYMBOLS: ImageSourcePropType[] = [
  require('../../assets/SVGs/asset-3simbolo-airs.svg') as ImageSourcePropType,
  require('../../assets/SVGs/asset-4simbolo-airs.svg') as ImageSourcePropType,
  require('../../assets/SVGs/asset-5simbolo-airs.svg') as ImageSourcePropType,
  require('../../assets/SVGs/asset-6simbolo-airs.svg') as ImageSourcePropType,
  require('../../assets/SVGs/asset-7simbolo-airs.svg') as ImageSourcePropType,
  require('../../assets/SVGs/asset-8simbolo-airs.svg') as ImageSourcePropType,
  require('../../assets/SVGs/asset-9simbolo-airs.svg') as ImageSourcePropType,
  require('../../assets/SVGs/asset-10simbolo-airs.svg') as ImageSourcePropType,
  require('../../assets/SVGs/asset-11simbolo-airs.svg') as ImageSourcePropType,
];
/* eslint-enable @typescript-eslint/no-var-requires */

const SWAP_MS = 650;

/** A random symbol index other than the current one, so every swap is visible. */
export function nextSymbolIndex(current: number, random: () => number = Math.random): number {
  const offset = 1 + Math.floor(random() * (BRAND_SYMBOLS.length - 1));
  return (current + offset) % BRAND_SYMBOLS.length;
}

/** Full-page loader: a spinning ring with the Airs symbol changing at random in the middle. */
export default function BrandLoader({
  size = 72,
  color = '#1ccba1',
}: BrandLoaderProps): React.JSX.Element {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * BRAND_SYMBOLS.length));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    const timer = setInterval(() => setIndex((current) => nextSymbolIndex(current)), SWAP_MS);
    return () => {
      loop.stop();
      clearInterval(timer);
    };
  }, [spin]);

  const symbolSize = Math.round(size * 0.5);
  return (
    <View
      testID='brand-loader'
      accessibilityRole='progressbar'
      accessibilityState={{ busy: true }}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            borderRadius: size / 2,
            borderColor: `${color}33`,
            borderTopColor: color,
            transform: [
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          },
        ]}
      />
      <View style={styles.center}>
        <ExpoImage
          testID='brand-loader-symbol'
          source={BRAND_SYMBOLS[index]}
          style={{ width: symbolSize, height: symbolSize }}
          contentFit='contain'
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { ...StyleSheet.absoluteFillObject, borderWidth: 3 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});

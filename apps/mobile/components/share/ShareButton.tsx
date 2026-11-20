import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Share2 } from 'lucide-react-native';
import type { ShareButtonProps } from './share.types';

const INK = '#7ff3e6';
const SIZES = {
  regular: { height: 32, paddingHorizontal: 14, fontSize: 13, icon: 15, gap: 6 },
  large: { height: 44, paddingHorizontal: 22, fontSize: 15, icon: 18, gap: 8 },
} as const;

/** The "Compartir" pill of the design: indigo glass, lilac edge, mint label. */
export default function ShareButton({
  label,
  onPress,
  size = 'regular',
  disabled = false,
  accessibilityLabel,
}: ShareButtonProps): React.JSX.Element {
  const metrics = SIZES[size];
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          height: metrics.height,
          borderRadius: metrics.height / 2,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents='none'>
        <Svg width='100%' height='100%'>
          <Defs>
            <LinearGradient id='share-button-fill' x1='0' y1='0' x2='0' y2='1'>
              <Stop offset='0' stopColor='#3a2f9a' />
              <Stop offset='1' stopColor='#1f1a5e' />
            </LinearGradient>
          </Defs>
          <Rect x='0' y='0' width='100%' height='100%' fill='url(#share-button-fill)' />
        </Svg>
      </View>
      <View
        style={[styles.content, { paddingHorizontal: metrics.paddingHorizontal, gap: metrics.gap }]}
      >
        <Share2 size={metrics.icon} color={INK} strokeWidth={2.4} />
        <Text style={[styles.label, { fontSize: metrics.fontSize }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#9d8cff',
    justifyContent: 'center',
    shadowColor: '#8f7cff',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { color: INK, fontWeight: '800', letterSpacing: 0.2 },
});

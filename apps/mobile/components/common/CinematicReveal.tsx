import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import type { CinematicRevealProps } from './CinematicReveal.types';

const PARTICLES = 18;
const RAYS = 16;

function Rays({ size, color }: { size: number; color: string }): React.JSX.Element {
  const center = size / 2;
  const wedges = Array.from({ length: RAYS }, (_, index) => {
    const start = (index / RAYS) * Math.PI * 2;
    const end = start + Math.PI / RAYS / 1.6;
    const x1 = center + Math.cos(start) * center;
    const y1 = center + Math.sin(start) * center;
    const x2 = center + Math.cos(end) * center;
    const y2 = center + Math.sin(end) * center;
    return `M${center} ${center} L${x1} ${y1} L${x2} ${y2} Z`;
  });
  return (
    <Svg width={size} height={size}>
      {wedges.map((d) => (
        <Path key={d} d={d} fill={color} opacity={0.22} />
      ))}
    </Svg>
  );
}

/**
 * A cinematic reveal: the screen dims, light rays open, the art drops in spinning like a coin,
 * lands with a flash and a burst of sparks, a sheen sweeps it and the content underneath is
 * revealed. Used to claim honor awards and to show a person their Airs tier. With motion
 * turned off it shows the final frame right away.
 */
export default function CinematicReveal({
  playKey,
  glow,
  accessibilityLabel,
  renderArt,
  onRequestClose,
  children,
}: CinematicRevealProps): React.JSX.Element {
  const { motionLevel } = useAppPreferences();
  const { width } = useWindowDimensions();
  const medalSize = Math.min(220, width * 0.55);
  const raySize = medalSize * 2.6;

  const backdrop = useRef(new Animated.Value(0)).current;
  const medalScale = useRef(new Animated.Value(0.2)).current;
  const medalOpacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const rayTurn = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;

  const angles = useMemo(
    () => Array.from({ length: PARTICLES }, (_, index) => (index / PARTICLES) * Math.PI * 2),
    []
  );

  useEffect(() => {
    const values = [backdrop, medalScale, medalOpacity, spin, flash, burst, rayTurn, sheen, reveal];
    if (motionLevel === 'off') {
      backdrop.setValue(1);
      medalScale.setValue(1);
      medalOpacity.setValue(1);
      spin.setValue(1);
      flash.setValue(0);
      burst.setValue(0);
      sheen.setValue(0);
      reveal.setValue(1);
      return undefined;
    }

    for (const value of values) value.setValue(0);
    medalScale.setValue(0.2);
    const full = motionLevel === 'full';
    const landing = Animated.parallel([
      Animated.timing(flash, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      ...(full
        ? [
            Animated.timing(burst, {
              toValue: 1,
              duration: 900,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]
        : []),
    ]);

    const sequence = Animated.sequence([
      Animated.timing(backdrop, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(medalOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(medalScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(spin, {
          toValue: 1,
          duration: full ? 1300 : 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      landing,
      Animated.parallel([
        Animated.timing(reveal, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheen, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    const rays = Animated.loop(
      Animated.timing(rayTurn, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const hapticTimer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, 900);

    sequence.start();
    if (full) rays.start();
    return () => {
      clearTimeout(hapticTimer);
      sequence.stop();
      rays.stop();
    };
  }, [
    playKey,
    backdrop,
    burst,
    flash,
    medalOpacity,
    medalScale,
    motionLevel,
    rayTurn,
    reveal,
    sheen,
    spin,
  ]);

  const rotateY = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
  const rotateRays = rayTurn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const flashOpacity = flash.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.85, 0] });
  const flashScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] });
  const sheenX = sheen.interpolate({ inputRange: [0, 1], outputRange: [-medalSize, medalSize] });
  const revealY = reveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Modal
      transparent
      visible
      animationType='none'
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Animated.View
          pointerEvents='none'
          style={[styles.center, { transform: [{ rotate: rotateRays }], opacity: backdrop }]}
        >
          <Rays size={raySize} color={glow} />
        </Animated.View>

        <Animated.View
          pointerEvents='none'
          style={[
            styles.flash,
            {
              width: medalSize,
              height: medalSize,
              borderRadius: medalSize / 2,
              backgroundColor: glow,
              opacity: flashOpacity,
              transform: [{ scale: flashScale }],
            },
          ]}
        />

        {angles.map((angle, index) => {
          const distance = medalSize * (0.9 + (index % 3) * 0.25);
          return (
            <Animated.View
              key={angle}
              pointerEvents='none'
              style={[
                styles.particle,
                {
                  backgroundColor: index % 2 ? glow : '#ffffff',
                  opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    {
                      translateX: burst.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.cos(angle) * distance],
                      }),
                    },
                    {
                      translateY: burst.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.sin(angle) * distance],
                      }),
                    },
                  ],
                },
              ]}
            />
          );
        })}

        <Animated.View
          accessibilityLabel={accessibilityLabel}
          style={{
            opacity: medalOpacity,
            transform: [{ perspective: 800 }, { scale: medalScale }, { rotateY }],
          }}
        >
          <View style={{ overflow: 'hidden' }}>
            {renderArt(medalSize)}
            <Animated.View
              pointerEvents='none'
              style={[
                styles.sheen,
                {
                  height: medalSize * 1.2,
                  transform: [{ translateX: sheenX }, { rotate: '18deg' }],
                },
              ]}
            />
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.copy, { opacity: reveal, transform: [{ translateY: revealY }] }]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** Text and button styles shared by the content of every reveal. */
export const cinematicCopyStyles = StyleSheet.create({
  headline: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
  body: { color: 'rgba(255,255,255,0.86)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, marginTop: 6 },
  chipText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  primary: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: '#1de9b6',
  },
  primaryText: { color: '#04231c', fontWeight: '800' },
  secondary: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  secondaryText: { color: '#ffffff', fontWeight: '700' },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,10,9,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  flash: { position: 'absolute' },
  particle: { position: 'absolute', width: 7, height: 7, borderRadius: 4 },
  sheen: {
    position: 'absolute',
    top: -20,
    left: '40%',
    width: 34,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  copy: { alignItems: 'center', marginTop: 28, gap: 6, maxWidth: 360 },
});

import React, { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { MotionLevel } from '../settings/AppPreferencesProvider';

/** A quiet, tier-tinted border beam. Only the decorative ring rotates. */
export default function TierAvatarBorder({
  color,
  motionLevel,
}: {
  color: string;
  motionLevel?: MotionLevel;
}): React.JSX.Element {
  const gradientId = `tierBeam${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const rotation = useRef(new Animated.Value(0)).current;
  // Start static until the system preference has been read.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (mounted) setReduceMotion(reduced);
    });
    const preference = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const appState = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => {
      mounted = false;
      preference.remove();
      appState.remove();
    };
  }, []);

  const animate = active && !reduceMotion && (motionLevel == null || motionLevel === 'full');
  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animate, rotation]);

  return (
    <View pointerEvents='none' accessible={false} style={styles.ring} testID='tier-avatar-border'>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width='100%' height='100%' viewBox='0 0 40 40'>
          <Defs>
            <LinearGradient id={gradientId} x1='0%' y1='100%' x2='100%' y2='0%'>
              <Stop offset='0%' stopColor={color} stopOpacity={0.08} />
              <Stop offset='65%' stopColor={color} stopOpacity={0.8} />
              <Stop offset='100%' stopColor='#fff5e5' />
            </LinearGradient>
          </Defs>
          <Circle
            cx={20}
            cy={20}
            r={18.5}
            fill='none'
            stroke={color}
            strokeOpacity={0.3}
            strokeWidth={1}
          />
          <Circle
            cx={20}
            cy={20}
            r={18.5}
            fill='none'
            stroke={`url(#${gradientId})`}
            strokeWidth={1.6}
            strokeDasharray='38 78.24'
            strokeLinecap='round'
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', inset: -2, borderRadius: 999 },
});

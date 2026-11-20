import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import type { AvatarFlipProps } from './avatar.types';

const FLIP_MS = 450;

/**
 * Two faces of an avatar that turn over like a coin: the avatar the person chose on the
 * front and, while `flipped`, their tier badge on the back. Without motion it switches at once.
 */
export default function AvatarFlip({
  front,
  back,
  flipped,
  size,
}: AvatarFlipProps): React.JSX.Element {
  const { motionLevel } = useAppPreferences();
  const showBack = flipped && Boolean(back);
  const turn = useRef(new Animated.Value(showBack ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(turn, {
      toValue: showBack ? 1 : 0,
      duration: motionLevel === 'off' ? 0 : FLIP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [motionLevel, showBack, turn]);

  const box = { width: size, height: size };
  const face = (from: string, to: string) => ({
    transform: [
      { perspective: 800 },
      { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) },
    ],
  });

  return (
    <View style={box}>
      <Animated.View
        testID='avatar-flip-front'
        accessibilityElementsHidden={showBack}
        importantForAccessibility={showBack ? 'no-hide-descendants' : 'auto'}
        style={[styles.face, box, face('0deg', '180deg')]}
      >
        {front}
      </Animated.View>
      {back ? (
        <Animated.View
          testID='avatar-flip-back'
          accessibilityElementsHidden={!showBack}
          importantForAccessibility={showBack ? 'auto' : 'no-hide-descendants'}
          style={[styles.face, box, face('180deg', '360deg')]}
        >
          {back}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
});

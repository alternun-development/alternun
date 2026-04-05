import { useCallback, useRef, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { ScrollView } from 'react-native';

export interface UseBackToTopOptions {
  scrollThreshold?: number;
}

export function useBackToTop(options: UseBackToTopOptions = {}) {
  const { scrollThreshold = 200 } = options;
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const bounce = useSharedValue(0);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const nextVisible = e.nativeEvent.contentOffset.y > scrollThreshold;

      setShowBackToTop((currentVisible) => {
        if (currentVisible === nextVisible) {
          return currentVisible;
        }

        if (nextVisible) {
          bounce.value = withRepeat(
            withSequence(
              withTiming(-5, { duration: 420, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) })
            ),
            -1
          );
        } else {
          cancelAnimation(bounce);
          bounce.value = 0;
        }

        return nextVisible;
      });
    },
    [bounce, scrollThreshold]
  );

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  return {
    scrollRef,
    showBackToTop,
    handleScroll,
    scrollToTop,
    bounceStyle,
  };
}

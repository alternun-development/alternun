import React, { useEffect, useState } from 'react';
import {
  useWindowDimensions,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';

interface DynamicMessageBarProps {
  message: string;
  bgColor?: string;
  textColor?: string;
  duration?: number;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export default function DynamicMessageBar({
  message,
  bgColor = '#333480',
  textColor = '#ffffff',
  duration = 15600,
  containerStyle,
  textStyle,
}: DynamicMessageBarProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const offsetX = useSharedValue(width);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      cancelAnimation(offsetX);
      return;
    }

    cancelAnimation(offsetX);

    offsetX.value = withRepeat(
      withTiming(
        -width * 1.5,
        {
          duration,
          easing: Easing.linear,
        },
        () => {
          offsetX.value = width;
        }
      ),
      -1,
      true,
      (isFinished) => {
        if (!isFinished) {
          offsetX.value = width;
        }
      }
    );

    return () => cancelAnimation(offsetX);
  }, [message, width, duration, offsetX, isPaused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  return (
    <Pressable
      onPressIn={() => setIsPaused(true)}
      onPressOut={() => setIsPaused(false)}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
        },
        containerStyle,
      ]}
    >
      <Animated.Text
        style={[
          styles.text,
          {
            color: textColor,
          },
          animatedStyle,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {message}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  text: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

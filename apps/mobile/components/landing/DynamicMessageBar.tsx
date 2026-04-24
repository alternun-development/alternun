import React, { useEffect, useState, useRef } from 'react';
import {
  useWindowDimensions,
  StyleSheet,
  Pressable,
  Text,
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
import { useAppPalette } from '../theme/useAppPalette';

export interface DynamicMessageLink {
  label: string;
  onPress: () => void;
}

export interface DynamicMessageContent {
  text: string;
  link?: DynamicMessageLink;
}

interface DynamicMessageBarProps {
  message: DynamicMessageContent;
  bgColor?: string;
  textColor?: string;
  duration?: number;
  isDark?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export default function DynamicMessageBar({
  message,
  bgColor,
  textColor = '#ffffff',
  duration: durationProp,
  isDark = false,
  containerStyle,
  textStyle,
}: DynamicMessageBarProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const offsetX = useSharedValue(width);
  const [isPaused, setIsPaused] = useState(false);
  const isInitialRef = useRef(true);
  const palette = useAppPalette();
  const resolvedBgColor = bgColor ?? (isDark ? '#000000' : '#333480');

  // Calculate duration based on screen width for consistent speed across devices
  // Target: 60 pixels per second (slower, more readable speed)
  const pixelsToScroll = width * 1.5;
  const pixelsPerSecond = 60;
  const calculatedDuration = Math.round((pixelsToScroll / pixelsPerSecond) * 1000);
  const duration = durationProp ?? calculatedDuration;

  useEffect(() => {
    if (isPaused) {
      cancelAnimation(offsetX);
      return;
    }

    cancelAnimation(offsetX);

    // Only reset to width on initial load or when message changes
    if (isInitialRef.current) {
      offsetX.value = width;
      isInitialRef.current = false;
    }

    offsetX.value = withRepeat(
      withTiming(
        -width * 1.5,
        {
          duration,
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) {
            offsetX.value = width;
          }
        }
      ),
      -1,
      true
    );

    return () => cancelAnimation(offsetX);
  }, [message, width, duration, offsetX, isPaused]);

  useEffect(() => {
    isInitialRef.current = true;
  }, [message]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  return (
    <Pressable
      onPressIn={() => setIsPaused(true)}
      onPressOut={() => setIsPaused(false)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={[
        styles.container,
        {
          backgroundColor: resolvedBgColor,
        },
        containerStyle,
      ]}
    >
      <Animated.View style={[styles.row, animatedStyle]}>
        <Text
          numberOfLines={1}
          style={[
            styles.text,
            {
              color: isPaused ? palette.accentBold : textColor,
            },
            textStyle,
          ]}
        >
          {message.text}
        </Text>
        {message.link ? (
          <Pressable
            accessibilityRole='link'
            onPress={message.link.onPress}
            style={({ hovered, pressed }) => [
              styles.linkChip,
              {
                backgroundColor: hovered || pressed ? '#27e9bf' : '#1ccba1',
                opacity: isPaused ? 1 : 0.98,
              },
            ]}
          >
            <Text style={styles.linkText}>{message.link.label}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    height: 18,
  },
  text: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  linkChip: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: '#1ccba1',
    height: 18,
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.1,
    color: '#041119',
  },
});

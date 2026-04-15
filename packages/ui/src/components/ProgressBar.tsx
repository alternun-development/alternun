import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, fontSize } from '../tokens/spacing';
import { palette } from '../tokens/colors';

interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
  trailingLabel?: string;
  showPercentage?: boolean;
  animate?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = palette.teal,
  height = 8,
  showLabel = false,
  label,
  trailingLabel,
  showPercentage = true,
  animate = true,
  style,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const clamped = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    if (animate) {
      Animated.timing(width, {
        toValue: clamped,
        duration: 900,
        useNativeDriver: false,
      }).start();
    } else {
      width.setValue(clamped);
    }
  }, [clamped, animate, width]);

  // Shimmer loop on the fill
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <View style={style}>
      {showLabel && (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
          ) : null}
          {trailingLabel ? (
            <Text style={[styles.label, { color: theme.textMuted }]}>{trailingLabel}</Text>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.track,
          { height, borderRadius: radius.full, backgroundColor: theme.skeletonBase },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              borderRadius: radius.full,
              backgroundColor: color,
              opacity: shimmerOpacity,
              width: width.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {showPercentage && (
        <Text style={[styles.percent, { color: theme.textMuted }]}>
          {Math.round(clamped * 100)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  percent: {
    fontSize: fontSize.xs,
    marginTop: 4,
    textAlign: 'right',
  },
});

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { DARK_PALETTE, LIGHT_PALETTE } from '../theme/palette';

const TRACK_HEIGHT = 14;
const TRACK_BORDER = 1;
const INNER_HEIGHT = TRACK_HEIGHT - TRACK_BORDER * 2;
const WAVE_LENGTH = 22;
const WAVE_AMPLITUDE = 1.6;
const WAVE_BASELINE = 3.4;
const WAVE_PERIOD_MS = 2800;
const FILL_DURATION_MS = 700;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** Sine-like edge from x=0 to `width`, alternating crest and trough every half wavelength. */
function waveEdge(width: number, baseline: number, amplitude: number): string {
  const half = WAVE_LENGTH / 2;
  let d = `L0 ${baseline} Q${half / 2} ${baseline - amplitude} ${half} ${baseline}`;
  for (let x = half * 2; x <= width + half; x += half) {
    d += ` T${x} ${baseline}`;
  }
  return d;
}

/** Air above the liquid surface, painted in the track colour so it carves the wave. */
export function buildSurfaceCarvePath(width: number): string {
  const end = width + WAVE_LENGTH;
  return `M0 0 ${waveEdge(end, WAVE_BASELINE, WAVE_AMPLITUDE)} L${end + WAVE_LENGTH} 0 Z`;
}

/** A thin, lighter band riding just under the surface in the opposite phase. */
export function buildBackWavePath(width: number): string {
  const end = width + WAVE_LENGTH;
  const bottom = WAVE_BASELINE + WAVE_AMPLITUDE + 0.8;
  return `M0 ${bottom} ${waveEdge(end, WAVE_BASELINE - 0.6, -WAVE_AMPLITUDE)} L${
    end + WAVE_LENGTH
  } ${bottom} Z`;
}

function useMotionAllowed(): boolean | null {
  // null until the system preference has been read, so the first fill never
  // animates for someone who asked for reduced motion.
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [active, setActive] = useState(AppState.currentState !== 'background');

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (mounted) setReduceMotion(reduced);
    });
    const preference = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const appState = AppState.addEventListener('change', (state) =>
      setActive(state !== 'background')
    );
    return () => {
      mounted = false;
      preference?.remove();
      appState.remove();
    };
  }, []);

  if (reduceMotion === null) return null;
  return !reduceMotion && active;
}

export default function ParticipationFactorBar({
  percent,
  isDark,
  marks,
  label,
  valueText,
  neutralTrackColor,
  neutralTickColor,
  markerColor,
  markerBorderColor,
}: {
  percent: number | null;
  isDark: boolean;
  marks: readonly number[];
  label: string;
  valueText: string;
  neutralTrackColor: string;
  neutralTickColor: string;
  markerColor: string;
  markerBorderColor: string;
}): React.JSX.Element {
  const c = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const available = percent !== null;
  const gradientId = `fpLiquid${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const motionAllowed = useMotionAllowed();
  const fill = useRef(new Animated.Value(0)).current;
  const phase = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (percent === null) {
      fill.setValue(0);
      return;
    }
    if (motionAllowed === null) return;
    if (!motionAllowed) {
      fill.setValue(percent);
      return;
    }
    const animation = Animated.timing(fill, {
      toValue: percent,
      duration: FILL_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [percent, motionAllowed, fill]);

  const animateWaves = available && motionAllowed === true && trackWidth > 0;
  useEffect(() => {
    if (!animateWaves) {
      phase.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: WAVE_PERIOD_MS,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
        isInteraction: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animateWaves, phase]);

  const onTrackLayout = (event: LayoutChangeEvent): void => {
    setTrackWidth(Math.max(0, Math.round(event.nativeEvent.layout.width - TRACK_BORDER * 2)));
  };

  const fillWidth = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const markerOffset = percent === 0 ? 0 : percent === 100 ? -12 : -6;
  const waveWidth = trackWidth + WAVE_LENGTH * 2;

  return (
    <View
      testID='dashboard-rbi-factor-progress'
      accessible
      role='progressbar'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      aria-valuetext={valueText}
      aria-disabled={!available}
      accessibilityState={{ disabled: !available }}
      style={styles.trackArea}
    >
      <View
        testID='dashboard-rbi-factor-track'
        onLayout={onTrackLayout}
        style={[
          styles.track,
          available
            ? {
                backgroundColor: c.liquidProgressTrack,
                borderColor: c.liquidProgressTrackBorder,
                borderWidth: TRACK_BORDER,
              }
            : { backgroundColor: neutralTrackColor },
        ]}
      >
        {available && (
          <Animated.View
            testID='dashboard-rbi-factor-fill'
            pointerEvents='none'
            style={[styles.fill, { width: fillWidth }]}
          >
            <Svg width='100%' height='100%' viewBox='0 0 100 12' preserveAspectRatio='none'>
              <Defs>
                <LinearGradient id={gradientId} x1='0%' y1='0%' x2='100%' y2='0%'>
                  <Stop offset='0%' stopColor={c.liquidProgressFillStart} />
                  <Stop offset='100%' stopColor={c.liquidProgressFillEnd} />
                </LinearGradient>
              </Defs>
              <Rect width='100' height='12' fill={`url(#${gradientId})`} />
            </Svg>
            {trackWidth > 0 && (
              <>
                <Animated.View
                  testID='dashboard-rbi-factor-wave-front'
                  style={[
                    styles.wave,
                    {
                      width: waveWidth,
                      transform: [
                        {
                          translateX: phase.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -WAVE_LENGTH],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Svg width={waveWidth} height={INNER_HEIGHT}>
                    <Path d={buildSurfaceCarvePath(trackWidth)} fill={c.liquidProgressTrack} />
                  </Svg>
                </Animated.View>
                <Animated.View
                  testID='dashboard-rbi-factor-wave-back'
                  style={[
                    styles.wave,
                    {
                      width: waveWidth,
                      transform: [
                        {
                          translateX: phase.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-WAVE_LENGTH, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Svg width={waveWidth} height={INNER_HEIGHT}>
                    <Path d={buildBackWavePath(trackWidth)} fill={c.liquidProgressWave} />
                  </Svg>
                </Animated.View>
              </>
            )}
            <View style={[styles.shine, { backgroundColor: c.liquidProgressShine }]} />
          </Animated.View>
        )}
      </View>
      {marks.map((mark) => (
        <View
          key={mark}
          style={[
            styles.tick,
            {
              left: `${mark}%`,
              backgroundColor: available ? c.liquidProgressTick : neutralTickColor,
              opacity: available ? 1 : 0.78,
            },
          ]}
        />
      ))}
      {available && (
        <Animated.View
          testID='dashboard-rbi-factor-marker'
          style={[
            styles.marker,
            {
              left: fillWidth,
              borderColor: markerBorderColor,
              backgroundColor: markerColor,
              transform: [{ translateX: markerOffset }],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trackArea: {
    height: TRACK_HEIGHT + 8,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  wave: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: INNER_HEIGHT,
  },
  shine: {
    position: 'absolute',
    top: WAVE_BASELINE + WAVE_AMPLITUDE + 1.6,
    left: 3,
    right: 3,
    height: 1.5,
    borderRadius: 1,
  },
  tick: {
    position: 'absolute',
    width: 2,
    height: TRACK_HEIGHT,
    top: 4,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: TRACK_HEIGHT + 8,
    borderRadius: 6,
    borderWidth: 2,
  },
});

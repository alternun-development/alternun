import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TipsSliderProps } from './types';

/** Next index of an endless carousel (wraps both ways). */
export function wrapIndex(index: number, length: number): number {
  return length === 0 ? 0 : ((index % length) + length) % length;
}

/** Endless, auto-advancing carousel of tips and calls to action. */
export function TipsSlider({
  tips,
  palette,
  t,
  intervalMs = 5200,
}: TipsSliderProps): React.JSX.Element | null {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  const go = (step: number): void => {
    Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setIndex((current) => wrapIndex(current + step, tips.length));
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  useEffect(() => {
    if (!intervalMs || paused || tips.length < 2) return undefined;
    const timer = setInterval(() => go(1), intervalMs);
    return () => clearInterval(timer);
    // `go` only reads stable refs and setters, so it is left out of the dependencies.
  }, [intervalMs, paused, tips.length]);

  if (tips.length === 0) return null;
  const tip = tips[wrapIndex(index, tips.length)];
  const Icon = tip.icon;

  return (
    <View
      testID='explorer-tips'
      accessibilityLabel={t('explorer.tips.label')}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      style={[styles.slider, { backgroundColor: palette.fill }]}
    >
      <Animated.View testID={`explorer-tip-${tip.key}`} style={[styles.tip, { opacity: fade }]}>
        <Icon size={24} color='#1ee6b5' />
        <View style={styles.copy}>
          <Text style={styles.title}>{tip.title}</Text>
          <Text style={styles.text}>{tip.text}</Text>
          {tip.action ? (
            <Pressable
              testID={`explorer-tip-${tip.key}-action`}
              accessibilityRole='button'
              onPress={tip.action.onPress}
              style={styles.action}
            >
              <Text style={styles.actionText}>{tip.action.label}</Text>
              <ArrowUpRight size={14} color='#1ee6b5' strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {tips.map((item, dot) => (
            <View
              key={item.key}
              style={[styles.dot, dot === wrapIndex(index, tips.length) && styles.dotActive]}
            />
          ))}
        </View>
        <View style={styles.nav}>
          <Pressable
            testID='explorer-tips-previous'
            accessibilityRole='button'
            accessibilityLabel={t('explorer.tips.previous')}
            hitSlop={6}
            onPress={() => go(-1)}
            style={styles.navButton}
          >
            <ChevronLeft size={16} color='#effff6' />
          </Pressable>
          <Pressable
            testID='explorer-tips-next'
            accessibilityRole='button'
            accessibilityLabel={t('explorer.tips.next')}
            hitSlop={6}
            onPress={() => go(1)}
            style={styles.navButton}
          >
            <ChevronRight size={16} color='#effff6' />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slider: { borderRadius: 22, padding: 18, gap: 14, overflow: 'hidden' },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, minHeight: 74 },
  copy: { flex: 1, gap: 4 },
  title: { color: '#effff6', fontSize: 15, fontWeight: '800' },
  text: { color: 'rgba(239,255,246,0.72)', fontSize: 13, lineHeight: 19 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  actionText: { color: '#1ee6b5', fontSize: 13, fontWeight: '900' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(239,255,246,0.28)' },
  dotActive: { width: 18, backgroundColor: '#1ee6b5' },
  nav: { flexDirection: 'row', gap: 6 },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,255,246,0.1)',
  },
});

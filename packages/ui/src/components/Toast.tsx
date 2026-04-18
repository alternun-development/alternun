import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { radius, fontSize, spacing } from '../tokens/spacing';
import { palette } from '../tokens/colors';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

const TYPE_ACCENT: Record<ToastType, string> = {
  success: palette.teal,
  error: palette.error,
  info: palette.info,
  warning: palette.warning,
};

interface ToastProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ item, onDismiss }: ToastProps) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  function dismiss() {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 80, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss(item.id));
  }

  const accent = TYPE_ACCENT[item.type];

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity onPress={dismiss} activeOpacity={0.85} style={styles.inner}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.body}>
          <Text style={styles.title}>{item.title}</Text>
          {item.message ? <Text style={styles.message}>{item.message}</Text> : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ToastSystemProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastSystem({ toasts, onDismiss }: ToastSystemProps) {
  return (
    <View style={styles.system} pointerEvents='box-none'>
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  system: {
    position: 'absolute',
    bottom: 32,
    left: spacing[4],
    right: spacing[4],
    gap: 8,
    zIndex: 9999,
  },
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  inner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,10,24,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  title: {
    color: '#e8e8ff',
    fontSize: fontSize.base,
    fontWeight: '600',
    fontFamily: 'Sculpin-Bold',
  },
  message: {
    color: 'rgba(232,232,255,0.65)',
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});

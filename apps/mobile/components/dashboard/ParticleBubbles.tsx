import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Particle {
  id: number;
}

interface FloatingParticleProps {
  id: number;
  color: string;
  containerWidth: number;
  containerHeight: number;
  onDone: (id: number) => void;
}

// ─── FloatingParticle ─────────────────────────────────────────────────────────

function FloatingParticle({
  id,
  color,
  containerWidth,
  containerHeight,
  onDone,
}: FloatingParticleProps) {
  const isMounted = useRef(true);

  // Randomise characteristics on mount
  const params = useRef({
    x: Math.random() * containerWidth,
    scale: 0.4 + Math.random() * 1.6,
    siner: 20 + Math.random() * 60,
    rotDir: Math.random() < 0.5 ? 1 : -1,
    speed: (1 + Math.random()) * 0.09,
    size: 20 + Math.floor(Math.random() * 15),
  }).current;

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMounted.current = true;

    // duration derived from speed: higher speed → shorter duration
    // at 60fps, containerHeight + size pixels at `speed` px/frame
    const totalDist = containerHeight + params.size * 2;
    const framesNeeded = totalDist / params.speed;
    const duration = (framesNeeded / 60) * 1000;

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    anim.start(({ finished }) => {
      if (finished && isMounted.current) {
        onDone(id);
      }
    });

    return () => {
      isMounted.current = false;
      anim.stop();
    };
  }, []); // intentional: run only on mount

  // Build 41-keyframe sine-wave translateX output range
  const steps = containerHeight / 2;
  const totalDist = containerHeight + params.size * 2;
  const KEYFRAME_COUNT = 41;
  const xInputRange: number[] = [];
  const xOutputRange: number[] = [];
  for (let i = 0; i < KEYFRAME_COUNT; i++) {
    const t = i / (KEYFRAME_COUNT - 1);
    xInputRange.push(t);
    const position = containerHeight + params.size - t * totalDist;
    const x = params.x + Math.sin((position * Math.PI) / steps) * params.siner;
    xOutputRange.push(x);
  }

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [containerHeight + params.size, -params.size],
  });

  const translateX = progress.interpolate({
    inputRange: xInputRange,
    outputRange: xOutputRange,
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${params.rotDir * 360}deg`],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 0.6, 0.6, 0],
  });

  return (
    <Animated.View
      pointerEvents='none'
      style={[
        styles.particle,
        {
          width: params.size,
          height: params.size,
          borderRadius: params.size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }, { scale: params.scale }],
        },
      ]}
    />
  );
}

// ─── ParticleBubbles ──────────────────────────────────────────────────────────

interface ParticleBubblesProps {
  color?: string;
  interval?: number;
}

let particleIdCounter = 0;

export default function ParticleBubbles({
  color = 'rgba(28,203,161,0.28)',
  interval = 220,
}: ParticleBubblesProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  const handleDone = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;

    const MAX_PARTICLES = 12;
    const timer = setInterval(() => {
      setParticles((prev) => {
        if (prev.length >= MAX_PARTICLES) return prev;
        particleIdCounter += 1;
        return [...prev, { id: particleIdCounter }];
      });
    }, interval);

    return () => clearInterval(timer);
  }, [containerSize.width, containerSize.height, interval]);

  return (
    <View style={styles.container} onLayout={onLayout} pointerEvents='none'>
      {containerSize.width > 0 &&
        containerSize.height > 0 &&
        particles.map((p) => (
          <FloatingParticle
            key={p.id}
            id={p.id}
            color={color}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onDone={handleDone}
          />
        ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

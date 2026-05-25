import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView as BlurViewRaw } from 'expo-blur';
import {
  LayoutDashboard,
  ShieldCheck,
  Leaf,
  CircleUserRound,
  type LucideProps,
} from 'lucide-react-native';
import type { FC } from 'react';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';

const BlurView = BlurViewRaw as unknown as React.FC<React.ComponentProps<typeof BlurViewRaw>>;

export type DockTab = 'dashboard' | 'portafolio' | 'explorar' | 'mi-perfil';

interface DockItem {
  key: DockTab;
  label: string;
  icon: FC<LucideProps>;
}

const DOCK_ITEMS: DockItem[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard as FC<LucideProps> },
  { key: 'portafolio', label: 'Portfolio', icon: ShieldCheck as FC<LucideProps> },
  { key: 'explorar', label: 'Explore', icon: Leaf as FC<LucideProps> },
  { key: 'mi-perfil', label: 'Profile', icon: CircleUserRound as FC<LucideProps> },
];

export const DOCK_HEIGHT = 64;

interface BottomDockProps {
  activeTab: DockTab;
  onChangeTab: (tab: DockTab) => void;
  isDark: boolean;
}

export function BottomDock({ activeTab, onChangeTab, isDark }: BottomDockProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const paddingBottom = Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom,
          height: DOCK_HEIGHT + paddingBottom,
          borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(11,45,49,0.10)',
        },
      ]}
      pointerEvents='box-none'
    >
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={isDark ? 60 : 50}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(10,10,24,0.82)' : 'rgba(230,239,245,0.85)',
          },
        ]}
        pointerEvents='none'
      />

      <View style={styles.row} pointerEvents='box-none'>
        {DOCK_ITEMS.map((item) => (
          <DockButton
            key={item.key}
            item={item}
            isActive={activeTab === item.key}
            isDark={isDark}
            onPress={() => onChangeTab(item.key)}
          />
        ))}
      </View>
    </View>
  );
}

function DockButton({
  item,
  isActive,
  isDark,
  onPress,
}: {
  item: DockItem;
  isActive: boolean;
  isDark: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(glowAnim, {
        toValue: isActive ? 1 : 0,
        useNativeDriver: false,
        speed: 20,
        bounciness: 10,
      }),
    ]).start();
  }, [isActive, glowAnim]);

  const handlePressIn = (): void => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 30,
      bounciness: 12,
    }).start();
  };

  const handlePressOut = (): void => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 14,
    }).start();
  };

  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const mutedColor = isDark ? 'rgba(232,232,255,0.42)' : 'rgba(11,45,49,0.42)';
  const iconColor = isActive ? accent : mutedColor;

  const IconComponent = item.icon;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.buttonOuter}
      accessibilityRole='tab'
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      <Animated.View style={[styles.buttonInner, { transform: [{ scale: scaleAnim }] }]}>
        {/* Active glow pill */}
        <Animated.View
          style={[
            styles.activePill,
            {
              opacity: glowAnim,
              backgroundColor: isDark ? 'rgba(30,230,181,0.13)' : 'rgba(13,148,136,0.12)',
            },
          ]}
          pointerEvents='none'
        />

        <IconComponent size={22} color={iconColor} strokeWidth={isActive ? 2.4 : 1.8} />

        <Text
          style={[
            styles.label,
            {
              color: iconColor,
              fontWeight: isActive ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>

        {/* Active dot indicator */}
        {isActive && <View style={[styles.activeDot, { backgroundColor: accent }]} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  buttonOuter: {
    flex: 1,
    alignItems: 'center',
  },
  buttonInner: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 56,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  label: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

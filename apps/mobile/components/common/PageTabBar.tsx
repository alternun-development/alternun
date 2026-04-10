import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Platform } from 'react-native';
import type { LucideProps } from 'lucide-react-native';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.FC<LucideProps>;
}

interface PageTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onChangeTab: (key: string) => void;
  isDark: boolean;
  accent: string;
  muted: string;
}

export function PageTabBar({
  tabs,
  activeTab,
  onChangeTab,
  isDark,
  accent,
  muted,
}: PageTabBarProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TabButton
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            isActive={isActive}
            accent={accent}
            muted={muted}
            isDark={isDark}
            isLargeScreen={isLargeScreen}
            onPress={() => onChangeTab(tab.key)}
          />
        );
      })}
    </View>
  );
}

function TabButton({
  label,
  icon: IconComponent,
  isActive,
  accent,
  muted,
  isDark,
  isLargeScreen,
  onPress,
}: {
  label: string;
  icon?: React.FC<LucideProps>;
  isActive: boolean;
  accent: string;
  muted: string;
  isDark: boolean;
  isLargeScreen: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);

  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;
  const underlineScaleAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1 : 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }),
      Animated.spring(opacityAnim, {
        toValue: isActive ? 1 : 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 5,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: isActive ? 0.85 : 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }),
      Animated.spring(underlineScaleAnim, {
        toValue: isActive ? 1 : 0,
        useNativeDriver: false,
        speed: 18,
        bounciness: 8,
      }),
    ]).start();
  }, [isActive, scaleAnim, opacityAnim, iconScaleAnim, underlineScaleAnim]);

  const handleMouseEnter = (): void => {
    if (!isLargeScreen && !isActive && Platform.OS === 'web') {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = (): void => {
    if (Platform.OS === 'web') {
      setShowTooltip(false);
    }
  };

  const bgColor = isActive ? `${accent}18` : 'transparent';
  const borderColor = isActive ? `${accent}44` : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.08)';
  const iconColor = isActive ? accent : muted;

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          onPress();
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        activeOpacity={0.6}
        style={[
          styles.tab,
          {
            backgroundColor: bgColor,
            borderColor,
          },
        ]}
      >
        <View style={styles.tabContent}>
          {IconComponent && (
            <Animated.View
              style={{
                transform: [{ scale: iconScaleAnim }],
              }}
            >
              <IconComponent size={18} color={iconColor} strokeWidth={2.2} />
            </Animated.View>
          )}

          {(isActive || isLargeScreen) && (
            <Animated.View
              style={[
                styles.labelWrapper,
                {
                  opacity: isLargeScreen && !isActive ? 1 : opacityAnim,
                  transform: [{ scaleX: isLargeScreen && !isActive ? 1 : scaleAnim }],
                },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? accent : muted,
                    fontWeight: isActive ? '700' : '500',
                    marginLeft: 6,
                  },
                ]}
              >
                {label}
              </Text>
            </Animated.View>
          )}
        </View>

        {isActive && (
          <Animated.View
            style={[
              styles.activeUnderline,
              {
                backgroundColor: accent,
                transform: [{ scaleX: underlineScaleAnim }],
              },
            ]}
          />
        )}
      </TouchableOpacity>

      {showTooltip && !isLargeScreen && !isActive && (
        <View
          style={[
            styles.tooltip,
            {
              backgroundColor: isDark ? 'rgba(10,10,10,1)' : 'rgba(0,0,0,1)',
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
            },
          ]}
        >
          <Text
            style={[
              styles.tooltipText,
              {
                color: '#fff',
              },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 6,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  labelWrapper: {
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    marginLeft: -45,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 9999,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

import { Shield, Trophy, type LucideProps } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export interface ColorPalette {
  bg: string;
  cardBg: string;
  cardBorder: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}

export interface AchievementDef {
  key: string;
  label: string;
  color: string;
  icon: React.FC<LucideProps>;
  unlocked: boolean;
  unlockedAt?: string | null;
}

const ShieldCheckIcon = Shield as React.FC<LucideProps>;
const TrophyIcon = Trophy as React.FC<LucideProps>;

export const ACHIEVEMENT_CATALOG = {
  account_confirmed: {
    label: 'Cuenta Verificada',
    color: '#1EE6B5',
    icon: ShieldCheckIcon,
  },
  first_10_airs: {
    label: '10 AIRS',
    color: '#d4b96a',
    icon: TrophyIcon,
  },
};

export function AchievementBadge({
  def,
  onPress,
}: {
  def: AchievementDef;
  onPress?: () => void;
}): React.JSX.Element {
  const Icon = def.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        alignItems: 'center',
        width: '25%',
        maxWidth: 75,
        paddingHorizontal: 4,
      }}
    >
      {/* Badge Container with Glow Effect */}
      <View
        style={{
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer Glow */}
        <View
          style={{
            position: 'absolute',
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: def.color,
            opacity: def.unlocked ? 0.15 : 0.05,
          }}
        />

        {/* Main Badge */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: def.unlocked ? def.color : 'rgba(255,255,255,0.1)',
            borderWidth: 2,
            borderColor: def.unlocked ? `${def.color}99` : 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Inner Shine */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              backgroundColor: 'white',
              opacity: def.unlocked ? 0.12 : 0.06,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          />

          {/* Icon Container */}
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              backgroundColor: def.unlocked ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)',
              width: 48,
              height: 48,
              borderRadius: 12,
            }}
          >
            <Icon
              size={22}
              color={def.unlocked ? '#fff' : 'rgba(255,255,255,0.4)'}
              strokeWidth={2}
            />
          </View>

          {/* Unlock Star */}
          {def.unlocked && (
            <View
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: def.color,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#050510',
              }}
            >
              <Text style={{ fontSize: 12, color: '#050510', fontWeight: '900' }}>★</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function AchievementTooltip({
  visible,
  label,
  color,
  isDark,
  _c,
}: {
  visible: boolean;
  label: string;
  color: string;
  isDark: boolean;
  _c?: ColorPalette;
}): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        backgroundColor: isDark ? 'rgba(5,5,16,0.95)' : 'rgba(240,253,249,0.95)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color,
        zIndex: 1000,
        minWidth: 120,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color,
          textAlign: 'center',
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

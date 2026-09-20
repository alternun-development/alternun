import { Shield, Trophy, type LucideProps } from 'lucide-react-native';
import React, { useState } from 'react';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { useAppTranslation } from '../i18n/useAppTranslation';
import { ACHIEVEMENT_ARTWORK, LOCKED_ACHIEVEMENT_ARTWORK, LOCKED_BADGE } from './badgeAssets';

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

export const AIRS_MILESTONES: Record<string, number> = {
  first_10_airs: 10,
  fifty_airs: 50,
  first_100_airs: 100,
  first_500_airs: 500,
  first_1000_airs: 1000,
  first_5000_airs: 5000,
  first_10000_airs: 10000,
  first_50000_airs: 50000,
};

export function isAchievementUnlocked(key: string, score: number | null, earned: boolean): boolean {
  const threshold = AIRS_MILESTONES[key];
  return (
    earned || (threshold != null && score != null && Number.isFinite(score) && score >= threshold)
  );
}

export const ACHIEVEMENT_CATALOG = {
  first_10_airs: { label: '10 AIRS', color: '#d4b96a', icon: TrophyIcon },
  fifty_airs: { label: '50 AIRS', color: '#d4b96a', icon: TrophyIcon },
  first_100_airs: { label: '100 AIRS', color: '#d4b96a', icon: TrophyIcon },
  first_500_airs: { label: '500 AIRS', color: '#d4b96a', icon: TrophyIcon },
  first_1000_airs: { label: '1,000 AIRS', color: '#d4b96a', icon: TrophyIcon },
  first_5000_airs: { label: '5,000 AIRS', color: '#d4b96a', icon: TrophyIcon },
  first_10000_airs: { label: '10,000 AIRS', color: '#d4b96a', icon: TrophyIcon },
  first_50000_airs: { label: '50,000 AIRS', color: '#d4b96a', icon: TrophyIcon },

  account_confirmed: {
    label: 'Cuenta Verificada',
    color: '#1EE6B5',
    icon: ShieldCheckIcon,
  },
  first_regenerative_action: {
    label: 'Acción Verde',
    color: '#1EE6B5',
    icon: ShieldCheckIcon,
  },
  five_regenerative_actions: {
    label: '5 Acciones',
    color: '#00d084',
    icon: ShieldCheckIcon,
  },
  first_commerce_action: {
    label: 'Aliado Comercial',
    color: '#ff6b6b',
    icon: TrophyIcon,
  },
  profile_complete: {
    label: 'Perfil Completo',
    color: '#845ef7',
    icon: ShieldCheckIcon,
  },
  bio_added: {
    label: 'Biografía',
    color: '#748ffc',
    icon: ShieldCheckIcon,
  },
  avatar_uploaded: {
    label: 'Avatar',
    color: '#a8e6cf',
    icon: ShieldCheckIcon,
  },
  wallet_connected: {
    label: 'Cartera Conectada',
    color: '#ffa07a',
    icon: TrophyIcon,
  },
  seven_day_streak: {
    label: '7 Días',
    color: '#ff8787',
    icon: TrophyIcon,
  },
  referral_invited: {
    label: 'Invita Amigos',
    color: '#ce93d8',
    icon: TrophyIcon,
  },
  ambassador: {
    label: 'Embajador',
    color: '#e91e63',
    icon: ShieldCheckIcon,
  },
};

export function AchievementBadge({
  def,
  onPress,
  textColor = '#637875',
}: {
  def: AchievementDef;
  onPress?: () => void;
  textColor?: string;
}): React.JSX.Element {
  const Icon = def.icon;
  const [loadedSource, setLoadedSource] = useState<unknown>(null);
  const source = def.unlocked
    ? ACHIEVEMENT_ARTWORK[def.key]
    : LOCKED_ACHIEVEMENT_ARTWORK[def.key] ?? LOCKED_BADGE;
  const amount = AIRS_MILESTONES[def.key];
  const { t } = useAppTranslation('mobile');

  return (
    <TouchableOpacity
      accessibilityRole='button'
      accessibilityLabel={def.label}
      accessibilityValue={{
        text: def.unlocked
          ? t('profile.achievementUnlocked', undefined, 'Unlocked')
          : t('profile.achievementLocked', undefined, 'Locked'),
      }}
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        alignItems: 'center',
        width: '25%',
        maxWidth: 75,
        paddingHorizontal: 4,
      }}
    >
      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        {!def.unlocked || ACHIEVEMENT_ARTWORK[def.key] ? (
          <>
            {amount != null && loadedSource !== source && (
              <Svg
                width={64}
                height={64}
                viewBox='0 0 64 64'
                style={{ position: 'absolute' }}
                accessible={false}
              >
                <Path
                  d='M 4 44 L 44 4 C 51 -3 62 2 62 13 L 62 49 Q 62 62 49 62 L 14 62 Q -2 62 4 44 Z'
                  fill={def.unlocked ? '#10dbb1' : '#aaa'}
                  stroke={def.unlocked ? '#1c6c70' : '#555'}
                  strokeWidth={2}
                />
                <SvgText
                  x={55}
                  y={53}
                  textAnchor='end'
                  fontSize={amount >= 1000 ? 17 : 20}
                  fontWeight='700'
                  fill='#3c5553'
                >
                  {amount >= 5000 ? `${amount / 1000}k` : amount}
                </SvgText>
              </Svg>
            )}
            <Image
              source={source}
              onLoad={() => setLoadedSource(source)}
              onError={() => setLoadedSource(null)}
              resizeMode='contain'
              style={{ width: 64, height: 64 }}
              accessible={false}
            />
          </>
        ) : (
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: `${def.color}20`,
              borderWidth: 1,
              borderColor: def.color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={26} color={def.color} strokeWidth={2} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={2}
        style={{
          marginTop: 6,
          fontSize: 10,
          lineHeight: 13,
          textAlign: 'center',
          color: textColor,
        }}
      >
        {def.label}
      </Text>
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

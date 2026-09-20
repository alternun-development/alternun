import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Check, type LucideProps } from 'lucide-react-native';
import { GlassCard, resolveTier, TIERS, type AirsTier } from '@alternun/ui';
import { useAppTranslation } from '../i18n/useAppTranslation';
import type { ColorPalette } from './AchievementBadge';
import { STATUS_BADGES } from './badgeAssets';
import { TierDetailsModal } from './TierDetailsModal';

const CheckIcon = Check as React.FC<LucideProps>;

export function TierJourney({
  score,
  isDark,
  c,
}: {
  score: number | null;
  isDark: boolean;
  c: ColorPalette;
}): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [selectedTier, setSelectedTier] = useState<AirsTier | null>(null);
  const hasScore = score !== null;
  const safeScore = score ?? 0;
  const tiers = (Object.keys(TIERS) as AirsTier[]).map((id) => ({
    id,
    label: t(`profile.tierLabels.${id}`, undefined, TIERS[id].label),
    threshold: TIERS[id].min,
    color: TIERS[id].color,
  }));
  const currentIdx = hasScore
    ? tiers.findIndex((tierItem) => tierItem.id === resolveTier(safeScore))
    : -1;

  const openDetailsLabel = t(
    'profile.tierDetails.open',
    undefined,
    'View tier details and benefits'
  );

  return (
    <GlassCard
      style={{
        margin: 12,
        padding: 18,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.12,
          color: c.muted,
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        {t('profile.tierJourney', undefined, 'Tier Journey')}
      </Text>

      <View style={{ position: 'relative', height: 120 }}>
        {/* Track background */}
        <View
          style={{
            position: 'absolute',
            top: 26,
            left: 14,
            right: 14,
            height: 3,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.08)',
            borderRadius: 999,
          }}
        />

        {/* Track fill */}
        <View
          style={{
            position: 'absolute',
            top: 26,
            left: 14,
            right: 14,
            height: 3,
            borderRadius: 999,
            backgroundColor: '#d4b96a',
            width: `${(Math.max(currentIdx + 1, 0) / tiers.length) * 100}%`,
          }}
        />

        {/* Tier nodes */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {tiers.map((t, i) => {
            const reached = i <= currentIdx;
            return (
              <TouchableOpacity
                key={t.id}
                accessibilityRole='button'
                accessibilityLabel={t.label}
                accessibilityHint={openDetailsLabel}
                onPress={() => setSelectedTier(t.id)}
                activeOpacity={0.75}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  zIndex: 1,
                }}
              >
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    overflow: 'hidden',
                    backgroundColor: isDark ? '#0d0d1f' : '#ffffff',
                  }}
                >
                  {STATUS_BADGES[t.id] ? (
                    <Image
                      source={STATUS_BADGES[t.id]}
                      accessible={false}
                      resizeMode='contain'
                      style={{ width: 54, height: 54, opacity: reached ? 1 : 0.35 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                        backgroundColor: reached ? t.color : 'transparent',
                        borderWidth: 2,
                        borderColor: reached
                          ? t.color
                          : isDark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(11,45,49,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {i === currentIdx && reached ? (
                        <CheckIcon size={14} color='#050510' strokeWidth={3} />
                      ) : (
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: reached ? '#050510' : c.muted,
                          }}
                        >
                          {i + 1}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: reached ? c.text : c.muted,
                    marginTop: 6,
                  }}
                >
                  {t.label}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: c.muted,
                    fontFamily: 'monospace',
                    marginTop: 2,
                  }}
                >
                  {t.threshold >= 1000 ? `${(t.threshold / 1000).toFixed(0)}K` : t.threshold}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <TierDetailsModal tier={selectedTier} score={score} onClose={() => setSelectedTier(null)} />
    </GlassCard>
  );
}

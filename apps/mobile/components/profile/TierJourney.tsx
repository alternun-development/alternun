import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Check, type LucideProps } from 'lucide-react-native';
import { GlassCard, resolveTier, TIERS, type AirsTier } from '@alternun/ui';
import { useAppTranslation } from '../i18n/useAppTranslation';
import type { ColorPalette } from './AchievementBadge';
import { STATUS_BADGES } from './badgeAssets';
import { TierDetailsModal } from './TierDetailsModal';
import { tierLinePosition } from './tierJourneyPosition';
import { useAppPreferences } from '../settings/AppPreferencesProvider';

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
  const [selectedTier, setSelectedTier] = useState<AirsTier | 'green' | null>(null);
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
  // The live dot marks the person's Airs on the line; the fill runs up to it.
  const [lineWidth, setLineWidth] = useState(0);
  const markerX = tierLinePosition(
    safeScore,
    lineWidth,
    tiers.map((tierItem) => tierItem.threshold)
  );
  const { motionLevel } = useAppPreferences();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!hasScore || motionLevel === 'off') {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hasScore, motionLevel, pulse]);
  const markerColor = currentIdx >= 0 ? tiers[currentIdx].color : '#1de9b6';
  // The dot opens the person's own status (Green below Bronze), with their balance and what is
  // left for the next tier; the stretch before Bronze is Green.
  const currentTier = hasScore ? resolveTier(safeScore) : null;
  const currentStatus: AirsTier | 'green' = currentTier ?? 'green';
  const firstNodeX = lineWidth > 0 ? lineWidth / (2 * tiers.length) : 0;
  const airsLabel = t(
    'profile.tierJourneyAirs',
    { amount: safeScore.toLocaleString() },
    `${safeScore.toLocaleString()} Airs`
  );

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
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.12,
            color: c.muted,
            textTransform: 'uppercase',
          }}
        >
          {t('profile.tierJourney', undefined, 'Tier Journey')}
        </Text>
        {hasScore ? (
          <Text
            testID='tier-journey-airs'
            style={{ fontSize: 12, fontWeight: '800', color: markerColor }}
          >
            {airsLabel}
          </Text>
        ) : null}
      </View>

      <View
        style={{ position: 'relative', height: 120 }}
        onLayout={(event) => setLineWidth(Math.floor(event.nativeEvent.layout.width))}
      >
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
            backgroundColor: markerColor,
            width: hasScore && lineWidth > 0 ? Math.max(0, markerX - 14) : 0,
          }}
        />

        {/* Before Bronze: the stretch from the start of the line to the first node */}
        {hasScore && lineWidth > 0 ? (
          <Pressable
            testID='tier-journey-before-first'
            accessibilityRole='button'
            accessibilityLabel={airsLabel}
            accessibilityHint={openDetailsLabel}
            onPress={() => setSelectedTier('green')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: Math.max(0, firstNodeX - 27),
              height: 56,
              zIndex: 3,
            }}
          />
        ) : null}

        {/* Live position of the person's Airs */}
        {hasScore && lineWidth > 0 ? (
          <Pressable
            testID='tier-journey-marker'
            accessibilityRole='button'
            accessibilityLabel={airsLabel}
            accessibilityHint={openDetailsLabel}
            onPress={() => setSelectedTier(currentStatus)}
            hitSlop={10}
            style={{
              position: 'absolute',
              top: 27.5 - 9,
              left: markerX - 9,
              width: 18,
              height: 18,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: markerColor,
                opacity: Animated.multiply(pulse, 0.35),
                transform: [{ scale: Animated.add(1.6, Animated.multiply(pulse, -0.6)) }],
              }}
            />
            <Animated.View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: markerColor,
                borderWidth: 2,
                borderColor: isDark ? '#0d0d1f' : '#ffffff',
                opacity: Animated.add(0.45, Animated.multiply(pulse, 0.55)),
              }}
            />
          </Pressable>
        ) : null}

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

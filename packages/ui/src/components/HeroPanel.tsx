/**
 * HeroPanel — Alternun Design System
 *
 * Full-width hero section for the Airs dashboard. Displays:
 *   - Personalised greeting
 *   - Regenerative score (large)
 *   - Status tier badge (Bronze → Silver → Gold → Platinum)
 *   - Progress bar to next tier with contextual hint
 *
 * Usage:
 *   <HeroPanel
 *     displayName="José Santiago"
 *     score={12480}
 *     brandMark={<AirsBrandMark size={40} fillColor={palette.teal} cutoutColor="#050f0c" />}
 *     isDark
 *   />
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RotateCcw, Info, type LucideProps } from 'lucide-react-native';
import { palette } from '../tokens/colors';
import { fontSize, radius, spacing } from '../tokens/spacing';
import { ProgressBar } from './ProgressBar';
import {
  ScoreNumberSkeleton,
  StatusBadgeSkeleton,
  ProgressNumbersSkeleton,
  ProgressPercentageSkeleton,
  SkeletonLoader,
} from './SkeletonLoader';
import { ThemeProvider } from '../theme/ThemeContext';
import { useTooltip } from './Tooltip';

// ─── Tier system ──────────────────────────────────────────────────────────────

export type AirsTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierSpec {
  label: string;
  /** Primary foreground colour for text/dot */
  color: string;
  /** Semi-transparent badge border / progress track overlay */
  trackColor: string;
  min: number;
  max: number | null;
  next: AirsTier | null;
  nextLabel: string | null;
}

export const TIERS: Record<AirsTier, TierSpec> = {
  bronze: {
    label: 'Bronze',
    color: '#cd7f32',
    trackColor: 'rgba(205,127,50,0.28)',
    min: 0,
    max: 1_000,
    next: 'silver',
    nextLabel: 'Silver',
  },
  silver: {
    label: 'Silver',
    color: palette.statusSilver,
    trackColor: 'rgba(168,184,204,0.28)',
    min: 1_000,
    max: 5_000,
    next: 'gold',
    nextLabel: 'Gold',
  },
  gold: {
    label: 'Gold',
    color: palette.statusGold,
    trackColor: 'rgba(212,185,106,0.28)',
    min: 5_000,
    max: 20_000,
    next: 'platinum',
    nextLabel: 'Platinum',
  },
  platinum: {
    label: 'Platinum',
    color: palette.statusPlatinum,
    trackColor: 'rgba(155,169,196,0.28)',
    min: 20_000,
    max: null,
    next: null,
    nextLabel: null,
  },
};

/** Resolve the tier for a given score. */
export function resolveTier(score: number): AirsTier {
  if (score >= 20_000) return 'platinum';
  if (score >= 5_000) return 'gold';
  if (score >= 1_000) return 'silver';
  return 'bronze';
}

function fmtScore(n: number): string {
  return n.toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface HeroPanelProps {
  /** Shown as "Hola, {firstName}" — only the first word is used. */
  displayName?: string;
  /** Total Airs earned. Pass `null` while loading. */
  score: number | null;
  /** Renders skeleton-safe placeholders when true. */
  isLoading?: boolean;
  /** Called when user taps the reload button (top-right). If not provided, no reload button is shown. */
  onReload?: () => void;
  /** Hides score / tier when user is not signed in. */
  previewMode?: boolean;
  /** ISO date string for the "last updated" line. */
  updatedAt?: string;
  /**
   * Slot for the brand mark icon rendered next to the score.
   * Example: `<AirsBrandMark size={40} fillColor={palette.teal} cutoutColor="#050f0c" />`
   */
  brandMark?: React.ReactNode;
  isDark?: boolean;
  /** When false, ambient orb animations are skipped and orbs render statically. Default: true. */
  animateOrbs?: boolean;
  /** Validity end date for status tier (ISO string). Shows in info tooltip. */
  tierValidUntil?: string;
}

export function HeroPanel({
  displayName,
  score,
  isLoading = false,
  onReload,
  previewMode = false,
  updatedAt: _updatedAt,
  brandMark,
  isDark = true,
  animateOrbs = true,
  tierValidUntil,
}: HeroPanelProps): React.JSX.Element {
  const safeScore = score ?? 0;
  const tier = previewMode || score == null ? 'bronze' : resolveTier(safeScore);
  const tierSpec = TIERS[tier];

  // Compute last updated time: use provided updatedAt or fallback to now (initial load)
  const lastUpdatedAt = _updatedAt ?? new Date().toISOString();

  const progressPct = useMemo(() => {
    if (tierSpec.max == null || previewMode || score == null) return 0;
    return Math.min((safeScore - tierSpec.min) / (tierSpec.max - tierSpec.min), 1);
  }, [safeScore, tier, tierSpec, previewMode, score]);
  const showProgressSection =
    tierSpec.max != null && tierSpec.next != null && !previewMode && (isLoading || score != null);
  const progressMax = tierSpec.max ?? 0;
  const progressNextLabel = tierSpec.nextLabel ?? '';

  const firstName = displayName?.trim().split(/\s+/)[0] ?? '';

  // ─── Palette ─────────────────────────────────────────────────────────────────
  const textPrimary = isDark ? '#ffffff' : '#0b2d31';
  const textMuted = isDark ? 'rgba(255,255,255,0.60)' : 'rgba(11,45,49,0.62)';
  const heroBg = isDark ? '#050f0c' : '#eaf8f3';
  const orbA = isDark ? 'rgba(28,203,161,0.11)' : 'rgba(28,203,161,0.08)';
  const orbB = isDark ? 'rgba(11,90,95,0.20)' : 'rgba(11,90,95,0.06)';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.10)';
  const accentColor = isDark ? palette.teal : palette.tealDark;

  // ─── Orb float animations ─────────────────────────────────────────────────
  const orbTR = useRef(new Animated.Value(0)).current;
  const orbBL = useRef(new Animated.Value(0)).current;
  const reloadRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animateOrbs) return;

    const makeFloat = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );

    const a1 = makeFloat(orbTR, 5800);
    const a2 = makeFloat(orbBL, 7200);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [orbTR, orbBL, animateOrbs]);

  // Reload button spin animation
  useEffect(() => {
    if (!isLoading) {
      reloadRotation.setValue(0);
      return;
    }

    const spin = Animated.loop(
      Animated.timing(reloadRotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [isLoading, reloadRotation]);

  const orbTRStyle = {
    transform: [
      { translateX: orbTR.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) },
      { translateY: orbTR.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
    ],
  };

  const orbBLStyle = {
    transform: [
      { translateX: orbBL.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
      { translateY: orbBL.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
    ],
  };

  const reloadRotateStyle = {
    transform: [
      {
        rotate: reloadRotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  // Cast icon for React Native compatibility
  const ReloadIcon = RotateCcw as React.FC<LucideProps>;
  const InfoIcon = Info as React.FC<LucideProps>;

  // Tooltip for status tier info
  const { isVisible: showStatusTooltip, toggle: toggleStatusTooltip } = useTooltip(false);

  const formatDate = (isoString?: string): string => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch {
      return 'N/A';
    }
  };

  const statusTooltipContent = (
    <View style={styles.tooltipContent}>
      <Text style={[styles.tooltipLabel, { color: accentColor }]}>Información de estado</Text>
      <View style={styles.tooltipDivider} />
      <View style={styles.tooltipLine}>
        <Text style={[styles.tooltipKey, { color: textMuted }]}>Actualizado:</Text>
        <Text style={[styles.tooltipValue, { color: textPrimary }]}>
          {formatDate(lastUpdatedAt)}
        </Text>
      </View>
      {tierValidUntil && (
        <View style={styles.tooltipLine}>
          <Text style={[styles.tooltipKey, { color: textMuted }]}>Válido hasta:</Text>
          <Text style={[styles.tooltipValue, { color: textPrimary }]}>
            {formatDate(tierValidUntil)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ThemeProvider mode={isDark ? 'dark' : 'light'}>
      <View style={[styles.container, { backgroundColor: heroBg }]}>
        {/* Decorative ambient orbs — top-right + bottom-left */}
        <Animated.View
          pointerEvents='none'
          style={[styles.orbTR, { backgroundColor: orbA }, orbTRStyle]}
        />
        <Animated.View
          pointerEvents='none'
          style={[styles.orbBL, { backgroundColor: orbB }, orbBLStyle]}
        />

        {/* Reload button (top-right) — shown when onReload is provided */}
        {onReload && (
          <TouchableOpacity
            style={styles.reloadButton}
            onPress={onReload}
            disabled={isLoading}
            accessibilityRole='button'
            accessibilityLabel='Recargar puntuación'
          >
            <Animated.View style={reloadRotateStyle}>
              <ReloadIcon size={16} color={accentColor} strokeWidth={2.5} />
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Greeting */}
        {firstName ? (
          <Text style={[styles.greeting, { color: textPrimary }]}>{`Hola, ${firstName}`}</Text>
        ) : null}

        <Text style={[styles.subtitle, { color: textMuted }]}>Tu puntuación regenerativa es:</Text>

        {/* Score row */}
        <View style={styles.scoreRow}>
          {brandMark ?? <View style={[styles.defaultMark, { borderColor: accentColor }]} />}
          {isLoading ? (
            <ScoreNumberSkeleton />
          ) : (
            <Text
              style={[styles.scoreValue, { color: textPrimary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {score != null ? fmtScore(safeScore) : '—'}
            </Text>
          )}
        </View>

        {/* Tier badge with info icon */}
        {isLoading ? (
          <StatusBadgeSkeleton />
        ) : (
          <>
            <View style={styles.tierBadgeRow}>
              <View style={[styles.tierBadge, { borderColor: tierSpec.trackColor }]}>
                <View style={[styles.tierDot, { backgroundColor: tierSpec.color }]} />
                <Text style={[styles.tierLabel, { color: tierSpec.color }]}>
                  {`Status ${tierSpec.label.toUpperCase()}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleStatusTooltip}
                accessibilityRole='button'
                accessibilityLabel='Información del estado'
              >
                <InfoIcon size={16} color={accentColor} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {showStatusTooltip && (
              <View style={styles.tooltipOverlay}>
                <View
                  style={[
                    styles.statusTooltip,
                    {
                      backgroundColor: isDark ? '#050f0c' : '#ffffff',
                      shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)',
                    },
                  ]}
                >
                  {statusTooltipContent}
                </View>
                <View
                  style={[styles.tooltipArrow, { borderTopColor: isDark ? '#050f0c' : '#ffffff' }]}
                />
              </View>
            )}
          </>
        )}

        <View style={[styles.divider, { backgroundColor: divider }]} />

        {/* Progress to next tier */}
        {showProgressSection && (
          <View style={styles.progressSection}>
            {isLoading ? (
              <>
                <View style={styles.progressLabelRow}>
                  <View style={styles.progressLeftGroup}>
                    <SkeletonLoader width='50%' height={14} borderRadius={4} />
                    <ProgressPercentageSkeleton />
                  </View>
                  <View style={styles.progressLoadingRight}>
                    <ProgressNumbersSkeleton />
                  </View>
                </View>
                <ProgressBar
                  progress={0}
                  color={tierSpec.color}
                  height={7}
                  style={styles.progressBar}
                  showPercentage={false}
                />
                <SkeletonLoader width='82%' height={17} borderRadius={4} style={{ marginTop: 2 }} />
              </>
            ) : (
              <>
                <View style={styles.progressLabelRow}>
                  <View style={styles.progressLeftGroup}>
                    <Text style={[styles.progressLeft, { color: textPrimary }]} numberOfLines={1}>
                      {`Progreso a ${progressNextLabel} —`}
                    </Text>
                    <Text
                      style={[styles.progressPercent, { color: textPrimary }]}
                      numberOfLines={1}
                    >
                      {`${Math.round(progressPct * 100)}%`}
                    </Text>
                  </View>
                  <Text style={[styles.progressRight, { color: textMuted }]} numberOfLines={1}>
                    {`${fmtScore(safeScore)} / ${fmtScore(progressMax)} Airs`}
                  </Text>
                </View>
                <ProgressBar
                  progress={progressPct}
                  color={tierSpec.color}
                  height={7}
                  style={styles.progressBar}
                  showPercentage={false}
                />
                <Text style={[styles.progressHint, { color: textMuted }]}>
                  {`Te faltan ${fmtScore(
                    progressMax - safeScore
                  )} Airs para alcanzar ${progressNextLabel} y desbloquear beneficios exclusivos`}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Platinum — max tier */}
        {tierSpec.max == null && !previewMode && score != null && (
          <Text style={[styles.progressHint, { color: tierSpec.color }]}>
            Has alcanzado el nivel máximo Platinum
          </Text>
        )}
      </View>
    </ThemeProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[5],
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 20,
  },

  /* Reload button — top-right corner */
  reloadButton: {
    position: 'absolute',
    top: spacing[5],
    right: spacing[4],
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(30,230,181,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(30,230,181,0.16)',
  },

  /* Ambient orbs — top-right + bottom-left (mirrored vs footer) */
  orbTR: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -120,
    right: -100,
  },
  orbBL: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    bottom: -80,
    left: -70,
  },

  /* Text */
  greeting: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    letterSpacing: 0.1,
    marginBottom: spacing[3],
  },

  /* Score */
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  defaultMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  scoreValue: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 56,
    flexShrink: 1,
  },

  /* Tier badge */
  tierBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
    zIndex: 1,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  tooltipOverlay: {
    position: 'absolute',
    top: 36,
    right: -8,
    zIndex: 1000,
    maxWidth: '90%',
  },
  statusTooltip: {
    minWidth: 220,
    maxWidth: 280,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(30,230,181,0.24)',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  /* Tooltip content */
  tooltipContent: {
    gap: spacing[2],
  },
  tooltipLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: 'rgba(30,230,181,0.16)',
  },
  tooltipLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  tooltipKey: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    flexShrink: 0,
  },
  tooltipValue: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  divider: {
    height: 1,
    marginBottom: spacing[4],
  },

  /* Progress */
  progressSection: {
    gap: spacing[2],
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing[2],
    flexWrap: 'nowrap',
  },
  progressLeftGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[1],
    flexShrink: 1,
    minWidth: 0,
  },
  progressLeft: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    flexShrink: 0,
  },
  progressPercent: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: -0.1,
    flexShrink: 0,
  },
  progressRight: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    flexShrink: 0,
    textAlign: 'right',
    minWidth: 0,
  },
  progressLoadingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  progressBar: {
    marginVertical: 2,
  },
  progressHint: {
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginTop: 2,
  },
});

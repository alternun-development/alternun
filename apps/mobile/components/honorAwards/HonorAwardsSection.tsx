import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SectionContainer } from '@alternun/ui';
import { createHonorAwardClient, sortHonorAwards, type HonorAward } from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import HonorAwardClaimCinematic from './HonorAwardClaimCinematic';
import HonorAwardEmblem from './HonorAwardEmblem';
import HonorAwardInspectModal from './HonorAwardInspectModal';
import { buildHonorSlots, HONOR_TIER_PALETTES, honorText } from './honorAwardTheme';
import type { HonorAwardsSectionProps, LoadState } from './honorAwards.types';

function PendingGlow({ color }: { color: string }): React.JSX.Element {
  const { motionLevel } = useAppPreferences();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motionLevel === 'off') {
      pulse.setValue(0.6);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [motionLevel, pulse]);
  return (
    <Animated.View
      pointerEvents='none'
      style={[
        styles.glow,
        {
          backgroundColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
          transform: [
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) },
          ],
        },
      ]}
    />
  );
}

/**
 * "Galardones de honor": the medals and trophies of a person or an ally. Pending awards glow
 * until they are claimed (which plays the claim animation); claimed ones open the card view.
 */
export default function HonorAwardsSection({
  scope,
  getToken,
  c,
  title,
  subtitle,
  hideWhenEmpty = false,
  client: injectedClient,
}: HonorAwardsSectionProps): React.JSX.Element | null {
  const { t } = useAppTranslation('mobile');
  const scopeKey = JSON.stringify(scope);
  const client = useMemo(
    () =>
      injectedClient ?? createHonorAwardClient(scope, getToken ?? (() => Promise.resolve(null))),
    // The scope is compared by value so a new object with the same target does not refetch.
    [injectedClient, scopeKey, getToken]
  );
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState(false);
  const [celebrating, setCelebrating] = useState<HonorAward | null>(null);
  const [inspecting, setInspecting] = useState<HonorAward | null>(null);

  const load = useCallback(() => {
    let active = true;
    setState({ kind: 'loading' });
    client
      .list()
      .then((awards) => {
        if (active) setState({ kind: 'ready', awards: sortHonorAwards(awards) });
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => load(), [load]);

  async function claim(award: HonorAward): Promise<void> {
    setClaimingId(award.id);
    setClaimError(false);
    try {
      const claimed = await client.claim(award.id);
      setState((current) =>
        current.kind === 'ready'
          ? {
              kind: 'ready',
              awards: sortHonorAwards(
                current.awards.map((item) => (item.id === claimed.id ? claimed : item))
              ),
            }
          : current
      );
      setCelebrating(claimed);
    } catch {
      setClaimError(true);
    } finally {
      setClaimingId(null);
    }
  }

  const awards = state.kind === 'ready' ? state.awards : [];
  if (hideWhenEmpty && (state.kind !== 'ready' || awards.length === 0)) return null;
  const slots = buildHonorSlots(awards);
  const pendingCount = awards.filter((award) => award.status === 'pending').length;

  return (
    <SectionContainer
      title={title ?? honorText(t, 'profile.sections.honorAwards', 'Galardones de honor')}
      style={{ margin: 12 }}
    >
      <Text style={[styles.subtitle, { color: c.muted }]}>
        {subtitle ??
          honorText(
            t,
            'profile.honorAwards.subtitle',
            'Medallas y trofeos que reconocen tu trayectoria de impacto positivo.'
          )}
      </Text>
      {pendingCount > 0 && client.canClaim ? (
        <Text style={[styles.pendingNote, { color: c.accent ?? '#1de9b6' }]}>
          {honorText(t, 'profile.honorAwards.pendingNote', 'Galardones por reclamar: {{count}}', {
            count: pendingCount,
          })}
        </Text>
      ) : null}

      {state.kind === 'loading' ? <ActivityIndicator style={styles.loader} /> : null}
      {state.kind === 'error' ? (
        <Pressable accessibilityRole='button' onPress={load}>
          <Text style={[styles.error, { color: c.muted }]}>
            {honorText(
              t,
              'profile.honorAwards.loadError',
              'No pudimos cargar los galardones. Toca para reintentar.'
            )}
          </Text>
        </Pressable>
      ) : null}
      {claimError ? (
        <Text style={[styles.error, { color: '#ff8a8a' }]}>
          {honorText(
            t,
            'profile.honorAwards.claimError',
            'No pudimos reclamar el galardón. Inténtalo de nuevo.'
          )}
        </Text>
      ) : null}

      {state.kind === 'ready' ? (
        <View style={styles.grid}>
          {slots.map((slot) => {
            if (slot.kind === 'empty') {
              return (
                <View key={slot.key} style={styles.slot} accessibilityLabel='honor-award-empty'>
                  <HonorAwardEmblem tier='generic' size={56} placeholder />
                  <Text numberOfLines={2} style={[styles.slotLabel, { color: c.muted }]}>
                    {honorText(t, 'profile.honorAwards.emptySlot', 'Espacio disponible')}
                  </Text>
                </View>
              );
            }
            const { award } = slot;
            const pending = award.status === 'pending';
            const palette = HONOR_TIER_PALETTES[award.recipe.tier];
            const claimable = pending && client.canClaim;
            return (
              <Pressable
                key={award.id}
                accessibilityRole='button'
                accessibilityLabel={award.recipe.title}
                accessibilityState={{ busy: claimingId === award.id }}
                disabled={claimingId !== null || (pending && !client.canClaim)}
                onPress={() => (claimable ? void claim(award) : setInspecting(award))}
                style={styles.slot}
              >
                <View style={styles.emblemBox}>
                  {pending ? <PendingGlow color={palette.glow} /> : null}
                  <View style={{ opacity: pending ? 0.75 : 1 }}>
                    <HonorAwardEmblem
                      tier={award.recipe.tier}
                      kind={award.recipe.kind}
                      title={award.recipe.title}
                      imageUrl={award.recipe.badgeImageUrl}
                      size={56}
                    />
                  </View>
                  {claimingId === award.id ? (
                    <ActivityIndicator style={StyleSheet.absoluteFill} color='#ffffff' />
                  ) : null}
                </View>
                <Text numberOfLines={2} style={[styles.slotLabel, { color: c.text }]}>
                  {award.partner?.displayName ?? award.recipe.title}
                </Text>
                {claimable ? (
                  <View style={[styles.claimBadge, { backgroundColor: palette.frame }]}>
                    <Text style={styles.claimBadgeText}>
                      {honorText(t, 'profile.honorAwards.claimCta', 'Reclamar')}
                    </Text>
                  </View>
                ) : award.recipe.eventYear ? (
                  <Text style={[styles.slotYear, { color: c.muted }]}>
                    {award.recipe.eventYear}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <HonorAwardClaimCinematic
        award={celebrating}
        onClose={() => setCelebrating(null)}
        onInspect={(award) => {
          setCelebrating(null);
          setInspecting(award);
        }}
      />
      <HonorAwardInspectModal award={inspecting} onClose={() => setInspecting(null)} />
    </SectionContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 13, marginBottom: 6 },
  pendingNote: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  loader: { marginVertical: 18 },
  error: { fontSize: 13, marginVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  slot: { width: '19%', minWidth: 62, alignItems: 'center', gap: 4 },
  emblemBox: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 64, height: 64, borderRadius: 32 },
  slotLabel: { fontSize: 10, textAlign: 'center', fontWeight: '600' },
  slotYear: { fontSize: 10, fontWeight: '700' },
  claimBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  claimBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
});

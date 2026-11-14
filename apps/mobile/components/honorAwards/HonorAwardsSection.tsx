import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SectionContainer } from '@alternun/ui';
import { Info } from 'lucide-react-native';
import { createHonorAwardClient, sortHonorAwards, type HonorAward } from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import HonorAwardClaimCinematic from './HonorAwardClaimCinematic';
import HonorAwardEmblem from './HonorAwardEmblem';
import HonorAwardInspectModal from './HonorAwardInspectModal';
import HonorAwardsInfoModal from './HonorAwardsInfoModal';
import { buildDemoHonorAward, demoTierForSlot } from './honorAwardDemo';
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
  const [celebrating, setCelebrating] = useState<{ award: HonorAward; demo: boolean } | null>(null);
  const [inspecting, setInspecting] = useState<{ award: HonorAward; demo: boolean } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

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
      setCelebrating({ award: claimed, demo: false });
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
  const hasEmptySlots = slots.some((slot) => slot.kind === 'empty');

  /** An empty slot previews the claim of a sample golf medal; nothing is saved. */
  function previewDemo(index: number): void {
    setCelebrating({
      award: buildDemoHonorAward(demoTierForSlot(index), {
        classification: honorText(
          t,
          'profile.honorAwards.demo.classification',
          'Misión de compensación'
        ),
        purpose: honorText(
          t,
          'profile.honorAwards.demo.purpose',
          'Como participante del torneo, sumaste a la conservación del bosque de manglar en el Caribe colombiano, junto a la Fundación Batis.'
        ),
      }),
      demo: true,
    });
  }

  return (
    <SectionContainer
      title={title ?? honorText(t, 'profile.sections.honorAwards', 'Galardones de honor')}
      style={{ margin: 12 }}
      trailing={
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={honorText(
            t,
            'profile.honorAwards.infoButton',
            '¿Qué son los galardones de honor?'
          )}
          hitSlop={10}
          onPress={() => setInfoOpen(true)}
          style={[styles.infoButton, { borderColor: c.border ?? 'rgba(255,255,255,0.25)' }]}
        >
          <Info size={18} color={c.accent ?? '#1de9b6'} />
        </Pressable>
      }
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
          {slots.map((slot, index) => {
            if (slot.kind === 'empty') {
              return (
                <Pressable
                  key={slot.key}
                  accessibilityRole='button'
                  accessibilityLabel={honorText(
                    t,
                    'profile.honorAwards.demo.slotLabel',
                    'Espacio disponible: ver demostración'
                  )}
                  onPress={() => previewDemo(index)}
                  style={styles.slot}
                >
                  <HonorAwardEmblem tier='generic' size={56} placeholder />
                  <Text numberOfLines={2} style={[styles.slotLabel, { color: c.muted }]}>
                    {honorText(t, 'profile.honorAwards.emptySlot', 'Espacio disponible')}
                  </Text>
                </Pressable>
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
                onPress={() =>
                  claimable ? void claim(award) : setInspecting({ award, demo: false })
                }
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
                      artPreset={award.recipe.artPreset}
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
      {state.kind === 'ready' && hasEmptySlots ? (
        <Text style={[styles.demoHint, { color: c.muted }]}>
          {honorText(
            t,
            'profile.honorAwards.info.demoHint',
            'Toca un espacio disponible para ver una demostración.'
          )}
        </Text>
      ) : null}

      <HonorAwardClaimCinematic
        award={celebrating?.award ?? null}
        demo={celebrating?.demo ?? false}
        onClose={() => setCelebrating(null)}
        onInspect={(award) => {
          setInspecting({ award, demo: celebrating?.demo ?? false });
          setCelebrating(null);
        }}
      />
      <HonorAwardInspectModal
        award={inspecting?.award ?? null}
        demo={inspecting?.demo ?? false}
        onClose={() => setInspecting(null)}
      />
      <HonorAwardsInfoModal
        visible={infoOpen}
        audience={scope.kind === 'me' ? 'person' : 'ally'}
        onClose={() => setInfoOpen(false)}
      />
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
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoHint: { fontSize: 11, marginTop: 10, textAlign: 'center' },
});

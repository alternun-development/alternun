import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SectionContainer } from '@alternun/ui';
import { Info, Lock, Ticket } from 'lucide-react-native';
import {
  createHonorAwardClient,
  sortHonorAwards,
  type HonorAward,
  type HonorAwardRedeemResult,
} from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import HonorAwardClaimCinematic from './HonorAwardClaimCinematic';
import HonorAwardEmblem from './HonorAwardEmblem';
import HonorAwardInspectModal from './HonorAwardInspectModal';
import HonorAwardsInfoModal from './HonorAwardsInfoModal';
import HonorAwardRedeemModal from './HonorAwardRedeemModal';
import { buildDemoHonorAward } from './honorAwardDemo';
import {
  buildHonorSlots,
  HONOR_TIER_PALETTES,
  honorText,
  lockedHonorAward,
} from './honorAwardTheme';
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
 * A person's legacy (mission medals) or an ally's "Galardones de honor". Pending awards glow
 * until they are claimed (which plays the claim animation); claimed ones open the medal view.
 * In a legacy, a person with no medals sees the sample medal first, then the medals still to
 * earn (locked), then empty placeholders.
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
  const [inspecting, setInspecting] = useState<{
    award: HonorAward;
    demo: boolean;
    stage: 'medal' | 'mission';
    locked?: boolean;
  } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setState({ kind: 'loading' });
    // The catalog only adds locked medals: if it fails, the person still sees their own.
    Promise.all([client.list(), client.catalog ? client.catalog().catch(() => []) : []])
      .then(([awards, catalog]) => {
        if (active) setState({ kind: 'ready', awards: sortHonorAwards(awards), catalog });
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
              ...current,
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

  /** After a code: refresh the legacy and, when the medal was given, play its claim. */
  async function afterRedeem(result: HonorAwardRedeemResult): Promise<void> {
    try {
      const [list, catalog] = await Promise.all([
        client.list(),
        client.catalog ? client.catalog().catch(() => []) : [],
      ]);
      setState({ kind: 'ready', awards: sortHonorAwards(list), catalog });
      const given = result.grantId ? list.find((award) => award.id === result.grantId) : null;
      if (given && given.status === 'pending') await claim(given);
    } catch {
      load();
    }
  }

  // A person's collection is their legacy: the mission medals. Allies keep "Galardones de honor".
  const legacy = scope.kind === 'me';
  const awards = state.kind === 'ready' ? state.awards : [];
  if (hideWhenEmpty && (state.kind !== 'ready' || awards.length === 0)) return null;
  const slots = buildHonorSlots(
    awards,
    legacy ? { locked: state.kind === 'ready' ? state.catalog : [] } : {}
  );
  const pendingCount = awards.filter((award) => award.status === 'pending').length;
  // Allies can preview a claim from an empty slot; a person's Legado shows only real medals.
  const hint =
    !legacy && slots.some((slot) => slot.kind === 'empty')
      ? honorText(
          t,
          'profile.honorAwards.info.demoHint',
          'Toca un espacio disponible para ver una demostración.'
        )
      : null;

  /** An ally's empty slot previews the claim with a sample medal; nothing is saved. */
  function previewDemo(): void {
    setCelebrating({
      award: buildDemoHonorAward({
        classification: honorText(
          t,
          'profile.honorAwards.demo.classification',
          'Misión de impacto positivo'
        ),
        purpose: honorText(
          t,
          'profile.honorAwards.demo.purpose',
          'Como participante del torneo, sumaste a la conservación del bosque de manglar en el Caribe colombiano, junto a la Fundación Batis.'
        ),
        partnerDescription: honorText(
          t,
          'profile.honorAwards.demo.partnerDescription',
          'Organización y promoción de torneos de golf y eventos deportivos en Colombia. Ayudamos a los deportistas a alcanzar sus sueños y metas.'
        ),
        projectLocation: honorText(
          t,
          'profile.honorAwards.demo.projectLocation',
          'KM5 Finca La Granja, Antigua Vía Férrea, Puerto Colombia, Atlántico.'
        ),
        projectDescription: honorText(
          t,
          'profile.honorAwards.demo.projectDescription',
          'Bosque de mangle rojo (Rhizophora mangle) en el Caribe colombiano.'
        ),
      }),
      demo: true,
    });
  }

  const sectionTitle =
    title ??
    (legacy
      ? honorText(t, 'profile.honorAwards.legacyTitle', 'Legado')
      : honorText(t, 'profile.sections.honorAwards', 'Galardones de honor'));
  const bodyText =
    subtitle ??
    (legacy
      ? null
      : honorText(
          t,
          'profile.honorAwards.subtitle',
          'Medallas y trofeos que reconocen tu trayectoria de impacto positivo.'
        ));

  return (
    <SectionContainer
      title={sectionTitle}
      subtitle={
        legacy
          ? honorText(t, 'profile.honorAwards.legacySubtitle', '(Medallas de misión)')
          : undefined
      }
      style={{ margin: 12 }}
      trailing={
        <View style={styles.headerActions}>
          {client.redeem ? (
            <Pressable
              accessibilityRole='button'
              onPress={() => setRedeemOpen(true)}
              style={[styles.redeemButton, { borderColor: c.accent ?? '#1de9b6' }]}
            >
              <Ticket size={15} color={c.accent ?? '#1de9b6'} />
              <Text style={[styles.redeemText, { color: c.text }]}>
                {honorText(t, 'profile.honorAwards.redeem.button', 'Reclamar medalla')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={
              legacy
                ? honorText(t, 'profile.honorAwards.legacyInfoButton', '¿Qué es el legado?')
                : honorText(
                    t,
                    'profile.honorAwards.infoButton',
                    '¿Qué son los galardones de honor?'
                  )
            }
            hitSlop={10}
            onPress={() => setInfoOpen(true)}
            style={[styles.infoButton, { borderColor: c.border ?? 'rgba(255,255,255,0.25)' }]}
          >
            <Info size={18} color={c.accent ?? '#1de9b6'} />
          </Pressable>
        </View>
      }
    >
      {bodyText ? <Text style={[styles.subtitle, { color: c.muted }]}>{bodyText}</Text> : null}
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
            if (slot.kind === 'locked') {
              const { recipe, partner } = slot.item;
              return (
                <Pressable
                  key={`locked-${recipe.id}`}
                  accessibilityRole='button'
                  accessibilityLabel={honorText(
                    t,
                    'profile.honorAwards.locked.slotLabel',
                    '{{title}}: medalla por obtener',
                    { title: recipe.title }
                  )}
                  onPress={() =>
                    setInspecting({
                      award: lockedHonorAward(slot.item),
                      demo: false,
                      stage: 'medal',
                      locked: true,
                    })
                  }
                  style={styles.slot}
                >
                  <View style={styles.emblemBox}>
                    <View style={styles.lockedArt}>
                      <HonorAwardEmblem
                        tier={recipe.tier}
                        kind={recipe.kind}
                        title={recipe.title}
                        imageUrl={recipe.badgeImageUrl}
                        artPreset={recipe.artPreset}
                        size={56}
                        grayscale
                      />
                    </View>
                    <View style={styles.lockBadge}>
                      <Lock size={11} color='#ffffff' />
                    </View>
                  </View>
                  <Text numberOfLines={2} style={[styles.slotLabel, { color: c.muted }]}>
                    {partner?.displayName ?? recipe.title}
                  </Text>
                  {recipe.eventYear ? (
                    <Text style={[styles.slotYear, { color: c.muted }]}>{recipe.eventYear}</Text>
                  ) : null}
                </Pressable>
              );
            }
            if (slot.kind === 'empty' && legacy) {
              return (
                <View key={slot.key} style={styles.slot}>
                  <HonorAwardEmblem tier='generic' size={56} placeholder />
                  <Text numberOfLines={2} style={[styles.slotLabel, { color: c.muted }]}>
                    {honorText(t, 'profile.honorAwards.emptySlot', 'Espacio disponible')}
                  </Text>
                </View>
              );
            }
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
                  onPress={previewDemo}
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
                  claimable
                    ? void claim(award)
                    : setInspecting({ award, demo: false, stage: 'medal' })
                }
                style={styles.slot}
              >
                <View style={styles.emblemBox}>
                  {pending ? <PendingGlow color={palette.glow} /> : null}
                  <HonorAwardEmblem
                    tier={award.recipe.tier}
                    kind={award.recipe.kind}
                    title={award.recipe.title}
                    imageUrl={award.recipe.badgeImageUrl}
                    artPreset={award.recipe.artPreset}
                    size={56}
                    grayscale={pending}
                  />
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
      {state.kind === 'ready' && hint ? (
        <Text style={[styles.demoHint, { color: c.muted }]}>{hint}</Text>
      ) : null}

      <HonorAwardClaimCinematic
        award={celebrating?.award ?? null}
        demo={celebrating?.demo ?? false}
        onClose={() => setCelebrating(null)}
        onInspect={(award) => {
          setInspecting({ award, demo: celebrating?.demo ?? false, stage: 'mission' });
          setCelebrating(null);
        }}
      />
      <HonorAwardInspectModal
        award={inspecting?.award ?? null}
        demo={inspecting?.demo ?? false}
        initialStage={inspecting?.stage ?? 'medal'}
        locked={inspecting?.locked ?? false}
        onClose={() => setInspecting(null)}
      />
      {client.redeem ? (
        <HonorAwardRedeemModal
          visible={redeemOpen}
          redeem={(code) => client.redeem?.(code) ?? Promise.reject(new Error('READ_ONLY'))}
          onRedeemed={(result) => void afterRedeem(result)}
          onClose={() => setRedeemOpen(false)}
        />
      ) : null}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  redeemText: { fontSize: 13, fontWeight: '700' },
  loader: { marginVertical: 18 },
  error: { fontSize: 13, marginVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  slot: { width: '19%', minWidth: 62, alignItems: 'center', gap: 4 },
  emblemBox: { alignItems: 'center', justifyContent: 'center' },
  lockedArt: { opacity: 0.6 },
  lockBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0e2a26',
    borderWidth: 1,
    borderColor: 'rgba(29,191,156,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', width: 64, height: 64, borderRadius: 32 },
  // Stretch so long names wrap inside the slot instead of spilling over its neighbors.
  slotLabel: { alignSelf: 'stretch', fontSize: 10, textAlign: 'center', fontWeight: '600' },
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

import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Gift, Lock, type LucideProps } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard, SectionContainer } from '@alternun/ui';
import SearchFilterBar, { type SearchFilterOption } from '../components/common/SearchFilterBar';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';

const ChevronLeftIcon = ChevronLeft as React.FC<LucideProps>;
const GiftIcon = Gift as React.FC<LucideProps>;
const CheckIcon = Check as React.FC<LucideProps>;
const LockIcon = Lock as React.FC<LucideProps>;

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string }> = {
  Bronze: { bg: 'rgba(205,127,50,0.14)', text: '#cd7f32', border: 'rgba(205,127,50,0.3)' },
  Silver: { bg: 'rgba(168,184,204,0.14)', text: '#a8b8cc', border: 'rgba(168,184,204,0.3)' },
  Gold: { bg: 'rgba(212,185,106,0.14)', text: '#d4b96a', border: 'rgba(212,185,106,0.3)' },
  Platinum: { bg: 'rgba(155,169,196,0.14)', text: '#9ba9c4', border: 'rgba(155,169,196,0.3)' },
};

const BENEFITS: { title: string; tier: Tier; unlocked: boolean }[] = [
  { title: 'Reporte de Impacto', tier: 'Bronze', unlocked: true },
  { title: 'Certificado NFT', tier: 'Silver', unlocked: true },
  { title: 'Acceso Premium', tier: 'Gold', unlocked: false },
  { title: 'Mentoría Verde', tier: 'Platinum', unlocked: false },
];

const FILTER_OPTIONS: SearchFilterOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'unlocked', label: 'Desbloqueados' },
  { key: 'locked', label: 'Bloqueados' },
];

export default function BeneficiosScreen() {
  const router = useRouter();
  const { themeMode } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: false }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const c = isDark
    ? {
        bg: '#050f0c',
        cardBg: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        text: '#e8fff6',
        muted: 'rgba(232,255,246,0.6)',
        accent: '#1EE6B5',
      }
    : {
        bg: '#f0fdf9',
        cardBg: 'rgba(255,255,255,0.85)',
        border: 'rgba(11,90,95,0.12)',
        text: '#0b2d31',
        muted: 'rgba(11,45,49,0.6)',
        accent: '#0d9488',
      };

  const filteredBenefits = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return BENEFITS.filter((benefit) => {
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'unlocked' && benefit.unlocked) ||
        (activeFilter === 'locked' && !benefit.unlocked);
      const matchesSearch =
        !normalizedQuery ||
        benefit.title.toLowerCase().includes(normalizedQuery) ||
        benefit.tier.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  return (
    <ScreenShell activeSection='beneficios' backgroundColor={c.bg}>
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeftIcon size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>Beneficios</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: c.muted }]}>
              Desbloquea beneficios según tu nivel AIRS
            </Text>

            {/* Benefit cards */}
            <SectionContainer title='Tus Beneficios'>
              <SearchFilterBar
                value={search}
                onChangeText={setSearch}
                placeholder='Buscar beneficio o nivel...'
                filters={FILTER_OPTIONS}
                activeFilter={activeFilter}
                onChangeFilter={setActiveFilter}
              />
              <GlassCard style={styles.listCard}>
                {filteredBenefits.map((benefit, idx) => {
                  const tc = TIER_COLORS[benefit.tier];
                  return (
                    <View
                      key={benefit.title}
                      style={[
                        styles.row,
                        idx < filteredBenefits.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: c.border,
                        },
                        !benefit.unlocked && styles.lockedRow,
                      ]}
                    >
                      <View
                        style={[
                          styles.iconCircle,
                          {
                            backgroundColor: benefit.unlocked
                              ? `${c.accent}18`
                              : 'rgba(255,255,255,0.06)',
                          },
                        ]}
                      >
                        <GiftIcon size={18} color={benefit.unlocked ? c.accent : c.muted} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text
                          style={[styles.rowTitle, { color: benefit.unlocked ? c.text : c.muted }]}
                        >
                          {benefit.title}
                        </Text>
                        <View
                          style={[
                            styles.tierBadge,
                            { backgroundColor: tc.bg, borderColor: tc.border },
                          ]}
                        >
                          <Text style={[styles.tierText, { color: tc.text }]}>{benefit.tier}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.stateIcon,
                          {
                            backgroundColor: benefit.unlocked
                              ? `${c.accent}18`
                              : 'rgba(255,255,255,0.06)',
                          },
                        ]}
                      >
                        {benefit.unlocked ? (
                          <CheckIcon size={16} color={c.accent} />
                        ) : (
                          <LockIcon size={16} color='rgba(200,200,200,0.4)' />
                        )}
                      </View>
                    </View>
                  );
                })}
              </GlassCard>
            </SectionContainer>
          </ScrollView>
        </Animated.View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  lockedRow: {
    opacity: 0.65,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

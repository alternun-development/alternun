import { useRouter } from 'expo-router';
import { ChevronLeft, Coins, TrendingUp, type LucideProps } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard, SectionContainer, StatCard, StatusPill } from '@alternun/ui';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import HorizontalCardScroller from '../components/common/HorizontalCardScroller';
import SearchFilterBar, { type SearchFilterOption } from '../components/common/SearchFilterBar';
import ScreenShell from '../components/common/ScreenShell';

const ChevronLeftIcon = ChevronLeft as React.FC<LucideProps>;
const CoinsIcon = Coins as React.FC<LucideProps>;
const TrendingUpIcon = TrendingUp as React.FC<LucideProps>;

const FILTERS = ['Todos', 'Libre', 'Depositado', 'Retirado'];
const FILTER_OPTIONS: SearchFilterOption[] = FILTERS.map((label) => ({ key: label, label }));

type TokenStatus = 'Free' | 'Deposited' | 'Consumed';

const TOKENS: { id: string; project: string; price: string; status: TokenStatus }[] = [
  { id: 'ATN-001', project: 'Reforestación Amazonas', price: '$48.20', status: 'Free' },
  { id: 'ATN-002', project: 'Energía Solar Bolivia', price: '$51.00', status: 'Deposited' },
  { id: 'ATN-003', project: 'Manglares Colombia', price: '$44.75', status: 'Free' },
  { id: 'ATN-004', project: 'Biodiversidad Perú', price: '$39.90', status: 'Consumed' },
];

export default function MisAtnScreen() {
  const router = useRouter();
  const { themeMode } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');

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

  const filteredTokens = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return TOKENS.filter((token) => {
      const matchesFilter =
        activeFilter === 'Todos' ||
        (activeFilter === 'Libre' && token.status === 'Free') ||
        (activeFilter === 'Depositado' && token.status === 'Deposited') ||
        (activeFilter === 'Retirado' && token.status === 'Consumed');
      const matchesSearch =
        !normalizedQuery ||
        token.id.toLowerCase().includes(normalizedQuery) ||
        token.project.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  return (
    <ScreenShell activeSection='portfolio' backgroundColor={c.bg}>
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
          <Text style={[styles.headerTitle, { color: c.text }]}>Mis ATN</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Stat cards */}
            <HorizontalCardScroller isDark={isDark}>
              <StatCard
                label='Total ATN'
                value='156'
                accentColor={c.accent}
                icon={<CoinsIcon size={16} color={c.accent} />}
                style={styles.statCard}
              />
              <StatCard
                label='En Pool'
                value='89'
                accentColor={c.accent}
                icon={<TrendingUpIcon size={16} color={c.accent} />}
                style={styles.statCard}
              />
              <StatCard
                label='Libres'
                value='67'
                accentColor={c.accent}
                icon={<CoinsIcon size={16} color={c.accent} />}
                style={styles.statCard}
              />
            </HorizontalCardScroller>

            <SearchFilterBar
              value={search}
              onChangeText={setSearch}
              placeholder='Buscar token o proyecto...'
              filters={FILTER_OPTIONS}
              activeFilter={activeFilter}
              onChangeFilter={setActiveFilter}
            />

            {/* Token list */}
            <SectionContainer title='Tokens'>
              <GlassCard style={styles.listCard}>
                {filteredTokens.map((token, idx) => (
                  <View
                    key={token.id}
                    style={[
                      styles.row,
                      idx < filteredTokens.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: c.border,
                      },
                    ]}
                  >
                    <View style={[styles.tokenIdBox, { backgroundColor: `${c.accent}14` }]}>
                      <Text style={[styles.tokenId, { color: c.accent }]}>{token.id}</Text>
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowTitle, { color: c.text }]}>{token.project}</Text>
                      <Text style={[styles.rowSub, { color: c.muted }]}>{token.price}</Text>
                    </View>
                    <StatusPill status={token.status} size='sm' />
                  </View>
                ))}
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
  statCard: {
    flex: 1,
    boxShadow: 'none',
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
  tokenIdBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tokenId: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
  },
});

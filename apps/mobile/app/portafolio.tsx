import React, { useEffect, useMemo, useRef, useState, } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { Coins, TrendingUp, Check, Gift, Lock, type LucideProps, } from 'lucide-react-native';
import { GlassCard, SectionContainer, StatCard, StatusPill, } from '@alternun/ui';
import { useAppPreferences, } from '../components/settings/AppPreferencesProvider';
import HorizontalCardScroller from '../components/common/HorizontalCardScroller';
import ScreenShell from '../components/common/ScreenShell';
import { PageTabBar, type TabItem, } from '../components/common/PageTabBar';
import SearchFilterBar, { type SearchFilterOption, } from '../components/common/SearchFilterBar';

const CoinsIcon = Coins as React.FC<LucideProps>;
const TrendingUpIcon = TrendingUp as React.FC<LucideProps>;
const CheckIcon = Check as React.FC<LucideProps>;
const GiftIcon = Gift as React.FC<LucideProps>;
const LockIcon = Lock as React.FC<LucideProps>;

// ─── Data ────────────────────────────────────────────────────────────────────

const ATN_FILTERS = ['Todos', 'Libre', 'Depositado', 'Retirado',];
const ATN_FILTER_OPTIONS: SearchFilterOption[] = ATN_FILTERS.map((label,) => ({ key: label, label, }),);

type TokenStatus = 'Free' | 'Deposited' | 'Consumed';

const TOKENS: { id: string; project: string; price: string; status: TokenStatus }[] = [
  { id: 'ATN-001', project: 'Reforestación Amazonas', price: '$48.20', status: 'Free', },
  { id: 'ATN-002', project: 'Energía Solar Bolivia', price: '$51.00', status: 'Deposited', },
  { id: 'ATN-003', project: 'Manglares Colombia', price: '$44.75', status: 'Free', },
  { id: 'ATN-004', project: 'Biodiversidad Perú', price: '$39.90', status: 'Consumed', },
];

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string }> = {
  Bronze: { bg: 'rgba(205,127,50,0.14)', text: '#cd7f32', border: 'rgba(205,127,50,0.3)', },
  Silver: { bg: 'rgba(168,184,204,0.14)', text: '#a8b8cc', border: 'rgba(168,184,204,0.3)', },
  Gold: { bg: 'rgba(212,185,106,0.14)', text: '#d4b96a', border: 'rgba(212,185,106,0.3)', },
  Platinum: { bg: 'rgba(155,169,196,0.14)', text: '#9ba9c4', border: 'rgba(155,169,196,0.3)', },
};

const BENEFITS: { title: string; tier: Tier; unlocked: boolean }[] = [
  { title: 'Reporte de Impacto', tier: 'Bronze', unlocked: true, },
  { title: 'Certificado NFT', tier: 'Silver', unlocked: true, },
  { title: 'Acceso Premium', tier: 'Gold', unlocked: false, },
  { title: 'Mentoría Verde', tier: 'Platinum', unlocked: false, },
];

const BENEFITS_FILTER_OPTIONS: SearchFilterOption[] = [
  { key: 'all', label: 'Todos', },
  { key: 'unlocked', label: 'Desbloqueados', },
  { key: 'locked', label: 'Bloqueados', },
];

// ─── Tab components ──────────────────────────────────────────────────────────

function MisAtnTab({ isDark, c, }: { isDark: boolean; c: any },): React.JSX.Element {
  const [activeFilter, setActiveFilter,] = useState('Todos',);
  const [search, setSearch,] = useState('',);

  const filteredTokens = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return TOKENS.filter((token,) => {
      const matchesFilter =
        activeFilter === 'Todos' ||
        (activeFilter === 'Libre' && token.status === 'Free') ||
        (activeFilter === 'Depositado' && token.status === 'Deposited') ||
        (activeFilter === 'Retirado' && token.status === 'Consumed');
      const matchesSearch =
        !normalizedQuery ||
        token.id.toLowerCase().includes(normalizedQuery,) ||
        token.project.toLowerCase().includes(normalizedQuery,);
      return matchesFilter && matchesSearch;
    },);
  }, [activeFilter, search,],);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: 100, },]}
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
        filters={ATN_FILTER_OPTIONS}
        activeFilter={activeFilter}
        onChangeFilter={setActiveFilter}
      />

      {/* Token list */}
      <SectionContainer title='Tokens'>
        <GlassCard style={styles.listCard}>
          {filteredTokens.map((token, idx,) => (
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
              <View style={[styles.tokenIdBox, { backgroundColor: `${c.accent}14`, },]}>
                <Text style={[styles.tokenId, { color: c.accent, },]}>{token.id}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: c.text, },]}>{token.project}</Text>
                <Text style={[styles.rowSub, { color: c.muted, },]}>{token.price}</Text>
              </View>
              <StatusPill status={token.status} size='sm' />
            </View>
          ),)}
        </GlassCard>
      </SectionContainer>
    </ScrollView>
  );
}

function BeneficiosTab({ isDark, c, }: { isDark: boolean; c: any },): React.JSX.Element {
  const [search, setSearch,] = useState('',);
  const [activeFilter, setActiveFilter,] = useState('all',);

  const filteredBenefits = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return BENEFITS.filter((benefit,) => {
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'unlocked' && benefit.unlocked) ||
        (activeFilter === 'locked' && !benefit.unlocked);
      const matchesSearch =
        !normalizedQuery ||
        benefit.title.toLowerCase().includes(normalizedQuery,) ||
        benefit.tier.toLowerCase().includes(normalizedQuery,);
      return matchesFilter && matchesSearch;
    },);
  }, [activeFilter, search,],);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: 100, },]}
      showsVerticalScrollIndicator={false}
    >
      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: c.muted, },]}>
        Desbloquea beneficios según tu nivel AIRS
      </Text>

      {/* Benefit cards */}
      <SectionContainer title='Tus Beneficios'>
        <SearchFilterBar
          value={search}
          onChangeText={setSearch}
          placeholder='Buscar beneficio o nivel...'
          filters={BENEFITS_FILTER_OPTIONS}
          activeFilter={activeFilter}
          onChangeFilter={setActiveFilter}
        />
        <GlassCard style={styles.listCard}>
          {filteredBenefits.map((benefit, idx,) => {
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
                    style={[styles.rowTitle, { color: benefit.unlocked ? c.text : c.muted, },]}
                  >
                    {benefit.title}
                  </Text>
                  <View
                    style={[
                      styles.tierBadge,
                      { backgroundColor: tc.bg, borderColor: tc.border, },
                    ]}
                  >
                    <Text style={[styles.tierText, { color: tc.text, },]}>{benefit.tier}</Text>
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
          },)}
        </GlassCard>
      </SectionContainer>
    </ScrollView>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const TABS: TabItem[] = [
  { key: 'mis-atn', label: 'My ATN', icon: CoinsIcon, },
  { key: 'beneficios', label: 'Benefits', icon: GiftIcon, },
];

export default function PortafolioScreen(): React.JSX.Element {
  const { themeMode, } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const [activeTab, setActiveTab,] = useState<string>('mis-atn',);

  const fadeAnim = useRef(new Animated.Value(0,),).current;
  const slideAnim = useRef(new Animated.Value(24,),).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: false, },),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: false, },),
    ],).start();
  }, [fadeAnim, slideAnim,],);

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

  return (
    <ScreenShell activeSection='portafolio' backgroundColor={c.bg}>
      <View style={[styles.root, { backgroundColor: c.bg, },]}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: c.text, },]}>Portfolio</Text>
        </View>

        {/* Tab Bar */}
        <PageTabBar
          tabs={TABS}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          isDark={isDark}
          accent={c.accent}
          muted={c.muted}
        />

        {/* Tab Content */}
        <Animated.View
          style={[
            styles.tabContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim, },], },
          ]}
        >
          {activeTab === 'mis-atn' && <MisAtnTab isDark={isDark} c={c} />}
          {activeTab === 'beneficios' && <BeneficiosTab isDark={isDark} c={c} />}
        </Animated.View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
  lockedRow: {
    opacity: 0.65,
  },
  tokenIdBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tokenId: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stateIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
},);

import { useRouter } from 'expo-router';
import { Award, ChevronLeft, Trophy, type LucideProps } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard, SectionContainer } from '@alternun/ui';
import SearchFilterBar, { type SearchFilterOption } from '../components/common/SearchFilterBar';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';

const ChevronLeftIcon = ChevronLeft as React.FC<LucideProps>;
const TrophyIcon = Trophy as React.FC<LucideProps>;
const AwardIcon = Award as React.FC<LucideProps>;

const TOP_USERS = [
  { rank: 1, name: 'María González', score: '98.420', medal: '🥇', color: '#d4b96a' },
  { rank: 2, name: 'Carlos Mendoza', score: '87.650', medal: '🥈', color: '#a8b8cc' },
  { rank: 3, name: 'Ana Ruiz', score: '76.330', medal: '🥉', color: '#cd7f32' },
  { rank: 4, name: 'Pablo Torres', score: '64.110', medal: null, color: null },
  { rank: 5, name: 'Lucía Vargas', score: '58.900', medal: null, color: null },
];

const FILTER_OPTIONS: SearchFilterOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'podium', label: 'Podio' },
  { key: 'others', label: 'Resto' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export default function RankingScreen() {
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

  const filteredUsers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return TOP_USERS.filter((user) => {
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'podium' && user.rank <= 3) ||
        (activeFilter === 'others' && user.rank > 3);
      const matchesSearch = !normalizedQuery || user.name.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  return (
    <ScreenShell activeSection='ranking' backgroundColor={c.bg}>
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
          <Text style={[styles.headerTitle, { color: c.text }]}>Ranking</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* My position highlight card */}
            <GlassCard variant='teal' style={styles.myPositionCard}>
              <View style={styles.myPosHeader}>
                <AwardIcon size={20} color={c.accent} />
                <Text style={[styles.myPosLabel, { color: c.accent }]}>Mi Posición</Text>
              </View>
              <View style={styles.myPosBody}>
                <View style={styles.myPosRankWrap}>
                  <Text style={[styles.myPosRankHash, { color: c.muted }]}>#</Text>
                  <Text style={[styles.myPosRank, { color: c.text }]}>47</Text>
                </View>
                <View>
                  <Text style={[styles.myPosScore, { color: c.text }]}>12.088</Text>
                  <Text style={[styles.myPosScoreLabel, { color: c.muted }]}>AIRS</Text>
                </View>
              </View>
            </GlassCard>

            {/* Top impactors */}
            <SectionContainer title='Top Impactores'>
              <SearchFilterBar
                value={search}
                onChangeText={setSearch}
                placeholder='Buscar persona o posición...'
                filters={FILTER_OPTIONS}
                activeFilter={activeFilter}
                onChangeFilter={setActiveFilter}
              />
              <GlassCard style={styles.listCard}>
                {filteredUsers.map((user, idx) => (
                  <View
                    key={user.rank}
                    style={[
                      styles.row,
                      idx < filteredUsers.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: c.border,
                      },
                    ]}
                  >
                    {/* Rank number */}
                    <Text style={[styles.rankNum, { color: user.color ?? c.muted }]}>
                      {user.rank}
                    </Text>

                    {/* Avatar circle */}
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor: user.color
                            ? `${user.color}22`
                            : 'rgba(255,255,255,0.08)',
                          borderColor: user.color ? `${user.color}44` : 'rgba(255,255,255,0.12)',
                        },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: user.color ?? c.muted }]}>
                        {getInitials(user.name)}
                      </Text>
                    </View>

                    {/* Name + score */}
                    <View style={styles.rowBody}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.userName, { color: c.text }]}>{user.name}</Text>
                        {user.medal ? <Text style={styles.medal}>{user.medal}</Text> : null}
                      </View>
                      <Text style={[styles.userScore, { color: c.muted }]}>{user.score} AIRS</Text>
                    </View>

                    {/* Trophy for top 3 */}
                    {user.rank <= 3 ? (
                      <TrophyIcon size={16} color={user.color ?? c.accent} />
                    ) : null}
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
  myPositionCard: {
    padding: 18,
    marginBottom: 16,
  },
  myPosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  myPosLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myPosBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  myPosRankWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  myPosRankHash: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  myPosRank: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 56,
    letterSpacing: -2,
  },
  myPosScore: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'right',
    letterSpacing: -1,
  },
  myPosScoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
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
  rankNum: {
    width: 20,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  medal: {
    fontSize: 14,
  },
  userScore: {
    fontSize: 12,
  },
});

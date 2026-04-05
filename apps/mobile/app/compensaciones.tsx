import { useRouter } from 'expo-router';
import { ChevronLeft, Leaf, ShieldCheck, TrendingUp, type LucideProps } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard, ProgressBar, SectionContainer, StatCard } from '@alternun/ui';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';

const ChevronLeftIcon = ChevronLeft as React.FC<LucideProps>;
const LeafIcon = Leaf as React.FC<LucideProps>;
const ShieldCheckIcon = ShieldCheck as React.FC<LucideProps>;
const TrendingUpIcon = TrendingUp as React.FC<LucideProps>;

const HISTORY = [
  { id: '#001', date: 'Abr 2026' },
  { id: '#002', date: 'Mar 2026' },
  { id: '#003', date: 'Feb 2026' },
  { id: '#004', date: 'Ene 2026' },
];

export default function CompensacionesScreen() {
  const router = useRouter();
  const { themeMode } = useAppPreferences();
  const isDark = themeMode === 'dark';

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

  return (
    <ScreenShell activeSection='compensation' backgroundColor={c.bg}>
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
          <Text style={[styles.headerTitle, { color: c.text }]}>Compensaciones</Text>
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
            <View style={styles.statsRow}>
              <StatCard
                label='CO₂ Offset'
                value='24.8t'
                accentColor={c.accent}
                icon={<LeafIcon size={16} color={c.accent} />}
                style={styles.statCard}
              />
              <StatCard
                label='Proyectos'
                value='3'
                accentColor={c.accent}
                icon={<TrendingUpIcon size={16} color={c.accent} />}
                style={styles.statCard}
              />
              <StatCard
                label='Certificados'
                value='12'
                accentColor={c.accent}
                icon={<ShieldCheckIcon size={16} color={c.accent} />}
                style={styles.statCard}
              />
            </View>

            {/* Historial */}
            <SectionContainer title='Historial'>
              <GlassCard style={styles.listCard}>
                {HISTORY.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[
                      styles.row,
                      idx < HISTORY.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: c.border,
                      },
                    ]}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: `${c.accent}18` }]}>
                      <LeafIcon size={18} color={c.accent} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowTitle, { color: c.text }]}>
                        {`Compensación Verde ${item.id}`}
                      </Text>
                      <Text style={[styles.rowSub, { color: c.muted }]}>{item.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: `${c.accent}18`, borderColor: `${c.accent}44` },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: c.accent }]}>Verificado</Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            </SectionContainer>

            {/* Mi Impacto */}
            <SectionContainer title='Mi Impacto'>
              <GlassCard style={styles.impactCard}>
                <ProgressBar
                  progress={0.62}
                  height={8}
                  showLabel
                  label='Meta anual'
                  trailingLabel='62%'
                />
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
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
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  impactCard: {
    padding: 16,
  },
});

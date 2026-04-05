import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Globe, Coins, TrendingUp, type LucideProps } from 'lucide-react-native';

const GlobeIcon = Globe as React.FC<LucideProps>;
const CoinsIcon = Coins as React.FC<LucideProps>;
const TrendingUpIcon = TrendingUp as React.FC<LucideProps>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardSummaryCardsProps {
  isDark: boolean;
}

// ─── Palette helper ───────────────────────────────────────────────────────────

function getPalette(isDark: boolean) {
  return isDark
    ? {
        cardBg: 'rgba(255,255,255,0.03)',
        cardBorder: 'rgba(255,255,255,0.09)',
        title: '#e8fff6',
        subtitle: 'rgba(232,255,246,0.55)',
        muted: 'rgba(232,255,246,0.55)',
        value: '#e8fff6',
        accent: '#1EE6B5',
        divider: 'rgba(255,255,255,0.07)',
        rankBg: 'rgba(30,230,181,0.10)',
        totalBg: 'rgba(30,230,181,0.08)',
        totalBorder: 'rgba(30,230,181,0.20)',
        tagBg: 'rgba(30,230,181,0.10)',
        iconBg: 'rgba(30,230,181,0.10)',
      }
    : {
        cardBg: 'rgba(255,255,255,0.95)',
        cardBorder: 'rgba(11,90,95,0.12)',
        title: '#0b2d31',
        subtitle: 'rgba(11,45,49,0.55)',
        muted: 'rgba(11,45,49,0.55)',
        value: '#0b2d31',
        accent: '#0d9488',
        divider: 'rgba(11,90,95,0.10)',
        rankBg: 'rgba(13,148,136,0.08)',
        totalBg: 'rgba(13,148,136,0.06)',
        totalBorder: 'rgba(13,148,136,0.18)',
        tagBg: 'rgba(13,148,136,0.10)',
        iconBg: 'rgba(13,148,136,0.10)',
      };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, p }: { children: React.ReactNode; p: ReturnType<typeof getPalette> }) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: p.cardBg,
          borderColor: p.cardBorder,
          shadowColor: p.accent,
        },
      ]}
    >
      {children}
    </View>
  );
}

function CardTitle({
  label,
  sub,
  p,
}: {
  label: string;
  sub: string;
  p: ReturnType<typeof getPalette>;
}) {
  return (
    <View style={styles.cardTitleBlock}>
      <Text style={[styles.cardTitle, { color: p.title }]}>{label}</Text>
      <Text style={[styles.cardSub, { color: p.subtitle }]}>{sub}</Text>
    </View>
  );
}

// ─── Tu Posición ──────────────────────────────────────────────────────────────

function PositionCard({ p }: { p: ReturnType<typeof getPalette> }) {
  return (
    <Card p={p}>
      <CardTitle label='Tu posición' sub='Entre miembros de Airs By Alternun' p={p} />
      <View style={[styles.divider, { backgroundColor: p.divider }]} />
      <View style={styles.rankRow}>
        <View style={[styles.rankIconWrap, { backgroundColor: p.iconBg }]}>
          <GlobeIcon size={16} color={p.accent} />
        </View>
        <Text style={[styles.rankLabel, { color: p.muted }]}>Global</Text>
        <Text style={[styles.rankValue, { color: p.title }]}>#1.284</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: p.divider }]} />
      <View style={styles.rankRow}>
        <Text style={styles.rankFlag}>🇨🇴</Text>
        <Text style={[styles.rankLabel, { color: p.muted }]}>Colombia</Text>
        <Text style={[styles.rankValue, { color: p.title }]}>#132</Text>
      </View>
    </Card>
  );
}

// ─── Proyección RBI ───────────────────────────────────────────────────────────

function RBICard({ p }: { p: ReturnType<typeof getPalette> }) {
  return (
    <Card p={p}>
      <CardTitle label='Proyección RBI' sub='Ingreso estimado próximo ciclo' p={p} />
      <View style={[styles.divider, { backgroundColor: p.divider }]} />
      {/* Big value */}
      <View style={styles.rbiHero}>
        <Text style={[styles.rbiValue, { color: p.accent }]}>≈ 14.2</Text>
        <View style={[styles.rbiTag, { backgroundColor: p.tagBg }]}>
          <CoinsIcon size={12} color={p.accent} />
          <Text style={[styles.rbiTagText, { color: p.accent }]}>ATN</Text>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: p.divider }]} />
      {/* Stats */}
      <View style={styles.rbiStats}>
        <View style={styles.rbiStatRow}>
          <Text style={[styles.rbiStatLabel, { color: p.muted }]}>Pool RBI estimado:</Text>
          <Text style={[styles.rbiStatValue, { color: p.value }]}>$120.000</Text>
        </View>
        <View style={styles.rbiStatRow}>
          <Text style={[styles.rbiStatLabel, { color: p.muted }]}>Usuarios elegibles:</Text>
          <Text style={[styles.rbiStatValue, { color: p.value }]}>8.420</Text>
        </View>
        <View style={styles.rbiStatRow}>
          <Text style={[styles.rbiStatLabel, { color: p.muted }]}>Tu puntaje Airs:</Text>
          <Text style={[styles.rbiStatValue, { color: p.accent }]}>12.480</Text>
        </View>
      </View>
    </Card>
  );
}

// ─── Mis ATN ─────────────────────────────────────────────────────────────────

function ATNCard({ p }: { p: ReturnType<typeof getPalette> }) {
  return (
    <Card p={p}>
      <CardTitle label='Mis ATN' sub='Tus tokens regenerativos' p={p} />
      <View style={[styles.divider, { backgroundColor: p.divider }]} />
      {/* ATN disponibles */}
      <View style={styles.atnRow}>
        <View style={styles.atnLabelBlock}>
          <Text style={[styles.atnLabel, { color: p.value }]}>ATN disponibles</Text>
          <Text style={[styles.atnSublabel, { color: p.muted }]}>Listos para usar</Text>
        </View>
        <Text style={[styles.atnValue, { color: p.value }]}>1.240</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: p.divider }]} />
      {/* ATN en stacking */}
      <View style={styles.atnRow}>
        <View style={styles.atnLabelBlock}>
          <Text style={[styles.atnLabel, { color: p.value }]}>ATN en stacking</Text>
          <Text style={[styles.atnSublabel, { color: p.muted }]}>Participando en proyectos</Text>
        </View>
        <Text style={[styles.atnValue, { color: p.value }]}>3.000</Text>
      </View>
      <View style={[styles.atnTotal, { backgroundColor: p.totalBg, borderColor: p.totalBorder }]}>
        <View style={styles.atnRow}>
          <View style={styles.atnLabelBlock}>
            <Text style={[styles.atnTotalLabel, { color: p.title }]}>Total ATN</Text>
          </View>
          <View style={styles.atnTotalRight}>
            <TrendingUpIcon size={14} color={p.accent} />
            <Text style={[styles.atnTotalValue, { color: p.accent }]}>4.240</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DashboardSummaryCards({ isDark }: DashboardSummaryCardsProps) {
  const p = getPalette(isDark);

  return (
    <View style={styles.root}>
      <View style={styles.grid}>
        <PositionCard p={p} />
        <RBICard p={p} />
        <ATNCard p={p} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  grid: {
    gap: 12,
  },
  // Card shell
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitleBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 12,
    fontWeight: '400',
  },
  divider: {
    height: 1,
  },

  // ── Tu posición ──
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  rankIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankFlag: {
    fontSize: 20,
    width: 30,
    textAlign: 'center',
  },
  rankLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  rankValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // ── Proyección RBI ──
  rbiHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rbiValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  rbiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rbiTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rbiStats: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  rbiStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rbiStatLabel: {
    fontSize: 13,
  },
  rbiStatValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Mis ATN ──
  atnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },
  atnLabelBlock: {
    flex: 1,
    gap: 2,
  },
  atnLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  atnSublabel: {
    fontSize: 11,
  },
  atnValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  atnTotal: {
    borderTopWidth: 1,
  },
  atnTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  atnTotalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  atnTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});

import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  Coins,
  Flag,
  Globe,
  MapPinned,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideProps,
} from 'lucide-react-native';

const GlobeIcon = Globe as React.FC<LucideProps>;
const CoinsIcon = Coins as React.FC<LucideProps>;
const TrendingUpIcon = TrendingUp as React.FC<LucideProps>;
const SparklesIcon = Sparkles as React.FC<LucideProps>;
const WalletIcon = Wallet as React.FC<LucideProps>;
const FlagIcon = Flag as React.FC<LucideProps>;
const MapPinnedIcon = MapPinned as React.FC<LucideProps>;

interface DashboardSummaryCardsProps {
  isDark: boolean;
}

function getPalette(isDark: boolean) {
  return isDark
    ? {
        cardBg: 'rgba(249,250,252,0.96)',
        cardBorder: 'rgba(112,124,151,0.28)',
        cardShadow: 'rgba(12,18,38,0.28)',
        title: '#313A91',
        subtitle: '#566287',
        copy: '#636A82',
        muted: '#7A8098',
        accent: '#11826B',
        accentSoft: 'rgba(17,130,107,0.11)',
        accentStrong: '#0E8D71',
        warning: '#D2A12F',
        warningSoft: 'rgba(210,161,47,0.16)',
        line: 'rgba(69,80,118,0.14)',
        panelBg: 'rgba(236,239,244,0.88)',
        panelBorder: 'rgba(119,126,155,0.24)',
        iconBg: 'rgba(49,58,145,0.08)',
        iconColor: '#313A91',
      }
    : {
        cardBg: '#FBFCFE',
        cardBorder: 'rgba(112,124,151,0.22)',
        cardShadow: 'rgba(12,18,38,0.14)',
        title: '#313A91',
        subtitle: '#566287',
        copy: '#636A82',
        muted: '#7A8098',
        accent: '#11826B',
        accentSoft: 'rgba(17,130,107,0.10)',
        accentStrong: '#0E8D71',
        warning: '#D2A12F',
        warningSoft: 'rgba(210,161,47,0.16)',
        line: 'rgba(69,80,118,0.12)',
        panelBg: '#F1F4F8',
        panelBorder: 'rgba(119,126,155,0.22)',
        iconBg: 'rgba(49,58,145,0.08)',
        iconColor: '#313A91',
      };
}

function SummaryCard({
  children,
  p,
}: {
  children: React.ReactNode;
  p: ReturnType<typeof getPalette>;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: p.cardBg,
          borderColor: p.cardBorder,
          boxShadow: `0px 14px 32px ${p.cardShadow}`,
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
    <View style={styles.titleBlock}>
      <Text style={[styles.title, { color: p.title }]}>{label}</Text>
      <Text style={[styles.subtitle, { color: p.subtitle }]}>{sub}</Text>
    </View>
  );
}

function Divider({ p }: { p: ReturnType<typeof getPalette> }) {
  return <View style={[styles.divider, { backgroundColor: p.line }]} />;
}

function PositionRow({
  icon,
  label,
  value,
  p,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  p: ReturnType<typeof getPalette>;
}) {
  return (
    <View style={styles.positionRow}>
      <View style={[styles.positionIcon, { backgroundColor: p.iconBg }]}>{icon}</View>
      <Text style={[styles.positionLabel, { color: p.title }]}>{label}</Text>
      <Text style={[styles.positionValue, { color: p.title }]}>{value}</Text>
    </View>
  );
}

function PositionCard({ p }: { p: ReturnType<typeof getPalette> }) {
  return (
    <SummaryCard p={p}>
      <CardTitle label='Tu posición' sub='Entre miembros de Airs By Alternun' p={p} />

      <View style={styles.positionList}>
        <PositionRow
          icon={<GlobeIcon size={18} color={p.accent} />}
          label='Global'
          value='#1.284'
          p={p}
        />
        <PositionRow
          icon={<Text style={styles.flagEmoji}>🇨🇴</Text>}
          label='Colombia'
          value='#132'
          p={p}
        />
        <PositionRow
          icon={<MapPinnedIcon size={18} color={p.iconColor} />}
          label='Medellín'
          value='#18'
          p={p}
        />
      </View>

      <View style={[styles.positionFooter, { borderTopColor: p.line }]}>
        <Text style={[styles.positionFootnote, { color: p.muted }]}>
          Ranking basado en Airs acumulados
        </Text>
      </View>
    </SummaryCard>
  );
}

function RBIStatRow({
  label,
  value,
  valueColor,
  p,
}: {
  label: string;
  value: string;
  valueColor?: string;
  p: ReturnType<typeof getPalette>;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: p.copy }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor ?? p.title }]}>{value}</Text>
    </View>
  );
}

function RBICard({ p }: { p: ReturnType<typeof getPalette> }) {
  return (
    <SummaryCard p={p}>
      <CardTitle label='Proyección RBI' sub='Ingreso estimado próximo ciclo' p={p} />

      <View style={styles.rbiHero}>
        <Text style={[styles.rbiValue, { color: p.accent }]}>≈ 14.2 ATN</Text>
        <View style={[styles.heroBadge, { backgroundColor: p.title }]}>
          <CoinsIcon size={14} color='#F8FAFC' />
        </View>
      </View>

      <Divider p={p} />

      <View style={styles.statList}>
        <RBIStatRow label='Pool RBI estimado:' value='$120.000' p={p} />
        <RBIStatRow label='Usuarios elegibles:' value='8.420' p={p} />
        <RBIStatRow label='Tu puntaje Airs:' value='12.480' valueColor={p.title} p={p} />
      </View>

      <Divider p={p} />

      <View style={[styles.calloutCard, { backgroundColor: p.warningSoft }]}>
        <View style={[styles.calloutIcon, { backgroundColor: 'rgba(255,255,255,0.48)' }]}>
          <SparklesIcon size={18} color={p.warning} />
        </View>
        <View style={styles.calloutBody}>
          <Text style={[styles.calloutTitle, { color: p.warning }]}>Boost activo</Text>
          <Text style={[styles.calloutText, { color: p.copy }]}>
            El RBI está +32% por incentivos especiales.
          </Text>
        </View>
      </View>

      <Divider p={p} />

      <View style={styles.tipRow}>
        <FlagIcon size={16} color={p.title} />
        <Text style={[styles.tipText, { color: p.copy }]}>
          Tip: Si alcanzas Platinum este mes, tu proyección subiría a ≈ 21 ATN.
        </Text>
      </View>
    </SummaryCard>
  );
}

function TokenRow({
  label,
  sublabel,
  value,
  p,
}: {
  label: string;
  sublabel: string;
  value: string;
  p: ReturnType<typeof getPalette>;
}) {
  return (
    <View style={styles.tokenRow}>
      <View style={styles.tokenLabelBlock}>
        <Text style={[styles.tokenLabel, { color: p.title }]}>{label}</Text>
        <Text style={[styles.tokenSubLabel, { color: p.muted }]}>{sublabel}</Text>
      </View>
      <Text style={[styles.tokenValue, { color: p.title }]}>{value}</Text>
    </View>
  );
}

function ATNCard({ p }: { p: ReturnType<typeof getPalette> }) {
  return (
    <SummaryCard p={p}>
      <CardTitle label='Mis ATN' sub='Tus tokens regenerativos' p={p} />

      <TokenRow label='ATN disponibles' sublabel='Listos para usar' value='1.240' p={p} />
      <Divider p={p} />
      <TokenRow label='ATN en stacking' sublabel='Participando en proyectos' value='3.000' p={p} />

      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: p.title }]}>Total ATN</Text>
        <View style={styles.totalValueWrap}>
          <TrendingUpIcon size={16} color={p.accent} />
          <Text style={[styles.totalValue, { color: p.accentStrong }]}>4.240</Text>
        </View>
      </View>

      <View
        style={[styles.walletPanel, { backgroundColor: p.panelBg, borderColor: p.panelBorder }]}
      >
        <View style={styles.walletPanelTop}>
          <Text style={[styles.walletPanelLabel, { color: p.title }]}>Wallet principal</Text>
          <Text style={[styles.walletPanelMeta, { color: p.muted }]}>Interna</Text>
        </View>
        <Text style={[styles.walletAddress, { color: p.copy }]}>0xA8f9...Wq77E4c2</Text>
        <View style={styles.walletLinkRow}>
          <WalletIcon size={15} color={p.title} />
          <Text style={[styles.walletLinkText, { color: p.title }]}>Gestionar wallet</Text>
        </View>
      </View>
    </SummaryCard>
  );
}

export default function DashboardSummaryCards({ isDark }: DashboardSummaryCardsProps) {
  const p = getPalette(isDark);
  const { width } = useWindowDimensions();
  const isMobile = width < 920;

  return (
    <View style={styles.root}>
      <View style={[styles.grid, isMobile ? styles.gridMobile : styles.gridDesktop]}>
        <View style={styles.cardSlot}>
          <PositionCard p={p} />
        </View>
        <View style={styles.cardSlot}>
          <RBICard p={p} />
        </View>
        <View style={styles.cardSlot}>
          <ATNCard p={p} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  grid: {
    gap: 18,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  gridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardSlot: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    flex: 1,
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  titleBlock: {
    gap: 6,
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },

  positionList: {
    gap: 18,
    paddingBottom: 18,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagEmoji: {
    fontSize: 18,
  },
  positionLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  positionValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  positionFooter: {
    marginTop: 'auto',
    borderTopWidth: 1,
    paddingTop: 12,
    alignItems: 'center',
  },
  positionFootnote: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  rbiHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  rbiValue: {
    flex: 1,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  heroBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statList: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  calloutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutBody: {
    flex: 1,
    gap: 2,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  calloutText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },

  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  tokenLabelBlock: {
    flex: 1,
    gap: 3,
  },
  tokenLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  tokenSubLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  tokenValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  totalValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  walletPanel: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  walletPanelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  walletPanelLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  walletPanelMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  walletAddress: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  walletLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletLinkText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

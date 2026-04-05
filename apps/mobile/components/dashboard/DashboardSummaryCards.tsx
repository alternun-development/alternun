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
  compact = false,
}: {
  children: React.ReactNode;
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          backgroundColor: p.cardBg,
          borderColor: p.cardBorder,
          boxShadow: compact ? `0px 10px 22px ${p.cardShadow}` : `0px 14px 32px ${p.cardShadow}`,
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
  compact = false,
}: {
  label: string;
  sub: string;
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
}) {
  return (
    <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
      <Text style={[styles.title, compact && styles.titleCompact, { color: p.title }]}>
        {label}
      </Text>
      <Text style={[styles.subtitle, compact && styles.subtitleCompact, { color: p.subtitle }]}>
        {sub}
      </Text>
    </View>
  );
}

function Divider({ p, compact = false }: { p: ReturnType<typeof getPalette>; compact?: boolean }) {
  return (
    <View style={[styles.divider, compact && styles.dividerCompact, { backgroundColor: p.line }]} />
  );
}

function PositionRow({
  icon,
  label,
  value,
  p,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
}) {
  return (
    <View style={[styles.positionRow, compact && styles.positionRowCompact]}>
      <View
        style={[
          styles.positionIcon,
          compact && styles.positionIconCompact,
          { backgroundColor: p.iconBg },
        ]}
      >
        {icon}
      </View>
      <Text
        style={[styles.positionLabel, compact && styles.positionLabelCompact, { color: p.title }]}
      >
        {label}
      </Text>
      <Text
        style={[styles.positionValue, compact && styles.positionValueCompact, { color: p.title }]}
      >
        {value}
      </Text>
    </View>
  );
}

function PositionCard({
  p,
  compact = false,
}: {
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
}) {
  return (
    <SummaryCard p={p} compact={compact}>
      <CardTitle
        label='Tu posición'
        sub='Entre miembros de Airs By Alternun'
        p={p}
        compact={compact}
      />

      <View style={[styles.positionList, compact && styles.positionListCompact]}>
        <PositionRow
          icon={<GlobeIcon size={18} color={p.accent} />}
          label='Global'
          value='#1.284'
          p={p}
          compact={compact}
        />
        <PositionRow
          icon={<Text style={styles.flagEmoji}>🇨🇴</Text>}
          label='Colombia'
          value='#132'
          p={p}
          compact={compact}
        />
        <PositionRow
          icon={<MapPinnedIcon size={18} color={p.iconColor} />}
          label='Medellín'
          value='#18'
          p={p}
          compact={compact}
        />
      </View>

      <View
        style={[
          styles.positionFooter,
          compact && styles.positionFooterCompact,
          { borderTopColor: p.line },
        ]}
      >
        <Text
          style={[
            styles.positionFootnote,
            compact && styles.positionFootnoteCompact,
            { color: p.muted },
          ]}
        >
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
  compact = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, compact && styles.statLabelCompact, { color: p.copy }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          compact && styles.statValueCompact,
          { color: valueColor ?? p.title },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function RBICard({ p, compact = false }: { p: ReturnType<typeof getPalette>; compact?: boolean }) {
  return (
    <SummaryCard p={p} compact={compact}>
      <CardTitle
        label='Proyección RBI'
        sub='Ingreso estimado próximo ciclo'
        p={p}
        compact={compact}
      />

      <View style={[styles.rbiHero, compact && styles.rbiHeroCompact]}>
        <Text style={[styles.rbiValue, compact && styles.rbiValueCompact, { color: p.accent }]}>
          ≈ 14.2 ATN
        </Text>
        <View
          style={[
            styles.heroBadge,
            compact && styles.heroBadgeCompact,
            { backgroundColor: p.title },
          ]}
        >
          <CoinsIcon size={14} color='#F8FAFC' />
        </View>
      </View>

      <Divider p={p} compact={compact} />

      <View style={[styles.statList, compact && styles.statListCompact]}>
        <RBIStatRow label='Pool RBI estimado:' value='$120.000' p={p} compact={compact} />
        <RBIStatRow label='Usuarios elegibles:' value='8.420' p={p} compact={compact} />
        <RBIStatRow
          label='Tu puntaje Airs:'
          value='12.480'
          valueColor={p.title}
          p={p}
          compact={compact}
        />
      </View>

      <Divider p={p} compact={compact} />

      <View
        style={[
          styles.calloutCard,
          compact && styles.calloutCardCompact,
          { backgroundColor: p.warningSoft },
        ]}
      >
        <View
          style={[
            styles.calloutIcon,
            compact && styles.calloutIconCompact,
            { backgroundColor: 'rgba(255,255,255,0.48)' },
          ]}
        >
          <SparklesIcon size={18} color={p.warning} />
        </View>
        <View style={styles.calloutBody}>
          <Text
            style={[
              styles.calloutTitle,
              compact && styles.calloutTitleCompact,
              { color: p.warning },
            ]}
          >
            Boost activo
          </Text>
          <Text
            style={[styles.calloutText, compact && styles.calloutTextCompact, { color: p.copy }]}
          >
            El RBI está +32% por incentivos especiales.
          </Text>
        </View>
      </View>

      <Divider p={p} compact={compact} />

      <View style={[styles.tipRow, compact && styles.tipRowCompact]}>
        <FlagIcon size={16} color={p.title} />
        <Text style={[styles.tipText, compact && styles.tipTextCompact, { color: p.copy }]}>
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
  compact = false,
}: {
  label: string;
  sublabel: string;
  value: string;
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
}) {
  return (
    <View style={[styles.tokenRow, compact && styles.tokenRowCompact]}>
      <View style={styles.tokenLabelBlock}>
        <Text style={[styles.tokenLabel, compact && styles.tokenLabelCompact, { color: p.title }]}>
          {label}
        </Text>
        <Text
          style={[styles.tokenSubLabel, compact && styles.tokenSubLabelCompact, { color: p.muted }]}
        >
          {sublabel}
        </Text>
      </View>
      <Text style={[styles.tokenValue, compact && styles.tokenValueCompact, { color: p.title }]}>
        {value}
      </Text>
    </View>
  );
}

function ATNCard({ p, compact = false }: { p: ReturnType<typeof getPalette>; compact?: boolean }) {
  return (
    <SummaryCard p={p} compact={compact}>
      <CardTitle label='Mis ATN' sub='Tus tokens regenerativos' p={p} compact={compact} />

      <TokenRow
        label='ATN disponibles'
        sublabel='Listos para usar'
        value='1.240'
        p={p}
        compact={compact}
      />
      <Divider p={p} compact={compact} />
      <TokenRow
        label='ATN en stacking'
        sublabel='Participando en proyectos'
        value='3.000'
        p={p}
        compact={compact}
      />

      <View style={[styles.totalRow, compact && styles.totalRowCompact]}>
        <Text style={[styles.totalLabel, compact && styles.totalLabelCompact, { color: p.title }]}>
          Total ATN
        </Text>
        <View style={styles.totalValueWrap}>
          <TrendingUpIcon size={16} color={p.accent} />
          <Text
            style={[
              styles.totalValue,
              compact && styles.totalValueCompact,
              { color: p.accentStrong },
            ]}
          >
            4.240
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.walletPanel,
          compact && styles.walletPanelCompact,
          { backgroundColor: p.panelBg, borderColor: p.panelBorder },
        ]}
      >
        <View style={styles.walletPanelTop}>
          <Text
            style={[
              styles.walletPanelLabel,
              compact && styles.walletPanelLabelCompact,
              { color: p.title },
            ]}
          >
            Wallet principal
          </Text>
          <Text
            style={[
              styles.walletPanelMeta,
              compact && styles.walletPanelMetaCompact,
              { color: p.muted },
            ]}
          >
            Interna
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.walletAddress, compact && styles.walletAddressCompact, { color: p.copy }]}
        >
          0xA8f9...Wq77E4c2
        </Text>
        <View style={styles.walletLinkRow}>
          <WalletIcon size={15} color={p.title} />
          <Text
            style={[
              styles.walletLinkText,
              compact && styles.walletLinkTextCompact,
              { color: p.title },
            ]}
          >
            Gestionar wallet
          </Text>
        </View>
      </View>
    </SummaryCard>
  );
}

export default function DashboardSummaryCards({ isDark }: DashboardSummaryCardsProps) {
  const p = getPalette(isDark);
  const { width } = useWindowDimensions();
  const isMobile = width < 920;
  const isCompactMobile = width < 520;

  return (
    <View style={[styles.root, isCompactMobile && styles.rootCompact]}>
      <View
        style={[
          styles.grid,
          isMobile ? styles.gridMobile : styles.gridDesktop,
          isCompactMobile && styles.gridCompact,
        ]}
      >
        <View style={styles.cardSlot}>
          <PositionCard p={p} compact={isCompactMobile} />
        </View>
        <View style={styles.cardSlot}>
          <RBICard p={p} compact={isCompactMobile} />
        </View>
        <View style={styles.cardSlot}>
          <ATNCard p={p} compact={isCompactMobile} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
  },
  rootCompact: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 24,
  },
  grid: {
    gap: 18,
  },
  gridCompact: {
    gap: 14,
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
  cardCompact: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  titleBlock: {
    gap: 6,
    marginBottom: 18,
  },
  titleBlockCompact: {
    gap: 4,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  titleCompact: {
    fontSize: 18,
    letterSpacing: -0.55,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  dividerCompact: {
    marginVertical: 10,
  },

  positionList: {
    gap: 18,
    paddingBottom: 18,
  },
  positionListCompact: {
    gap: 14,
    paddingBottom: 14,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionRowCompact: {
    gap: 10,
  },
  positionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  positionLabelCompact: {
    fontSize: 16,
  },
  positionValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  positionValueCompact: {
    fontSize: 21,
    letterSpacing: -0.6,
  },
  positionFooter: {
    marginTop: 'auto',
    borderTopWidth: 1,
    paddingTop: 12,
    alignItems: 'center',
  },
  positionFooterCompact: {
    paddingTop: 10,
  },
  positionFootnote: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  positionFootnoteCompact: {
    fontSize: 10,
  },

  rbiHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  rbiHeroCompact: {
    gap: 8,
    marginBottom: 4,
  },
  rbiValue: {
    flex: 1,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  rbiValueCompact: {
    fontSize: 24,
    letterSpacing: -0.75,
  },
  heroBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  statList: {
    gap: 10,
  },
  statListCompact: {
    gap: 8,
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
  statLabelCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  statValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  statValueCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  calloutCardCompact: {
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  calloutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  calloutBody: {
    flex: 1,
    gap: 2,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  calloutTitleCompact: {
    fontSize: 13,
  },
  calloutText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  calloutTextCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipRowCompact: {
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  tipTextCompact: {
    fontSize: 11,
    lineHeight: 16,
  },

  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  tokenRowCompact: {
    gap: 10,
    paddingVertical: 0,
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
  tokenLabelCompact: {
    fontSize: 14,
  },
  tokenSubLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  tokenSubLabelCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  tokenValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  tokenValueCompact: {
    fontSize: 20,
    letterSpacing: -0.55,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  totalRowCompact: {
    marginTop: 12,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  totalLabelCompact: {
    fontSize: 15,
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
  totalValueCompact: {
    fontSize: 22,
    letterSpacing: -0.65,
  },
  walletPanel: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  walletPanelCompact: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
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
  walletPanelLabelCompact: {
    fontSize: 13,
  },
  walletPanelMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  walletPanelMetaCompact: {
    fontSize: 12,
  },
  walletAddress: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  walletAddressCompact: {
    fontSize: 14,
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
  walletLinkTextCompact: {
    fontSize: 13,
  },
});

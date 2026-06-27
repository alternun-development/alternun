import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import {
  ChevronRight,
  Coins,
  Globe,
  MapPinned,
  TrendingUp,
  Wallet,
  type LucideProps,
} from 'lucide-react-native';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';

const GlobeIcon = Globe as React.FC<LucideProps>;
const CoinsIcon = Coins as React.FC<LucideProps>;
const TrendingUpIcon = TrendingUp as React.FC<LucideProps>;
const WalletIcon = Wallet as React.FC<LucideProps>;
const MapPinnedIcon = MapPinned as React.FC<LucideProps>;

interface AuthClient {
  getSessionToken(): Promise<string | null>;
}

interface UserPositions {
  globalRank: number | null;
  countryRank: number | null;
  cityRank: number | null;
  country: string | null;
  city: string | null;
}

interface DashboardSummaryCardsProps {
  isDark: boolean;
  onNavigate?: (key: string) => void;
  client?: AuthClient | null;
  signedIn?: boolean;
}

function getPalette(isDark: boolean): {
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  title: string;
  subtitle: string;
  copy: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  warning: string;
  warningSoft: string;
  line: string;
  panelBg: string;
  panelBorder: string;
  iconBg: string;
  iconColor: string;
  heroBadgeBg: string;
} {
  return isDark
    ? {
        cardBg: 'rgba(11,18,27,0.96)',
        cardBorder: 'rgba(124,146,182,0.18)',
        cardShadow: 'rgba(0,0,0,0.34)',
        title: '#DCE5FF',
        subtitle: '#93A4C8',
        copy: '#B5C0D6',
        muted: '#7F8AA4',
        accent: '#27C8A3',
        accentSoft: 'rgba(39,200,163,0.12)',
        accentStrong: '#4DE2BC',
        warning: '#E6B44E',
        warningSoft: 'rgba(230,180,78,0.14)',
        line: 'rgba(154,170,202,0.14)',
        panelBg: 'rgba(18,27,39,0.86)',
        panelBorder: 'rgba(128,146,184,0.18)',
        iconBg: 'rgba(58,78,124,0.28)',
        iconColor: '#9FB2FF',
        heroBadgeBg: '#3140A8',
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
        heroBadgeBg: '#313A91',
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
}): React.JSX.Element {
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
}): React.JSX.Element {
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

function Divider({
  p,
  compact = false,
}: {
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
}): React.JSX.Element {
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
}): React.JSX.Element {
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
  client,
  signedIn,
}: {
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
  client?: AuthClient | null;
  signedIn?: boolean;
}): React.JSX.Element {
  const t = useAppTranslation();
  const [positions, setPositions] = useState<UserPositions | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signedIn || !client) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const token = await client.getSessionToken();
        if (!token || cancelled) return;
        const res = await fetch(`${resolveMobileApiBaseUrl()}/v1/airs/my-position`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          globalRank?: number | null;
          countryRank?: number | null;
          cityRank?: number | null;
          country?: string | null;
          city?: string | null;
        };
        if (!cancelled) {
          setPositions({
            globalRank: data.globalRank ?? null,
            countryRank: data.countryRank ?? null,
            cityRank: data.cityRank ?? null,
            country: data.country ?? null,
            city: data.city ?? null,
          });
        }
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, client]);

  const fmtRank = (rank: number | null | undefined): string =>
    rank != null ? `#${rank.toLocaleString()}` : '—';

  return (
    <SummaryCard p={p} compact={compact}>
      <CardTitle
        label={t.t('dashboard.summaryCards.position.title')}
        sub={t.t('dashboard.summaryCards.position.subtitle')}
        p={p}
        compact={compact}
      />

      {loading ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator size='small' color={p.accent} />
        </View>
      ) : (
        <View style={[styles.positionList, compact && styles.positionListCompact]}>
          <PositionRow
            icon={<GlobeIcon size={18} color={p.accent} />}
            label={t.t('dashboard.summaryCards.position.global')}
            value={fmtRank(positions?.globalRank)}
            p={p}
            compact={compact}
          />
          <PositionRow
            icon={<Text style={styles.flagEmoji}>🌍</Text>}
            label={positions?.country ?? t.t('dashboard.summaryCards.position.country')}
            value={fmtRank(positions?.countryRank)}
            p={p}
            compact={compact}
          />
          <PositionRow
            icon={<MapPinnedIcon size={18} color={p.iconColor} />}
            label={positions?.city ?? t.t('dashboard.summaryCards.position.city')}
            value={fmtRank(positions?.cityRank)}
            p={p}
            compact={compact}
          />
        </View>
      )}

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
          {t.t('dashboard.summaryCards.position.rankingNote')}
        </Text>
      </View>
    </SummaryCard>
  );
}

function RBICard({
  p,
  compact = false,
}: {
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
}): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const { language } = useAppPreferences();
  const t = useAppTranslation();

  const getDocumentationUrl = (): string => {
    const baseUrl = 'https://alternun-development.github.io';
    const pathEn = '/docs/tutorial-basics/rbi-regenerative-basic-income';
    const pathOther = `/${language}/docs/tutorial-basics/rbi-regenerative-basic-income`;

    return language === 'en' ? `${baseUrl}${pathEn}` : `${baseUrl}${pathOther}`;
  };

  return (
    <SummaryCard p={p} compact={compact}>
      <CardTitle
        label={t.t('dashboard.summaryCards.rbi.title')}
        sub={t.t('dashboard.summaryCards.rbi.subtitle')}
        p={p}
        compact={compact}
      />

      <View style={[styles.rbiHero, compact && styles.rbiHeroCompact]}>
        <Text style={[styles.rbiValue, compact && styles.rbiValueCompact, { color: p.accent }]}>
          Coming soon
        </Text>
        <View
          style={[
            styles.heroBadge,
            compact && styles.heroBadgeCompact,
            { backgroundColor: p.heroBadgeBg },
          ]}
        >
          <CoinsIcon size={14} color='#F8FAFC' />
        </View>
      </View>

      <Divider p={p} compact={compact} />

      <View style={[styles.statList, compact && styles.statListCompact]}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, compact && styles.statLabelCompact, { color: p.copy }]}>
            {t.t('dashboard.summaryCards.rbi.estimatedPool')}
          </Text>
          <Text style={[styles.statValue, compact && styles.statValueCompact, { color: p.title }]}>
            Coming soon
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, compact && styles.statLabelCompact, { color: p.copy }]}>
            {t.t('dashboard.summaryCards.rbi.eligibleUsers')}
          </Text>
          <Text style={[styles.statValue, compact && styles.statValueCompact, { color: p.title }]}>
            Coming soon
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, compact && styles.statLabelCompact, { color: p.copy }]}>
            {t.t('dashboard.summaryCards.rbi.airsScore')}
          </Text>
          <Text style={[styles.statValue, compact && styles.statValueCompact, { color: p.title }]}>
            Coming soon
          </Text>
        </View>
      </View>

      <Divider p={p} compact={compact} />

      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
        <View
          style={[
            styles.rbiInfoBox,
            compact && styles.rbiInfoBoxCompact,
            { backgroundColor: p.accentSoft, borderColor: p.accent },
          ]}
        >
          <View style={styles.rbiInfoHeader}>
            <Text
              style={[
                styles.rbiInfoTitle,
                compact && styles.rbiInfoTitleCompact,
                { color: p.accent },
              ]}
            >
              {t.t('dashboard.summaryCards.rbi.whatIsRbi')}
            </Text>
            <ChevronRight
              size={16}
              color={p.accent}
              style={{
                transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
              }}
            />
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <>
          <View style={[styles.rbiExplanation, compact && styles.rbiExplanationCompact]}>
            <Text
              style={[
                styles.rbiExplanationText,
                compact && styles.rbiExplanationTextCompact,
                { color: p.copy },
              ]}
            >
              {t.t('dashboard.summaryCards.rbi.explanation')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              void Linking.openURL(getDocumentationUrl());
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.rbiDocLink,
                compact && styles.rbiDocLinkCompact,
                { backgroundColor: p.accentSoft, borderColor: p.accent },
              ]}
            >
              <Text
                style={[
                  styles.rbiDocLinkText,
                  compact && styles.rbiDocLinkTextCompact,
                  { color: p.accent },
                ]}
              >
                {t.t('dashboard.summaryCards.rbi.fullDocumentation')}
              </Text>
              <ChevronRight size={14} color={p.accent} />
            </View>
          </TouchableOpacity>
        </>
      )}
    </SummaryCard>
  );
}

function ATNCard({
  p,
  compact = false,
  dense = false,
  onNavigate,
}: {
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
  dense?: boolean;
  onNavigate?: (key: string) => void;
}): React.JSX.Element {
  const useDenseLayout = compact || dense;
  const t = useAppTranslation();

  return (
    <SummaryCard p={p} compact={compact}>
      <CardTitle
        label={t.t('dashboard.summaryCards.atn.title')}
        sub={t.t('dashboard.summaryCards.atn.subtitle')}
        p={p}
        compact={compact}
      />

      <View style={[styles.tokenRow, compact && styles.tokenRowCompact]}>
        <View style={styles.tokenLabelBlock}>
          <Text
            style={[styles.tokenLabel, compact && styles.tokenLabelCompact, { color: p.title }]}
          >
            {t.t('dashboard.summaryCards.atn.availableLabel')}
          </Text>
          <Text
            style={[
              styles.tokenSubLabel,
              compact && styles.tokenSubLabelCompact,
              { color: p.muted },
            ]}
          >
            {t.t('dashboard.summaryCards.atn.availableDesc')}
          </Text>
        </View>
        <Text style={[styles.tokenValue, compact && styles.tokenValueCompact, { color: p.title }]}>
          Coming soon
        </Text>
      </View>
      <Divider p={p} compact={compact} />
      <View style={[styles.tokenRow, compact && styles.tokenRowCompact]}>
        <View style={styles.tokenLabelBlock}>
          <Text
            style={[styles.tokenLabel, compact && styles.tokenLabelCompact, { color: p.title }]}
          >
            {t.t('dashboard.summaryCards.atn.stackingLabel')}
          </Text>
          <Text
            style={[
              styles.tokenSubLabel,
              compact && styles.tokenSubLabelCompact,
              { color: p.muted },
            ]}
          >
            {t.t('dashboard.summaryCards.atn.stackingDesc')}
          </Text>
        </View>
        <Text style={[styles.tokenValue, compact && styles.tokenValueCompact, { color: p.title }]}>
          Coming soon
        </Text>
      </View>

      <View style={[styles.totalRow, compact && styles.totalRowCompact]}>
        <Text style={[styles.totalLabel, compact && styles.totalLabelCompact, { color: p.title }]}>
          {t.t('dashboard.summaryCards.atn.totalLabel')}
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
            Coming soon
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.walletPanel,
          useDenseLayout && styles.walletPanelDense,
          compact && styles.walletPanelCompact,
          { backgroundColor: p.panelBg, borderColor: p.panelBorder },
        ]}
      >
        <View style={[styles.walletPanelTop, useDenseLayout && styles.walletPanelTopDense]}>
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
              useDenseLayout && styles.walletPanelMetaDense,
              compact && styles.walletPanelMetaCompact,
              { color: p.muted },
            ]}
          >
            Interna
          </Text>
        </View>
        <Text
          numberOfLines={useDenseLayout ? 2 : 1}
          style={[
            styles.walletAddress,
            useDenseLayout && styles.walletAddressDense,
            compact && styles.walletAddressCompact,
            { color: p.copy },
          ]}
        >
          0xA8f9...Wq77E4c2
        </Text>
        <TouchableOpacity onPress={() => onNavigate?.('mi-perfil:wallet')} activeOpacity={0.7}>
          <View style={[styles.walletLinkRow, useDenseLayout && styles.walletLinkRowDense]}>
            <WalletIcon size={15} color={p.title} />
            <Text
              style={[
                styles.walletLinkText,
                useDenseLayout && styles.walletLinkTextDense,
                compact && styles.walletLinkTextCompact,
                { color: p.title },
              ]}
            >
              Gestionar wallet
            </Text>
            <ChevronRight size={14} color={p.title} />
          </View>
        </TouchableOpacity>
      </View>
    </SummaryCard>
  );
}

export default function DashboardSummaryCards({
  isDark,
  onNavigate,
  client,
  signedIn,
}: DashboardSummaryCardsProps): React.JSX.Element {
  const p = getPalette(isDark);
  const { width } = useWindowDimensions();
  const isMobile = width < 920;
  const isCompactMobile = width < 520;
  const isDenseAtnCard = width < 720;

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
          <PositionCard p={p} compact={isCompactMobile} client={client} signedIn={signedIn} />
        </View>
        <View style={styles.cardSlot}>
          <RBICard p={p} compact={isCompactMobile} />
        </View>
        <View style={styles.cardSlot}>
          <ATNCard p={p} compact={isCompactMobile} dense={isDenseAtnCard} onNavigate={onNavigate} />
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
    fontFamily: 'Sculpin-Bold',
  },
  titleCompact: {
    fontSize: 18,
    letterSpacing: -0.55,
    fontFamily: 'Sculpin-Bold',
  },
  subtitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  subtitleCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
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
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  positionLabelCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
  },
  positionValue: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  positionValueCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
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
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  rbiValueCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
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
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  statLabelCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  statValue: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  statValueCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
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
    overflow: 'hidden',
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
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '800',
  },
  calloutTitleCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
  },
  calloutText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  calloutTextCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    lineHeight: 15,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    paddingBottom: 4,
  },
  tipRowDense: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  tipRowCompact: {
    gap: 8,
    marginTop: 2,
  },
  tipText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  tipTextCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    lineHeight: 16,
    flexWrap: 'wrap',
  },
  tipTextDense: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },

  rbiInfoBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rbiInfoBoxCompact: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  rbiInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rbiInfoTitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  rbiInfoTitleCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
  },
  rbiExplanation: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rbiExplanationCompact: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rbiExplanationText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  rbiExplanationTextCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 18,
  },
  rbiDocLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  rbiDocLinkCompact: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  rbiDocLinkText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  rbiDocLinkTextCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
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
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  tokenLabelCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
  },
  tokenSubLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  tokenSubLabelCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    lineHeight: 14,
  },
  tokenValue: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  tokenValueCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
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
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  totalLabelCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 15,
  },
  totalValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalValue: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  totalValueCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 22,
    letterSpacing: -0.65,
  },
  walletPanel: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    overflow: 'hidden',
    width: '100%',
  },
  walletPanelDense: {
    gap: 8,
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
    minWidth: 0,
    flexWrap: 'wrap',
  },
  walletPanelTopDense: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  walletPanelLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  walletPanelLabelCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
  },
  walletPanelMeta: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
  },
  walletPanelMetaDense: {
    alignSelf: 'flex-start',
  },
  walletPanelMetaCompact: {
    fontSize: 12,
  },
  walletAddress: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    minWidth: 0,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  walletAddressDense: {
    fontSize: 14,
    lineHeight: 18,
  },
  walletAddressCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  walletLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  walletLinkRowDense: {
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  walletLinkText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '800',
  },
  walletLinkTextDense: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
  },
  walletLinkTextCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
  },
});

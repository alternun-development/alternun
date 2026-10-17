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
import { ChevronDown, ChevronRight, Coins, Wallet, type LucideProps } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import { listWalletAccounts, type WalletAccountRecord } from '../wallet/walletApiClient';
import { resolveWalletSummaryState } from './walletSummary';
import { getDashboardSummaryCardsLayout } from './dashboardSummaryCardsLayout';
import { calculateRbiProjection } from './rbiProjection';

const CoinsIcon = Coins as React.FC<LucideProps>;
const WalletIcon = Wallet as React.FC<LucideProps>;
const ChevronDownIcon = ChevronDown as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;

interface AuthClient {
  getSessionToken(): Promise<string | null>;
}

export interface RewardAsset {
  id: string;
  name: string;
  value?: number | string | null;
  icon: React.ReactNode;
}

interface DashboardSummaryCardsProps {
  isDark: boolean;
  onNavigate?: (key: string) => void;
  client?: AuthClient;
  signedIn?: boolean;
  airsBalance?: number | null;
  participationFactor?: number | null;
  communityEligibleAirs?: number | null;
  rewardAssets?: readonly RewardAsset[];
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
  mobile = false,
  testID,
  minHeight,
}: {
  children: React.ReactNode;
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
  mobile?: boolean;
  testID?: string;
  minHeight?: number;
}): React.JSX.Element {
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        compact && styles.cardCompact,
        mobile && styles.cardMobile,
        // Desktop (minHeight is a number, from desktopMinHeight): flex: 1 lets
        // the two cards stretch to equal height across the row. Mobile
        // (minHeight undefined): flexBasis: 'auto' preserves cardMobile's
        // content-based sizing — flex: 0 alone still resolves to CSS
        // flex-basis: 0%, which collapses the card to just `minHeight` (100)
        // and lets content below that point render outside the card's border.
        typeof minHeight === 'number' ? { flex: 1 } : { flex: 0, flexBasis: 'auto' },
        {
          backgroundColor: p.cardBg,
          borderColor: p.cardBorder,
          boxShadow: compact ? `0px 10px 22px ${p.cardShadow}` : `0px 14px 32px ${p.cardShadow}`,
        },
        typeof minHeight === 'number' && { minHeight },
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
  mobile = false,
}: {
  label: string;
  sub: string;
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
  mobile?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.titleBlock,
        compact && styles.titleBlockCompact,
        mobile && styles.titleBlockMobile,
      ]}
    >
      <Text
        style={[
          styles.title,
          compact && styles.titleCompact,
          mobile && styles.titleMobile,
          { color: p.title },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.subtitle,
          compact && styles.subtitleCompact,
          mobile && styles.subtitleMobile,
          { color: p.subtitle },
        ]}
      >
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

const RBI_DOCUMENTATION_URL =
  'https://docs.alternun.io/docs/tutorial-basics/airs-tu-huella-regenerativa';
const TERMS_URL = 'https://docs.alternun.io/terms';
const PARTICIPATION_FACTOR_MARKS = [0, 15, 50, 100] as const;

function formatMetricValue(value: number | null): string | null {
  return value === null ? null : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatFactorPercent(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function RbiStatValue({
  value,
  loading,
  p,
  compact = false,
  dense = false,
}: {
  value: string | null;
  loading?: boolean;
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
  dense?: boolean;
}): React.JSX.Element {
  if (loading) {
    return <ActivityIndicator size='small' color={p.accent} />;
  }

  return (
    <Text
      style={[
        styles.statValue,
        compact && styles.statValueCompact,
        dense && styles.statValueDense,
        { color: p.title },
      ]}
    >
      {value ?? '—'}
    </Text>
  );
}

function RBICard({
  p,
  compact = false,
  mobile = false,
  dense = false,
  eligibleUsers,
  eligibleUsersLoading = false,
  airsScore,
  airsScoreLoading = false,
  participationFactor,
  communityEligibleAirs,
  minHeight,
}: {
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
  mobile?: boolean;
  dense?: boolean;
  eligibleUsers?: number | null;
  eligibleUsersLoading?: boolean;
  airsScore?: number | null;
  airsScoreLoading?: boolean;
  participationFactor?: number | null;
  communityEligibleAirs?: number | null;
  minHeight?: number;
}): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const useDenseLayout = dense;
  const t = useAppTranslation();
  const metrics = calculateRbiProjection({
    airs: airsScore,
    participationFactor,
    communityEligibleAirs,
  });
  const factorPercent = metrics.participationFactorPercent;
  const factorAvailable = factorPercent !== null;
  const factorValueText = factorAvailable
    ? `FP ${formatFactorPercent(factorPercent)} %`
    : t.t('dashboard.summaryCards.rbi.notAvailable');
  const markerOffset = factorPercent === 0 ? 0 : factorPercent === 100 ? -12 : -6;
  const metricRows = [
    {
      testID: 'dashboard-rbi-eligible-airs',
      label: t.t('dashboard.summaryCards.rbi.eligibleAirs'),
      value: formatMetricValue(metrics.eligibleAirs),
      loading: airsScoreLoading && participationFactor != null,
    },
    {
      testID: 'dashboard-rbi-eligible-users',
      label: t.t('dashboard.summaryCards.rbi.eligibleUsers'),
      value: typeof eligibleUsers === 'number' ? eligibleUsers.toLocaleString() : null,
      loading: eligibleUsersLoading,
    },
    {
      testID: 'dashboard-rbi-aliquot',
      label: t.t('dashboard.summaryCards.rbi.aliquot'),
      value: metrics.aliquotPercent === null ? null : `${metrics.aliquotPercent.toFixed(2)} %`,
      loading: false,
    },
  ];

  return (
    <SummaryCard
      p={p}
      compact={compact}
      mobile={mobile}
      testID='dashboard-rbi-card'
      minHeight={minHeight}
    >
      <CardTitle
        label={t.t('dashboard.summaryCards.rbi.title')}
        sub={t.t('dashboard.summaryCards.rbi.subtitle')}
        p={p}
        compact={compact}
        mobile={mobile}
      />

      <View
        testID='dashboard-rbi-status'
        accessibilityRole='adjustable'
        accessibilityLabel={t.t('dashboard.summaryCards.rbi.subtitle')}
        accessibilityState={{ disabled: !factorAvailable }}
        aria-disabled={!factorAvailable}
        aria-valuetext={factorValueText}
        aria-valuenow={factorPercent ?? undefined}
        accessibilityValue={
          factorAvailable
            ? { min: 0, max: 100, now: factorPercent, text: factorValueText }
            : { text: factorValueText }
        }
        style={[
          styles.factorPanel,
          compact && styles.factorPanelCompact,
          mobile && styles.factorPanelMobile,
          { backgroundColor: p.panelBg, borderColor: p.panelBorder },
        ]}
      >
        <View style={styles.factorHeader}>
          <Text style={[styles.factorLabel, { color: p.copy }]}>FP</Text>
          <Text
            testID='dashboard-rbi-factor-value'
            style={[styles.factorValueText, { color: factorAvailable ? p.title : p.muted }]}
          >
            {factorValueText}
          </Text>
        </View>
        <View style={styles.factorTrackArea}>
          <View style={styles.factorGradientTrack}>
            <Svg width='100%' height='100%' viewBox='0 0 100 12' preserveAspectRatio='none'>
              <Defs>
                <LinearGradient id='rbi-factor-gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                  <Stop offset='0%' stopColor={factorAvailable ? '#D6534D' : p.muted} />
                  <Stop offset='100%' stopColor={factorAvailable ? '#219A70' : p.muted} />
                </LinearGradient>
              </Defs>
              <Rect width='100' height='12' rx='6' fill='url(#rbi-factor-gradient)' />
            </Svg>
          </View>
          {PARTICIPATION_FACTOR_MARKS.map((mark) => (
            <View
              key={mark}
              style={[
                styles.factorTick,
                {
                  left: `${mark}%`,
                  backgroundColor: factorAvailable ? '#FFFFFF' : p.cardBg,
                },
              ]}
            />
          ))}
          {factorAvailable && (
            <View
              testID='dashboard-rbi-factor-marker'
              accessibilityLabel={factorValueText}
              style={[
                styles.factorMarker,
                {
                  left: `${factorPercent}%`,
                  borderColor: p.cardBg,
                  backgroundColor: p.title,
                  transform: [{ translateX: markerOffset }],
                },
              ]}
            />
          )}
        </View>
        <View style={styles.factorMarks}>
          {PARTICIPATION_FACTOR_MARKS.map((mark) => (
            <View
              key={mark}
              testID={`dashboard-rbi-factor-mark-${mark}`}
              style={[
                styles.factorMarkLabelWrap,
                mark === 0 && styles.factorMarkLabelStart,
                mark === 100 && styles.factorMarkLabelEnd,
                mark > 0 &&
                  mark < 100 && {
                    left: `${mark}%`,
                    transform: [{ translateX: -18 }],
                  },
              ]}
            >
              <Text style={[styles.factorMarkLabel, { color: p.muted }]}>{mark} %</Text>
            </View>
          ))}
        </View>
      </View>

      <Divider p={p} compact={compact} />

      <View style={[styles.statList, compact && styles.statListCompact]}>
        {metricRows.map((row) => (
          <View
            key={row.testID}
            testID={row.testID}
            style={[
              styles.statRow,
              useDenseLayout && styles.statRowDense,
              mobile && styles.statRowMobile,
              mobile && { backgroundColor: p.panelBg, borderColor: p.panelBorder },
            ]}
          >
            <Text style={[styles.statLabel, compact && styles.statLabelCompact, { color: p.copy }]}>
              {row.label}
            </Text>
            <RbiStatValue
              value={row.value}
              loading={row.loading}
              p={p}
              compact={compact}
              dense={useDenseLayout}
            />
          </View>
        ))}
      </View>

      <Divider p={p} compact={compact} />

      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={t.t('dashboard.summaryCards.rbi.whatIsRbi')}
      >
        <View
          style={[
            styles.rbiInfoBox,
            compact && styles.rbiInfoBoxCompact,
            useDenseLayout && styles.rbiInfoBoxDense,
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
            {isExpanded ? (
              <ChevronDownIcon size={16} color={p.accent} />
            ) : (
              <ChevronRightIcon size={16} color={p.accent} />
            )}
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
              void Linking.openURL(RBI_DOCUMENTATION_URL);
            }}
            activeOpacity={0.7}
            accessibilityRole='link'
            accessibilityLabel={t.t('dashboard.summaryCards.rbi.fullDocumentation')}
          >
            <View
              style={[
                styles.rbiDocLink,
                compact && styles.rbiDocLinkCompact,
                useDenseLayout && styles.rbiDocLinkDense,
                { backgroundColor: p.accentSoft, borderColor: p.accent },
              ]}
            >
              <Text
                style={[
                  styles.rbiDocLinkText,
                  compact && styles.rbiDocLinkTextCompact,
                  useDenseLayout && styles.rbiDocLinkTextDense,
                  { color: p.accent },
                ]}
              >
                {t.t('dashboard.summaryCards.rbi.fullDocumentation')}
              </Text>
              <ChevronRightIcon size={14} color={p.accent} />
            </View>
          </TouchableOpacity>
        </>
      )}

      <View style={[styles.factorNote, compact && styles.factorNoteCompact]}>
        <Text style={[styles.factorNoteText, { color: p.copy }]}>
          {t.t('dashboard.summaryCards.rbi.participationNote')}{' '}
        </Text>
        <TouchableOpacity
          onPress={() => {
            void Linking.openURL(TERMS_URL);
          }}
          accessibilityRole='link'
          accessibilityLabel={t.t('dashboard.summaryCards.rbi.termsAndConditions')}
          activeOpacity={0.7}
        >
          <Text style={[styles.factorTermsLink, { color: p.accent }]}>
            {t.t('dashboard.summaryCards.rbi.termsAndConditions')}
          </Text>
        </TouchableOpacity>
      </View>
    </SummaryCard>
  );
}

function truncateMiddle(value: string, start = 8, end = 6): string {
  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function ATNCard({
  p,
  compact = false,
  mobile = false,
  dense = false,
  onNavigate,
  walletAccount,
  assets,
  minHeight,
}: {
  p: ReturnType<typeof getPalette>;
  compact?: boolean;
  mobile?: boolean;
  dense?: boolean;
  onNavigate?: (key: string) => void;
  walletAccount?: WalletAccountRecord | null;
  assets?: readonly RewardAsset[];
  minHeight?: number;
}): React.JSX.Element {
  const useDenseLayout = dense;
  const t = useAppTranslation();
  const comingSoonLabel = t.t('dashboard.summaryCards.comingSoon');
  const primaryWalletLabel = t.t('dashboard.summaryCards.atn.primaryWalletLabel');
  const primaryWalletMeta = t.t('dashboard.summaryCards.atn.primaryWalletMeta');
  const walletSummaryState = resolveWalletSummaryState(walletAccount ?? null);
  const walletAddress = walletSummaryState.address
    ? truncateMiddle(walletSummaryState.address)
    : null;
  const defaultAtnAsset: RewardAsset = {
    id: 'atn',
    name: t.t('dashboard.summaryCards.atn.assetName'),
    value: null,
    icon: <CoinsIcon size={18} color={p.accent} />,
  };
  const suppliedAssets = assets ?? [];
  const suppliedAtn = suppliedAssets.find((asset) => asset.id.toLowerCase() === 'atn');
  const orderedAssets = [
    suppliedAtn ?? defaultAtnAsset,
    ...suppliedAssets.filter((asset) => asset.id.toLowerCase() !== 'atn'),
  ];
  const redeemActionLabel = t.t('dashboard.summaryCards.atn.redeemAction');

  return (
    <SummaryCard
      p={p}
      compact={compact}
      mobile={mobile}
      testID='dashboard-atn-card'
      minHeight={minHeight}
    >
      <CardTitle
        label={t.t('dashboard.summaryCards.atn.title')}
        sub={t.t('dashboard.summaryCards.atn.subtitle')}
        p={p}
        compact={compact}
        mobile={mobile}
      />

      <View style={[styles.assetList, compact && styles.assetListCompact]}>
        {orderedAssets.map((asset, index) => (
          <React.Fragment key={asset.id}>
            <View
              testID={`dashboard-atn-asset-${asset.id}`}
              style={[
                styles.tokenRow,
                compact && styles.tokenRowCompact,
                useDenseLayout && styles.tokenRowDense,
                mobile && styles.tokenRowMobile,
                mobile && { backgroundColor: p.panelBg, borderColor: p.panelBorder },
              ]}
            >
              <View style={styles.tokenIdentity}>
                <View
                  accessibilityRole='image'
                  accessibilityLabel={asset.name}
                  style={[styles.tokenIcon, { backgroundColor: p.accentSoft }]}
                >
                  {asset.icon}
                </View>
                <Text
                  style={[
                    styles.tokenLabel,
                    compact && styles.tokenLabelCompact,
                    { color: p.title },
                  ]}
                >
                  {asset.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.tokenValue,
                  compact && styles.tokenValueCompact,
                  useDenseLayout && styles.tokenValueDense,
                  { color: p.title },
                ]}
              >
                {typeof asset.value === 'number'
                  ? asset.value.toLocaleString()
                  : asset.value ?? comingSoonLabel}
              </Text>
            </View>
            {index < orderedAssets.length - 1 && <Divider p={p} compact={compact} />}
          </React.Fragment>
        ))}
      </View>

      <View
        style={[
          styles.walletPanel,
          useDenseLayout && styles.walletPanelDense,
          compact && styles.walletPanelCompact,
          mobile && styles.walletPanelMobile,
          { backgroundColor: p.accentSoft, borderColor: p.accent },
        ]}
      >
        <View style={[styles.walletPanelTop, useDenseLayout && styles.walletPanelTopDense]}>
          <Text
            style={[
              styles.walletPanelLabel,
              compact && styles.walletPanelLabelCompact,
              { color: p.accent },
            ]}
          >
            {primaryWalletLabel}
          </Text>
          <Text
            style={[
              styles.walletPanelMeta,
              useDenseLayout && styles.walletPanelMetaDense,
              compact && styles.walletPanelMetaCompact,
              { color: p.muted },
            ]}
          >
            {primaryWalletMeta}
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
          {walletSummaryState.mode === 'ready' && walletAddress
            ? walletAddress
            : t.t(
                'wallet.noWalletAccount',
                undefined,
                'There is no data for your rewards wallet yet'
              )}
        </Text>

        <View style={[styles.walletLinkDivider, { backgroundColor: p.accent, opacity: 0.18 }]} />

        <TouchableOpacity onPress={() => onNavigate?.('mi-perfil:wallet')} activeOpacity={0.7}>
          <View style={[styles.walletLinkRow, useDenseLayout && styles.walletLinkRowDense]}>
            <View style={styles.walletLinkLabelGroup}>
              <WalletIcon size={15} color={p.accent} />
              <Text
                numberOfLines={1}
                ellipsizeMode='tail'
                style={[
                  styles.walletLinkText,
                  useDenseLayout && styles.walletLinkTextDense,
                  compact && styles.walletLinkTextCompact,
                  { color: p.accent },
                ]}
              >
                {walletSummaryState.mode === 'ready'
                  ? t.t('wallet.manageWallet', undefined, 'Manage rewards wallet')
                  : t.t('wallet.createButton', undefined, 'Create rewards wallet')}
              </Text>
            </View>
            <ChevronRightIcon size={14} color={p.accent} />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        testID='dashboard-atn-redeem-action'
        accessibilityRole='button'
        accessibilityLabel={`${redeemActionLabel}. ${comingSoonLabel}`}
        accessibilityState={{ disabled: true }}
        disabled
        style={[
          styles.redeemAction,
          compact && styles.redeemActionCompact,
          { backgroundColor: p.panelBg, borderColor: p.panelBorder },
        ]}
      >
        <Text style={[styles.redeemActionText, { color: p.copy }]}>{redeemActionLabel}</Text>
        <Text style={[styles.redeemActionStatus, { color: p.muted }]}>{comingSoonLabel}</Text>
      </TouchableOpacity>
    </SummaryCard>
  );
}

export default function DashboardSummaryCards({
  isDark,
  onNavigate,
  client,
  signedIn,
  airsBalance,
  participationFactor,
  communityEligibleAirs,
  rewardAssets,
}: DashboardSummaryCardsProps): React.JSX.Element {
  const p = getPalette(isDark);
  const { width, fontScale = 1 } = useWindowDimensions();
  const { isMobile, isCompactMobile, isDenseAtnCard } = getDashboardSummaryCardsLayout(
    width,
    fontScale
  );
  const desktopMinHeight = isMobile ? undefined : 480;
  const [eligibleUsers, setEligibleUsers] = useState<number | null>(null);
  const [eligibleUsersLoading, setEligibleUsersLoading] = useState(false);
  const [walletAccount, setWalletAccount] = useState<WalletAccountRecord | null>(null);
  const airsScoreLoading = Boolean(signedIn) && typeof airsBalance !== 'number';

  useEffect(() => {
    if (!signedIn || !client) {
      return;
    }

    let cancelled = false;
    setEligibleUsersLoading(true);

    const fetchEligibleUsers = async (): Promise<void> => {
      try {
        const token = await client.getSessionToken();
        if (!token) {
          return;
        }
        const res = await fetch(`${resolveMobileApiBaseUrl()}/v1/airs/leaderboard?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { totalEligibleUsers?: number };
        if (!cancelled && typeof data.totalEligibleUsers === 'number') {
          setEligibleUsers(data.totalEligibleUsers);
        }
      } catch {
        // Leave eligibleUsers as null; the card renders the unavailable state.
      } finally {
        if (!cancelled) {
          setEligibleUsersLoading(false);
        }
      }
    };

    void fetchEligibleUsers();

    return () => {
      cancelled = true;
    };
  }, [signedIn, client]);

  useEffect(() => {
    if (!signedIn || !client) {
      setWalletAccount(null);
      return;
    }

    let cancelled = false;
    setWalletAccount(null);

    const fetchWalletAccount = async (): Promise<void> => {
      try {
        const { accounts } = await listWalletAccounts(client);
        if (cancelled) {
          return;
        }

        const primary = accounts.find((account) => account.isPrimary) ?? accounts[0] ?? null;
        setWalletAccount(primary);
      } catch {
        if (!cancelled) {
          setWalletAccount(null);
        }
      }
    };

    void fetchWalletAccount();

    return () => {
      cancelled = true;
    };
  }, [client, signedIn]);

  return (
    <View style={[styles.root, isCompactMobile && styles.rootCompact]}>
      <View
        style={[
          styles.grid,
          isMobile ? styles.gridMobile : styles.gridDesktop,
          isCompactMobile && styles.gridCompact,
        ]}
      >
        <View style={[styles.cardSlot, isMobile && styles.cardSlotMobile]}>
          <RBICard
            p={p}
            compact={isCompactMobile}
            mobile={isMobile}
            dense={isDenseAtnCard}
            eligibleUsers={eligibleUsers}
            eligibleUsersLoading={eligibleUsersLoading}
            airsScore={airsBalance}
            airsScoreLoading={airsScoreLoading}
            participationFactor={participationFactor}
            communityEligibleAirs={communityEligibleAirs}
            minHeight={desktopMinHeight}
          />
        </View>
        <View style={[styles.cardSlot, isMobile && styles.cardSlotMobile]}>
          <ATNCard
            p={p}
            compact={isCompactMobile}
            mobile={isMobile}
            dense={isDenseAtnCard}
            onNavigate={onNavigate}
            walletAccount={walletAccount}
            assets={rewardAssets}
            minHeight={desktopMinHeight}
          />
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
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  gridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardSlot: {
    flex: 1,
    minWidth: 0,
  },
  cardSlotMobile: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    alignSelf: 'stretch',
    width: '100%',
    overflow: 'visible',
  },
  card: {
    flex: 1,
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    alignSelf: 'stretch',
    width: '100%',
  },
  cardCompact: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  cardMobile: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  titleBlock: {
    gap: 6,
    marginBottom: 18,
  },
  titleBlockCompact: {
    gap: 4,
    marginBottom: 14,
  },
  titleBlockMobile: {
    gap: 5,
    marginBottom: 16,
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
  titleMobile: {
    fontSize: 20,
    letterSpacing: -0.65,
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
  subtitleMobile: {
    fontSize: 12,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  dividerCompact: {
    marginVertical: 10,
  },

  factorPanel: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  factorPanelCompact: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  factorPanelMobile: {
    width: '100%',
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  factorLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '800',
  },
  factorValueText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  factorTrackArea: {
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  factorGradientTrack: {
    height: 12,
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  factorTick: {
    position: 'absolute',
    width: 2,
    height: 12,
    top: 4,
    opacity: 0.78,
  },
  factorMarker: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
  },
  factorMarks: {
    height: 16,
    position: 'relative',
  },
  factorMarkLabelWrap: {
    position: 'absolute',
    top: 0,
    width: 36,
  },
  factorMarkLabelStart: {
    left: 0,
  },
  factorMarkLabelEnd: {
    right: 0,
  },
  factorMarkLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
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
  statRowDense: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  statRowMobile: {
    borderWidth: 1,
    borderRadius: 14,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    minWidth: 0,
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
    flexShrink: 1,
    minWidth: 0,
  },
  statValueCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  statValueDense: {
    textAlign: 'left',
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
  rbiInfoBoxDense: {
    paddingHorizontal: 10,
    paddingVertical: 10,
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
    minWidth: 0,
  },
  rbiInfoTitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 0,
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
    minWidth: 0,
  },
  rbiDocLinkCompact: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  rbiDocLinkDense: {
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  rbiDocLinkText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 0,
  },
  rbiDocLinkTextCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
  },
  rbiDocLinkTextDense: {
    textAlign: 'left',
  },
  factorNote: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  factorNoteCompact: {
    marginTop: 12,
  },
  factorNoteText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  factorTermsLink: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  assetList: {
    gap: 10,
    marginBottom: 16,
  },
  assetListCompact: {
    gap: 8,
    marginBottom: 12,
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
  tokenRowDense: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  tokenRowMobile: {
    borderWidth: 1,
    borderRadius: 14,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  tokenIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  tokenIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    flexShrink: 0,
  },
  tokenLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    minWidth: 0,
  },
  tokenLabelCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
  },
  tokenValue: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  tokenValueCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  tokenValueDense: {
    textAlign: 'left',
    marginLeft: 46,
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
  walletPanelMobile: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
  walletLinkDivider: {
    height: 1,
    width: '100%',
    borderRadius: 1,
  },
  walletLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    minWidth: 0,
  },
  walletLinkRowDense: {
    alignItems: 'center',
  },
  walletLinkLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  walletLinkText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
    minWidth: 0,
  },
  walletLinkTextDense: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
  },
  walletLinkTextCompact: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
  },
  redeemAction: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    opacity: 0.72,
  },
  redeemActionCompact: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  redeemActionText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  redeemActionStatus: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
});

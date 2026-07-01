import type { User } from '../components/auth/AppAuthProvider';
import { useLocalSearchParams, useRouter, type Router } from 'expo-router';
import {
  Award,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Copy,
  Globe,
  LogOut,
  MapPin,
  Moon,
  Settings,
  Shield,
  ShieldCheck,
  Trophy,
  UserCircle2,
  Wallet,
  type LucideProps,
} from 'lucide-react-native';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ToastAndroid,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COUNTRIES, countryFlag, type Country } from '../utils/countries';
import { detectLocationFromIP } from '../utils/geolocation';
import { CountryPickerModal } from '../components/profile/CountryPickerModal';
import { CityPickerModal } from '../components/profile/CityPickerModal';
import * as Clipboard from 'expo-clipboard';
import { getLocaleLabel } from '@alternun/i18n';
import { GlassCard, SectionContainer, resolveTier } from '@alternun/ui';
import type { TierSpec } from '@alternun/ui';
import { useAuth } from '../components/auth/AppAuthProvider';
import { useAppTranslation } from '../components/i18n/useAppTranslation';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import WalletCreationFlow from '../components/wallet/WalletCreationFlow';
import WalletAddAccountFlow from '../components/wallet/WalletAddAccountFlow';
import WalletRestoreFlow from '../components/wallet/WalletRestoreFlow';
import WalletManageModal from '../components/wallet/WalletManageModal';
import WalletImportKeystoreFlow from '../components/wallet/WalletImportKeystoreFlow';
import WalletChangePinFlow from '../components/wallet/WalletChangePinFlow';
import {
  getWalletBalances,
  listWalletAccounts,
  verifyWalletPin,
  type AuthClient,
  type WalletAccountRecord,
  type WalletBalance,
} from '../components/wallet/walletApiClient';
import {
  CHAIN_META,
  formatChainAmount,
  getChainNetworkLabel,
} from '../components/wallet/chainMeta';
import WalletReceiveModal from '../components/wallet/WalletReceiveModal';
import WalletSendModal from '../components/wallet/WalletSendModal';
import WalletActivityModal from '../components/wallet/WalletActivityModal';
import WalletBackupScreen from '../components/wallet/WalletBackupScreen';
import PinUnlockScreen from '../components/wallet/PinUnlockScreen';
import { unlockMnemonicWithDiagnosis } from '@alternun/wallet';
import ScreenShell from '../components/common/ScreenShell';
import { PageTabBar, type TabItem } from '../components/common/PageTabBar';
import SearchFilterBar, { type SearchFilterOption } from '../components/common/SearchFilterBar';
import { resolveAppPackageVersion } from '../components/common/Footer.shared';
import profileStylesEnhanced from '../components/profile/ProfileStyles';
import { isTestnetRuntime, resolveMobileApiBaseUrl } from '../utils/runtimeConfig';
import { createShadowStyle } from '../components/theme/deprecatedStylesHelper';
import { resolveSessionTokenWithRetry } from '../components/auth/sessionToken';
import {
  AchievementBadge,
  AchievementTooltip,
  ACHIEVEMENT_CATALOG,
  type AchievementDef,
  type ColorPalette,
} from '../components/profile/AchievementBadge';
import { ReferralCard } from '../components/profile/ReferralCard';

const AwardIcon = Award as React.FC<LucideProps>;
const BellIcon = Bell as React.FC<LucideProps>;
const BellOffIcon = BellOff as React.FC<LucideProps>;
const CheckIcon = Check as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;
const GlobeIcon = Globe as React.FC<LucideProps>;
const LogOutIcon = LogOut as React.FC<LucideProps>;
const MapPinIcon = MapPin as React.FC<LucideProps>;
const MoonIcon = Moon as React.FC<LucideProps>;
const SettingsIcon = Settings as React.FC<LucideProps>;
const ShieldCheckIcon = ShieldCheck as React.FC<LucideProps>;
const TrophyIcon = Trophy as React.FC<LucideProps>;
const UserCircle2Icon = UserCircle2 as React.FC<LucideProps>;
const CopyIcon = Copy as React.FC<LucideProps>;
const WalletIcon = Wallet as React.FC<LucideProps>;

// ─── Data & Helpers ──────────────────────────────────────────────────────────

type UserMetadata = Record<string, unknown>;

interface AccountReferralSummary {
  user_created_at?: string | null;
  referred_by_user_id?: string | null;
  referred_by_referral_code?: string | null;
  referred_by_name?: string | null;
  referred_by_email?: string | null;
}

const NETWORKS = [
  { name: 'Polygon', color: '#8247e5' },
  { name: 'Ethereum', color: '#627eea' },
  { name: 'Celo', color: '#35d07f' },
];

type TierLabelMap = {
  bronze: string;
  silver: string;
  gold: string;
  platinum: string;
};

type AuthMethodDescriptor =
  | { kind: 'guest' }
  | { kind: 'wallet' }
  | { kind: 'email' }
  | { kind: 'session' }
  | { kind: 'provider'; provider: string };

function getMetadata(user: User | null): UserMetadata {
  if (!user?.metadata || typeof user.metadata !== 'object') return {};
  return user.metadata as UserMetadata;
}

function normalizeDateCandidate(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }

  return null;
}

function resolveAccountCreatedAt(
  user: User | null,
  referralSummary: AccountReferralSummary | null
): string | null {
  if (!user) return null;

  const metadata = getMetadata(user);
  const userRecord = user as User & Record<string, unknown>;
  const candidates = [
    referralSummary?.user_created_at,
    userRecord.createdAt,
    userRecord.created_at,
    metadata.createdAt,
    metadata.created_at,
    metadata.created,
    metadata.registeredAt,
    metadata.registered_at,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeDateCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function formatAccountCreatedAt(value: string | null, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function resolveProfileLocation(user: User | null): string | null {
  if (!user) return null;
  const metadata = getMetadata(user);
  const country = typeof metadata.country === 'string' ? metadata.country.trim() : '';
  const city = typeof metadata.city === 'string' ? metadata.city.trim() : '';
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return null;
}

function getAccountReferrerLabel(summary: AccountReferralSummary | null): string | null {
  return (
    summary?.referred_by_name ??
    summary?.referred_by_email ??
    summary?.referred_by_referral_code ??
    null
  );
}

function getProfileInfo(user: User | null): { displayName: string; email?: string } {
  if (!user) return { displayName: '' };
  const metadata = getMetadata(user);
  const firstName =
    typeof metadata.firstName === 'string'
      ? metadata.firstName
      : typeof metadata.first_name === 'string'
      ? metadata.first_name
      : '';
  const lastName =
    typeof metadata.lastName === 'string'
      ? metadata.lastName
      : typeof metadata.last_name === 'string'
      ? metadata.last_name
      : '';
  const fullNameFromParts = `${firstName} ${lastName}`.trim();
  const nameCandidates = [
    metadata.fullName,
    metadata.full_name,
    metadata.displayName,
    metadata.display_name,
    metadata.name,
    fullNameFromParts,
  ];
  const validName = nameCandidates.find(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  );
  const emailLocalPart =
    typeof user.email === 'string' && user.email.includes('@')
      ? user.email.split('@')[0]
      : undefined;
  const fallbackDisplayName =
    emailLocalPart ??
    (typeof user.providerUserId === 'string' && user.providerUserId.trim().length > 0
      ? truncateMiddle(user.providerUserId, 6, 4)
      : typeof user.id === 'string' && user.id.trim().length > 0
      ? truncateMiddle(user.id, 6, 4)
      : '');
  return { displayName: validName?.trim() ?? fallbackDisplayName, email: user.email };
}

function getWalletAddress(user: User | null): string {
  if (!user) return '';
  const metadata = getMetadata(user);
  const walletObject =
    typeof metadata.wallet === 'object' && metadata.wallet !== null
      ? (metadata.wallet as UserMetadata)
      : undefined;
  const candidates = [
    metadata.walletAddress,
    metadata.wallet_address,
    metadata.address,
    walletObject?.address,
    walletObject?.walletAddress,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('0x') && candidate.length >= 10)
      return candidate;
  }
  if (typeof user.providerUserId === 'string' && user.providerUserId.startsWith('0x'))
    return user.providerUserId;
  return '';
}

function getWalletProvider(user: User | null): string | null {
  if (!user) return null;
  const metadata = getMetadata(user);
  const provider =
    typeof metadata.walletProvider === 'string'
      ? metadata.walletProvider
      : typeof metadata.wallet_provider === 'string'
      ? metadata.wallet_provider
      : null;
  if (provider && provider.trim().length > 0) return provider.toLowerCase();
  if (typeof user.provider === 'string' && user.provider.startsWith('wallet:'))
    return user.provider.replace('wallet:', '').toLowerCase();
  return null;
}

function normalizeProviderName(provider: string): string {
  return provider
    .replace(/^(wallet|auth|oauth):/i, '')
    .trim()
    .toLowerCase();
}

function getAuthMethodDescriptor(user: User | null): AuthMethodDescriptor {
  if (!user) return { kind: 'guest' };

  const provider = typeof user.provider === 'string' ? user.provider.trim() : '';
  if (provider.startsWith('wallet:')) return { kind: 'wallet' };

  const normalizedProvider = normalizeProviderName(provider);
  if (normalizedProvider === 'google' || normalizedProvider === 'discord') {
    return { kind: 'provider', provider: normalizedProvider };
  }

  if (normalizedProvider === 'email') return { kind: 'email' };
  if (normalizedProvider === 'session') return { kind: 'session' };
  if (normalizedProvider.length > 0) return { kind: 'provider', provider: normalizedProvider };
  if (user.email) return { kind: 'email' };
  return { kind: 'session' };
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function truncateMiddle(value: string, start = 6, end = 4): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function resolveTierSpec(tier: ReturnType<typeof resolveTier>, labels: TierLabelMap): TierSpec {
  switch (tier) {
    case 'bronze':
      return {
        label: labels.bronze,
        color: '#cd7f32',
        trackColor: 'rgba(205,127,50,0.28)',
        min: 0,
        max: 1_000,
        next: 'silver',
        nextLabel: labels.silver,
      };
    case 'silver':
      return {
        label: labels.silver,
        color: '#a8b8cc',
        trackColor: 'rgba(168,184,204,0.28)',
        min: 1_000,
        max: 5_000,
        next: 'gold',
        nextLabel: labels.gold,
      };
    case 'gold':
      return {
        label: labels.gold,
        color: '#d4b96a',
        trackColor: 'rgba(212,185,106,0.28)',
        min: 5_000,
        max: 20_000,
        next: 'platinum',
        nextLabel: labels.platinum,
      };
    case 'platinum':
    default:
      return {
        label: labels.platinum,
        color: '#9ba9c4',
        trackColor: 'rgba(155,169,196,0.28)',
        min: 20_000,
        max: null,
        next: null,
        nextLabel: null,
      };
  }
}

// ─── Profile components ──────────────────────────────────────────────────────

function ProfileHeader({
  displayName,
  score,
  email,
  location,
  isDark,
  c,
  floatAnim1,
  floatAnim2,
}: {
  displayName: string;
  score: number | null;
  email?: string;
  location?: string | null;
  isDark: boolean;
  c: ColorPalette;
  floatAnim1?: Animated.Value;
  floatAnim2?: Animated.Value;
}): React.JSX.Element {
  const { t, locale } = useAppTranslation('mobile');
  const safeScore = score ?? 0;
  const tier = resolveTier(safeScore);
  const tierLabels = {
    bronze: t('profile.tierLabels.bronze', undefined, 'Bronze'),
    silver: t('profile.tierLabels.silver', undefined, 'Silver'),
    gold: t('profile.tierLabels.gold', undefined, 'Gold'),
    platinum: t('profile.tierLabels.platinum', undefined, 'Platinum'),
  };
  const spec = resolveTierSpec(tier, tierLabels);
  const profileStats = {
    airs: t('profile.stats.airs', undefined, 'AIRS'),
    projects: t('profile.stats.projects', undefined, 'Projects'),
    co2: t('profile.stats.co2', undefined, 'CO₂'),
  };
  const heroBg = isDark ? '#050f0c' : '#eaf8f3';

  return (
    <View
      style={[
        {
          borderRadius: 20,
          marginHorizontal: 12,
          marginVertical: 0,
          paddingHorizontal: 20,
          paddingVertical: 24,
          backgroundColor: heroBg,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(11,45,49,0.08)',
          position: 'relative',
          overflow: 'hidden',
        },
      ]}
    >
      {/* Animated floating circles */}
      {floatAnim1 && (
        <View
          style={{
            position: 'absolute',
            top: -120,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: 100,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <Animated.View
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: isDark ? 'rgba(30,230,181,0.08)' : 'rgba(13,148,136,0.05)',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              transform: [
                {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                  translateY: floatAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 30],
                  }),
                },
              ],
            }}
          />
        </View>
      )}

      {floatAnim2 && (
        <View
          style={{
            position: 'absolute',
            bottom: -100,
            left: 20,
            width: 150,
            height: 150,
            borderRadius: 75,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <Animated.View
            style={{
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: isDark ? 'rgba(30,230,181,0.06)' : 'rgba(13,148,136,0.04)',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              transform: [
                {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                  translateY: floatAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -25],
                  }),
                },
              ],
            }}
          />
        </View>
      )}

      {/* Content */}
      <View style={{ alignItems: 'center', zIndex: 1 }}>
        {/* Avatar with tier badge */}
        <View style={{ marginBottom: 14, position: 'relative' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: spec.color,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: heroBg,
              ...createShadowStyle({
                color: spec.color,
                offsetX: 0,
                offsetY: 2,
                opacity: 0.3,
                radius: 4,
                elevation: 5,
              }),
            }}
          >
            <Text
              style={{
                fontSize: 36,
                fontWeight: '800',
                color: '#050510',
                fontFamily: 'Sculpin-Bold',
              }}
            >
              {toInitials(displayName)}
            </Text>
          </View>
          {/* Tier badge */}
          <View
            style={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              backgroundColor: spec.color,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: heroBg,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: '#050510',
                letterSpacing: 0.08,
                textTransform: 'uppercase',
              }}
            >
              {spec.label}
            </Text>
          </View>
        </View>

        {/* Name */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            letterSpacing: -0.02,
            color: c.text,
            marginBottom: 2,
          }}
        >
          {displayName}
        </Text>

        {/* Email */}
        {email && (
          <Text
            style={{
              fontSize: 12,
              color: c.muted,
              fontFamily: 'monospace',
              marginBottom: location ? 6 : 18,
            }}
          >
            {email}
          </Text>
        )}

        {/* Location chip */}
        {location ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginBottom: 18,
              backgroundColor: isDark ? 'rgba(30,230,181,0.08)' : 'rgba(13,148,136,0.08)',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <MapPinIcon size={11} color={c.accent} strokeWidth={2.2} />
            <Text style={{ fontSize: 12, color: c.accent, fontWeight: '600' }}>{location}</Text>
          </View>
        ) : null}

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
          <Stat label={profileStats.airs} value={safeScore.toLocaleString(locale)} c={c} />
          <Divider c={c} />
          <Stat label={profileStats.projects} value='0' c={c} />
          <Divider c={c} />
          <Stat label={profileStats.co2} value='0 t' c={c} />
        </View>
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  c,
}: {
  label: string;
  value: string;
  c: ColorPalette;
}): React.JSX.Element {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: -0.02,
          color: c.text,
          fontFamily: 'monospace',
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: c.muted,
          letterSpacing: 0.08,
          textTransform: 'uppercase',
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function Divider({ c }: { c: ColorPalette }): React.JSX.Element {
  return (
    <View
      style={{
        width: 1,
        backgroundColor: c.muted,
        opacity: 0.18,
        height: 40,
      }}
    />
  );
}

function TierJourney({
  score,
  isDark,
  c,
}: {
  score: number | null;
  isDark: boolean;
  c: ColorPalette;
}): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const safeScore = score ?? 0;
  const tiers = [
    {
      id: 'bronze' as const,
      label: t('profile.tierLabels.bronze', undefined, 'Bronze'),
      threshold: 0,
      color: '#cd7f32',
    },
    {
      id: 'silver' as const,
      label: t('profile.tierLabels.silver', undefined, 'Silver'),
      threshold: 1000,
      color: '#a8b8cc',
    },
    {
      id: 'gold' as const,
      label: t('profile.tierLabels.gold', undefined, 'Gold'),
      threshold: 5000,
      color: '#d4b96a',
    },
    {
      id: 'platinum' as const,
      label: t('profile.tierLabels.platinum', undefined, 'Platinum'),
      threshold: 20000,
      color: '#9ba9c4',
    },
  ];
  const currentIdx = tiers.findIndex((tierItem) => tierItem.id === resolveTier(safeScore));

  return (
    <GlassCard
      style={{
        margin: 12,
        padding: 18,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.12,
          color: c.muted,
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        {t('profile.tierJourney', undefined, 'Tier Journey')}
      </Text>

      <View style={{ position: 'relative', height: 120 }}>
        {/* Track background */}
        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            right: 14,
            height: 3,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.08)',
            borderRadius: 999,
          }}
        />

        {/* Track fill */}
        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            right: 14,
            height: 3,
            borderRadius: 999,
            backgroundColor: '#d4b96a',
            width: `${((currentIdx + 1) / tiers.length) * 100}%`,
          }}
        />

        {/* Tier nodes */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {tiers.map((t, i) => {
            const reached = i <= currentIdx;
            return (
              <View
                key={t.id}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  zIndex: 1,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: reached ? t.color : 'transparent',
                    borderWidth: 2,
                    borderColor: reached
                      ? t.color
                      : isDark
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(11,45,49,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i === currentIdx && reached ? (
                    <CheckIcon size={14} color='#050510' strokeWidth={3} />
                  ) : (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: reached ? '#050510' : c.muted,
                      }}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: reached ? c.text : c.muted,
                    marginTop: 6,
                  }}
                >
                  {t.label}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: c.muted,
                    fontFamily: 'monospace',
                    marginTop: 2,
                  }}
                >
                  {t.threshold >= 1000 ? `${(t.threshold / 1000).toFixed(0)}K` : t.threshold}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </GlassCard>
  );
}

function SettingRow({
  icon,
  label,
  value,
  danger = false,
  onPress,
  isLast = false,
  hideChevron = false,
  c,
}: {
  icon: React.FC<LucideProps>;
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
  isLast?: boolean;
  hideChevron?: boolean;
  c: ColorPalette;
}): React.JSX.Element {
  const Icon = icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: c.cardBorder,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: danger ? 'rgba(255,59,48,0.12)' : `${c.accent}12`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={danger ? '#ff3b30' : c.accent} strokeWidth={2} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: '600',
          color: danger ? '#ff3b30' : c.text,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text
          style={{
            fontSize: 12,
            color: c.muted,
          }}
        >
          {value}
        </Text>
      )}
      {!hideChevron && <ChevronRightIcon size={16} color={c.muted} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

function AccountInfoModal({
  visible,
  user,
  isDark,
  c,
  onClose,
}: {
  visible: boolean;
  user: User | null;
  isDark: boolean;
  c: ColorPalette;
  onClose: () => void;
}): React.JSX.Element | null {
  const { t, locale } = useAppTranslation('mobile');
  const [copiedId, setCopiedId] = useState(false);
  const [referralSummary, setReferralSummary] = useState<AccountReferralSummary | null>(null);
  const [referralSummaryLoading, setReferralSummaryLoading] = useState(false);
  const profile = useMemo(() => getProfileInfo(user), [user]);
  const createdAt =
    formatAccountCreatedAt(resolveAccountCreatedAt(user, referralSummary), locale) ??
    (referralSummaryLoading
      ? t('profile.accountInfoModal.loading', undefined, 'Loading...')
      : t('profile.accountInfoModal.na', undefined, 'N/A'));
  const referrerLabel = getAccountReferrerLabel(referralSummary);

  useEffect(() => {
    let isMounted = true;

    const fetchReferralSummary = async (): Promise<void> => {
      if (!visible || !user?.id) {
        setReferralSummary(null);
        setReferralSummaryLoading(false);
        return;
      }

      setReferralSummaryLoading(true);

      try {
        const apiBaseUrl = resolveMobileApiBaseUrl().replace(/\/+$/, '');
        const referralUrl = new URL(`${apiBaseUrl}/v1/referrals/me`);
        referralUrl.searchParams.set('user_id', user.id);
        if (profile.displayName) {
          referralUrl.searchParams.set('display_name', profile.displayName);
        }

        const response = await fetch(referralUrl.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Referral summary request failed (${response.status})`);
        }

        const summary = (await response.json()) as AccountReferralSummary;
        if (isMounted) {
          setReferralSummary(summary);
        }
      } catch {
        if (isMounted) {
          setReferralSummary(null);
        }
      } finally {
        if (isMounted) {
          setReferralSummaryLoading(false);
        }
      }
    };

    void fetchReferralSummary();

    return () => {
      isMounted = false;
    };
  }, [profile.displayName, user?.id, visible]);

  if (!visible || !user) return null;

  const handleCopyId = (): void => {
    if (user.id) {
      void Clipboard.setString(user.id);
      setCopiedId(true);
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          t('profile.accountInfoModal.copiedToast', undefined, 'ID copied to clipboard'),
          ToastAndroid.SHORT
        );
      }
      setTimeout(() => {
        setCopiedId(false);
      }, 2000);
    }
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        zIndex: 100,
      }}
    >
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: isDark ? '#050f0c' : '#f0fdf9',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 40,
          maxHeight: '85%',
          borderTopWidth: 3,
          borderTopColor: c.accent,
        }}
      >
        <View
          style={{
            width: 40,
            height: 4,
            backgroundColor: c.muted,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 16,
            opacity: 0.4,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: c.text,
              letterSpacing: -0.5,
            }}
          >
            {t('profile.accountInfoModal.title', undefined, 'Account Information')}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ fontSize: 24, color: c.muted, fontWeight: '400' }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {/* Account ID */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: c.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.accountInfoModal.accountId', undefined, 'Account ID')}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: c.text,
                  fontFamily: 'monospace',
                  fontWeight: '500',
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {user.id || t('profile.accountInfoModal.na', undefined, 'N/A')}
              </Text>
              <TouchableOpacity onPress={handleCopyId} style={{ padding: 8, marginLeft: 8 }}>
                {copiedId ? (
                  <CheckIcon size={18} color={c.accent} strokeWidth={3} />
                ) : (
                  <Copy size={18} color={c.accent} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: c.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.accountInfoModal.email', undefined, 'Email')}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
              }}
            >
              <Text
                style={{ fontSize: 14, color: c.text, fontFamily: 'monospace', fontWeight: '400' }}
              >
                {user.email ?? t('profile.accountInfoModal.na', undefined, 'N/A')}
              </Text>
            </View>
          </View>

          {/* Display Name */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: c.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.accountInfoModal.username', undefined, 'Username')}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
              }}
            >
              <Text style={{ fontSize: 14, color: c.text, fontWeight: '500' }}>
                {profile.displayName || t('profile.accountInfoModal.na', undefined, 'N/A')}
              </Text>
            </View>
          </View>

          {/* Creation Date */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: c.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.accountInfoModal.createdAt', undefined, 'Creation Date')}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
              }}
            >
              <Text
                style={{ fontSize: 14, color: c.text, fontFamily: 'monospace', fontWeight: '400' }}
              >
                {createdAt}
              </Text>
            </View>
          </View>

          {/* Referred By */}
          {referrerLabel ? (
            <View style={{ marginBottom: 18 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: c.muted,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {t('profile.accountInfoModal.referredBy', undefined, 'Referred by')}
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: `${c.accent}44`,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: `${c.accent}12`,
                }}
              >
                <Text style={{ fontSize: 14, color: c.text, fontWeight: '700' }}>
                  {referrerLabel}
                </Text>
                {referralSummary?.referred_by_referral_code &&
                referralSummary.referred_by_referral_code !== referrerLabel ? (
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: c.muted,
                      fontFamily: 'monospace',
                      fontWeight: '500',
                    }}
                  >
                    {referralSummary.referred_by_referral_code}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Verified Badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: `${c.accent}18`,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: `${c.accent}44`,
              marginTop: 8,
            }}
          >
            <CheckIcon size={18} color={c.accent} strokeWidth={2.5} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>
              {t('profile.accountInfoModal.activeAccount', undefined, 'Active account')}
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={onClose}
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.08)',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: c.cardBorder,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, letterSpacing: 0.3 }}>
            {t('profile.modal.close', undefined, 'Close')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PersonalInfoModal({
  visible,
  user,
  isDark,
  c,
  onClose,
}: {
  visible: boolean;
  user: User | null;
  isDark: boolean;
  c: ColorPalette;
  onClose: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation('mobile');
  const { client } = useAuth();
  const profile = useMemo(() => getProfileInfo(user), [user]);
  const metadata = useMemo(() => getMetadata(user), [user]);
  const [firstName] = useState<string>(
    typeof metadata.firstName === 'string'
      ? metadata.firstName
      : typeof metadata.first_name === 'string'
      ? metadata.first_name
      : ''
  );
  const [lastName] = useState<string>(
    typeof metadata.lastName === 'string'
      ? metadata.lastName
      : typeof metadata.last_name === 'string'
      ? metadata.last_name
      : ''
  );
  const email = profile.email ?? '';
  const [country, setCountry] = useState<string>(
    typeof metadata.country === 'string' ? metadata.country : ''
  );
  const [city, setCity] = useState<string>(typeof metadata.city === 'string' ? metadata.city : '');
  const [isSaving, setIsSaving] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Auto-detect location from IP when both fields are empty
  useEffect(() => {
    if (country || city) return;
    let cancelled = false;
    setDetectingLocation(true);
    void detectLocationFromIP().then((geo) => {
      if (cancelled) return;
      setDetectingLocation(false);
      if (geo) {
        setCountry(geo.countryName);
        setCity(geo.city);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const token = await resolveSessionTokenWithRetry(client, { maxAttempts: 3 });
      if (token) {
        const baseUrl = resolveMobileApiBaseUrl();
        await fetch(`${baseUrl}/v1/airs/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            country: country.trim() || null,
            city: city.trim() || null,
          }),
        });
      }
    } catch {
      // non-fatal — close anyway
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        zIndex: 100,
      }}
    >
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: isDark ? '#050f0c' : '#f0fdf9',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 40,
          maxHeight: '85%',
          borderTopWidth: 3,
          borderTopColor: c.accent,
        }}
      >
        {/* Drag Handle */}
        <View
          style={{
            width: 40,
            height: 4,
            backgroundColor: c.muted,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 16,
            opacity: 0.4,
          }}
        />

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: c.text,
              letterSpacing: -0.5,
            }}
          >
            {t('profile.modal.title', undefined, 'Personal Information')}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ fontSize: 24, color: c.muted, fontWeight: '400' }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {/* First Name */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: c.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.modal.firstName', undefined, 'First name')}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
              }}
            >
              <Text style={{ fontSize: 15, color: c.text, fontWeight: '500' }}>
                {firstName || profile.displayName}
              </Text>
            </View>
          </View>

          {/* Last Name */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: c.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.modal.lastName', undefined, 'Last name')}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
              }}
            >
              <Text style={{ fontSize: 15, color: c.text, fontWeight: '500' }}>
                {lastName || '-'}
              </Text>
            </View>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: c.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.modal.email', undefined, 'Email')}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
              }}
            >
              <Text
                style={{ fontSize: 14, color: c.text, fontFamily: 'monospace', fontWeight: '400' }}
              >
                {email}
              </Text>
            </View>
          </View>

          {/* Country picker */}
          <View style={{ marginBottom: 18 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: c.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {t('profile.modal.country', undefined, 'Country')}
              </Text>
              {detectingLocation && (
                <Text style={{ fontSize: 11, color: c.accent }}>Detecting…</Text>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setCountryPickerVisible(true)}
              style={{
                borderWidth: 1,
                borderColor: c.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {country ? (
                  <Text style={{ fontSize: 20 }}>
                    {countryFlag(
                      COUNTRIES.find((ct) => ct.name.toLowerCase() === country.toLowerCase())
                        ?.code ?? ''
                    )}
                  </Text>
                ) : (
                  <GlobeIcon size={18} color={c.muted} strokeWidth={1.8} />
                )}
                <Text
                  style={{
                    fontSize: 15,
                    color: country ? c.text : c.muted,
                    fontWeight: country ? '500' : '400',
                  }}
                >
                  {country || t('profile.modal.countryPlaceholder', undefined, 'Select country')}
                </Text>
              </View>
              <ChevronRightIcon size={16} color={c.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* City picker */}
          {(() => {
            const countryCode =
              COUNTRIES.find((ct) => ct.name.toLowerCase() === country.toLowerCase())?.code ?? '';
            return (
              <View style={{ marginBottom: 18 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: c.muted,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {t('profile.modal.city', undefined, 'City')}
                </Text>
                <TouchableOpacity
                  activeOpacity={country ? 0.75 : 1}
                  onPress={() => {
                    if (country) setCityPickerVisible(true);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: c.cardBorder,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,45,49,0.04)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: country ? 1 : 0.5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: city ? c.text : c.muted,
                      fontWeight: city ? '500' : '400',
                      flex: 1,
                    }}
                  >
                    {city ||
                      (country
                        ? t('profile.modal.cityPlaceholder', undefined, 'Select city')
                        : t(
                            'profile.modal.citySelectCountryFirst',
                            undefined,
                            'Select a country first'
                          ))}
                  </Text>
                  {country ? <ChevronRightIcon size={16} color={c.muted} strokeWidth={2} /> : null}
                </TouchableOpacity>

                <CityPickerModal
                  visible={cityPickerVisible}
                  isDark={isDark}
                  c={c}
                  countryCode={countryCode}
                  countryName={country}
                  onClose={() => setCityPickerVisible(false)}
                  onSelect={(selected) => setCity(selected)}
                />
              </View>
            );
          })()}

          {/* Country picker modal */}
          <CountryPickerModal
            visible={countryPickerVisible}
            isDark={isDark}
            c={c}
            onClose={() => setCountryPickerVisible(false)}
            onSelect={(selected: Country) => {
              setCountry(selected.name);
              setCity('');
            }}
          />

          {/* Status Badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: `${c.accent}18`,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: `${c.accent}44`,
              marginTop: 8,
            }}
          >
            <CheckIcon size={18} color={c.accent} strokeWidth={2.5} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>
              {t('profile.accountStatus.verified', undefined, 'Verified')}
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              void handleSave();
            }}
            disabled={isSaving}
            style={{
              backgroundColor: c.accent,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? (
              <ActivityIndicator size='small' color='#050510' />
            ) : (
              <Text
                style={{ fontSize: 15, fontWeight: '700', color: '#050510', letterSpacing: 0.3 }}
              >
                {t('profile.modal.saveChanges', undefined, 'Save Changes')}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,45,49,0.08)',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: c.cardBorder,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, letterSpacing: 0.3 }}>
              {t('profile.modal.cancel', undefined, 'Cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Tab components ──────────────────────────────────────────────────────────

interface LeaderboardRow {
  rank: number;
  name: string;
  score: number;
  medal: string | null;
  color: string | null;
  isMe: boolean;
}

const MEDAL_DATA: Record<number, { medal: string; color: string }> = {
  1: { medal: '🥇', color: '#d4b96a' },
  2: { medal: '🥈', color: '#a8b8cc' },
  3: { medal: '🥉', color: '#cd7f32' },
};

function RankingTab({ isDark, c }: { isDark: boolean; c: ColorPalette }): React.JSX.Element {
  const { t, locale } = useAppTranslation('mobile');
  const { client, user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardRow | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const enhancedStyles = profileStylesEnhanced(isDark);
  const rankingFilters: SearchFilterOption[] = [
    { key: 'all', label: t('profile.ranking.filters.all', undefined, 'All') },
    { key: 'podium', label: t('profile.ranking.filters.podium', undefined, 'Podium') },
    { key: 'others', label: t('profile.ranking.filters.others', undefined, 'Others') },
  ];

  useEffect(() => {
    if (!user || !client) return;
    let cancelled = false;
    void (async () => {
      setLoadingBoard(true);
      try {
        const token = await client.getSessionToken();
        if (!token || cancelled) return;
        const res = await fetch(`${resolveMobileApiBaseUrl()}/v1/airs/leaderboard?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          entries?: { rank: number; displayName: string; airsBalance: number; isMe: boolean }[];
          requestingUserEntry?: {
            rank: number;
            displayName: string;
            airsBalance: number;
            isMe: boolean;
          } | null;
        };
        if (cancelled) return;
        const toRow = (e: {
          rank: number;
          displayName: string;
          airsBalance: number;
          isMe: boolean;
        }): LeaderboardRow => ({
          rank: e.rank,
          name: e.displayName,
          score: e.airsBalance,
          medal: MEDAL_DATA[e.rank]?.medal ?? null,
          color: MEDAL_DATA[e.rank]?.color ?? null,
          isMe: e.isMe,
        });
        const allRows = (data.entries ?? []).map(toRow);
        setRows(allRows);
        const me =
          allRows.find((r) => r.isMe) ??
          (data.requestingUserEntry ? toRow(data.requestingUserEntry) : null);
        setMyEntry(me);
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setLoadingBoard(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, client]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'podium' && row.rank <= 3) ||
        (activeFilter === 'others' && row.rank > 3);
      const matchesSearch = !normalizedQuery || row.name.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search, rows]);

  return (
    <ScrollView
      contentContainerStyle={[enhancedStyles.content, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard variant='teal' style={rankingStyles.myPositionCard}>
        <View style={rankingStyles.myPosHeader}>
          <AwardIcon size={20} color={c.accent} />
          <Text style={[rankingStyles.myPosLabel, { color: c.accent }]}>
            {t('profile.ranking.myPosition', undefined, 'My Position')}
          </Text>
        </View>
        {loadingBoard ? (
          <ActivityIndicator size='small' color={c.accent} style={{ marginVertical: 8 }} />
        ) : (
          <View style={rankingStyles.myPosBody}>
            <View style={rankingStyles.myPosRankWrap}>
              <Text style={[rankingStyles.myPosRankHash, { color: c.muted }]}>#</Text>
              <Text style={[rankingStyles.myPosRank, { color: c.text }]}>
                {myEntry?.rank ?? '—'}
              </Text>
            </View>
            <View>
              <Text style={[rankingStyles.myPosScore, { color: c.text }]}>
                {(myEntry?.score ?? 0).toLocaleString(locale)}
              </Text>
              <Text style={[rankingStyles.myPosScoreLabel, { color: c.muted }]}>
                {t('profile.stats.airs', undefined, 'AIRS')}
              </Text>
            </View>
          </View>
        )}
      </GlassCard>
      <SectionContainer title={t('profile.ranking.topImpactors', undefined, 'Top Impactors')}>
        <SearchFilterBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('profile.ranking.searchPlaceholder', undefined, 'Search person...')}
          filters={rankingFilters}
          activeFilter={activeFilter}
          onChangeFilter={setActiveFilter}
        />
        <GlassCard style={rankingStyles.listCard}>
          {loadingBoard ? (
            <ActivityIndicator size='small' color={c.accent} style={{ margin: 20 }} />
          ) : filteredUsers.length === 0 ? (
            <Text style={{ color: c.muted, textAlign: 'center', padding: 20, fontSize: 14 }}>
              {t('profile.ranking.noResults', undefined, 'No results')}
            </Text>
          ) : (
            filteredUsers.map((row, idx) => (
              <View
                key={row.rank}
                style={[
                  rankingStyles.row,
                  row.isMe && { backgroundColor: `${c.accent}14` },
                  idx < filteredUsers.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                  },
                ]}
              >
                <Text style={[rankingStyles.rankNum, { color: row.color ?? c.muted }]}>
                  {row.rank}
                </Text>
                <View
                  style={[
                    rankingStyles.avatarCircle,
                    {
                      backgroundColor: row.color ? `${row.color}22` : 'rgba(255,255,255,0.08)',
                      borderColor: row.color ? `${row.color}44` : 'rgba(255,255,255,0.12)',
                    },
                  ]}
                >
                  <Text style={[rankingStyles.avatarText, { color: row.color ?? c.muted }]}>
                    {getInitials(row.name)}
                  </Text>
                </View>
                <View style={rankingStyles.rowBody}>
                  <View style={rankingStyles.nameRow}>
                    <Text style={[rankingStyles.userName, { color: c.text }]}>{row.name}</Text>
                    {row.medal ? <Text style={rankingStyles.medal}>{row.medal}</Text> : null}
                    {row.isMe ? (
                      <Text
                        style={{ fontSize: 10, fontWeight: '700', color: c.accent, marginLeft: 4 }}
                      >
                        TÚ
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[rankingStyles.userScore, { color: c.muted }]}>
                    {row.score.toLocaleString(locale)} {t('profile.stats.airs', undefined, 'AIRS')}
                  </Text>
                </View>
                {row.rank <= 3 ? <TrophyIcon size={16} color={row.color ?? c.accent} /> : null}
              </View>
            ))
          )}
        </GlassCard>
      </SectionContainer>
    </ScrollView>
  );
}

function WalletAddressRow({
  label,
  address,
  dotColor,
  accentColor,
  mutedColor,
  textColor,
  copiedLabel,
}: {
  label: string;
  address: string | null;
  dotColor: string;
  accentColor: string;
  mutedColor: string;
  textColor: string;
  copiedLabel: string;
}): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);
  if (!address) return null;
  const handleCopy = (): void => {
    void Clipboard.setStringAsync(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <View style={walletStyles.addressRow}>
      <View style={[walletStyles.addressDot, { backgroundColor: dotColor }]} />
      <View style={walletStyles.addressInfo}>
        <Text style={[walletStyles.addressLabel, { color: mutedColor }]}>{label}</Text>
        <Text style={[walletStyles.addressValue, { color: textColor }]}>
          {truncateMiddle(address, 8, 6)}
        </Text>
      </View>
      <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={walletStyles.copyBtn}>
        <CopyIcon size={15} color={copied ? accentColor : mutedColor} />
        {copied && (
          <Text style={[walletStyles.copiedText, { color: accentColor }]}>{copiedLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function WalletTab({
  isDark,
  c,
  client,
}: {
  isDark: boolean;
  c: ColorPalette;
  client: AuthClient;
}): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const enhancedStyles = profileStylesEnhanced(isDark);
  const [creationVisible, setCreationVisible] = useState(false);
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [restoreVisible, setRestoreVisible] = useState(false);
  const [importKeystoreVisible, setImportKeystoreVisible] = useState(false);
  const [changePinVisible, setChangePinVisible] = useState(false);
  const [localAccount, setLocalAccount] = useState<WalletAccountRecord | null>(null);
  const [allAccounts, setAllAccounts] = useState<WalletAccountRecord[]>([]);
  // Starts true so the first render never shows the "create wallet" empty state before we've
  // actually checked whether one already exists — that's the flash the loader below prevents.
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [receiveVisible, setReceiveVisible] = useState(false);
  const [sendVisible, setSendVisible] = useState(false);
  const [activityVisible, setActivityVisible] = useState(false);
  const [exportPinVisible, setExportPinVisible] = useState(false);
  const [exportBackupVisible, setExportBackupVisible] = useState(false);
  const [unlockedExport, setUnlockedExport] = useState<{ mnemonic: string; pin: string } | null>(
    null
  );
  const [manageVisible, setManageVisible] = useState(false);
  const loadingFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const refreshBalances = (): void => {
    void getWalletBalances(client)
      .then(({ balances: next }) => setBalances(next))
      .catch(() => {
        // Balance lookups are best-effort — keep showing the last known values on failure.
      });
  };

  const handleExportPinSubmit = async (
    pin: string
  ): Promise<{ verified: boolean; lockedUntil?: string }> => {
    // Step 1: check local vault BEFORE calling the server — avoids a round-trip and
    // gives a better error if the vault just isn't on this device at all.
    const unlock = await unlockMnemonicWithDiagnosis(pin);

    if (unlock.ok) {
      // Local decryption succeeded; also verify against server (rate-limit gate) and
      // confirm the PIN hasn't drifted server-side.
      const result = await verifyWalletPin(client, pin);
      if (result.verified) {
        setUnlockedExport({ mnemonic: unlock.mnemonic, pin });
      } else {
        // Server rejected the PIN even though local decryption worked — PIN digests
        // are out of sync (shouldn't normally happen, but handle gracefully).
        return result;
      }
      return { verified: true };
    }

    if (unlock.reason === 'no_vault') {
      // Vault doesn't exist on this device (e.g. first-time on a new browser/device).
      // Don't call verifyWalletPin — there's nothing to export. Surface a clear message
      // instead of "Incorrect PIN" which would be completely misleading.
      throw new Error(
        'Your wallet is not stored on this device. Restore it first using your recovery phrase.'
      );
    }

    // Local decrypt failed → PIN is genuinely wrong. Now confirm with server for lockout tracking.
    return verifyWalletPin(client, pin);
  };

  useEffect(() => {
    Animated.timing(loadingFade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    void listWalletAccounts(client)
      .then(({ accounts }) => {
        setAllAccounts(accounts);
        const primary = accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;
        setLocalAccount(primary);
        if (primary) {
          refreshBalances();
        }
      })
      .catch(() => {
        // No local wallet yet, or not reachable — fall through to the "create" state below.
      })
      .finally(() => setIsLoadingAccount(false));
  }, [client]);

  useEffect(() => {
    if (!isLoadingAccount) {
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoadingAccount]);

  const CHAIN_FEATURES = [
    t('profile.wallet.createFeature1', undefined, 'Non-custodial: only you hold the keys'),
    t('profile.wallet.createFeature2', undefined, 'Multi-chain: EVM, Bitcoin and Solana'),
    t('profile.wallet.createFeature3', undefined, 'Encrypted with your PIN, backed up by you'),
  ];

  if (isLoadingAccount) {
    return (
      <Animated.View style={{ opacity: loadingFade }}>
        <GlassCard style={walletStyles.walletCard}>
          <View style={walletStyles.walletCardHeader}>
            <View style={[walletStyles.walletIconSmall, { backgroundColor: `${c.accent}18` }]}>
              <ActivityIndicator size='small' color={c.accent} />
            </View>
            <View style={walletStyles.walletCardHeaderText}>
              <Text style={[walletStyles.walletCardTitle, { color: c.text }]}>
                {t('profile.wallet.loadingTitle', undefined, 'Loading your wallet…')}
              </Text>
              <Text style={[walletStyles.walletCardSubtitle, { color: c.muted }]}>
                {t(
                  'profile.wallet.loadingSubtitle',
                  undefined,
                  'Checking for an existing wallet on this account'
                )}
              </Text>
            </View>
          </View>
          <View style={[walletStyles.addressSection, { borderColor: `${c.accent}20` }]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={walletStyles.balanceRow}>
                <View style={[walletStyles.skeletonDot, { backgroundColor: `${c.accent}20` }]} />
                <View style={[walletStyles.skeletonBar, { backgroundColor: `${c.accent}14` }]} />
              </View>
            ))}
          </View>
        </GlassCard>
      </Animated.View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[enhancedStyles.content, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: contentFade }}>
        {localAccount ? (
          /* ── Wallet exists state ─────────────────────── */
          <>
            <GlassCard style={walletStyles.walletCard}>
              <View style={walletStyles.walletCardHeader}>
                <View style={[walletStyles.walletIconSmall, { backgroundColor: `${c.accent}18` }]}>
                  <WalletIcon size={22} color={c.accent} />
                </View>
                <View style={walletStyles.walletCardHeaderText}>
                  <Text style={[walletStyles.walletCardTitle, { color: c.text }]}>
                    {t('profile.wallet.localWalletTitle', undefined, 'Your Alternun wallet')}
                  </Text>
                  <View style={walletStyles.networkRow}>
                    <Text style={[walletStyles.walletCardSubtitle, { color: c.muted }]}>
                      {t('profile.wallet.localWalletSubtitle', undefined, 'Active across 3 chains')}
                    </Text>
                    <View
                      style={[
                        walletStyles.networkBadge,
                        {
                          backgroundColor: isTestnetRuntime()
                            ? 'rgba(245,158,11,0.15)'
                            : 'rgba(16,185,129,0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          walletStyles.networkBadgeText,
                          { color: isTestnetRuntime() ? '#f59e0b' : '#10b981' },
                        ]}
                      >
                        {isTestnetRuntime() ? 'Testnet' : 'Mainnet'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[walletStyles.activeBadge, { backgroundColor: `${c.accent}18` }]}>
                  <View style={[walletStyles.activeDot, { backgroundColor: c.accent }]} />
                  <Text style={[walletStyles.activeBadgeText, { color: c.accent }]}>Active</Text>
                </View>
              </View>

              {balances.length > 0 && (
                <View style={[walletStyles.addressSection, { borderColor: `${c.accent}20` }]}>
                  {balances.map((balance) => (
                    <View key={balance.chain} style={walletStyles.balanceRow}>
                      <View
                        style={[
                          walletStyles.addressDot,
                          { backgroundColor: CHAIN_META[balance.chain].dotColor },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[walletStyles.balanceLabel, { color: c.muted }]}>
                          {CHAIN_META[balance.chain].label}
                        </Text>
                        <Text
                          style={[
                            walletStyles.balanceNetworkLabel,
                            { color: isTestnetRuntime() ? '#f59e0b' : c.muted },
                          ]}
                        >
                          {getChainNetworkLabel(balance.chain, isTestnetRuntime())}
                        </Text>
                      </View>
                      <Text style={[walletStyles.balanceValue, { color: c.text }]}>
                        {formatChainAmount(balance.amount, balance.chain)}{' '}
                        {CHAIN_META[balance.chain].unit}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={walletStyles.walletActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    walletStyles.actionBtn,
                    { backgroundColor: `${c.accent}14`, borderColor: `${c.accent}30` },
                  ]}
                  onPress={() => setReceiveVisible(true)}
                >
                  <Text style={[walletStyles.actionBtnText, { color: c.accent }]}>
                    {t('wallet.receive.title', undefined, 'Receive')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    walletStyles.actionBtn,
                    { backgroundColor: `${c.accent}14`, borderColor: `${c.accent}30` },
                  ]}
                  onPress={() => setSendVisible(true)}
                >
                  <Text style={[walletStyles.actionBtnText, { color: c.accent }]}>
                    {t('wallet.send.title', undefined, 'Send')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    walletStyles.actionBtn,
                    { backgroundColor: `${c.accent}14`, borderColor: `${c.accent}30` },
                  ]}
                  onPress={() => setActivityVisible(true)}
                >
                  <Text style={[walletStyles.actionBtnText, { color: c.accent }]}>
                    {t('wallet.activity.title', undefined, 'Activity')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[walletStyles.addressSection, { borderColor: `${c.accent}20` }]}>
                <WalletAddressRow
                  label={t('profile.wallet.evmAddress', undefined, 'Ethereum / EVM')}
                  address={localAccount.evmAddress}
                  dotColor='#627EEA'
                  accentColor={c.accent}
                  mutedColor={c.muted}
                  textColor={c.text}
                  copiedLabel={t('profile.wallet.addressCopied', undefined, 'Copied')}
                />
                <View style={[walletStyles.addressDivider, { backgroundColor: `${c.accent}12` }]} />
                <WalletAddressRow
                  label={t('profile.wallet.bitcoinAddress', undefined, 'Bitcoin')}
                  address={localAccount.bitcoinAddress}
                  dotColor='#F7931A'
                  accentColor={c.accent}
                  mutedColor={c.muted}
                  textColor={c.text}
                  copiedLabel={t('profile.wallet.addressCopied', undefined, 'Copied')}
                />
                <View style={[walletStyles.addressDivider, { backgroundColor: `${c.accent}12` }]} />
                <WalletAddressRow
                  label={t('profile.wallet.solanaAddress', undefined, 'Solana')}
                  address={localAccount.solanaAddress}
                  dotColor='#9945FF'
                  accentColor={c.accent}
                  mutedColor={c.muted}
                  textColor={c.text}
                  copiedLabel={t('profile.wallet.addressCopied', undefined, 'Copied')}
                />
              </View>

              <View style={walletStyles.walletActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    walletStyles.actionBtn,
                    { backgroundColor: `${c.accent}14`, borderColor: `${c.accent}30` },
                  ]}
                  onPress={() => setExportPinVisible(true)}
                >
                  <Text style={[walletStyles.actionBtnText, { color: c.accent }]}>
                    {t('profile.wallet.exportBackup', undefined, 'Export backup')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    walletStyles.actionBtn,
                    { backgroundColor: `${c.accent}14`, borderColor: `${c.accent}30` },
                  ]}
                  onPress={() => setChangePinVisible(true)}
                >
                  <Text style={[walletStyles.actionBtnText, { color: c.accent }]}>
                    {t('profile.wallet.changePin', undefined, 'Change PIN')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    walletStyles.actionBtn,
                    { backgroundColor: `${c.accent}14`, borderColor: `${c.accent}30` },
                  ]}
                  onPress={() => setManageVisible(true)}
                >
                  <Text style={[walletStyles.actionBtnText, { color: c.accent }]}>
                    {t('profile.wallet.manageWallets', undefined, 'Manage wallets')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[walletStyles.exportWarning, { color: c.muted }]}>
                {t(
                  'profile.wallet.exportWarning',
                  undefined,
                  'This is your only recovery option if you lose your device.'
                )}
              </Text>
            </GlassCard>
          </>
        ) : (
          /* ── No wallet / create state ────────────────── */
          <>
            <GlassCard style={walletStyles.createCard}>
              <View style={[walletStyles.walletIconWrap, { backgroundColor: `${c.accent}14` }]}>
                <WalletIcon size={40} color={c.accent} />
              </View>

              <Text style={[walletStyles.createTitle, { color: c.text }]}>
                {t('profile.wallet.createTitle', undefined, 'Create your Alternun wallet')}
              </Text>
              <Text style={[walletStyles.createSubtitle, { color: c.muted }]}>
                {t(
                  'profile.wallet.createSubtitle',
                  undefined,
                  'Your multichain key — Ethereum, Bitcoin and Solana in one place.'
                )}
              </Text>

              <View style={walletStyles.featureList}>
                {CHAIN_FEATURES.map((feature, i) => (
                  <View key={i} style={walletStyles.featureRow}>
                    <View style={[walletStyles.featureDot, { backgroundColor: c.accent }]} />
                    <Text style={[walletStyles.featureText, { color: c.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[walletStyles.primaryBtn, { backgroundColor: c.accent }]}
                activeOpacity={0.8}
                onPress={() => setCreationVisible(true)}
              >
                <WalletIcon size={16} color='#fff' />
                <Text style={walletStyles.primaryBtnText}>
                  {t('profile.wallet.createButton', undefined, 'Create Alternun wallet')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[walletStyles.secondaryBtn, { borderColor: `${c.accent}44` }]}
                activeOpacity={0.7}
                onPress={() => setRestoreVisible(true)}
              >
                <Text style={[walletStyles.secondaryBtnText, { color: c.accent }]}>
                  {t('profile.wallet.restoreButton', undefined, 'Restore from recovery phrase')}
                </Text>
              </TouchableOpacity>

              <Text style={[walletStyles.disclaimer, { color: c.muted }]}>
                {t(
                  'profile.wallet.createDisclaimer',
                  undefined,
                  'Alternun never sees your private key or PIN. If you lose your device without a backup, funds are unrecoverable.'
                )}
              </Text>
            </GlassCard>

            <SectionContainer
              title={t('profile.wallet.supportedNetworks', undefined, 'Supported Networks')}
            >
              <View style={walletStyles.networkPillRow}>
                {NETWORKS.map((network) => (
                  <View key={network.name} style={walletStyles.networkPill}>
                    <View style={[walletStyles.networkDot, { backgroundColor: network.color }]} />
                    <Text style={[walletStyles.networkName, { color: c.text }]}>
                      {network.name}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionContainer>
          </>
        )}

        <WalletCreationFlow
          visible={creationVisible}
          isDark={isDark}
          accent={c.accent}
          client={client}
          onCancel={() => setCreationVisible(false)}
          onComplete={(newAccount) => {
            setCreationVisible(false);
            setLocalAccount(newAccount);
            refreshBalances();
          }}
        />

        <WalletAddAccountFlow
          visible={addAccountVisible}
          isDark={isDark}
          accent={c.accent}
          client={client}
          existingAccounts={allAccounts}
          onCancel={() => setAddAccountVisible(false)}
          onComplete={(_account) => {
            setAddAccountVisible(false);
            refreshBalances();
          }}
        />

        <WalletRestoreFlow
          visible={restoreVisible}
          isDark={isDark}
          accent={c.accent}
          client={client}
          onCancel={() => setRestoreVisible(false)}
          onComplete={(newAccount) => {
            setRestoreVisible(false);
            setLocalAccount(newAccount);
            refreshBalances();
          }}
        />

        <WalletImportKeystoreFlow
          visible={importKeystoreVisible}
          isDark={isDark}
          accent={c.accent}
          client={client}
          onCancel={() => setImportKeystoreVisible(false)}
          onComplete={(newAccount) => {
            setImportKeystoreVisible(false);
            setLocalAccount(newAccount);
            refreshBalances();
          }}
        />

        <WalletChangePinFlow
          visible={changePinVisible}
          isDark={isDark}
          accent={c.accent}
          client={client}
          primaryAccount={localAccount}
          onCancel={() => setChangePinVisible(false)}
          onComplete={() => setChangePinVisible(false)}
        />

        {localAccount && (
          <>
            <WalletReceiveModal
              visible={receiveVisible}
              isDark={isDark}
              accent={c.accent}
              account={localAccount}
              onClose={() => setReceiveVisible(false)}
            />
            <WalletSendModal
              visible={sendVisible}
              isDark={isDark}
              accent={c.accent}
              client={client}
              account={localAccount}
              onClose={() => setSendVisible(false)}
              onSent={refreshBalances}
            />
            <WalletActivityModal
              visible={activityVisible}
              isDark={isDark}
              accent={c.accent}
              client={client}
              onClose={() => setActivityVisible(false)}
            />
            <PinUnlockScreen
              visible={exportPinVisible}
              isDark={isDark}
              accent={c.accent}
              title={t('wallet.pin.unlock.exportTitle', undefined, 'Enter your PIN to export')}
              onSubmit={handleExportPinSubmit}
              onUnlocked={() => {
                setExportPinVisible(false);
                setExportBackupVisible(true);
              }}
              onCancel={() => setExportPinVisible(false)}
            />
            {unlockedExport && (
              <WalletBackupScreen
                visible={exportBackupVisible}
                isDark={isDark}
                accent={c.accent}
                mnemonic={unlockedExport.mnemonic}
                pin={unlockedExport.pin}
                initialStep='export'
                onDone={() => {
                  setExportBackupVisible(false);
                  setUnlockedExport(null);
                }}
              />
            )}
            <WalletManageModal
              visible={manageVisible}
              isDark={isDark}
              accent={c.accent}
              client={client}
              onClose={() => setManageVisible(false)}
              onPrimaryChanged={(accounts) => {
                setAllAccounts(accounts);
                const newPrimary = accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;
                setLocalAccount(newPrimary);
                refreshBalances();
              }}
              onAddWallet={() => {
                setManageVisible(false);
                // Route based on whether the user already has a LOCAL (airs_hd) wallet:
                //   - airs_hd exists → derive next HD account from same mnemonic (WalletAddAccountFlow)
                //   - only external wallets (MetaMask) OR no wallet at all → create fresh (WalletCreationFlow)
                //     Note: WalletCreationFlow handles ConflictException only if wallet_preferences
                //     has has_local_wallet=true AND the user has no DB account row — in that edge case
                //     it will call setupWallet which may fail; user should use WalletRestoreFlow instead.
                const hasHdWallet = allAccounts.some((a) => a.walletType !== 'external');
                if (hasHdWallet) {
                  setAddAccountVisible(true);
                } else {
                  setCreationVisible(true);
                }
              }}
              onRestoreWallet={() => {
                setManageVisible(false);
                setRestoreVisible(true);
              }}
              onImportKeystore={() => {
                setManageVisible(false);
                setImportKeystoreVisible(true);
              }}
            />
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}

function PerfilTab({
  isDark,
  c,
  user,
  signingOut,
  onSignOut,
  router,
  onToggleTheme,
  language,
  onCycleLanguage,
  footerLabel,
  client,
}: {
  isDark: boolean;
  c: ColorPalette;
  user: User | null;
  signingOut: boolean;
  onSignOut: () => void;
  router: Router;
  onToggleTheme: () => void;
  language: string;
  onCycleLanguage: () => void;
  footerLabel: string;
  client: ReturnType<typeof useAuth>['client'];
}): React.JSX.Element {
  const profile = useMemo(() => getProfileInfo(user), [user]);
  const walletAddress = useMemo(() => getWalletAddress(user), [user]);
  const walletProvider = useMemo(() => getWalletProvider(user), [user]);
  const walletConnected = Boolean(walletAddress || walletProvider);
  const { t } = useAppTranslation('mobile');
  const authMethodDescriptor = useMemo(() => getAuthMethodDescriptor(user), [user]);
  const authMethod = useMemo(() => {
    switch (authMethodDescriptor.kind) {
      case 'guest':
        return t('shared.labels.guest', undefined, 'Guest');
      case 'wallet':
        return t('profile.accessMethods.labels.wallet', undefined, 'Wallet');
      case 'email':
        return t('profile.accessMethods.labels.email', undefined, 'Email');
      case 'session':
        return t('profile.accessMethods.labels.session', undefined, 'Session');
      case 'provider':
        if (authMethodDescriptor.provider === 'google') {
          return t('profile.accessMethods.labels.google', undefined, 'Google');
        }
        if (authMethodDescriptor.provider === 'discord') {
          return t('profile.accessMethods.labels.discord', undefined, 'Discord');
        }
        return t(
          'profile.accessMethods.labels.provider',
          { provider: authMethodDescriptor.provider },
          authMethodDescriptor.provider
        );
      default:
        return t('profile.accessMethods.labels.session', undefined, 'Session');
    }
  }, [authMethodDescriptor, t]);
  const [showAccountInfoModal, setShowAccountInfoModal] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<{
    label: string;
    color: string;
  } | null>(null);
  const [achievements, setAchievements] = useState<
    Array<{ key: string; unlocked: boolean; unlockedAt: string | null }>
  >([]);

  // Animated circles
  const { motionLevel } = useAppPreferences();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (motionLevel === 'off') {
      return;
    }

    const duration = 3000;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const startAnimation = (anim: Animated.Value): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      Animated.loop(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        Animated.sequence([
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      ).start();
    };

    startAnimation(floatAnim1);
    startAnimation(floatAnim2);
  }, [floatAnim1, floatAnim2, motionLevel]);

  useEffect(() => {
    const fetchAchievements = async (): Promise<void> => {
      try {
        if (!user?.id) {
          return;
        }

        const sessionToken = await resolveSessionTokenWithRetry(client, {
          attempts: 4,
          retryDelayMs: 250,
        });
        if (!sessionToken) {
          return;
        }

        const apiBaseUrl = resolveMobileApiBaseUrl().replace(/\/+$/, '');
        const response = await fetch(`${apiBaseUrl}/v1/airs/achievements`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const data = (await response.json()) as Array<{
            key: string;
            unlocked: boolean;
            unlockedAt: string | null;
          }>;
          setAchievements(data);
        } else {
          console.warn(`Failed to fetch achievements: ${response.status}`, await response.text());
        }
      } catch (error) {
        console.warn('Error fetching achievements:', error);
      }
    };

    void fetchAchievements();
  }, [user?.id, client]);

  const accountIdLabel = t('profile.accountInfoModal.accountId', undefined, 'Account ID');
  const naLabel = t('profile.accountInfoModal.na', undefined, 'N/A');
  const verifiedLabel = t('profile.accountStatus.verified', undefined, 'Verified');
  const walletNotConnectedLabel = t('profile.wallet.notConnected', undefined, 'Not connected');
  const themeLabel = isDark
    ? t('shared.labels.dark', undefined, 'Dark')
    : t('shared.labels.light', undefined, 'Light');
  const languageLabel = getLocaleLabel(language, language);
  const currentAuthLabel = t(
    'profile.accessMethods.current',
    { method: authMethod },
    'Current: {{method}}'
  );

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={{ marginTop: 12 }} />
        <ProfileHeader
          displayName={profile.displayName}
          score={0}
          email={profile.email}
          location={resolveProfileLocation(user)}
          isDark={isDark}
          c={c}
          floatAnim1={floatAnim1}
          floatAnim2={floatAnim2}
        />

        {/* Tier Journey */}
        <TierJourney score={0} isDark={isDark} c={c} />

        {/* Achievements */}
        <SectionContainer
          title={t('profile.sections.achievements', undefined, 'Achievements')}
          style={{ margin: 12 }}
        >
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              padding: 16,
              position: 'relative',
            }}
          >
            {Object.entries(ACHIEVEMENT_CATALOG).map(([key, def]) => {
              const achievement = achievements.find((a) => a.key === key);
              const isUnlocked = achievement?.unlocked ?? false;
              const achievementLabel = t(`profile.achievementBadges.${key}`, undefined, def.label);

              const achievementDef: AchievementDef = {
                key,
                label: achievementLabel,
                color: def.color,
                icon: def.icon,
                unlocked: isUnlocked,
                unlockedAt: achievement?.unlockedAt ?? null,
              };

              return (
                <AchievementBadge
                  key={key}
                  def={achievementDef}
                  onPress={() =>
                    setSelectedAchievement({ label: achievementLabel, color: def.color })
                  }
                />
              );
            })}

            {/* Tooltip */}
            {selectedAchievement && (
              <TouchableOpacity
                style={{ position: 'absolute', width: '100%', height: '100%' }}
                onPress={() => setSelectedAchievement(null)}
              >
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AchievementTooltip
                    visible={Boolean(selectedAchievement)}
                    label={selectedAchievement?.label || ''}
                    color={selectedAchievement?.color || ''}
                    isDark={isDark}
                    _c={c}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </SectionContainer>

        {/* Referrals */}
        <SectionContainer
          title={t('profile.sections.referrals', undefined, 'Referidos')}
          style={{ margin: 12 }}
        >
          <ReferralCard user={user} isDark={isDark} c={c} />
        </SectionContainer>

        {/* Cuenta */}
        <SectionContainer
          title={t('profile.sections.account', undefined, 'Account')}
          style={{ margin: 12 }}
        >
          <GlassCard>
            <SettingRow
              icon={UserCircle2}
              label={accountIdLabel}
              value={user?.id ? truncateMiddle(user.id, 10, 6) : naLabel}
              c={c}
              onPress={() => setShowAccountInfoModal(true)}
            />
            <SettingRow
              icon={UserCircle2}
              label={t('profile.accountRows.personalInfo', undefined, 'Personal information')}
              value={verifiedLabel}
              c={c}
              onPress={() => setShowPersonalInfoModal(true)}
            />
            <SettingRow
              icon={Wallet}
              label={t('profile.accountRows.wallet', undefined, 'Wallet')}
              value={walletConnected ? truncateMiddle(walletAddress) : walletNotConnectedLabel}
              c={c}
              onPress={() => {
                if (!walletConnected) {
                  router.push({ pathname: '/mi-perfil', params: { tab: 'wallet' } });
                }
              }}
            />
            <SettingRow
              icon={Shield}
              label={t('profile.accountRows.accessMethod', undefined, 'Access method')}
              value={authMethod}
              c={c}
              hideChevron
              onPress={() => {
                Alert.alert(
                  t('profile.accessMethodsAlert.title', undefined, 'Access Methods'),
                  `${currentAuthLabel}\n\n${t(
                    'profile.accessMethodsAlert.available',
                    undefined,
                    'Available methods:\n• Email\n• Google\n• Discord'
                  )}`
                );
              }}
            />
            <TouchableOpacity
              onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 13,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: notificationsEnabled
                    ? `${c.accent}12`
                    : 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {notificationsEnabled ? (
                  <BellIcon size={16} color={c.accent} strokeWidth={2} />
                ) : (
                  <BellOffIcon size={16} color={c.muted} strokeWidth={2} />
                )}
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: notificationsEnabled ? c.text : c.muted,
                }}
              >
                {t('profile.accountRows.notifications', undefined, 'Notifications')}
              </Text>
              <View
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: notificationsEnabled
                    ? c.accent
                    : isDark
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(11,45,49,0.12)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 2,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: notificationsEnabled ? '#fff' : c.muted,
                    opacity: notificationsEnabled ? 1 : 0.5,
                    position: 'absolute',
                    left: notificationsEnabled ? 24 : 2,
                  }}
                />
              </View>
            </TouchableOpacity>
          </GlassCard>
        </SectionContainer>

        {/* Preferencias */}
        <SectionContainer
          title={t('profile.sections.preferences', undefined, 'Preferences')}
          style={{ margin: 12 }}
        >
          <GlassCard>
            <SettingRow
              icon={MoonIcon}
              label={t('profile.preferenceRows.theme', undefined, 'Theme')}
              value={themeLabel}
              c={c}
              onPress={onToggleTheme}
            />
            <SettingRow
              icon={GlobeIcon}
              label={t('profile.preferenceRows.language', undefined, 'Language')}
              value={languageLabel}
              c={c}
              onPress={onCycleLanguage}
            />
            <SettingRow
              icon={SettingsIcon}
              label={t('profile.preferenceRows.settings', undefined, 'Settings')}
              onPress={() => router.push('/settings')}
              c={c}
            />
            <TouchableOpacity
              onPress={onSignOut}
              disabled={signingOut}
              activeOpacity={0.6}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 13,
                borderBottomWidth: 0,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,59,48,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {signingOut ? (
                  <ActivityIndicator size='small' color='#ff3b30' />
                ) : (
                  <LogOutIcon size={16} color='#ff3b30' strokeWidth={2} />
                )}
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#ff3b30',
                }}
              >
                {t('profile.preferenceRows.signOut', undefined, 'Sign out')}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </SectionContainer>

        {/* Version Footer */}
        <Text
          style={{
            textAlign: 'center',
            fontSize: 10,
            color: c.muted,
            marginTop: 20,
            fontFamily: 'monospace',
          }}
        >
          {footerLabel}
        </Text>
      </ScrollView>

      {/* Account Info Modal */}
      <AccountInfoModal
        visible={showAccountInfoModal}
        user={user}
        isDark={isDark}
        c={c}
        onClose={() => setShowAccountInfoModal(false)}
      />

      {/* Personal Info Modal */}
      <PersonalInfoModal
        visible={showPersonalInfoModal}
        user={user}
        isDark={isDark}
        c={c}
        onClose={() => setShowPersonalInfoModal(false)}
      />
    </View>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MiPerfilScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user, loading, signOutUser, client } = useAuth();
  const { t } = useAppTranslation('mobile');
  const { themeMode, language, toggleThemeMode, cycleLanguage } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const appVersion = resolveAppPackageVersion().version;
  const footerLabel = t('profile.footer', { version: appVersion });
  const tabs = useMemo<TabItem[]>(
    () => [
      { key: 'ranking', label: t('profile.tabs.ranking', undefined, 'Ranking'), icon: TrophyIcon },
      { key: 'wallet', label: t('profile.tabs.wallet', undefined, 'Wallet'), icon: WalletIcon },
      {
        key: 'perfil',
        label: t('profile.tabs.profile', undefined, 'Profile'),
        icon: UserCircle2Icon,
      },
    ],
    [t]
  );
  const initialTab =
    typeof params.tab === 'string' && tabs.some((tab) => tab.key === params.tab)
      ? params.tab
      : 'perfil';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [signingOut, setSigningOut] = useState(false);

  // Sync FROM the URL only when the `tab` query param itself actually changes (e.g. navigating
  // here via a link with a different ?tab=) — not on every render. `tabs` must NOT be a dependency
  // here: it's re-created every render (useAppTranslation's `t` is a fresh function reference each
  // render, so the `tabs` useMemo never stabilizes), which previously made this effect re-run on
  // every render and forcibly reset activeTab back to the stale URL param — the exact "switching
  // tabs snaps back instantly" bug. `tab.key` membership is checked inline instead of via `tabs`.
  const tabKeys = useMemo(() => tabs.map((tab) => tab.key), [tabs]);
  useEffect(() => {
    if (typeof params.tab === 'string' && tabKeys.includes(params.tab)) {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  // Sync TO the URL when the user switches tabs via the UI, so the `tab` query param never goes
  // stale — without this, the param above would still be wrong on the next mount/deep-link.
  const handleChangeTab = (key: string): void => {
    setActiveTab(key);
    router.setParams({ tab: key });
  };

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
        cardBorder: 'rgba(255,255,255,0.08)',
        border: 'rgba(255,255,255,0.08)',
        text: '#e8fff6',
        muted: 'rgba(232,255,246,0.6)',
        accent: '#1EE6B5',
      }
    : {
        bg: '#f0fdf9',
        cardBg: 'rgba(255,255,255,0.85)',
        cardBorder: 'rgba(11,90,95,0.12)',
        border: 'rgba(11,90,95,0.12)',
        text: '#0b2d31',
        muted: 'rgba(11,45,49,0.6)',
        accent: '#0d9488',
      };

  const handleSignOut = async (): Promise<void> => {
    setSigningOut(true);
    try {
      await signOutUser();
      router.replace('/');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) return <ActivityIndicator size='large' color={c.accent} style={{ flex: 1 }} />;

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <GlassCard style={{ alignItems: 'center' }}>
          <UserCircle2Icon size={48} color={c.muted} />
          <Text style={[styles.signInPrompt, { color: c.text }]}>
            {t('profile.signInPrompt', undefined, 'Sign in to view your profile')}
          </Text>
          <TouchableOpacity
            style={[
              styles.signInBtn,
              { backgroundColor: `${c.accent}18`, borderColor: `${c.accent}44` },
            ]}
            onPress={() => router.push('/auth?next=/mi-perfil')}
          >
            <Text style={[styles.signInBtnText, { color: c.accent }]}>
              {t('shared.labels.signIn', undefined, 'Sign In')}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  return (
    <ScreenShell activeSection='mi-perfil' backgroundColor={c.bg}>
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <View style={styles.headerBar}>
          <View style={styles.titleWithIcon}>
            <ShieldCheckIcon size={24} color={c.accent} strokeWidth={1.8} />
            <Text style={[styles.pageTitle, { color: c.text }]}>
              {t('profile.screenTitle', undefined, 'My Profile')}
            </Text>
          </View>
          <View style={styles.tabRow}>
            <PageTabBar
              tabs={tabs}
              activeTab={activeTab}
              onChangeTab={handleChangeTab}
              isDark={isDark}
              accent={c.accent}
              muted={c.muted}
            />
          </View>
        </View>
        <Animated.View
          style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {activeTab === 'ranking' && <RankingTab isDark={isDark} c={c} />}
          {activeTab === 'wallet' && <WalletTab isDark={isDark} c={c} client={client} />}
          {activeTab === 'perfil' && (
            <PerfilTab
              isDark={isDark}
              c={c}
              user={user}
              signingOut={signingOut}
              onSignOut={() => {
                void handleSignOut();
              }}
              router={router}
              onToggleTheme={() => {
                void toggleThemeMode?.();
              }}
              language={language}
              onCycleLanguage={() => {
                void cycleLanguage?.();
              }}
              footerLabel={footerLabel}
              client={client}
            />
          )}
        </Animated.View>
      </View>
    </ScreenShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    // The tab tooltip below needs to render above tabContent's card, but tabContent has its own
    // transform (translateY), which creates a separate stacking context that otherwise paints on
    // top regardless of the tooltip's own zIndex (a descendant's zIndex can't lift its ancestor
    // above a later sibling subtree). Elevating headerBar itself fixes that.
    position: 'relative',
    zIndex: 20,
  },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tabRow: { marginHorizontal: -16 },
  pageTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Sculpin-Bold' },
  tabContent: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  signInPrompt: { fontSize: 16, fontWeight: '600', marginVertical: 12, textAlign: 'center' },
  signInBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  signInBtnText: { fontWeight: '600', fontSize: 14 },
});

const rankingStyles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 16, gap: 0 },
  myPositionCard: { padding: 18, marginBottom: 16 },
  myPosHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  myPosLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  myPosBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  myPosRankWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  myPosRankHash: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  myPosRank: { fontSize: 52, fontWeight: '800', letterSpacing: -1 },
  myPosScore: { fontSize: 18, fontWeight: '700' },
  myPosScoreLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  listCard: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rankNum: { fontSize: 16, fontWeight: '700', width: 24 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700' },
  rowBody: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 14, fontWeight: '600' },
  medal: { fontSize: 14 },
  userScore: { fontSize: 12 },
});

const walletStyles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 16, gap: 0 },

  /* ── Create wallet state ── */
  createCard: { padding: 24, alignItems: 'center', marginBottom: 16, gap: 0 },
  walletIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  createTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  createSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  featureList: { alignSelf: 'stretch', gap: 10, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  featureText: { fontSize: 13, flex: 1, lineHeight: 20 },
  primaryBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 14 },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 17, opacity: 0.7 },

  /* ── Existing wallet state ── */
  walletCard: { padding: 20, marginBottom: 16 },
  walletCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  walletIconSmall: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCardHeaderText: { flex: 1 },
  walletCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  walletCardSubtitle: { fontSize: 12 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },
  addressSection: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  addressDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  addressInfo: { flex: 1, minWidth: 0 },
  addressLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  addressValue: { fontSize: 13, fontWeight: '500' },
  addressDivider: { height: 1, marginHorizontal: 14 },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  balanceLabel: { fontSize: 12, fontWeight: '600' },
  balanceNetworkLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  balanceValue: { fontSize: 13, fontWeight: '700' },
  networkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  networkBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  networkBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  skeletonDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  skeletonBar: { flex: 1, height: 12, borderRadius: 6 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  copiedText: { fontSize: 11, fontWeight: '600' },
  walletActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  exportWarning: { fontSize: 11, textAlign: 'center', lineHeight: 16, opacity: 0.7 },

  /* ── Networks (supported networks pill list) ── */
  networkPillRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  networkName: { fontSize: 13, fontWeight: '500' },
});

import type { User } from '../components/auth/AppAuthProvider';
import { useLocalSearchParams, useRouter, type Router } from 'expo-router';
import {
  Award,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Globe,
  LogOut,
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassCard, SectionContainer, resolveTier } from '@alternun/ui';
import type { TierSpec } from '@alternun/ui';
import { useAuth } from '../components/auth/AppAuthProvider';
import { useAppTranslation } from '../components/i18n/useAppTranslation';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';
import { PageTabBar, type TabItem } from '../components/common/PageTabBar';
import SearchFilterBar, { type SearchFilterOption } from '../components/common/SearchFilterBar';
import { resolveAppPackageVersion } from '../components/common/Footer.shared';
import profileStylesEnhanced from '../components/profile/ProfileStyles';

const AwardIcon = Award as React.FC<LucideProps>;
const BellIcon = Bell as React.FC<LucideProps>;
const BellOffIcon = BellOff as React.FC<LucideProps>;
const CheckIcon = Check as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;
const GlobeIcon = Globe as React.FC<LucideProps>;
const LogOutIcon = LogOut as React.FC<LucideProps>;
const MoonIcon = Moon as React.FC<LucideProps>;
const SettingsIcon = Settings as React.FC<LucideProps>;
const ShieldCheckIcon = ShieldCheck as React.FC<LucideProps>;
const TrophyIcon = Trophy as React.FC<LucideProps>;
const UserCircle2Icon = UserCircle2 as React.FC<LucideProps>;
const WalletIcon = Wallet as React.FC<LucideProps>;

// ─── Data & Helpers ──────────────────────────────────────────────────────────

type UserMetadata = Record<string, unknown>;

interface ColorPalette {
  bg: string;
  cardBg: string;
  cardBorder: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}

const TOP_USERS = [
  { rank: 1, name: 'María González', score: '98.420', medal: '🥇', color: '#d4b96a' },
  { rank: 2, name: 'Carlos Mendoza', score: '87.650', medal: '🥈', color: '#a8b8cc' },
  { rank: 3, name: 'Ana Ruiz', score: '76.330', medal: '🥉', color: '#cd7f32' },
  { rank: 4, name: 'Pablo Torres', score: '64.110', medal: null, color: null },
  { rank: 5, name: 'Lucía Vargas', score: '58.900', medal: null, color: null },
];

const NETWORKS = [
  { name: 'Polygon', color: '#8247e5' },
  { name: 'Ethereum', color: '#627eea' },
  { name: 'Celo', color: '#35d07f' },
];

const RANKING_FILTERS: SearchFilterOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'podium', label: 'Podio' },
  { key: 'others', label: 'Resto' },
];

function getMetadata(user: User | null): UserMetadata {
  if (!user?.metadata || typeof user.metadata !== 'object') return {};
  return user.metadata as UserMetadata;
}

function getProfileInfo(user: User | null): { displayName: string; email?: string } {
  if (!user) return { displayName: 'Guest' };
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
  return { displayName: validName?.trim() ?? emailLocalPart ?? 'Account', email: user.email };
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

function getAuthMethodLabel(user: User | null): string {
  if (!user) return 'guest';
  if (user.provider && !user.provider.startsWith('wallet:')) return `auth: ${user.provider}`;
  if (user.provider && user.provider.startsWith('wallet:')) return 'auth: wallet';
  if (user.email) return 'auth: email';
  return 'auth: session';
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

function resolveTierSpec(tier: ReturnType<typeof resolveTier>): TierSpec {
  switch (tier) {
    case 'bronze':
      return {
        label: 'Bronze',
        color: '#cd7f32',
        trackColor: 'rgba(205,127,50,0.28)',
        min: 0,
        max: 1_000,
        next: 'silver',
        nextLabel: 'Silver',
      };
    case 'silver':
      return {
        label: 'Silver',
        color: '#a8b8cc',
        trackColor: 'rgba(168,184,204,0.28)',
        min: 1_000,
        max: 5_000,
        next: 'gold',
        nextLabel: 'Gold',
      };
    case 'gold':
      return {
        label: 'Gold',
        color: '#d4b96a',
        trackColor: 'rgba(212,185,106,0.28)',
        min: 5_000,
        max: 20_000,
        next: 'platinum',
        nextLabel: 'Platinum',
      };
    case 'platinum':
    default:
      return {
        label: 'Platinum',
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
  isDark,
  c,
}: {
  displayName: string;
  score: number | null;
  email?: string;
  isDark: boolean;
  c: ColorPalette;
}): React.JSX.Element {
  const safeScore = score ?? 0;
  const tier = resolveTier(safeScore);
  const spec = resolveTierSpec(tier);
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
      {/* Decorative glow */}
      <View
        style={{
          position: 'absolute',
          top: -100,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: isDark ? 'rgba(30,230,181,0.12)' : 'rgba(13,148,136,0.08)',
          pointerEvents: 'none',
        }}
      />

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
              boxShadow: `0 0 0 2px ${spec.color}`,
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
              marginBottom: 18,
            }}
          >
            {email}
          </Text>
        )}

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
          <Stat label='Airs' value={safeScore.toLocaleString('es-ES')} c={c} />
          <Divider c={c} />
          <Stat label='Proyectos' value='0' c={c} />
          <Divider c={c} />
          <Stat label='CO₂' value='0 t' c={c} />
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
  const safeScore = score ?? 0;
  const tiers = [
    { id: 'bronze' as const, label: 'Bronze', threshold: 0, color: '#cd7f32' },
    { id: 'silver' as const, label: 'Silver', threshold: 1000, color: '#a8b8cc' },
    { id: 'gold' as const, label: 'Gold', threshold: 5000, color: '#d4b96a' },
    { id: 'platinum' as const, label: 'Platinum', threshold: 20000, color: '#9ba9c4' },
  ];
  const currentIdx = tiers.findIndex((t) => t.id === resolveTier(safeScore));

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
        Trayecto de Tier
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

function AchievementBadge({
  icon,
  label,
  color,
  unlocked = true,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  unlocked?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 6,
        opacity: unlocked ? 1 : 0.4,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: unlocked ? `${color}2E` : 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: unlocked ? `${color}66` : 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: 70,
        }}
      >
        {label}
      </Text>
    </View>
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
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      // TODO: Implement API call to save user information
      await new Promise((resolve) => setTimeout(resolve, 500));
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
            Información Personal
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
              Nombre
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
              Apellido
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
              Email
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
              Información Verificada
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
                Guardar Cambios
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
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Tab components ──────────────────────────────────────────────────────────

function RankingTab({ isDark, c }: { isDark: boolean; c: ColorPalette }): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const enhancedStyles = profileStylesEnhanced(isDark);

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
    <ScrollView
      contentContainerStyle={[enhancedStyles.content, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard variant='teal' style={rankingStyles.myPositionCard}>
        <View style={rankingStyles.myPosHeader}>
          <AwardIcon size={20} color={c.accent} />
          <Text style={[rankingStyles.myPosLabel, { color: c.accent }]}>Mi Posición</Text>
        </View>
        <View style={rankingStyles.myPosBody}>
          <View style={rankingStyles.myPosRankWrap}>
            <Text style={[rankingStyles.myPosRankHash, { color: c.muted }]}>#</Text>
            <Text style={[rankingStyles.myPosRank, { color: c.text }]}>47</Text>
          </View>
          <View>
            <Text style={[rankingStyles.myPosScore, { color: c.text }]}>12.088</Text>
            <Text style={[rankingStyles.myPosScoreLabel, { color: c.muted }]}>AIRS</Text>
          </View>
        </View>
      </GlassCard>
      <SectionContainer title='Top Impactores'>
        <SearchFilterBar
          value={search}
          onChangeText={setSearch}
          placeholder='Buscar persona...'
          filters={RANKING_FILTERS}
          activeFilter={activeFilter}
          onChangeFilter={setActiveFilter}
        />
        <GlassCard style={rankingStyles.listCard}>
          {filteredUsers.map((user, idx) => (
            <View
              key={user.rank}
              style={[
                rankingStyles.row,
                idx < filteredUsers.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                },
              ]}
            >
              <Text style={[rankingStyles.rankNum, { color: user.color ?? c.muted }]}>
                {user.rank}
              </Text>
              <View
                style={[
                  rankingStyles.avatarCircle,
                  {
                    backgroundColor: user.color ? `${user.color}22` : 'rgba(255,255,255,0.08)',
                    borderColor: user.color ? `${user.color}44` : 'rgba(255,255,255,0.12)',
                  },
                ]}
              >
                <Text style={[rankingStyles.avatarText, { color: user.color ?? c.muted }]}>
                  {getInitials(user.name)}
                </Text>
              </View>
              <View style={rankingStyles.rowBody}>
                <View style={rankingStyles.nameRow}>
                  <Text style={[rankingStyles.userName, { color: c.text }]}>{user.name}</Text>
                  {user.medal ? <Text style={rankingStyles.medal}>{user.medal}</Text> : null}
                </View>
                <Text style={[rankingStyles.userScore, { color: c.muted }]}>{user.score} AIRS</Text>
              </View>
              {user.rank <= 3 ? <TrophyIcon size={16} color={user.color ?? c.accent} /> : null}
            </View>
          ))}
        </GlassCard>
      </SectionContainer>
    </ScrollView>
  );
}

function WalletTab({ isDark, c }: { isDark: boolean; c: ColorPalette }): React.JSX.Element {
  const enhancedStyles = profileStylesEnhanced(isDark);
  return (
    <ScrollView
      contentContainerStyle={[enhancedStyles.content, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={walletStyles.connectCard}>
        <View style={[walletStyles.walletIconWrap, { backgroundColor: `${c.accent}14` }]}>
          <WalletIcon size={48} color={c.accent} />
        </View>
        <Text style={[walletStyles.connectTitle, { color: c.text }]}>Conecta tu Wallet</Text>
        <Text style={[walletStyles.connectSub, { color: c.muted }]}>
          Vincula tu billetera para gestionar tus ATN tokens
        </Text>
        <TouchableOpacity
          style={[
            walletStyles.connectBtn,
            { backgroundColor: `${c.accent}18`, borderColor: `${c.accent}44` },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[walletStyles.connectBtnText, { color: c.accent }]}>Conectar Wallet</Text>
        </TouchableOpacity>
      </GlassCard>
      <SectionContainer title='Redes Soportadas'>
        <View style={walletStyles.networkRow}>
          {NETWORKS.map((network) => (
            <View key={network.name} style={walletStyles.networkPill}>
              <View style={[walletStyles.networkDot, { backgroundColor: network.color }]} />
              <Text style={[walletStyles.networkName, { color: c.text }]}>{network.name}</Text>
            </View>
          ))}
        </View>
      </SectionContainer>
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
}): React.JSX.Element {
  const profile = useMemo(() => getProfileInfo(user), [user]);
  const walletAddress = useMemo(() => getWalletAddress(user), [user]);
  const walletProvider = useMemo(() => getWalletProvider(user), [user]);
  const walletConnected = Boolean(walletAddress || walletProvider);
  const authMethod = useMemo(() => getAuthMethodLabel(user), [user]);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
          isDark={isDark}
          c={c}
        />

        {/* Tier Journey */}
        <TierJourney score={0} isDark={isDark} c={c} />

        {/* Achievements */}
        <SectionContainer title='Logros' style={{ margin: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              padding: 16,
            }}
          >
            <AchievementBadge
              icon={<Wallet size={22} color='#34d399' />}
              label='Primer Árbol'
              color='#34d399'
              unlocked
            />
            <AchievementBadge
              icon={<Trophy size={22} color={c.accent} />}
              label='10 kg CO₂'
              color={c.accent}
              unlocked
            />
            <AchievementBadge
              icon={<Trophy size={22} color='#d4b96a' />}
              label='1K Airs'
              color='#d4b96a'
              unlocked
            />
            <AchievementBadge
              icon={<Award size={22} color='#818cf8' />}
              label='5K Airs'
              color='#818cf8'
              unlocked
            />
            <AchievementBadge
              icon={<CheckIcon size={22} color={c.accent} />}
              label='KYC Verificado'
              color={c.accent}
              unlocked
            />
            <AchievementBadge
              icon={<UserCircle2 size={22} color='#a8b8cc' />}
              label='Recluta'
              color='#a8b8cc'
              unlocked
            />
            <AchievementBadge
              icon={<Wallet size={22} color='#cd7f32' />}
              label='Socio'
              color='#cd7f32'
              unlocked
            />
            <AchievementBadge
              icon={<Trophy size={22} color='#9ba9c4' />}
              label='Platinum'
              color='#9ba9c4'
              unlocked={false}
            />
          </View>
        </SectionContainer>

        {/* Cuenta */}
        <SectionContainer title='Cuenta' style={{ margin: 12 }}>
          <GlassCard>
            <SettingRow
              icon={UserCircle2}
              label='Información personal'
              value='Verificado'
              c={c}
              onPress={() => setShowPersonalInfoModal(true)}
            />
            <SettingRow
              icon={Wallet}
              label='Wallet'
              value={walletConnected ? truncateMiddle(walletAddress) : 'No conectada'}
              c={c}
              onPress={() => {
                if (!walletConnected) {
                  router.push({ pathname: '/mi-perfil', params: { tab: 'wallet' } });
                }
              }}
            />
            <SettingRow
              icon={Shield}
              label='Método de acceso'
              value={authMethod}
              c={c}
              hideChevron
              onPress={() => {
                Alert.alert(
                  'Métodos de acceso',
                  `Actual: ${authMethod}\n\nMétodos disponibles:\n• Email\n• Google\n• Discord`
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
                Notificaciones
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
        <SectionContainer title='Preferencias' style={{ margin: 12 }}>
          <GlassCard>
            <SettingRow
              icon={MoonIcon}
              label='Tema'
              value={isDark ? 'Oscuro' : 'Claro'}
              c={c}
              onPress={onToggleTheme}
            />
            <SettingRow
              icon={GlobeIcon}
              label='Idioma'
              value={language === 'es' ? 'Español' : language === 'en' ? 'English' : 'ไทย'}
              c={c}
              onPress={onCycleLanguage}
            />
            <SettingRow
              icon={SettingsIcon}
              label='Configuración'
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
                Cerrar sesión
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

const TABS: TabItem[] = [
  { key: 'ranking', label: 'Ranking', icon: TrophyIcon },
  { key: 'wallet', label: 'Wallet', icon: WalletIcon },
  { key: 'perfil', label: 'Profile', icon: UserCircle2Icon },
];

export default function MiPerfilScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user, loading, signOutUser } = useAuth();
  const { t } = useAppTranslation('mobile');
  const { themeMode, language, toggleThemeMode, cycleLanguage } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const appVersion = resolveAppPackageVersion().version;
  const footerLabel = t('profile.footer', { version: appVersion });
  const initialTab =
    typeof params.tab === 'string' && TABS.some((t) => t.key === params.tab)
      ? params.tab
      : 'perfil';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (typeof params.tab === 'string' && TABS.some((t) => t.key === params.tab)) {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

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
            Inicia sesión para ver tu perfil
          </Text>
          <TouchableOpacity
            style={[
              styles.signInBtn,
              { backgroundColor: `${c.accent}18`, borderColor: `${c.accent}44` },
            ]}
            onPress={() => router.push('/auth?next=/mi-perfil')}
          >
            <Text style={[styles.signInBtnText, { color: c.accent }]}>Open Sign In</Text>
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
            <Text style={[styles.pageTitle, { color: c.text }]}>My Profile</Text>
          </View>
          <PageTabBar
            tabs={TABS}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            isDark={isDark}
            accent={c.accent}
            muted={c.muted}
          />
        </View>
        <Animated.View
          style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {activeTab === 'ranking' && <RankingTab isDark={isDark} c={c} />}
          {activeTab === 'wallet' && <WalletTab isDark={isDark} c={c} />}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  connectCard: { padding: 28, alignItems: 'center', marginBottom: 16 },
  walletIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  connectTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  connectSub: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  connectBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
  connectBtnText: { fontWeight: '600', fontSize: 14 },
  networkRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  networkName: { fontSize: 13, fontWeight: '500' },
});

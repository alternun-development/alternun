import React, { useCallback, useMemo, useState } from 'react';
import type { User } from '@edcalderon/auth';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from 'react-native';

import TopNav from './TopNav';
import HeroStats from './HeroStats';
import WalletConnectModal from './WalletConnectModal';
import ToastSystem from './ToastSystem';
import { useAppPreferences } from '../settings/AppPreferencesProvider';

import type { ToastMessage } from './types';

let toastIdCounter = 0;

interface DashboardProps {
  user: User | null;
  onRequireSignIn: () => void;
  onOpenProfilePage: () => void;
  onOpenSettingsPage: () => void;
  onWalletConnect: (walletType: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

interface SectionConfig {
  key: string;
  label: string;
  subtitle: string;
  requiresWallet: boolean;
  integrationTitle: string;
  integrationDescription: string;
}

type AccessState = 'signin' | 'wallet' | 'integration';
type UserMetadata = Record<string, unknown>;

interface DashboardStats {
  totalAIRS: number;
  activePositions: number;
  tokensHeld: number;
  compensationsCompleted: number;
}

interface ProfileInfo {
  displayName: string;
  email?: string;
}

const DASHBOARD_SECTIONS: SectionConfig[] = [
  {
    key: 'compensation',
    label: 'Micro-Compensation',
    subtitle: 'Zero blockchain complexity',
    requiresWallet: false,
    integrationTitle: 'Payment API integration pending',
    integrationDescription:
      'No placeholder transactions are shown. Configure your payment provider and backend endpoint to activate this flow.',
  },
  {
    key: 'portfolio',
    label: 'ImpactToken Portfolio',
    subtitle: 'Your on-chain impact tokens',
    requiresWallet: true,
    integrationTitle: 'Contract portfolio sync pending',
    integrationDescription:
      'Token balances are intentionally hidden until contract reads are wired to your production indexer or RPC.',
  },
  {
    key: 'pool',
    label: 'PoolVault',
    subtitle: 'Fractional yield positions',
    requiresWallet: true,
    integrationTitle: 'Vault contract integration pending',
    integrationDescription:
      'Pool positions are placeholder-only. Hook your vault contracts and claim endpoints to unlock this section.',
  },
  {
    key: 'ledger',
    label: 'Activity Feed',
    subtitle: 'AIRS ledger history',
    requiresWallet: true,
    integrationTitle: 'Ledger API integration pending',
    integrationDescription:
      'No synthetic AIRS events are displayed. Connect your authenticated ledger API for real entries.',
  },
  {
    key: 'certificates',
    label: 'Certificates',
    subtitle: 'Your impact SBT gallery',
    requiresWallet: true,
    integrationTitle: 'SBT certificate sync pending',
    integrationDescription:
      'Certificate cards stay locked until on-chain certificate queries and metadata endpoints are connected.',
  },
];

function getMetadata(user: User | null): UserMetadata {
  if (!user || !user.metadata || typeof user.metadata !== 'object') {
    return {};
  }

  return user.metadata as UserMetadata;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function firstValidNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    const value = readNumber(candidate);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function clampToPositiveInteger(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

function getUserDashboardStats(user: User | null): DashboardStats | null {
  if (!user) {
    return null;
  }

  const metadata = getMetadata(user);
  const stats = typeof metadata.stats === 'object' && metadata.stats !== null
    ? (metadata.stats as UserMetadata)
    : {};

  return {
    totalAIRS: clampToPositiveInteger(
      firstValidNumber(
        stats.totalAIRS,
        stats.totalAirs,
        stats.total_airs,
        metadata.totalAIRS,
        metadata.totalAirs,
        metadata.total_airs,
        metadata.airs,
      ) ?? 0,
    ),
    activePositions: clampToPositiveInteger(
      firstValidNumber(
        stats.activePositions,
        stats.active_positions,
        metadata.activePositions,
        metadata.active_positions,
      ) ?? 0,
    ),
    tokensHeld: clampToPositiveInteger(
      firstValidNumber(
        stats.tokensHeld,
        stats.tokens_held,
        metadata.tokensHeld,
        metadata.tokens_held,
      ) ?? 0,
    ),
    compensationsCompleted: clampToPositiveInteger(
      firstValidNumber(
        stats.compensationsCompleted,
        stats.compensations_completed,
        metadata.compensationsCompleted,
        metadata.compensations_completed,
      ) ?? 0,
    ),
  };
}

function getUserProfileInfo(user: User | null): ProfileInfo {
  if (!user) {
    return { displayName: 'Guest' };
  }

  const metadata = getMetadata(user);
  const firstName = typeof metadata.firstName === 'string'
    ? metadata.firstName
    : typeof metadata.first_name === 'string'
      ? metadata.first_name
      : '';
  const lastName = typeof metadata.lastName === 'string'
    ? metadata.lastName
    : typeof metadata.last_name === 'string'
      ? metadata.last_name
      : '';

  const fullNameFromParts = `${firstName} ${lastName}`.trim();

  const rawNameCandidates = [
    metadata.fullName,
    metadata.full_name,
    metadata.displayName,
    metadata.display_name,
    metadata.name,
    fullNameFromParts,
  ];

  const nameCandidate = rawNameCandidates.find(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
  );

  const emailLocalPart =
    typeof user.email === 'string' && user.email.includes('@')
      ? user.email.split('@')[0]
      : undefined;

  return {
    displayName: nameCandidate?.trim() || emailLocalPart || 'Account',
    email: user.email,
  };
}

function getWalletAddress(user: User | null): string {
  if (!user) {
    return '';
  }

  const metadata = getMetadata(user);
  const walletObject = typeof metadata.wallet === 'object' && metadata.wallet !== null
    ? (metadata.wallet as Record<string, unknown>)
    : undefined;

  const metadataCandidates = [
    metadata.walletAddress,
    metadata.wallet_address,
    metadata.address,
    walletObject?.address,
    walletObject?.walletAddress,
  ];

  for (const candidate of metadataCandidates) {
    if (typeof candidate === 'string' && candidate.startsWith('0x') && candidate.length >= 10) {
      return candidate;
    }
  }

  if (typeof user.providerUserId === 'string' && user.providerUserId.startsWith('0x')) {
    return user.providerUserId;
  }

  if (user.id.includes('0x')) {
    const candidate = user.id.slice(user.id.indexOf('0x'));
    if (candidate.length >= 10) {
      return candidate;
    }
  }

  return '';
}

function getWalletProvider(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const metadata = getMetadata(user);
  const provider = typeof metadata.walletProvider === 'string'
    ? metadata.walletProvider
    : typeof metadata.wallet_provider === 'string'
      ? metadata.wallet_provider
      : null;

  if (provider && provider.trim().length > 0) {
    return provider.toLowerCase();
  }

  if (typeof user.provider === 'string' && user.provider.startsWith('wallet:')) {
    return user.provider.replace('wallet:', '').toLowerCase();
  }

  return null;
}

function getAuthMethodLabel(user: User | null, walletConnected: boolean, walletProvider: string | null): string {
  if (!user) {
    return 'guest';
  }

  if (walletConnected) {
    return `wallet: ${walletProvider ?? 'connected'}`;
  }

  if (user.provider) {
    return `auth: ${user.provider}`;
  }

  if (user.email) {
    return 'auth: email';
  }

  return 'auth: session';
}

function getAccessState(section: SectionConfig, user: User | null, walletConnected: boolean): AccessState {
  if (!user) {
    return 'signin';
  }

  if (section.requiresWallet && !walletConnected) {
    return 'wallet';
  }

  return 'integration';
}

export default function Dashboard({
  user,
  onRequireSignIn,
  onOpenProfilePage,
  onOpenSettingsPage,
  onWalletConnect,
  onSignOut,
}: DashboardProps) {
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { themeMode, language, toggleThemeMode, cycleLanguage } = useAppPreferences();
  const isDark = themeMode === 'dark';

  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const walletAddress = getWalletAddress(user);
  const walletProvider = getWalletProvider(user);
  const walletConnected = Boolean(walletAddress || walletProvider);
  const atnEligible = walletConnected;
  const authMethodLabel = getAuthMethodLabel(user, walletConnected, walletProvider);
  const userStats = useMemo(() => getUserDashboardStats(user), [user]);
  const profileInfo = useMemo(() => getUserProfileInfo(user), [user]);

  const handleRequireSignIn = useCallback(() => {
    onRequireSignIn();
  }, [onRequireSignIn]);

  const handleOpenWalletConnect = useCallback(() => {
    if (!user) {
      addToast('info', 'Sign In Required', 'Sign in first to connect a wallet.');
      onRequireSignIn();
      return;
    }

    setWalletModalVisible(true);
  }, [addToast, onRequireSignIn, user]);

  const handleConnect = useCallback(
    async (walletType: string) => {
      setWalletModalVisible(false);
      try {
        await onWalletConnect(walletType);
        addToast('success', 'Wallet Connected', 'Wallet authentication completed.');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to connect wallet at this time.';
        addToast('error', 'Wallet Connection Failed', message);
      }
    },
    [addToast, onWalletConnect],
  );

  const handleSignOut = useCallback(async () => {
    if (!user) {
      onRequireSignIn();
      return;
    }

    try {
      await onSignOut();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign out right now.';
      addToast('error', 'Sign Out Failed', message);
    }
  }, [addToast, onRequireSignIn, onSignOut, user]);

  const handleOpenProfile = useCallback(() => {
    onOpenProfilePage();
  }, [onOpenProfilePage]);

  const handleOpenSettings = useCallback(() => {
    onOpenSettingsPage();
  }, [onOpenSettingsPage]);

  const sectionStates = useMemo(
    () =>
      DASHBOARD_SECTIONS.map((section) => ({
        section,
        accessState: getAccessState(section, user, walletConnected),
      })),
    [user, walletConnected],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#050510' : '#f6f8fc'} />
      <View style={[styles.container, { backgroundColor: isDark ? '#050510' : '#f6f8fc' }]}>
        <TopNav
          signedIn={Boolean(user)}
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          atnEligible={atnEligible}
          themeMode={themeMode}
          language={language}
          authMethodLabel={authMethodLabel}
          userDisplayName={profileInfo.displayName}
          userEmail={profileInfo.email}
          onSignIn={handleRequireSignIn}
          onConnectWallet={handleOpenWalletConnect}
          onToggleTheme={toggleThemeMode}
          onCycleLanguage={cycleLanguage}
          onOpenProfile={handleOpenProfile}
          onOpenSettings={handleOpenSettings}
          onSignOut={() => {
            void handleSignOut();
          }}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <HeroStats
            totalAIRS={userStats ? userStats.totalAIRS : null}
            activePositions={userStats ? userStats.activePositions : null}
            tokensHeld={userStats ? userStats.tokensHeld : null}
            compensationsCompleted={userStats ? userStats.compensationsCompleted : null}
            previewMode={!user}
            isDark={isDark}
          />

          {!user ? (
            <View style={styles.authHintRow}>
              <Text style={[styles.authHintText, { color: isDark ? 'rgba(232,232,255,0.72)' : '#475569' }]}>
                Sign in from the top-right profile menu to activate actions.
              </Text>
            </View>
          ) : null}

          {sectionStates.map(({ section, accessState }, index) => {
            return (
              <React.Fragment key={section.key}>
                <SectionDivider isDark={isDark} />
                <SectionLabel isDark={isDark} label={section.label} subtitle={section.subtitle} />
                <SectionExperienceCard
                  section={section}
                  accessState={accessState}
                  isDark={isDark}
                  onConnectWallet={handleOpenWalletConnect}
                  onSignOut={() => {
                    void handleSignOut();
                  }}
                  onInteract={(actionLabel) => {
                    addToast(
                      'info',
                      'Work in progress',
                      `${section.label}: ${actionLabel} will be enabled in the next release.`,
                    );
                  }}
                />
                {index === sectionStates.length - 1 ? <View style={styles.bottomSpacer} /> : null}
              </React.Fragment>
            );
          })}
        </ScrollView>

        <WalletConnectModal
          visible={walletModalVisible}
          onClose={() => setWalletModalVisible(false)}
          onConnect={(walletType) => {
            void handleConnect(walletType);
          }}
        />

        <ToastSystem toasts={toasts} onDismiss={dismissToast} />
      </View>
    </SafeAreaView>
  );
}

function SectionDivider({ isDark }: { isDark: boolean }) {
  return <View style={[sectionStyles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)' }]} />;
}

function SectionLabel({
  isDark,
  label,
  subtitle,
}: {
  isDark: boolean;
  label: string;
  subtitle?: string;
}) {
  return (
    <View style={sectionStyles.labelContainer}>
      <View style={sectionStyles.labelAccent} />
      <View>
        <Text style={[sectionStyles.label, { color: isDark ? 'rgba(232,232,255,0.95)' : '#0f172a' }]}>{label}</Text>
        {subtitle ? (
          <Text style={[sectionStyles.sublabel, { color: isDark ? 'rgba(232,232,255,0.8)' : '#475569' }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface SectionExperienceCardProps {
  section: SectionConfig;
  accessState: AccessState;
  isDark: boolean;
  onConnectWallet: () => void;
  onSignOut: () => void;
  onInteract: (actionLabel: string) => void;
}

interface ExperiencePalette {
  cardBg: string;
  cardBorder: string;
  rowBg: string;
  rowBorder: string;
  title: string;
  muted: string;
  strong: string;
  progressTrack: string;
  feedDotMuted: string;
  secondaryButtonBg: string;
  secondaryButtonBorder: string;
  secondaryButtonText: string;
  overlayBg: string;
  overlayTitle: string;
  overlayDescription: string;
  overlaySecondaryBg: string;
  overlaySecondaryBorder: string;
  overlaySecondaryText: string;
}

function getExperiencePalette(isDark: boolean): ExperiencePalette {
  if (isDark) {
    return {
      cardBg: 'rgba(255,255,255,0.03)',
      cardBorder: 'rgba(255,255,255,0.12)',
      rowBg: 'rgba(255,255,255,0.04)',
      rowBorder: 'rgba(255,255,255,0.08)',
      title: '#e8e8ff',
      muted: 'rgba(232,232,255,0.74)',
      strong: '#e8e8ff',
      progressTrack: 'rgba(255,255,255,0.08)',
      feedDotMuted: 'rgba(232,232,255,0.22)',
      secondaryButtonBg: 'rgba(255,255,255,0.02)',
      secondaryButtonBorder: 'rgba(255,255,255,0.2)',
      secondaryButtonText: '#e8e8ff',
      overlayBg: 'rgba(5,5,16,0.88)',
      overlayTitle: '#e8e8ff',
      overlayDescription: 'rgba(232,232,255,0.9)',
      overlaySecondaryBg: 'rgba(255,255,255,0.02)',
      overlaySecondaryBorder: 'rgba(255,255,255,0.2)',
      overlaySecondaryText: '#e8e8ff',
    };
  }

  return {
    cardBg: '#ffffff',
    cardBorder: 'rgba(15,23,42,0.16)',
    rowBg: 'rgba(15,23,42,0.04)',
    rowBorder: 'rgba(15,23,42,0.12)',
    title: '#0f172a',
    muted: '#475569',
    strong: '#0f172a',
    progressTrack: 'rgba(15,23,42,0.12)',
    feedDotMuted: 'rgba(15,23,42,0.25)',
    secondaryButtonBg: 'rgba(15,23,42,0.03)',
    secondaryButtonBorder: 'rgba(15,23,42,0.2)',
    secondaryButtonText: '#0f172a',
    overlayBg: 'rgba(255,255,255,0.92)',
    overlayTitle: '#0f172a',
    overlayDescription: '#1e293b',
    overlaySecondaryBg: 'rgba(15,23,42,0.03)',
    overlaySecondaryBorder: 'rgba(15,23,42,0.2)',
    overlaySecondaryText: '#0f172a',
  };
}

function SectionExperienceCard({
  section,
  accessState,
  isDark,
  onConnectWallet,
  onSignOut,
  onInteract,
}: SectionExperienceCardProps) {
  const locked = accessState !== 'integration';
  const showOverlay = accessState === 'wallet';
  const palette = getExperiencePalette(isDark);

  return (
    <View style={[experienceStyles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
      <SectionPreview
        sectionKey={section.key}
        isDark={isDark}
        disabled={locked}
        onInteract={onInteract}
      />

      {showOverlay ? (
        <View style={[experienceStyles.overlay, { backgroundColor: palette.overlayBg }]}>
          <Text style={[experienceStyles.overlayTitle, { color: palette.overlayTitle }]}>
            Connect wallet to activate this section
          </Text>
          <Text style={[experienceStyles.overlayDescription, { color: palette.overlayDescription }]}>
            You can preview the final UI now. Actions will unlock after wallet linking.
          </Text>
          <View style={experienceStyles.overlayActions}>
            <TouchableOpacity
              style={experienceStyles.overlayPrimaryButton}
              onPress={onConnectWallet}
              activeOpacity={0.85}
            >
              <Text style={experienceStyles.overlayPrimaryText}>Connect Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                experienceStyles.overlaySecondaryButton,
                {
                  backgroundColor: palette.overlaySecondaryBg,
                  borderColor: palette.overlaySecondaryBorder,
                },
              ]}
              onPress={onSignOut}
              activeOpacity={0.85}
            >
              <Text style={[experienceStyles.overlaySecondaryText, { color: palette.overlaySecondaryText }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface SectionPreviewProps {
  sectionKey: string;
  isDark: boolean;
  disabled: boolean;
  onInteract: (actionLabel: string) => void;
}

function SectionPreview({ sectionKey, isDark, disabled, onInteract }: SectionPreviewProps) {
  const palette = getExperiencePalette(isDark);
  const disabledActionStyle = disabled ? experienceStyles.actionDisabled : null;
  const disabledActionTextStyle = disabled ? experienceStyles.actionTextDisabled : null;

  const run = (label: string) => {
    if (disabled) {
      return;
    }
    onInteract(label);
  };

  if (sectionKey === 'compensation') {
    return (
      <View style={experienceStyles.previewBlock}>
        <Text style={[experienceStyles.previewTitle, { color: palette.title }]}>Offset Checkout</Text>
        <View style={[experienceStyles.metricRow, { backgroundColor: palette.rowBg, borderColor: palette.rowBorder }]}>
          <Text style={[experienceStyles.metricLabel, { color: palette.muted }]}>Project</Text>
          <Text style={[experienceStyles.metricValue, { color: palette.strong }]}>Not selected</Text>
        </View>
        <View style={[experienceStyles.metricRow, { backgroundColor: palette.rowBg, borderColor: palette.rowBorder }]}>
          <Text style={[experienceStyles.metricLabel, { color: palette.muted }]}>Amount</Text>
          <Text style={[experienceStyles.metricValue, { color: palette.strong }]}>$0.00</Text>
        </View>
        <View style={experienceStyles.previewActions}>
          <TouchableOpacity
            style={[experienceStyles.previewActionPrimary, disabledActionStyle]}
            disabled={disabled}
            onPress={() => run('Open checkout')}
            activeOpacity={0.8}
          >
            <Text style={[experienceStyles.previewActionPrimaryText, disabledActionTextStyle]}>
              Preview Checkout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              experienceStyles.previewActionSecondary,
              {
                backgroundColor: palette.secondaryButtonBg,
                borderColor: palette.secondaryButtonBorder,
              },
              disabledActionStyle,
            ]}
            disabled={disabled}
            onPress={() => run('Issue certificate')}
            activeOpacity={0.8}
          >
            <Text style={[experienceStyles.previewActionSecondaryText, { color: palette.secondaryButtonText }, disabledActionTextStyle]}>
              Issue SBT
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (sectionKey === 'portfolio') {
    return (
      <View style={experienceStyles.previewBlock}>
        <View style={experienceStyles.tokenRow}>
          <Text style={[experienceStyles.tokenId, { color: palette.strong }]}>Token #000</Text>
          <View style={experienceStyles.statusPill}>
            <Text style={experienceStyles.statusPillText}>Free</Text>
          </View>
        </View>
        <Text style={[experienceStyles.tokenMeta, { color: palette.muted }]}>Acquisition: $0.00</Text>
        <View style={experienceStyles.previewActions}>
          <TouchableOpacity
            style={[experienceStyles.previewActionPrimary, disabledActionStyle]}
            disabled={disabled}
            onPress={() => run('Deposit token to pool')}
            activeOpacity={0.8}
          >
            <Text style={[experienceStyles.previewActionPrimaryText, disabledActionTextStyle]}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              experienceStyles.previewActionSecondary,
              {
                backgroundColor: palette.secondaryButtonBg,
                borderColor: palette.secondaryButtonBorder,
              },
              disabledActionStyle,
            ]}
            disabled={disabled}
            onPress={() => run('Retire token')}
            activeOpacity={0.8}
          >
            <Text style={[experienceStyles.previewActionSecondaryText, { color: palette.secondaryButtonText }, disabledActionTextStyle]}>
              Retire
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              experienceStyles.previewActionSecondary,
              {
                backgroundColor: palette.secondaryButtonBg,
                borderColor: palette.secondaryButtonBorder,
              },
              disabledActionStyle,
            ]}
            disabled={disabled}
            onPress={() => run('Transfer token')}
            activeOpacity={0.8}
          >
            <Text style={[experienceStyles.previewActionSecondaryText, { color: palette.secondaryButtonText }, disabledActionTextStyle]}>
              Transfer
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (sectionKey === 'pool') {
    return (
      <View style={experienceStyles.previewBlock}>
        <View style={[experienceStyles.metricRow, { backgroundColor: palette.rowBg, borderColor: palette.rowBorder }]}>
          <Text style={[experienceStyles.metricLabel, { color: palette.muted }]}>Position</Text>
          <Text style={[experienceStyles.metricValue, { color: palette.strong }]}>POS-000</Text>
        </View>
        <View style={[experienceStyles.metricRow, { backgroundColor: palette.rowBg, borderColor: palette.rowBorder }]}>
          <Text style={[experienceStyles.metricLabel, { color: palette.muted }]}>Total Value</Text>
          <Text style={[experienceStyles.metricValue, { color: palette.strong }]}>$0.00</Text>
        </View>
        <View style={[experienceStyles.progressTrack, { backgroundColor: palette.progressTrack }]}>
          <View style={[experienceStyles.progressFill, { width: '0%' }]} />
        </View>
        <Text style={[experienceStyles.progressText, { color: palette.muted }]}>Sold 0.0%</Text>
        <View style={experienceStyles.previewActions}>
          <TouchableOpacity
            style={[experienceStyles.previewActionPrimary, disabledActionStyle]}
            disabled={disabled}
            onPress={() => run('Claim proceeds')}
            activeOpacity={0.8}
          >
            <Text style={[experienceStyles.previewActionPrimaryText, disabledActionTextStyle]}>
              Claim Proceeds
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (sectionKey === 'ledger') {
    return (
      <View style={experienceStyles.previewBlock}>
        <View style={experienceStyles.feedRow}>
          <View style={experienceStyles.feedDot} />
          <View style={experienceStyles.feedTextColumn}>
            <Text style={[experienceStyles.feedTitle, { color: palette.strong }]}>No AIRS activity yet</Text>
            <Text style={[experienceStyles.feedMeta, { color: palette.muted }]}>Connect integrations to stream events</Text>
          </View>
        </View>
        <View style={experienceStyles.feedRow}>
          <View style={[experienceStyles.feedDotMuted, { backgroundColor: palette.feedDotMuted }]} />
          <View style={experienceStyles.feedTextColumn}>
            <Text style={[experienceStyles.feedTitleMuted, { color: palette.muted }]}>Ledger reference</Text>
            <Text style={[experienceStyles.feedMeta, { color: palette.muted }]}>0x0000...0000</Text>
          </View>
        </View>
        <View style={experienceStyles.previewActions}>
          <TouchableOpacity
            style={[
              experienceStyles.previewActionSecondary,
              {
                backgroundColor: palette.secondaryButtonBg,
                borderColor: palette.secondaryButtonBorder,
              },
              disabledActionStyle,
            ]}
            disabled={disabled}
            onPress={() => run('Refresh ledger feed')}
            activeOpacity={0.8}
          >
            <Text style={[experienceStyles.previewActionSecondaryText, { color: palette.secondaryButtonText }, disabledActionTextStyle]}>
              Refresh Feed
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={experienceStyles.previewBlock}>
      <View style={[experienceStyles.metricRow, { backgroundColor: palette.rowBg, borderColor: palette.rowBorder }]}>
        <Text style={[experienceStyles.metricLabel, { color: palette.muted }]}>Certificate</Text>
        <Text style={[experienceStyles.metricValue, { color: palette.strong }]}>SBT-000</Text>
      </View>
      <View style={[experienceStyles.metricRow, { backgroundColor: palette.rowBg, borderColor: palette.rowBorder }]}>
        <Text style={[experienceStyles.metricLabel, { color: palette.muted }]}>Impact</Text>
        <Text style={[experienceStyles.metricValue, { color: palette.strong }]}>0.00 tCO₂</Text>
      </View>
      <View style={experienceStyles.previewActions}>
        <TouchableOpacity
          style={[experienceStyles.previewActionPrimary, disabledActionStyle]}
          disabled={disabled}
          onPress={() => run('Open certificate viewer')}
          activeOpacity={0.8}
        >
          <Text style={[experienceStyles.previewActionPrimaryText, disabledActionTextStyle]}>
            View Certificate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            experienceStyles.previewActionSecondary,
            {
              backgroundColor: palette.secondaryButtonBg,
              borderColor: palette.secondaryButtonBorder,
            },
            disabledActionStyle,
          ]}
          disabled={disabled}
          onPress={() => run('Share certificate')}
          activeOpacity={0.8}
        >
          <Text style={[experienceStyles.previewActionSecondaryText, { color: palette.secondaryButtonText }, disabledActionTextStyle]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  labelAccent: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#1ccba1',
  },
  label: {
    color: 'rgba(232,232,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sublabel: {
    color: 'rgba(232,232,255,0.72)',
    fontSize: 11,
    marginTop: 1,
  },
});

const experienceStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    position: 'relative',
    gap: 10,
  },
  previewBlock: {
    gap: 10,
  },
  previewTitle: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricLabel: {
    color: 'rgba(232,232,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    color: '#e8e8ff',
    fontSize: 12,
    fontWeight: '700',
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tokenId: {
    color: '#e8e8ff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  tokenMeta: {
    color: 'rgba(232,232,255,0.72)',
    fontSize: 12,
  },
  statusPill: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.35)',
    backgroundColor: 'rgba(28,203,161,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    color: '#1ccba1',
    fontSize: 10,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#1ccba1',
  },
  progressText: {
    color: 'rgba(232,232,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  feedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1ccba1',
  },
  feedDotMuted: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(232,232,255,0.22)',
  },
  feedTextColumn: {
    flex: 1,
    gap: 2,
  },
  feedTitle: {
    color: '#e8e8ff',
    fontSize: 12,
    fontWeight: '700',
  },
  feedTitleMuted: {
    color: 'rgba(232,232,255,0.68)',
    fontSize: 12,
    fontWeight: '600',
  },
  feedMeta: {
    color: 'rgba(232,232,255,0.72)',
    fontSize: 11,
  },
  previewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  previewActionPrimary: {
    backgroundColor: '#1ccba1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  previewActionPrimaryText: {
    color: '#050510',
    fontSize: 11,
    fontWeight: '700',
  },
  previewActionSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  previewActionSecondaryText: {
    color: '#e8e8ff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionDisabled: {
    opacity: 0.38,
  },
  actionTextDisabled: {
    textDecorationLine: 'none',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(5,5,16,0.74)',
    padding: 14,
    justifyContent: 'flex-end',
    gap: 8,
  },
  overlayTitle: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  overlayDescription: {
    color: 'rgba(232,232,255,0.78)',
    fontSize: 12,
    lineHeight: 18,
  },
  overlayActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  overlayPrimaryButton: {
    backgroundColor: '#1ccba1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  overlayPrimaryText: {
    color: '#050510',
    fontSize: 12,
    fontWeight: '700',
  },
  overlaySecondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  overlaySecondaryText: {
    color: '#e8e8ff',
    fontSize: 12,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  authHintRow: {
    paddingHorizontal: 16,
    marginTop: -2,
    marginBottom: 4,
  },
  authHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 80,
  },
});

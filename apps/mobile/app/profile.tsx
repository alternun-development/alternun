import type { User } from '../components/auth/AppAuthProvider';
import { useRouter } from 'expo-router';
import { LogOut, Settings, Shield, UserCircle2, Wallet } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createTypographyStyles } from '../components/theme/typography';
import { useAuth } from '../components/auth/AppAuthProvider';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import TopNav from '../components/dashboard/TopNav';

type UserMetadata = Record<string, unknown>;

interface ProfileInfo {
  displayName: string;
  email?: string;
}

function getMetadata(user: User | null): UserMetadata {
  if (!user?.metadata || typeof user.metadata !== 'object') {
    return {};
  }

  return user.metadata as UserMetadata;
}

function getProfileInfo(user: User | null): ProfileInfo {
  if (!user) {
    return { displayName: 'Guest' };
  }

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

  return {
    displayName: validName?.trim() ?? emailLocalPart ?? 'Account',
    email: user.email,
  };
}

function getWalletAddress(user: User | null): string {
  if (!user) {
    return '';
  }

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
    if (typeof candidate === 'string' && candidate.startsWith('0x') && candidate.length >= 10) {
      return candidate;
    }
  }

  if (typeof user.providerUserId === 'string' && user.providerUserId.startsWith('0x')) {
    return user.providerUserId;
  }

  return '';
}

function getWalletProvider(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const metadata = getMetadata(user);
  const provider =
    typeof metadata.walletProvider === 'string'
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

function getAuthMethodLabel(user: User | null): string {
  if (!user) {
    return 'guest';
  }

  if (user.provider && !user.provider.startsWith('wallet:')) {
    return `auth: ${user.provider}`;
  }

  if (user.provider && user.provider.startsWith('wallet:')) {
    return 'auth: wallet';
  }

  if (user.email) {
    return 'auth: email';
  }

  return 'auth: session';
}

function getRoles(user: User | null): string[] {
  if (!user) {
    return [];
  }

  const metadata = getMetadata(user);
  const roles = new Set<string>();

  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      if (typeof role === 'string' && role.trim().length > 0) {
        roles.add(role.trim());
      }
    }
  }

  const metadataRoles = metadata.roles;
  if (Array.isArray(metadataRoles)) {
    for (const role of metadataRoles) {
      if (typeof role === 'string' && role.trim().length > 0) {
        roles.add(role.trim());
      }
    }
  } else if (typeof metadataRoles === 'string' && metadataRoles.trim().length > 0) {
    roles.add(metadataRoles.trim());
  }

  const singleRole = metadata.role;
  if (typeof singleRole === 'string' && singleRole.trim().length > 0) {
    roles.add(singleRole.trim());
  }

  return Array.from(roles);
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function truncateMiddle(value: string, start = 6, end = 4): string {
  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

interface InfoRowProps {
  label: string;
  value: string;
  labelColor: string;
  valueColor: string;
  borderColor: string;
  valueStrong?: boolean;
}

function InfoRow({
  label,
  value,
  labelColor,
  valueColor,
  borderColor,
  valueStrong = false,
}: InfoRowProps) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
      <Text style={[styles.infoLabel, { color: labelColor }]}>{label}</Text>
      <Text
        style={[styles.infoValue, valueStrong && styles.infoValueStrong, { color: valueColor }]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ProfileRoute() {
  const router = useRouter();
  const { user, loading, signOutUser } = useAuth();
  const { themeMode, language, motionLevel, toggleThemeMode, cycleLanguage, cycleMotionLevel } =
    useAppPreferences();
  const [signingOut, setSigningOut] = useState(false);
  const isDark = themeMode === 'dark';

  const palette = isDark
    ? {
        screenBg: '#050510',
        cardBg: '#0d0d1f',
        cardBorder: 'rgba(255,255,255,0.1)',
        textPrimary: '#e8e8ff',
        textMuted: 'rgba(232,232,255,0.72)',
        textSubtle: 'rgba(232,232,255,0.58)',
        accent: '#1ccba1',
        pillBg: 'rgba(28,203,161,0.12)',
        rowBorder: 'rgba(255,255,255,0.08)',
        buttonSecondaryBg: 'rgba(255,255,255,0.03)',
        buttonSecondaryBorder: 'rgba(255,255,255,0.16)',
      }
    : {
        screenBg: '#f6f8fc',
        cardBg: '#ffffff',
        cardBorder: 'rgba(15,23,42,0.12)',
        textPrimary: '#0f172a',
        textMuted: '#334155',
        textSubtle: '#64748b',
        accent: '#0f766e',
        pillBg: 'rgba(15,118,110,0.12)',
        rowBorder: 'rgba(15,23,42,0.1)',
        buttonSecondaryBg: 'rgba(15,23,42,0.02)',
        buttonSecondaryBorder: 'rgba(15,23,42,0.16)',
      };

  const profile = useMemo(() => getProfileInfo(user), [user]);
  const walletAddress = useMemo(() => getWalletAddress(user), [user]);
  const walletProvider = useMemo(() => getWalletProvider(user), [user]);
  const walletConnected = Boolean(walletAddress || walletProvider);
  const authMethod = useMemo(() => getAuthMethodLabel(user), [user]);
  const roles = useMemo(() => getRoles(user), [user]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
      router.replace('/');
    } finally {
      setSigningOut(false);
    }
  };

  const handleNavigate = (key: string) => {
    if (key === 'dashboard') {
      router.push('/');
    } else if (key === 'compensation') {
      router.push('/compensaciones');
    } else if (key === 'portfolio') {
      router.push('/mis-atn');
    } else if (key === 'proyectos') {
      router.push('/proyectos');
    } else if (key === 'beneficios') {
      router.push('/beneficios');
    } else if (key === 'ranking') {
      router.push('/ranking');
    } else if (key === 'wallet') {
      router.push('/wallet');
    } else if (key === 'profile') {
      router.push('/profile');
    }
  };

  const userStats = useMemo(() => {
    if (!user) return null;
    const metadata = getMetadata(user);
    const stats =
      typeof metadata.stats === 'object' && metadata.stats !== null
        ? (metadata.stats as UserMetadata)
        : {};
    return {
      totalAIRS: Number.isFinite(Number(stats.totalAIRS)) ? Number(stats.totalAIRS) : 0,
    };
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.centeredState, { backgroundColor: palette.screenBg }]}>
        <ActivityIndicator size='large' color='#1ccba1' />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centeredState, { backgroundColor: palette.screenBg }]}>
        <View
          style={[
            styles.centerCard,
            { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Sign in required</Text>
          <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
            You need an authenticated account to open profile details.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace({ pathname: '/auth', params: { next: '/profile' } })}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Open Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const authUserId = user.providerUserId
    ? truncateMiddle(user.providerUserId, 10, 6)
    : 'Not available';
  const walletDisplay = walletAddress ? truncateMiddle(walletAddress) : 'Not linked';
  const providerDisplay = walletProvider ?? 'Not linked';
  const rolesDisplay = roles.length > 0 ? roles.join(', ') : 'No roles assigned';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
      <View style={[styles.screen, { backgroundColor: palette.screenBg }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.heroCard,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: palette.pillBg }]}>
              <Text style={[styles.avatarText, { color: palette.accent }]}>
                {toInitials(profile.displayName)}
              </Text>
            </View>
            <View style={styles.heroMain}>
              <Text style={[styles.heroName, { color: palette.textPrimary }]}>
                {profile.displayName}
              </Text>
              <Text style={[styles.heroEmail, { color: palette.textMuted }]}>
                {profile.email ?? 'No email available'}
              </Text>
              <View style={[styles.authPill, { backgroundColor: palette.pillBg }]}>
                <Shield size={12} color={palette.accent} />
                <Text style={[styles.authPillText, { color: palette.accent }]}>{authMethod}</Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
            ]}
          >
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Account</Text>
            <InfoRow
              label='User ID'
              value={truncateMiddle(user.id, 12, 8)}
              borderColor={palette.rowBorder}
              labelColor={palette.textSubtle}
              valueColor={palette.textPrimary}
              valueStrong
            />
            <InfoRow
              label='Provider ID'
              value={authUserId}
              borderColor={palette.rowBorder}
              labelColor={palette.textSubtle}
              valueColor={palette.textMuted}
            />
            <InfoRow
              label='Email'
              value={profile.email ?? 'Not available'}
              borderColor='transparent'
              labelColor={palette.textSubtle}
              valueColor={palette.textMuted}
            />
          </View>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
            ]}
          >
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Wallet</Text>
            <InfoRow
              label='Status'
              value={walletConnected ? 'Connected' : 'Not linked'}
              borderColor={palette.rowBorder}
              labelColor={palette.textSubtle}
              valueColor={walletConnected ? '#16a34a' : palette.textSubtle}
              valueStrong
            />
            <InfoRow
              label='Address'
              value={walletDisplay}
              borderColor={palette.rowBorder}
              labelColor={palette.textSubtle}
              valueColor={palette.textMuted}
            />
            <InfoRow
              label='Provider'
              value={providerDisplay}
              borderColor='transparent'
              labelColor={palette.textSubtle}
              valueColor={palette.textMuted}
            />
          </View>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
            ]}
          >
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Access</Text>
            <InfoRow
              label='Auth Method'
              value={authMethod}
              borderColor={palette.rowBorder}
              labelColor={palette.textSubtle}
              valueColor={palette.textMuted}
            />
            <InfoRow
              label='Roles'
              value={rolesDisplay}
              borderColor='transparent'
              labelColor={palette.textSubtle}
              valueColor={palette.textMuted}
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: palette.buttonSecondaryBg,
                  borderColor: palette.buttonSecondaryBorder,
                },
              ]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.85}
            >
              <Settings size={16} color={palette.textPrimary} />
              <Text style={[styles.secondaryButtonText, { color: palette.textPrimary }]}>
                Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, styles.dangerButton]}
              onPress={() => {
                void handleSignOut();
              }}
              activeOpacity={0.85}
              disabled={signingOut}
            >
              <LogOut size={16} color='#fca5a5' />
              <Text style={styles.dangerButtonText}>
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.noteCard,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
            ]}
          >
            <UserCircle2 size={16} color={palette.accent} />
            <Wallet size={16} color={palette.accent} />
            <Text style={[styles.noteText, { color: palette.textMuted }]}>
              Profile values are loaded from your authenticated session and metadata.
            </Text>
          </View>
        </ScrollView>

        {/* Floating nav */}
        <View style={styles.floatingNav} pointerEvents='box-none'>
          <TopNav
            key={user ? 'topnav-signed-in' : 'topnav-signed-out'}
            signedIn={Boolean(user)}
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            themeMode={themeMode}
            language={language}
            authMethodLabel={authMethod}
            userDisplayName={profile.displayName}
            userEmail={profile.email}
            airsScore={userStats?.totalAIRS ?? null}
            onSignIn={() => router.replace({ pathname: '/auth', params: { next: '/profile' } })}
            onConnectWallet={() => {
              if (!user) {
                router.replace({ pathname: '/auth', params: { next: '/profile' } });
              }
            }}
            motionLevel={motionLevel}
            onToggleTheme={toggleThemeMode}
            onCycleLanguage={cycleLanguage}
            onCycleMotionLevel={cycleMotionLevel}
            onOpenProfile={() => {}}
            onOpenSettings={() => router.push('/settings')}
            onSignOut={() => {
              void handleSignOut();
            }}
            onNavigate={handleNavigate}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = createTypographyStyles({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
  },
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 14,
    paddingBottom: 34,
    paddingTop: 120,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  centerCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroMain: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
  },
  heroEmail: {
    fontSize: 13,
  },
  authPill: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  authPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  infoValueStrong: {
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#1ccba1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#050510',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.22)',
  },
  dangerButtonText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '700',
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

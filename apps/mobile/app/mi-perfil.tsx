import type { User, } from '../components/auth/AppAuthProvider';
import { useLocalSearchParams, useRouter, type Router, } from 'expo-router';
import {
  Award,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  Trophy,
  UserCircle2,
  Wallet,
  type LucideProps,
} from 'lucide-react-native';
import React, { useMemo, useRef, useState, useEffect, } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassCard, SectionContainer, } from '@alternun/ui';
import { useAuth, } from '../components/auth/AppAuthProvider';
import { useAppPreferences, } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';
import { PageTabBar, type TabItem, } from '../components/common/PageTabBar';
import SearchFilterBar, { type SearchFilterOption, } from '../components/common/SearchFilterBar';

const AwardIcon = Award as React.FC<LucideProps>;
const TrophyIcon = Trophy as React.FC<LucideProps>;
const SettingsIcon = Settings as React.FC<LucideProps>;
const LogOutIcon = LogOut as React.FC<LucideProps>;
const ShieldIcon = Shield as React.FC<LucideProps>;
const ShieldCheckIcon = ShieldCheck as React.FC<LucideProps>;
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
  { rank: 1, name: 'María González', score: '98.420', medal: '🥇', color: '#d4b96a', },
  { rank: 2, name: 'Carlos Mendoza', score: '87.650', medal: '🥈', color: '#a8b8cc', },
  { rank: 3, name: 'Ana Ruiz', score: '76.330', medal: '🥉', color: '#cd7f32', },
  { rank: 4, name: 'Pablo Torres', score: '64.110', medal: null, color: null, },
  { rank: 5, name: 'Lucía Vargas', score: '58.900', medal: null, color: null, },
];

const NETWORKS = [
  { name: 'Polygon', color: '#8247e5', },
  { name: 'Ethereum', color: '#627eea', },
  { name: 'Celo', color: '#35d07f', },
];

const RANKING_FILTERS: SearchFilterOption[] = [
  { key: 'all', label: 'Todos', },
  { key: 'podium', label: 'Podio', },
  { key: 'others', label: 'Resto', },
];

function getMetadata(user: User | null,): UserMetadata {
  if (!user?.metadata || typeof user.metadata !== 'object') return {};
  return user.metadata as UserMetadata;
}

function getProfileInfo(user: User | null,): { displayName: string; email?: string } {
  if (!user) return { displayName: 'Guest', };
  const metadata = getMetadata(user,);
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
    (entry,): entry is string => typeof entry === 'string' && entry.trim().length > 0,
  );
  const emailLocalPart =
    typeof user.email === 'string' && user.email.includes('@',)
      ? user.email.split('@',)[0]
      : undefined;
  return { displayName: validName?.trim() ?? emailLocalPart ?? 'Account', email: user.email, };
}

function getWalletAddress(user: User | null,): string {
  if (!user) return '';
  const metadata = getMetadata(user,);
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
    if (typeof candidate === 'string' && candidate.startsWith('0x',) && candidate.length >= 10)
      return candidate;
  }
  if (typeof user.providerUserId === 'string' && user.providerUserId.startsWith('0x',))
    return user.providerUserId;
  return '';
}

function getWalletProvider(user: User | null,): string | null {
  if (!user) return null;
  const metadata = getMetadata(user,);
  const provider =
    typeof metadata.walletProvider === 'string'
      ? metadata.walletProvider
      : typeof metadata.wallet_provider === 'string'
        ? metadata.wallet_provider
        : null;
  if (provider && provider.trim().length > 0) return provider.toLowerCase();
  if (typeof user.provider === 'string' && user.provider.startsWith('wallet:',))
    return user.provider.replace('wallet:', '',).toLowerCase();
  return null;
}

function getAuthMethodLabel(user: User | null,): string {
  if (!user) return 'guest';
  if (user.provider && !user.provider.startsWith('wallet:',)) return `auth: ${user.provider}`;
  if (user.provider && user.provider.startsWith('wallet:',)) return 'auth: wallet';
  if (user.email) return 'auth: email';
  return 'auth: session';
}

function getRoles(user: User | null,): string[] {
  if (!user) return [];
  const metadata = getMetadata(user,);
  const roles = new Set<string>();
  if (Array.isArray(user.roles,))
    for (const role of user.roles)
      if (typeof role === 'string' && role.trim().length > 0) roles.add(role.trim(),);
  const metadataRoles = metadata.roles;
  if (Array.isArray(metadataRoles,))
    for (const role of metadataRoles)
      if (typeof role === 'string' && role.trim().length > 0) roles.add(role.trim(),);
      else if (typeof metadataRoles === 'string' && (metadataRoles as string).trim().length > 0)
        roles.add((metadataRoles as string).trim(),);
  const singleRole = metadata.role;
  if (typeof singleRole === 'string' && singleRole.trim().length > 0) roles.add(singleRole.trim(),);
  return Array.from(roles,);
}

function toInitials(name: string,): string {
  const parts = name.trim().split(/\s+/,).filter(Boolean,);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1,).toUpperCase();
  return `${parts[0].slice(0, 1,)}${parts[1].slice(0, 1,)}`.toUpperCase();
}

function truncateMiddle(value: string, start = 6, end = 4,): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start,)}...${value.slice(-end,)}`;
}

function getInitials(name: string,): string {
  const parts = name.trim().split(' ',);
  if (parts.length === 1) return parts[0].slice(0, 1,).toUpperCase();
  return `${parts[0].slice(0, 1,)}${parts[1].slice(0, 1,)}`.toUpperCase();
}

// ─── Tab components ──────────────────────────────────────────────────────────

function RankingTab({ _isDark, c, }: { _isDark: boolean; c: ColorPalette },): React.JSX.Element {
  const [search, setSearch,] = useState('',);
  const [activeFilter, setActiveFilter,] = useState('all',);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return TOP_USERS.filter((user,) => {
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'podium' && user.rank <= 3) ||
        (activeFilter === 'others' && user.rank > 3);
      const matchesSearch = !normalizedQuery || user.name.toLowerCase().includes(normalizedQuery,);
      return matchesFilter && matchesSearch;
    },);
  }, [activeFilter, search,],);

  return (
    <ScrollView
      contentContainerStyle={[rankingStyles.content, { paddingBottom: 100, },]}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard variant='teal' style={rankingStyles.myPositionCard}>
        <View style={rankingStyles.myPosHeader}>
          <AwardIcon size={20} color={c.accent} />
          <Text style={[rankingStyles.myPosLabel, { color: c.accent, },]}>Mi Posición</Text>
        </View>
        <View style={rankingStyles.myPosBody}>
          <View style={rankingStyles.myPosRankWrap}>
            <Text style={[rankingStyles.myPosRankHash, { color: c.muted, },]}>#</Text>
            <Text style={[rankingStyles.myPosRank, { color: c.text, },]}>47</Text>
          </View>
          <View>
            <Text style={[rankingStyles.myPosScore, { color: c.text, },]}>12.088</Text>
            <Text style={[rankingStyles.myPosScoreLabel, { color: c.muted, },]}>AIRS</Text>
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
          {filteredUsers.map((user, idx,) => (
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
              <Text style={[rankingStyles.rankNum, { color: user.color ?? c.muted, },]}>
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
                <Text style={[rankingStyles.avatarText, { color: user.color ?? c.muted, },]}>
                  {getInitials(user.name,)}
                </Text>
              </View>
              <View style={rankingStyles.rowBody}>
                <View style={rankingStyles.nameRow}>
                  <Text style={[rankingStyles.userName, { color: c.text, },]}>{user.name}</Text>
                  {user.medal ? <Text style={rankingStyles.medal}>{user.medal}</Text> : null}
                </View>
                <Text style={[rankingStyles.userScore, { color: c.muted, },]}>{user.score} AIRS</Text>
              </View>
              {user.rank <= 3 ? <TrophyIcon size={16} color={user.color ?? c.accent} /> : null}
            </View>
          ),)}
        </GlassCard>
      </SectionContainer>
    </ScrollView>
  );
}

function WalletTab({ _isDark, c, }: { _isDark: boolean; c: ColorPalette },): React.JSX.Element {
  return (
    <ScrollView
      contentContainerStyle={[walletStyles.content, { paddingBottom: 100, },]}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={walletStyles.connectCard}>
        <View style={[walletStyles.walletIconWrap, { backgroundColor: `${c.accent}14`, },]}>
          <WalletIcon size={48} color={c.accent} />
        </View>
        <Text style={[walletStyles.connectTitle, { color: c.text, },]}>Conecta tu Wallet</Text>
        <Text style={[walletStyles.connectSub, { color: c.muted, },]}>
          Vincula tu billetera para gestionar tus ATN tokens
        </Text>
        <TouchableOpacity
          style={[
            walletStyles.connectBtn,
            { backgroundColor: `${c.accent}18`, borderColor: `${c.accent}44`, },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[walletStyles.connectBtnText, { color: c.accent, },]}>Conectar Wallet</Text>
        </TouchableOpacity>
      </GlassCard>
      <SectionContainer title='Redes Soportadas'>
        <View style={walletStyles.networkRow}>
          {NETWORKS.map((network,) => (
            <View key={network.name} style={walletStyles.networkPill}>
              <View style={[walletStyles.networkDot, { backgroundColor: network.color, },]} />
              <Text style={[walletStyles.networkName, { color: c.text, },]}>{network.name}</Text>
            </View>
          ),)}
        </View>
      </SectionContainer>
    </ScrollView>
  );
}

function PerfilTab({
  _isDark,
  c,
  user,
  signingOut,
  onSignOut,
  router,
}: {
  _isDark: boolean;
  c: ColorPalette;
  user: User | null;
  signingOut: boolean;
  onSignOut: () => void;
  router: Router;
},): React.JSX.Element {
  const profile = useMemo(() => getProfileInfo(user,), [user,],);
  const walletAddress = useMemo(() => getWalletAddress(user,), [user,],);
  const walletProvider = useMemo(() => getWalletProvider(user,), [user,],);
  const walletConnected = Boolean(walletAddress || walletProvider,);
  const authMethod = useMemo(() => getAuthMethodLabel(user,), [user,],);
  const roles = useMemo(() => getRoles(user,), [user,],);

  return (
    <ScrollView
      contentContainerStyle={[profileStyles.content, { paddingBottom: 100, },]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View
        style={[profileStyles.heroCard, { backgroundColor: c.cardBg, borderColor: c.cardBorder, },]}
      >
        <View style={[profileStyles.avatarWrap, { backgroundColor: `${c.accent}14`, },]}>
          <Text style={[profileStyles.avatarText, { color: c.accent, },]}>
            {toInitials(profile.displayName,)}
          </Text>
        </View>
        <Text style={[profileStyles.heroName, { color: c.text, },]}>{profile.displayName}</Text>
        {profile.email && (
          <Text style={[profileStyles.heroEmail, { color: c.muted, },]}>{profile.email}</Text>
        )}
        <View
          style={[
            profileStyles.authPill,
            { backgroundColor: `${c.accent}14`, borderColor: `${c.accent}44`, },
          ]}
        >
          <ShieldIcon size={12} color={c.accent} />
          <Text style={[profileStyles.authLabel, { color: c.accent, },]}>{authMethod}</Text>
        </View>
      </View>

      {/* Account */}
      <View
        style={[profileStyles.infoCard, { backgroundColor: c.cardBg, borderColor: c.cardBorder, },]}
      >
        <Text style={[profileStyles.infoTitle, { color: c.text, },]}>Account</Text>
        <ProfileInfoRow label='User ID' value={user?.id ?? '—'} c={c} />
        <ProfileInfoRow label='Provider' value={user?.provider ?? '—'} c={c} />
        {profile.email && <ProfileInfoRow label='Email' value={profile.email} c={c} />}
      </View>

      {/* Wallet */}
      <View
        style={[profileStyles.infoCard, { backgroundColor: c.cardBg, borderColor: c.cardBorder, },]}
      >
        <Text style={[profileStyles.infoTitle, { color: c.text, },]}>Wallet</Text>
        <ProfileInfoRow
          label='Status'
          value={walletConnected ? 'Connected' : 'Not Connected'}
          c={c}
        />
        {walletAddress && (
          <ProfileInfoRow label='Address' value={truncateMiddle(walletAddress,)} c={c} />
        )}
        {walletProvider && <ProfileInfoRow label='Provider' value={walletProvider} c={c} />}
      </View>

      {/* Access */}
      {roles.length > 0 && (
        <View
          style={[profileStyles.infoCard, { backgroundColor: c.cardBg, borderColor: c.cardBorder, },]}
        >
          <Text style={[profileStyles.infoTitle, { color: c.text, },]}>Access</Text>
          <ProfileInfoRow label='Roles' value={roles.join(', ',)} c={c} />
        </View>
      )}

      {/* Actions */}
      <View style={profileStyles.actionRow}>
        <TouchableOpacity
          style={[
            profileStyles.secondaryBtn,
            { borderColor: c.cardBorder, backgroundColor: c.cardBg, },
          ]}
          onPress={() => router.push('/settings',)}
          activeOpacity={0.7}
        >
          <SettingsIcon size={16} color={c.text} />
          <Text style={[profileStyles.btnText, { color: c.text, },]}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={profileStyles.dangerBtn}
          onPress={onSignOut}
          disabled={signingOut}
          activeOpacity={0.7}
        >
          {signingOut ? (
            <ActivityIndicator size='small' color='#ff3b30' />
          ) : (
            <>
              <LogOutIcon size={16} color='#ff3b30' />
              <Text style={profileStyles.dangerBtnText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ProfileInfoRow({
  label,
  value,
  c,
}: {
  label: string;
  value: string;
  c: ColorPalette;
},): React.JSX.Element {
  return (
    <View style={[profileStyles.infoRow, { borderBottomColor: c.cardBorder, },]}>
      <Text style={[profileStyles.infoLabel, { color: c.muted, },]}>{label}</Text>
      <Text style={[profileStyles.infoValue, { color: c.text, },]}>{value}</Text>
    </View>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const TABS: TabItem[] = [
  { key: 'ranking', label: 'Ranking', icon: TrophyIcon, },
  { key: 'wallet', label: 'Wallet', icon: WalletIcon, },
  { key: 'perfil', label: 'Profile', icon: UserCircle2Icon, },
];

export default function MiPerfilScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user, loading, signOutUser, } = useAuth();
  const { themeMode, } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const initialTab =
    typeof params.tab === 'string' && TABS.some((t,) => t.key === params.tab,)
      ? params.tab
      : 'perfil';
  const [activeTab, setActiveTab,] = useState<string>(initialTab,);
  const [signingOut, setSigningOut,] = useState(false,);

  useEffect(() => {
    if (typeof params.tab === 'string' && TABS.some((t,) => t.key === params.tab,)) {
      setActiveTab(params.tab,);
    }
  }, [params.tab,],);

  const fadeAnim = useRef(new Animated.Value(0,),).current;
  const slideAnim = useRef(new Animated.Value(24,),).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: false, },),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: false, },),
    ],).start();
  }, [fadeAnim, slideAnim,],);

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
    setSigningOut(true,);
    try {
      await signOutUser();
      router.replace('/',);
    } finally {
      setSigningOut(false,);
    }
  };

  if (loading) return <ActivityIndicator size='large' color={c.accent} style={{ flex: 1, }} />;

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, },]}>
        <GlassCard style={{ alignItems: 'center', }}>
          <UserCircle2Icon size={48} color={c.muted} />
          <Text style={[styles.signInPrompt, { color: c.text, },]}>
            Inicia sesión para ver tu perfil
          </Text>
          <TouchableOpacity
            style={[
              styles.signInBtn,
              { backgroundColor: `${c.accent}18`, borderColor: `${c.accent}44`, },
            ]}
            onPress={() => router.push('/auth?next=/mi-perfil',)}
          >
            <Text style={[styles.signInBtnText, { color: c.accent, },]}>Open Sign In</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  return (
    <ScreenShell activeSection='mi-perfil' backgroundColor={c.bg}>
      <View style={[styles.root, { backgroundColor: c.bg, },]}>
        <View style={styles.headerBar}>
          <View style={styles.titleWithIcon}>
            <ShieldCheckIcon size={24} color={c.accent} strokeWidth={1.8} />
            <Text style={[styles.pageTitle, { color: c.text, },]}>My Profile</Text>
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
          style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim, },], },]}
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
            />
          )}
        </Animated.View>
      </View>
    </ScreenShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 10, },
  pageTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Sculpin-Bold', },
  tabContent: { flex: 1, },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, },
  signInPrompt: { fontSize: 16, fontWeight: '600', marginVertical: 12, textAlign: 'center', },
  signInBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  signInBtnText: { fontWeight: '600', fontSize: 14, },
},);

const rankingStyles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 16, gap: 0, },
  myPositionCard: { padding: 18, marginBottom: 16, },
  myPosHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, },
  myPosLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, },
  myPosBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', },
  myPosRankWrap: { flexDirection: 'row', alignItems: 'flex-start', },
  myPosRankHash: { fontSize: 20, fontWeight: '700', marginTop: 6, },
  myPosRank: { fontSize: 52, fontWeight: '800', letterSpacing: -1, },
  myPosScore: { fontSize: 18, fontWeight: '700', },
  myPosScoreLabel: { fontSize: 11, fontWeight: '500', marginTop: 2, },
  listCard: { padding: 0, overflow: 'hidden', },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, },
  rankNum: { fontSize: 16, fontWeight: '700', width: 24, },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', },
  rowBody: { flex: 1, gap: 2, },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, },
  userName: { fontSize: 14, fontWeight: '600', },
  medal: { fontSize: 14, },
  userScore: { fontSize: 12, },
},);

const walletStyles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 16, gap: 0, },
  connectCard: { padding: 28, alignItems: 'center', marginBottom: 16, },
  walletIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  connectTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center', },
  connectSub: { fontSize: 14, textAlign: 'center', marginBottom: 16, },
  connectBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, },
  connectBtnText: { fontWeight: '600', fontSize: 14, },
  networkRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', },
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
  networkDot: { width: 8, height: 8, borderRadius: 4, },
  networkName: { fontSize: 13, fontWeight: '500', },
},);

const profileStyles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 16, gap: 14, },
  heroCard: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: 'center', },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', },
  heroName: { fontSize: 18, fontWeight: '700', marginBottom: 4, },
  heroEmail: { fontSize: 13, marginBottom: 12, },
  authPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authLabel: { fontSize: 11, fontWeight: '600', },
  infoCard: { padding: 16, borderRadius: 12, borderWidth: 1, },
  infoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 12, fontWeight: '500', },
  infoValue: { fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 8, },
  actionRow: { flexDirection: 'row', gap: 12, },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  btnText: { fontSize: 14, fontWeight: '600', },
  dangerBtnText: { fontSize: 14, fontWeight: '600', color: '#ff3b30', },
},);

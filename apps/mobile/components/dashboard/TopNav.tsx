import { getLocaleLabel } from '@alternun/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { BlurView as BlurViewRaw } from 'expo-blur';
import { Image as ExpoImageRaw } from 'expo-image';

const BlurView = BlurViewRaw as unknown as React.FC<any>;
import {
  Bell,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Settings,
  LogOut,
  Languages,
  Moon,
  Sun,
  LogIn,
  LayoutDashboard,
  Leaf,
  ShieldCheck,
  CircleUserRound,
  Zap,
  Menu,
  X,
  type LucideProps,
} from 'lucide-react-native';
import AirsBrandMark from '../branding/AirsBrandMark';
import { useAppTranslation } from '../i18n/useAppTranslation';
import type { AppLanguage, MotionLevel, ThemeMode } from '../settings/AppPreferencesProvider';
import NotificationDropdown, { type NotificationItem } from './NotificationDropdown';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const AIRS_LOGOTIPO_DARK = require('../../assets/AIRS-logotipo-dark.svg') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const AIRS_LOGOTIPO_LIGHT = require('../../assets/AIRS-logotipo-light.svg') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const ALTERNUN_LOGO = require('../../assets/logo.png') as number;

// ── JSX-safe casts ────────────────────────────────────────────────────────────
const ExpoImage = ExpoImageRaw as unknown as React.FC<any>;
const ChevronDownIcon = ChevronDown as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;
const SettingsIcon = Settings as React.FC<LucideProps>;
const LogOutIcon = LogOut as React.FC<LucideProps>;
const LanguagesIcon = Languages as React.FC<LucideProps>;
const LogInIcon = LogIn as React.FC<LucideProps>;
const LayoutDashboardIcon = LayoutDashboard as React.FC<LucideProps>;
const LeafIcon = Leaf as React.FC<LucideProps>;
const ShieldCheckIcon = ShieldCheck as React.FC<LucideProps>;
const BellIcon = Bell as React.FC<LucideProps>;
const ChevronUpIcon = ChevronUp as React.FC<LucideProps>;
const CircleUserRoundIcon = CircleUserRound as React.FC<LucideProps>;
const MoonIcon = Moon as React.FC<LucideProps>;
const SunIcon = Sun as React.FC<LucideProps>;
const ZapIcon = Zap as React.FC<LucideProps>;
const MenuIcon = Menu as React.FC<LucideProps>;
const CloseIcon = X as React.FC<LucideProps>;
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

// ── Nav sections ──────────────────────────────────────────────────────────────
export interface NavSection {
  key: string;
  label: string;
  icon: React.FC<LucideProps>;
}

export const NAV_SECTIONS: NavSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { key: 'explorar', label: 'Explore', icon: LeafIcon },
  { key: 'portafolio', label: 'Portfolio', icon: ShieldCheckIcon },
  { key: 'mi-perfil', label: 'My Profile', icon: CircleUserRoundIcon },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface TopNavProps {
  signedIn: boolean;
  walletConnected: boolean;
  walletAddress: string;
  themeMode: ThemeMode;
  language: AppLanguage;
  motionLevel?: MotionLevel;
  authMethodLabel?: string;
  userDisplayName?: string;
  userEmail?: string;
  airsScore?: number | null;
  notifications?: NotificationItem[];
  activeSection?: string;
  onSignIn: () => void;
  onConnectWallet: () => void;
  onToggleTheme: () => void;
  onCycleLanguage: () => void;
  onCycleMotionLevel?: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onNavigate?: (sectionKey: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onDismissNotification?: (id: string) => void;
  onNavigateToNotifications?: () => void;
}

function getInitials(name?: string): string {
  if (!name?.trim()) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TopNav({
  signedIn,
  walletConnected: _walletConnected,
  walletAddress: _walletAddress,
  themeMode,
  language,
  motionLevel,
  authMethodLabel: _authMethodLabel,
  userDisplayName,
  userEmail,
  airsScore,
  notifications = EMPTY_NOTIFICATIONS,
  activeSection = 'dashboard',
  onSignIn,
  _onConnectWallet,
  onToggleTheme,
  onCycleLanguage,
  onCycleMotionLevel,
  _onOpenProfile,
  onOpenSettings,
  onSignOut,
  onNavigate,
  onMarkAllNotificationsRead,
  onDismissNotification,
  onNavigateToNotifications,
}: TopNavProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [dropdownAnimated] = useState(() => new Animated.Value(0));
  const [notifAnimated] = useState(() => new Animated.Value(0));

  const { t } = useAppTranslation('mobile');
  const { width, height } = useWindowDimensions();
  const isDark = themeMode === 'dark';
  const isMobile = width < 720;
  const isExtraSmall = width < 360;

  const brandMarkFill = isDark ? '#1ee6b5' : '#0b5a5f';
  const brandMarkCutout = isDark ? '#03292f' : '#d9fff4';
  const wordmarkSource = isDark ? AIRS_LOGOTIPO_LIGHT : AIRS_LOGOTIPO_DARK;
  const ThemeIconComp = isDark ? SunIcon : MoonIcon;
  const themeLabel = isDark ? t('labels.dark') : t('labels.light');

  // ── Palette ────────────────────────────────────────────────────────────────
  const p = isDark
    ? {
        navBg: 'rgba(5,5,22,0.55)',
        navBorder: 'rgba(255,255,255,0.10)',
        pillBg: '#1EE6B5',
        pillBorder: 'transparent',
        pillText: '#064A4B',
        pillSub: 'rgba(232,232,255,0.50)',
        avatarBg: 'rgba(6,74,75,0.20)',
        avatarText: '#064A4B',
        scoreText: 'rgba(6,74,75,0.80)',
        chevron: '#064A4B',
        badgeBg: '#3b5bdb',
        badgeText: '#ffffff',
        accent: '#1EE6B5',
        dropBg: '#0d1020',
        dropBorder: 'rgba(255,255,255,0.10)',
        dropDivider: 'rgba(255,255,255,0.07)',
        dropText: '#e8e8ff',
        dropSub: 'rgba(232,232,255,0.55)',
        navActive: 'rgba(28,203,161,0.14)',
        navActiveBorder: 'rgba(28,203,161,0.32)',
        navActiveText: '#1EE6B5',
        iconIdle: 'rgba(232,232,255,0.55)',
        danger: '#f87171',
        dangerBg: 'rgba(248,113,113,0.09)',
      }
    : {
        navBg: 'rgba(255,255,255,0.55)',
        navBorder: 'rgba(15,23,42,0.12)',
        pillBg: '#064A4B',
        pillBorder: 'transparent',
        pillText: '#ffffff',
        pillSub: '#64748b',
        avatarBg: 'rgba(0,0,0,0.25)',
        avatarText: '#1EE6B5',
        scoreText: '#1EE6B5',
        chevron: 'rgba(255,255,255,0.85)',
        badgeBg: '#3b5bdb',
        badgeText: '#ffffff',
        accent: '#0d9488',
        dropBg: '#ffffff',
        dropBorder: 'rgba(15,23,42,0.14)',
        dropDivider: 'rgba(15,23,42,0.08)',
        dropText: '#0f172a',
        dropSub: '#64748b',
        navActive: 'rgba(13,148,136,0.11)',
        navActiveBorder: 'rgba(13,148,136,0.28)',
        navActiveText: '#0d9488',
        iconIdle: '#64748b',
        danger: '#ef4444',
        dangerBg: 'rgba(239,68,68,0.08)',
      };

  const profileName = userDisplayName?.trim() ?? 'Account';
  const initials = useMemo(() => getInitials(profileName), [profileName]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!menuVisible) setSettingsExpanded(false);
  }, [menuVisible]);

  useEffect(() => {
    Animated.timing(dropdownAnimated, {
      toValue: menuVisible ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [menuVisible, dropdownAnimated]);

  useEffect(() => {
    Animated.timing(notifAnimated, {
      toValue: notifVisible ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [notifVisible, notifAnimated]);

  const toggleMenu = () => {
    setNotifVisible(false);
    setMenuVisible((v) => !v);
  };
  const toggleNotif = () => {
    setMenuVisible(false);
    setNotifVisible((v) => !v);
  };
  const handleBrandPress = () => {
    dismissAll();
    onNavigate?.('dashboard');
  };

  const anyOpen = menuVisible || notifVisible;
  const dismissAll = () => {
    setMenuVisible(false);
    setNotifVisible(false);
  };

  return (
    // Outer wrapper: fills the absolute slot in Dashboard
    <View style={styles.wrapper}>
      {/* ── Full-screen dismiss overlay (closes dropdown on outside tap) ── */}
      {anyOpen && (
        <Pressable style={[styles.dismissOverlay, { width, height }]} onPress={dismissAll} />
      )}

      {/* ── Glass nav bar ────────────────────────────────────────────────── */}
      <View
        style={[styles.navBar, isMobile && styles.navBarMobile, { borderBottomColor: p.navBorder }]}
      >
        {/* Glass background — clipped separately so dropdown can overflow */}
        <View
          style={[
            styles.navBarGlass,
            isMobile && styles.navBarGlassMobile,
            { borderBottomColor: p.navBorder },
          ]}
        >
          <BlurView
            intensity={isDark ? 52 : 40}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: p.navBg }]} />
        </View>

        {/* Left: Airs wordmark + brand mark + byline */}
        <View style={styles.logoArea}>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Return to dashboard'
            onPress={handleBrandPress}
            style={({ pressed }) => [
              styles.logoButton,
              isMobile && styles.logoButtonMobile,
              pressed && styles.logoButtonPressed,
            ]}
          >
            <View style={styles.logoBrand}>
              {/* Wordmark row: "Airs" SVG + mark */}
              <View style={[styles.logoMarkRow, isMobile && styles.logoMarkRowMobile]}>
                <ExpoImage
                  source={wordmarkSource}
                  style={isMobile ? styles.wordmarkMobile : styles.wordmark}
                  contentFit='contain'
                />
                <AirsBrandMark
                  size={isMobile ? 28 : 34}
                  fillColor={brandMarkFill}
                  cutoutColor={brandMarkCutout}
                />
              </View>
              {/* Byline: "By [Alternun logo]" + subtitle */}
              <View style={styles.bylineRow}>
                <Text style={[styles.bylineBy, { color: p.pillSub }]}>{t('labels.by')}</Text>
                <ExpoImage source={ALTERNUN_LOGO} style={styles.bylineLogo} contentFit='contain' />
                <Text
                  style={[
                    styles.bylineSubtitle,
                    { color: p.pillSub },
                    isMobile && styles.bylineSubtitleMobile,
                  ]}
                  numberOfLines={1}
                >
                  Alternun Impact & Reputation Score
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Right: profile pill (notification badge inside) or hamburger on extra small */}
        <View style={styles.rightArea}>
          {/* ── Hamburger menu button (extra small screens only) ────────── */}
          {isExtraSmall && (
            <TouchableOpacity
              style={[styles.hamburgerButton, { backgroundColor: p.pillBg }]}
              onPress={toggleMenu}
              activeOpacity={0.85}
            >
              {menuVisible ? (
                <CloseIcon size={20} color={p.pillText} />
              ) : (
                <MenuIcon size={20} color={p.pillText} />
              )}
            </TouchableOpacity>
          )}

          {/* ── Profile trigger pill (normal screens) ────────────────────── */}
          {!isExtraSmall && (
            <View style={styles.profileContainer}>
              <TouchableOpacity
                style={[
                  styles.profilePill,
                  isMobile && styles.profilePillMobile,
                  isExtraSmall && styles.profilePillExtraSmall,
                  { backgroundColor: p.pillBg, borderColor: p.pillBorder },
                ]}
                onPress={toggleMenu}
                activeOpacity={0.85}
              >
                {/* Avatar */}
                <View
                  style={[
                    styles.avatar,
                    isMobile && styles.avatarMobile,
                    isExtraSmall && styles.avatarExtraSmall,
                    { backgroundColor: p.avatarBg },
                  ]}
                >
                  {signedIn ? (
                    <Text style={[styles.avatarText, { color: p.avatarText }]}>{initials}</Text>
                  ) : (
                    <AirsBrandMark
                      size={13}
                      fillColor={brandMarkFill}
                      cutoutColor={brandMarkCutout}
                    />
                  )}
                </View>

                {/* Name + score (hidden on extra small screens) */}
                {signedIn && !isExtraSmall && (
                  <View style={[styles.nameBlock, isMobile && styles.nameBlockMobile]}>
                    <Text
                      style={[
                        styles.pillName,
                        isMobile && styles.pillNameMobile,
                        { color: p.pillText },
                      ]}
                      numberOfLines={1}
                    >
                      {profileName}
                    </Text>
                    {airsScore != null && (
                      <Text
                        style={[
                          styles.pillScore,
                          isMobile && styles.pillScoreMobile,
                          { color: p.scoreText },
                        ]}
                        numberOfLines={1}
                      >
                        {airsScore.toLocaleString()} Airs
                      </Text>
                    )}
                  </View>
                )}

                {/* Notification badge */}
                <TouchableOpacity
                  style={[
                    styles.notifBadge,
                    isMobile && styles.notifBadgeMobile,
                    { backgroundColor: 'rgba(255,255,255,0.18)' },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleNotif();
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <BellIcon size={11} color='rgba(255,255,255,0.85)' />
                  {unreadCount > 0 && (
                    <View style={[styles.badgeOverlay, { backgroundColor: p.badgeBg }]}>
                      <Text style={[styles.badgeCount, { color: p.badgeText }]}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Dropdown chevron (hidden on extra small screens) */}
                {!isExtraSmall &&
                  (menuVisible ? (
                    <ChevronUpIcon size={14} color={p.chevron} />
                  ) : (
                    <ChevronDownIcon size={14} color={p.chevron} />
                  ))}
              </TouchableOpacity>

              {/* ── Profile + Nav dropdown ─────────────────────────────────── */}
              {menuVisible && (
                <Animated.View
                  style={[
                    styles.dropdown,
                    isExtraSmall && styles.dropdownExtraSmall,
                    { backgroundColor: p.dropBg, borderColor: p.dropBorder },
                    {
                      opacity: dropdownAnimated,
                      transform: [
                        {
                          scale: dropdownAnimated.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.92, 1],
                          }),
                        },
                        {
                          translateY: dropdownAnimated.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-8, 0],
                          }),
                        },
                      ],
                    },
                    { overflow: 'hidden' },
                  ]}
                >
                  <Animated.View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      borderRadius: 16,
                      opacity: dropdownAnimated.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: dropdownAnimated.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.28],
                      }),
                      shadowRadius: dropdownAnimated.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, 12],
                      }),
                      shadowColor: '#05100d',
                    }}
                    pointerEvents='none'
                  />
                  {signedIn && (
                    <View
                      style={[
                        styles.dropHeader,
                        isExtraSmall && styles.dropHeaderExtraSmall,
                        { borderBottomColor: p.dropDivider },
                      ]}
                    >
                      <View style={[styles.dropAvatar, { backgroundColor: p.avatarBg }]}>
                        <Text style={[styles.dropAvatarText, { color: p.avatarText }]}>
                          {initials}
                        </Text>
                      </View>
                      <View style={styles.dropHeaderInfo}>
                        <Text
                          style={[styles.dropHeaderName, { color: p.dropText }]}
                          numberOfLines={1}
                        >
                          {profileName}
                        </Text>
                        {userEmail ? (
                          <Text
                            style={[styles.dropHeaderEmail, { color: p.dropSub }]}
                            numberOfLines={1}
                          >
                            {userEmail}
                          </Text>
                        ) : null}
                        {airsScore != null && (
                          <View style={[styles.dropScorePill, { backgroundColor: p.navActive }]}>
                            <Text style={[styles.dropScoreText, { color: p.accent }]}>
                              {airsScore.toLocaleString()} Airs
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Sign in */}
                  {!signedIn && (
                    <TouchableOpacity
                      style={[
                        styles.navItem,
                        isExtraSmall && styles.navItemExtraSmall,
                        { backgroundColor: 'transparent' },
                      ]}
                      onPress={() => {
                        setMenuVisible(false);
                        onSignIn();
                      }}
                      activeOpacity={0.8}
                    >
                      <LogInIcon size={15} color={p.accent} />
                      <Text style={[styles.navItemText, { color: p.dropText }]}>
                        {t('labels.signIn')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Nav items */}
                  <View style={[styles.navSectionGroup, { borderBottomColor: p.dropDivider }]}>
                    {NAV_SECTIONS.map((section) => {
                      const isActive = activeSection === section.key;
                      const IconComp = section.icon;
                      return (
                        <TouchableOpacity
                          key={section.key}
                          style={[
                            styles.navItem,
                            isExtraSmall && styles.navItemExtraSmall,
                            {
                              backgroundColor: isActive ? p.navActive : 'transparent',
                              borderWidth: isActive ? 1 : 0,
                              borderColor: isActive ? p.navActiveBorder : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setMenuVisible(false);
                            onNavigate?.(section.key);
                          }}
                          activeOpacity={0.8}
                        >
                          <IconComp size={15} color={isActive ? p.navActiveText : p.iconIdle} />
                          <Text
                            style={[
                              styles.navItemText,
                              { color: isActive ? p.navActiveText : p.dropText },
                              isActive && styles.navItemTextActive,
                            ]}
                          >
                            {section.label}
                          </Text>
                          {isActive && (
                            <View style={[styles.activeIndicator, { backgroundColor: p.accent }]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Settings expandable */}
                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      isExtraSmall && styles.navItemExtraSmall,
                      { backgroundColor: 'transparent' },
                    ]}
                    onPress={() => setSettingsExpanded((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <SettingsIcon size={15} color={p.iconIdle} />
                    <Text style={[styles.navItemText, { color: p.dropText, flex: 1 }]}>
                      {t('labels.settings')}
                    </Text>
                    {settingsExpanded ? (
                      <ChevronDownIcon size={13} color={p.chevron} />
                    ) : (
                      <ChevronRightIcon size={13} color={p.chevron} />
                    )}
                  </TouchableOpacity>

                  {settingsExpanded && (
                    <>
                      <TouchableOpacity
                        style={[styles.navSubItem, { backgroundColor: 'transparent' }]}
                        onPress={onCycleLanguage}
                        activeOpacity={0.8}
                      >
                        <LanguagesIcon size={14} color={p.iconIdle} />
                        <Text style={[styles.navItemText, { color: p.dropText, flex: 1 }]}>
                          {t('labels.language')}
                        </Text>
                        <Text style={[styles.navItemValue, { color: p.accent }]}>
                          {getLocaleLabel(language, language)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.navSubItem, { backgroundColor: 'transparent' }]}
                        onPress={onToggleTheme}
                        activeOpacity={0.8}
                      >
                        <ThemeIconComp size={14} color={p.iconIdle} />
                        <Text style={[styles.navItemText, { color: p.dropText, flex: 1 }]}>
                          {t('labels.theme')}
                        </Text>
                        <Text style={[styles.navItemValue, { color: p.accent }]}>{themeLabel}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.navSubItem, { backgroundColor: 'transparent' }]}
                        onPress={() => onCycleMotionLevel?.()}
                        activeOpacity={0.8}
                      >
                        <ZapIcon size={14} color={p.iconIdle} />
                        <Text style={[styles.navItemText, { color: p.dropText, flex: 1 }]}>
                          Animación
                        </Text>
                        <Text style={[styles.navItemValue, { color: p.accent }]}>
                          {motionLevel === 'full' ? 'Full' : motionLevel === 'low' ? 'Low' : 'Off'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.navSubItem, { backgroundColor: 'transparent' }]}
                        onPress={() => {
                          setMenuVisible(false);
                          onOpenSettings();
                        }}
                        activeOpacity={0.8}
                      >
                        <SettingsIcon size={14} color={p.iconIdle} />
                        <Text style={[styles.navItemText, { color: p.dropText }]}>
                          {t('navigation.moreSettings')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Sign out */}
                  {signedIn && (
                    <TouchableOpacity
                      style={[
                        styles.navItem,
                        isExtraSmall && styles.navItemExtraSmall,
                        { backgroundColor: p.dangerBg },
                      ]}
                      onPress={() => {
                        setMenuVisible(false);
                        onSignOut();
                      }}
                      activeOpacity={0.8}
                    >
                      <LogOutIcon size={15} color={p.danger} />
                      <Text style={[styles.navItemText, { color: p.danger }]}>Sign Out</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* ── Notification dropdown (portal-like, outside nav bar) ─────────── */}
      <Animated.View
        style={[
          styles.notifDropdownWrapper,
          {
            opacity: notifAnimated,
            transform: [
              { scale: notifAnimated.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}
      >
        {notifVisible && (
          <NotificationDropdown
            notifications={notifications}
            isDark={isDark}
            onMarkAllRead={() => onMarkAllNotificationsRead?.()}
            onDismiss={(id) => onDismissNotification?.(id)}
            onClose={() => setNotifVisible(false)}
            onNavigateToCenter={() => {
              setNotifVisible(false);
              onNavigateToNotifications?.();
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 990,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    // NO overflow: 'hidden' here — dropdown must render beyond these bounds
    zIndex: 1100,
    position: 'relative',
  },
  navBarMobile: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // Separate clipped layer for blur + tint so it doesn't clip the dropdown
  navBarGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  navBarGlassMobile: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  logoArea: {
    flex: 1,
    minWidth: 0,
    maxWidth: '55%',
    justifyContent: 'center',
  },
  logoButton: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingRight: 8,
    paddingVertical: 2,
  },
  logoButtonMobile: {
    paddingRight: 4,
    paddingVertical: 1,
  },
  logoButtonPressed: {
    opacity: 0.78,
  },
  logoBrand: {
    gap: 2,
  },
  logoMarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoMarkRowMobile: {
    gap: 4,
  },
  wordmark: {
    width: 72,
    height: 26,
  },
  wordmarkMobile: {
    width: 52,
    height: 20,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 2,
  },
  bylineBy: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  bylineLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  bylineSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.05,
    flexShrink: 1,
  },
  bylineSubtitleMobile: {
    fontSize: 9,
    fontWeight: '400',
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    maxWidth: '45%',
  },

  // ── Profile pill ────────────────────────────────────────────────────────
  profileContainer: {
    position: 'relative',
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 10,
    boxShadow: '0px 10px 22px rgba(30, 230, 181, 0.18)',
  },
  profilePillMobile: {
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
  },
  profilePillExtraSmall: {
    gap: 0,
    paddingVertical: 4,
    paddingLeft: 3,
    paddingRight: 3,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMobile: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarExtraSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  nameBlock: {
    gap: 1,
    maxWidth: 110,
  },
  nameBlockMobile: {
    maxWidth: 92,
  },
  pillName: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  pillNameMobile: {
    fontSize: 11,
    lineHeight: 13,
  },
  pillScore: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
  pillScoreMobile: {
    fontSize: 9,
    lineHeight: 11,
  },
  notifBadge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  notifBadgeMobile: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  badgeOverlay: {
    position: 'absolute',
    top: -3,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCount: {
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
  },

  // ── Dropdown ────────────────────────────────────────────────────────────
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1900,
  },
  dropdown: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 220,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 2,
    boxShadow: '0px 18px 34px rgba(5, 16, 13, 0.28)',
    zIndex: 1200,
  },
  dropdownExtraSmall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderWidth: 0,
    paddingVertical: 60,
    paddingHorizontal: 12,
    paddingTop: 70,
    zIndex: 2000,
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  dropHeaderExtraSmall: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 8,
    marginBottom: 2,
  },
  dropAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dropAvatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  dropHeaderInfo: {
    flex: 1,
    gap: 3,
  },
  dropHeaderName: {
    fontSize: 13,
    fontWeight: '700',
  },
  dropHeaderEmail: {
    fontSize: 10,
  },
  dropScorePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  dropScoreText: {
    fontSize: 10,
    fontWeight: '700',
  },
  navSectionGroup: {
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    position: 'relative',
  },
  navItemExtraSmall: {
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  navItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
  navItemTextActive: {
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    right: 10,
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  navSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  navItemValue: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Notification dropdown wrapper ───────────────────────────────────────
  notifDropdownWrapper: {
    position: 'absolute',
    top: 52,
    right: 14,
    zIndex: 1300,
  },
});

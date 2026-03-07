import { getLocaleLabel, } from '@alternun/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import { Image as ExpoImage } from 'expo-image';
import { Wallet, Star, ChevronDown, ChevronRight, Settings, CircleUserRound, LogOut, Languages, Moon, Sun, LogIn } from 'lucide-react-native';
import AirsBrandMark from '../branding/AirsBrandMark';
import { useAppTranslation, } from '../i18n/useAppTranslation';
import type { AppLanguage, ThemeMode } from '../settings/AppPreferencesProvider';

const AIRS_LOGOTIPO_DARK = require('../../assets/AIRS-logotipo-dark.svg');
const AIRS_LOGOTIPO_LIGHT = require('../../assets/AIRS-logotipo-light.svg');

interface TopNavProps {
  signedIn: boolean;
  walletConnected: boolean;
  walletAddress: string;
  atnEligible: boolean;
  themeMode: ThemeMode;
  language: AppLanguage;
  authMethodLabel?: string;
  userDisplayName?: string;
  userEmail?: string;
  onSignIn: () => void;
  onConnectWallet: () => void;
  onToggleTheme: () => void;
  onCycleLanguage: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

function getInitials(name?: string): string {
  if (!name?.trim()) {
    return 'U';
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export default function TopNav({
  signedIn,
  walletConnected,
  walletAddress,
  atnEligible,
  themeMode,
  language,
  authMethodLabel,
  userDisplayName,
  userEmail,
  onSignIn,
  onConnectWallet,
  onToggleTheme,
  onCycleLanguage,
  onOpenProfile,
  onOpenSettings,
  onSignOut,
}: TopNavProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const { t, } = useAppTranslation('mobile');
  const isDark = themeMode === 'dark';
  const iconColor = isDark ? '#e8e8ff' : '#0f172a';
  const secondaryColor = isDark ? '#66e6c5' : '#0f766e';
  const brandMarkFill = isDark ? '#1ee6b5' : '#0b5a5f';
  const brandMarkCutout = isDark ? '#03292f' : '#d9fff4';
  const wordmarkSource = isDark ? AIRS_LOGOTIPO_LIGHT : AIRS_LOGOTIPO_DARK;
  const themeLabel = isDark ? t('labels.dark') : t('labels.light');
  const ThemeIcon = isDark ? Sun : Moon;
  const SettingsChevron = settingsExpanded ? ChevronDown : ChevronRight;
  const palette = isDark
    ? {
        navBg: 'rgba(5,5,16,0.95)',
        navBorder: 'rgba(255,255,255,0.06)',
        logoText: '#e8e8ff',
        triggerBg: 'rgba(255,255,255,0.04)',
        triggerBorder: 'rgba(255,255,255,0.12)',
        profileName: '#e8e8ff',
        authMethod: 'rgba(232,232,255,0.7)',
        walletBg: 'rgba(255,255,255,0.06)',
        walletBorder: 'rgba(255,255,255,0.1)',
        walletText: '#e8e8ff',
        dropdownBg: '#0d0d1f',
        dropdownBorder: 'rgba(255,255,255,0.12)',
        dropdownDivider: 'rgba(255,255,255,0.08)',
        dropdownItemBg: 'rgba(255,255,255,0.03)',
        dropdownText: '#e8e8ff',
        headerEmail: 'rgba(232,232,255,0.72)',
        avatarBg: 'rgba(28,203,161,0.16)',
        avatarText: '#1ccba1',
        chevron: 'rgba(232,232,255,0.62)',
      }
    : {
        navBg: '#ffffff',
        navBorder: 'rgba(15,23,42,0.12)',
        logoText: '#0f172a',
        triggerBg: '#ffffff',
        triggerBorder: 'rgba(15,23,42,0.18)',
        profileName: '#0f172a',
        authMethod: '#475569',
        walletBg: 'rgba(15,23,42,0.04)',
        walletBorder: 'rgba(15,23,42,0.12)',
        walletText: '#0f172a',
        dropdownBg: '#ffffff',
        dropdownBorder: 'rgba(15,23,42,0.16)',
        dropdownDivider: 'rgba(15,23,42,0.12)',
        dropdownItemBg: 'rgba(15,23,42,0.03)',
        dropdownText: '#0f172a',
        headerEmail: '#475569',
        avatarBg: 'rgba(15,118,110,0.14)',
        avatarText: '#0f766e',
        chevron: '#64748b',
      };

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';
  const walletDisplay = truncatedAddress || 'Connected';

  const profileName = userDisplayName?.trim() || 'Account';
  const initials = useMemo(() => getInitials(profileName), [profileName]);
  const showWalletStatus = signedIn && walletConnected;
  const triggerInitials = signedIn ? initials : 'U';

  useEffect(() => {
    if (!menuVisible) {
      setSettingsExpanded(false);
    }
  }, [menuVisible]);

  return (
    <View style={[styles.nav, { borderBottomColor: palette.navBorder, backgroundColor: palette.navBg }]}>
      <View style={styles.logoContainer}>
        <AirsBrandMark size={28} fillColor={brandMarkFill} cutoutColor={brandMarkCutout} />
        <View style={styles.brandCopy}>
          <ExpoImage source={wordmarkSource} style={styles.wordmarkImage} contentFit='contain' />
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.logoCaption, { color: palette.logoText }]}>
            Alternun Impact & Reputation Score
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {showWalletStatus ? (
          <View style={styles.walletConnected}>
            <View style={[styles.stakingBadge, atnEligible ? styles.badgeTeal : styles.badgeAmber]}>
              <Star size={10} color={atnEligible ? '#1ccba1' : '#f59e0b'} fill={atnEligible ? '#1ccba1' : '#f59e0b'} />
              <Text style={[styles.badgeText, atnEligible ? styles.badgeTextTeal : styles.badgeTextAmber]}>
                {atnEligible ? 'Eligible' : 'Staking'}
              </Text>
            </View>
            <View style={[styles.addressChip, { backgroundColor: palette.walletBg, borderColor: palette.walletBorder }]}>
              <View style={styles.addressDot} />
              <Text style={[styles.addressText, { color: palette.walletText }]}>{walletDisplay}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.profileMenuContainer}>
          <TouchableOpacity
            style={[styles.profileTrigger, { backgroundColor: palette.triggerBg, borderColor: palette.triggerBorder }]}
            onPress={() => setMenuVisible((prev) => !prev)}
            activeOpacity={0.85}
          >
            <View style={[styles.avatar, { backgroundColor: palette.avatarBg }]}>
              <Text style={[styles.avatarText, { color: palette.avatarText }]}>{triggerInitials}</Text>
            </View>
            {signedIn ? (
              <View style={styles.profileMeta}>
                <Text style={[styles.profileName, { color: palette.profileName }]} numberOfLines={1}>
                  {profileName}
                </Text>
              </View>
            ) : null}
            <ChevronDown size={14} color={palette.chevron} />
          </TouchableOpacity>

          {menuVisible ? (
            <View style={[styles.profileDropdown, { backgroundColor: palette.dropdownBg, borderColor: palette.dropdownBorder }]}>
              {signedIn && (userEmail || authMethodLabel) ? (
                <View style={[styles.dropdownHeader, { borderBottomColor: palette.dropdownDivider }]}>
                  <View style={styles.dropdownHeaderTop}>
                    <Text style={[styles.dropdownHeaderName, { color: palette.dropdownText }]} numberOfLines={1}>
                      {profileName}
                    </Text>
                    {authMethodLabel ? (
                      <Text style={[styles.dropdownHeaderAuthMethod, { color: palette.authMethod }]} numberOfLines={1}>
                        {authMethodLabel}
                      </Text>
                    ) : null}
                  </View>
                  {userEmail ? (
                    <Text style={[styles.dropdownHeaderEmail, { color: palette.headerEmail }]} numberOfLines={1}>
                      {userEmail}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {!signedIn ? (
                <TouchableOpacity
                  style={[styles.dropdownItem, { backgroundColor: palette.dropdownItemBg }]}
                  onPress={() => {
                    setMenuVisible(false);
                    onSignIn();
                  }}
                  activeOpacity={0.8}
                >
                  <LogIn size={14} color={iconColor} />
                  <Text style={[styles.dropdownItemText, { color: palette.dropdownText }]}>{t('labels.signIn')}</Text>
                </TouchableOpacity>
              ) : null}

              {signedIn && !walletConnected ? (
                <TouchableOpacity
                  style={[styles.dropdownItem, { backgroundColor: palette.dropdownItemBg }]}
                  onPress={() => {
                    setMenuVisible(false);
                    onConnectWallet();
                  }}
                  activeOpacity={0.8}
                >
                  <Wallet size={14} color="#1ccba1" />
                  <Text style={[styles.dropdownItemText, { color: palette.dropdownText }]}>Link Wallet</Text>
                </TouchableOpacity>
              ) : null}

              {signedIn ? (
                <TouchableOpacity
                  style={[styles.dropdownItem, { backgroundColor: palette.dropdownItemBg }]}
                  onPress={() => {
                    setMenuVisible(false);
                    onOpenProfile();
                  }}
                  activeOpacity={0.8}
                >
                  <CircleUserRound size={14} color={iconColor} />
                  <Text style={[styles.dropdownItemText, { color: palette.dropdownText }]}>Profile</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.dropdownItem, { backgroundColor: palette.dropdownItemBg }]}
                onPress={() => {
                  setSettingsExpanded((prev) => !prev);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.dropdownItemSplit}>
                  <View style={styles.dropdownItemLeft}>
                    <Settings size={14} color={iconColor} />
                    <Text style={[styles.dropdownItemText, { color: palette.dropdownText }]}>{t('labels.settings')}</Text>
                  </View>
                  <SettingsChevron size={14} color={palette.chevron} />
                </View>
              </TouchableOpacity>

              {settingsExpanded ? (
                <>
                  <TouchableOpacity
                    style={[styles.dropdownSubItem, { backgroundColor: palette.dropdownItemBg }]}
                    onPress={() => {
                      onCycleLanguage();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownItemSplit}>
                      <View style={styles.dropdownItemLeft}>
                        <Languages size={14} color={iconColor} />
                        <Text style={[styles.dropdownItemText, { color: palette.dropdownText }]}>{t('labels.language')}</Text>
                      </View>
                      <Text style={[styles.dropdownItemValue, { color: secondaryColor }]}>
                        {getLocaleLabel(language, language)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dropdownSubItem, { backgroundColor: palette.dropdownItemBg }]}
                    onPress={() => {
                      onToggleTheme();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownItemSplit}>
                      <View style={styles.dropdownItemLeft}>
                        <ThemeIcon size={14} color={iconColor} />
                        <Text style={[styles.dropdownItemText, { color: palette.dropdownText }]}>{t('labels.theme')}</Text>
                      </View>
                      <Text style={[styles.dropdownItemValue, { color: secondaryColor }]}>{themeLabel}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dropdownSubItem, { backgroundColor: palette.dropdownItemBg }]}
                    onPress={() => {
                      setMenuVisible(false);
                      setSettingsExpanded(false);
                      onOpenSettings();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownItemLeft}>
                      <Settings size={14} color={iconColor} />
                      <Text style={[styles.dropdownItemText, { color: palette.dropdownText }]}>{t('navigation.moreSettings')}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : null}

              {signedIn ? (
                <TouchableOpacity
                  style={[styles.dropdownItem, styles.dropdownItemDanger]}
                  onPress={() => {
                    setMenuVisible(false);
                    onSignOut();
                  }}
                  activeOpacity={0.8}
                >
                  <LogOut size={14} color="#f87171" />
                  <Text style={styles.dropdownItemTextDanger}>Sign Out</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = createTypographyStyles({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    zIndex: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  brandCopy: {
    gap: 1,
    flexShrink: 1,
  },
  wordmarkImage: {
    width: 64,
    height: 22,
  },
  logoCaption: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.08,
    flexShrink: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  walletConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stakingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeTeal: {
    backgroundColor: 'rgba(28,203,161,0.12)',
    borderColor: 'rgba(28,203,161,0.3)',
  },
  badgeAmber: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextTeal: {
    color: '#1ccba1',
  },
  badgeTextAmber: {
    color: '#f59e0b',
  },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1ccba1',
  },
  addressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  profileMenuContainer: {
    position: 'relative',
  },
  profileTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(28,203,161,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileMeta: {
    maxWidth: 94,
    minWidth: 56,
  },
  profileName: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 230,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  dropdownHeader: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 2,
    gap: 2,
  },
  dropdownHeaderTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownHeaderName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownHeaderAuthMethod: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dropdownHeaderEmail: {
    fontSize: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
  },
  dropdownSubItem: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
  },
  dropdownItemSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownItemDanger: {
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownItemValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownItemTextDanger: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
  },
});

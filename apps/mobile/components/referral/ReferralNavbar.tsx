import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTranslation } from '../i18n/useAppTranslation';

interface ReferralNavbarProps {
  user?: { id: string; email?: string } | null;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  onLanguageChange?: (language: string) => void;
  currentLanguage?: string;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'th', label: 'ไทย' },
];

export const ReferralNavbar: React.FC<ReferralNavbarProps> = ({
  user,
  theme = 'dark',
  onThemeChange,
  onLanguageChange,
  currentLanguage = 'en',
}) => {
  const router = useRouter();
  const { t } = useAppTranslation('mobile');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const isDark = theme === 'dark';
  const avatarInitials = user?.email ? user.email.substring(0, 1).toUpperCase() : 'U';

  return (
    <>
      <View style={[styles.navbar, isDark ? styles.navbarDark : styles.navbarLight]}>
        <View style={styles.container}>
          {/* Logo */}
          <Pressable onPress={() => router.push('/')} style={styles.logoContainer}>
            <Text style={[styles.logo, isDark ? styles.logoDark : styles.logoLight]}>
              ✦ Alternun
            </Text>
          </Pressable>

          {/* Right actions */}
          <View style={styles.actions}>
            {/* Dark Mode Toggle */}
            <Pressable
              onPress={() => onThemeChange?.(isDark ? 'light' : 'dark')}
              style={[styles.iconButton, isDark ? styles.iconButtonDark : styles.iconButtonLight]}
            >
              <Text style={styles.iconButtonText}>{isDark ? '☀️' : '🌙'}</Text>
            </Pressable>

            {/* Language Menu */}
            <View style={styles.languageMenuContainer}>
              <Pressable
                onPress={() => {
                  setShowLanguageMenu(!showLanguageMenu);
                  setShowDropdown(false);
                }}
                style={[styles.iconButton, isDark ? styles.iconButtonDark : styles.iconButtonLight]}
              >
                <Text style={styles.iconButtonText}>🌐</Text>
              </Pressable>
              {showLanguageMenu && (
                <View
                  style={[
                    styles.dropdownMenu,
                    styles.languageDropdown,
                    isDark ? styles.dropdownMenuDark : styles.dropdownMenuLight,
                  ]}
                >
                  {LANGUAGES.map((lang) => (
                    <Pressable
                      key={lang.code}
                      onPress={() => {
                        onLanguageChange?.(lang.code);
                        setShowLanguageMenu(false);
                      }}
                      style={[
                        styles.menuItem,
                        currentLanguage === lang.code && styles.menuItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          { color: isDark ? '#f8fafc' : '#041710' },
                          currentLanguage === lang.code && styles.menuItemActiveText,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* User Avatar/Auth */}
            {user ? (
              <View style={styles.avatarMenuContainer}>
                <Pressable
                  onPress={() => {
                    setShowDropdown(!showDropdown);
                    setShowLanguageMenu(false);
                  }}
                  style={[styles.avatar, isDark ? styles.avatarDark : styles.avatarLight]}
                >
                  <Text style={styles.avatarText}>{avatarInitials}</Text>
                </Pressable>
                {showDropdown && (
                  <View
                    style={[
                      styles.dropdownMenu,
                      styles.avatarDropdown,
                      isDark ? styles.dropdownMenuDark : styles.dropdownMenuLight,
                    ]}
                  >
                    <Pressable
                      onPress={() => {
                        setShowDropdown(false);
                        setTimeout(() => router.push('/mi-perfil'), 0);
                      }}
                      style={styles.menuItem}
                    >
                      <Text
                        style={[styles.menuItemText, { color: isDark ? '#f8fafc' : '#041710' }]}
                      >
                        👤 {t('common.profile', undefined, 'Profile')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setShowDropdown(false);
                        setTimeout(() => router.push('/settings'), 0);
                      }}
                      style={styles.menuItem}
                    >
                      <Text
                        style={[styles.menuItemText, { color: isDark ? '#f8fafc' : '#041710' }]}
                      >
                        ⚙️ {t('common.settings', undefined, 'Settings')}
                      </Text>
                    </Pressable>
                    <View style={styles.menuDivider} />
                    <Pressable
                      onPress={() => {
                        setShowDropdown(false);
                        setTimeout(() => router.push('/auth?mode=logout'), 0);
                      }}
                      style={styles.menuItem}
                    >
                      <Text
                        style={[styles.menuItemText, styles.menuItemDanger, { color: '#ff6b6b' }]}
                      >
                        🚪 {t('common.signOut', undefined, 'Sign Out')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => router.push('/auth')}
                  style={[
                    styles.signInButton,
                    isDark ? styles.signInButtonDark : styles.signInButtonLight,
                  ]}
                >
                  <Text style={styles.signInText}>{t('auth.signIn', undefined, 'Sign In')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}
                  style={[
                    styles.signUpButton,
                    isDark ? styles.signUpButtonDark : styles.signUpButtonLight,
                  ]}
                >
                  <Text style={styles.signUpText}>{t('auth.signUp', undefined, 'Sign Up')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
  },
  navbarDark: {
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(5, 5, 16, 0.8)',
  },
  navbarLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  logoDark: {
    color: '#f8fafc',
  },
  logoLight: {
    color: '#041710',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconButtonLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  iconButtonText: {
    fontSize: 20,
  },
  languageMenuContainer: {
    position: 'relative',
  },
  avatarMenuContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarDark: {
    backgroundColor: '#1ccba1',
    borderColor: 'rgba(28, 203, 161, 0.3)',
  },
  avatarLight: {
    backgroundColor: '#1ccba1',
    borderColor: 'rgba(28, 203, 161, 0.3)',
  },
  avatarText: {
    color: '#041710',
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 180,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  avatarDropdown: {
    right: 0,
  },
  languageDropdown: {
    right: 50,
  },
  dropdownMenuDark: {
    backgroundColor: 'rgba(10, 11, 28, 0.98)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dropdownMenuLight: {
    backgroundColor: 'rgba(248, 250, 252, 0.98)',
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  menuItemActive: {
    backgroundColor: 'rgba(28, 203, 161, 0.1)',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuItemActiveText: {
    color: '#1ccba1',
    fontWeight: '600',
  },
  menuItemDanger: {
    color: '#ff6b6b',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 0,
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  signInButtonDark: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(248, 250, 252, 0.2)',
  },
  signInButtonLight: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  signInText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  signUpButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1ccba1',
  },
  signUpButtonDark: {
    backgroundColor: '#1ccba1',
  },
  signUpButtonLight: {
    backgroundColor: '#1ccba1',
  },
  signUpText: {
    color: '#041710',
    fontSize: 14,
    fontWeight: '700',
  },
});

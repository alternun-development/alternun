import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { Languages, Moon, Settings as SettingsIcon, Sun, } from 'lucide-react-native';

import { getLocaleLabel, } from '@alternun/i18n';
import { useAppPreferences, } from '../settings/AppPreferencesProvider';
import { useAppTranslation, } from '../i18n/useAppTranslation';

type MenuPalette = {
  mutedButtonBg: string;
  textPrimary: string;
  accent: string;
};

interface AirsIntroSettingsMenuProps {
  palette: MenuPalette;
  onOpenSettings?: () => void;
}

export default function AirsIntroSettingsMenu({
  palette,
  onOpenSettings,
}: AirsIntroSettingsMenuProps,): React.ReactElement {
  const { themeMode, language, toggleThemeMode, cycleLanguage, } = useAppPreferences();
  const { t, } = useAppTranslation('mobile',);
  const isDark = themeMode === 'dark';
  const ThemeIcon = isDark ? Sun : Moon;
  const languageLabel = getLocaleLabel(language, language,);

  return (
    <>
      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: palette.mutedButtonBg, },]}
        onPress={toggleThemeMode}
        activeOpacity={0.82}
      >
        <ThemeIcon size={14} color={palette.textPrimary} />
        <Text style={[styles.menuText, { color: palette.textPrimary, },]}>{t('labels.theme',)}</Text>
        <View style={styles.menuItemRight}>
          <Text style={[styles.menuValue, { color: palette.accent, },]}>
            {isDark ? t('labels.dark',) : t('labels.light',)}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: palette.mutedButtonBg, },]}
        onPress={cycleLanguage}
        activeOpacity={0.82}
      >
        <Languages size={14} color={palette.textPrimary} />
        <Text style={[styles.menuText, { color: palette.textPrimary, },]}>
          {t('labels.language',)}
        </Text>
        <View style={styles.menuItemRight}>
          <Text style={[styles.menuValue, { color: palette.accent, },]}>{languageLabel}</Text>
        </View>
      </TouchableOpacity>

      {onOpenSettings ? (
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: palette.mutedButtonBg, },]}
          onPress={onOpenSettings}
          activeOpacity={0.82}
        >
          <SettingsIcon size={14} color={palette.textPrimary} />
          <Text style={[styles.menuText, { color: palette.textPrimary, flex: 1, },]}>
            {t('navigation.moreSettings',)}
          </Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuText: {
    fontSize: 12,
    fontWeight: '700',
  },
  menuItemRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    fontSize: 11,
    fontWeight: '700',
  },
},);

import { getLocaleLabel, } from '@alternun/i18n';
import { useAppTranslation, } from '../components/i18n/useAppTranslation';
import { useAppPreferences, } from '../components/settings/AppPreferencesProvider';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { createTypographyStyles, } from '../components/theme/typography';

export default function SettingsScreen() {
  const {
    themeMode,
    language,
    showAirsIntro,
    toggleThemeMode,
    cycleLanguage,
    setShowAirsIntro,
  } = useAppPreferences();
  const { t, } = useAppTranslation('mobile',);
  const isDark = themeMode === 'dark';

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#050510' : '#f6f8fc', },]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: isDark ? '#e8e8ff' : '#0f172a', },]}>{t('settingsScreen.title',)}</Text>
        <Text style={[styles.subtitle, { color: isDark ? 'rgba(232,232,255,0.72)' : '#475569', },]}>
          {t('settingsScreen.subtitle',)}
        </Text>

        <View style={[styles.card, { backgroundColor: isDark ? '#0d0d1f' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)', },]}>
          <Text style={[styles.cardTitle, { color: isDark ? '#e8e8ff' : '#0f172a', },]}>{t('settingsScreen.sections.appearance',)}</Text>
          <TouchableOpacity
            style={[styles.rowButton, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)', },]}
            onPress={toggleThemeMode}
            activeOpacity={0.85}
          >
            <Text style={[styles.rowLabel, { color: isDark ? '#e8e8ff' : '#0f172a', },]}>{t('labels.theme',)}</Text>
            <Text style={[styles.rowValue, { color: isDark ? '#66e6c5' : '#0f766e', },]}>
              {themeMode === 'dark' ? t('labels.dark',) : t('labels.light',)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? '#0d0d1f' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)', },]}>
          <Text style={[styles.cardTitle, { color: isDark ? '#e8e8ff' : '#0f172a', },]}>{t('settingsScreen.sections.language',)}</Text>
          <TouchableOpacity
            style={[styles.rowButton, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)', },]}
            onPress={cycleLanguage}
            activeOpacity={0.85}
          >
            <Text style={[styles.rowLabel, { color: isDark ? '#e8e8ff' : '#0f172a', },]}>{t('settingsScreen.currentLanguage',)}</Text>
            <Text style={[styles.rowValue, { color: isDark ? '#66e6c5' : '#0f766e', },]}>
              {getLocaleLabel(language, language,)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? '#0d0d1f' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)', },]}>
          <Text style={[styles.cardTitle, { color: isDark ? '#e8e8ff' : '#0f172a', },]}>{t('settingsScreen.sections.onboarding',)}</Text>
          <TouchableOpacity
            style={[styles.rowButton, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)', },]}
            onPress={() => setShowAirsIntro(!showAirsIntro,)}
            activeOpacity={0.85}
          >
            <Text style={[styles.rowLabel, { color: isDark ? '#e8e8ff' : '#0f172a', },]}>{t('settingsScreen.showIntroAgain',)}</Text>
            <Text style={[styles.rowValue, { color: isDark ? '#66e6c5' : '#0f766e', },]}>
              {showAirsIntro ? t('labels.no',) : t('labels.yes',)}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.rowHelpText, { color: isDark ? 'rgba(232,232,255,0.58)' : '#64748b', },]}>
            {t('settingsScreen.localPreferenceHelp',)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = createTypographyStyles({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowHelpText: {
    fontSize: 11,
    lineHeight: 16,
  },
},);

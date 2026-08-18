import { getLocaleLabel, SUPPORTED_LOCALES, type AlternunLocale } from '@alternun/i18n';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenShell from '../components/common/ScreenShell';
import { useAuth } from '../components/auth/AppAuthProvider';
import { useAppTranslation } from '../components/i18n/useAppTranslation';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';

const SUPPORT_EMAIL = 'support@alternun.co';

export default function DeleteAccountPage(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { language, setLanguage, themeMode } = useAppPreferences();
  const { t } = useAppTranslation('mobile');
  const [mailClientUnavailable, setMailClientUnavailable] = React.useState(false);
  const isDark = themeMode === 'dark';
  const colors = {
    accent: isDark ? '#66e6c5' : '#0f766e',
    background: isDark ? '#050510' : '#f6f8fc',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
    card: isDark ? '#0d0d1f' : '#ffffff',
    muted: isDark ? 'rgba(232,232,255,0.68)' : '#64748b',
    text: isDark ? '#e8e8ff' : '#0f172a',
  };

  const handleSignIn = (): void => {
    router.push({ pathname: '/auth', params: { next: '/delete-account' } });
  };

  const handleContactSupport = (): void => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('accountDeletion.title'))}`;
    void Linking.canOpenURL(url)
      .then((canOpen) =>
        canOpen ? Linking.openURL(url) : Promise.reject(new Error('No mail handler'))
      )
      .then(() => setMailClientUnavailable(false))
      .catch(() => setMailClientUnavailable(true));
  };

  return (
    <ScreenShell backgroundColor={colors.background}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.badge, { color: colors.accent }]}>{t('accountDeletion.badge')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('accountDeletion.title')}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            {t('accountDeletion.description')}
          </Text>

          <View style={styles.topActions}>
            {!user && (
              <TouchableOpacity
                accessibilityRole='button'
                activeOpacity={0.85}
                onPress={handleSignIn}
                style={[styles.primaryAction, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.primaryActionText}>{t('accountDeletion.signIn')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole='button'
              activeOpacity={0.85}
              onPress={() => router.push('/settings')}
              style={[styles.secondaryAction, { borderColor: colors.accent }]}
            >
              <Text style={[styles.secondaryActionText, { color: colors.accent }]}>
                {t('accountDeletion.settings')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settingsScreen.sections.language')}
          </Text>
          <View style={styles.localeRow}>
            {SUPPORTED_LOCALES.map((locale) => {
              const selected = locale === language;
              return (
                <TouchableOpacity
                  key={locale}
                  accessibilityRole='button'
                  accessibilityState={{ selected }}
                  activeOpacity={0.8}
                  onPress={() => setLanguage(locale as AlternunLocale)}
                  style={[
                    styles.localeButton,
                    {
                      backgroundColor: selected ? colors.accent : 'transparent',
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.localeButtonText, { color: selected ? '#04171a' : colors.text }]}
                  >
                    {getLocaleLabel(locale, language)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('accountDeletion.stepsTitle')}
          </Text>
          {['stepOne', 'stepTwo', 'stepThree'].map((step, index) => (
            <View key={step} style={styles.step}>
              <Text style={[styles.stepNumber, { color: colors.accent }]}>{index + 1}</Text>
              <Text style={[styles.stepText, { color: colors.muted }]}>
                {t(`accountDeletion.${step}`)}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            accessibilityRole='link'
            activeOpacity={0.85}
            onPress={handleContactSupport}
            style={[styles.supportAction, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.primaryActionText}>{t('accountDeletion.contactSupport')}</Text>
          </TouchableOpacity>
          <Text selectable style={[styles.supportEmail, { color: colors.muted }]}>
            {mailClientUnavailable
              ? `${SUPPORT_EMAIL} (copy this address to contact support)`
              : SUPPORT_EMAIL}
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 16, padding: 20, paddingBottom: 40 },
  hero: { borderRadius: 20, borderWidth: 1, gap: 14, padding: 20 },
  badge: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800' },
  description: { fontSize: 15, lineHeight: 23 },
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryAction: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryActionText: { color: '#04171a', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  secondaryAction: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryActionText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  card: { borderRadius: 18, borderWidth: 1, gap: 14, padding: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  localeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  localeButton: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  localeButtonText: { fontSize: 13, fontWeight: '700' },
  step: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  stepNumber: { fontSize: 18, fontWeight: '800', lineHeight: 22, width: 18 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 21 },
  supportAction: { borderRadius: 12, marginTop: 4, paddingHorizontal: 16, paddingVertical: 13 },
  supportEmail: { fontSize: 13, textAlign: 'center' },
});

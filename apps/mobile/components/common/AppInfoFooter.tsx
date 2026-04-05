import { useAppTranslation } from '../i18n/useAppTranslation';
import { Image as ExpoImage } from 'expo-image';
import React, { useMemo } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { createTypographyStyles } from '../theme/typography';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { resolvePrimaryLinksForViewport } from './AppInfoFooter.links';
import {
  AIRS_LOGOTIPO_DARK,
  AIRS_LOGOTIPO_LIGHT,
  FooterCopyright,
  FooterTextLink,
  resolveVersionMetadata,
} from './Footer.shared';

export default function AppInfoFooter(): React.JSX.Element {
  const { themeMode, language } = useAppPreferences();
  const { width } = useWindowDimensions();
  const { t } = useAppTranslation('mobile');
  const versionMetadata = useMemo(resolveVersionMetadata, []);
  const isDark = themeMode === 'dark';
  const isMobile = width < 720;
  const isWide = width >= 1120;
  const wordmarkSource = isDark ? AIRS_LOGOTIPO_LIGHT : AIRS_LOGOTIPO_DARK;
  const primaryLinks = resolvePrimaryLinksForViewport({ isMobile, isWide }, language);

  const palette = isDark
    ? {
        bg: '#050510',
        border: 'rgba(28, 203, 161, 0.12)',
        title: '#e8e8ff',
        text: 'rgba(232, 232, 255, 0.7)',
        muted: 'rgba(232, 232, 255, 0.5)',
      }
    : {
        bg: '#f9fafb',
        border: 'rgba(15, 23, 42, 0.12)',
        title: '#0f172a',
        text: 'rgba(15, 45, 49, 0.7)',
        muted: 'rgba(15, 45, 49, 0.5)',
      };

  const wordmarkWidth = isMobile ? 72 : 88;
  const wordmarkHeight = isMobile ? 24 : 28;

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: palette.bg,
          borderTopColor: palette.border,
        },
      ]}
    >
      {/* Desktop layout: row */}
      {!isMobile && (
        <View style={styles.desktopRow}>
          <View style={styles.leftSection}>
            <ExpoImage
              source={wordmarkSource}
              style={{ width: wordmarkWidth, height: wordmarkHeight }}
              contentFit='contain'
            />
          </View>

          <View style={styles.centerSection}>
            {primaryLinks.map((link) => (
              <FooterTextLink
                key={link.labelKey}
                label={t(link.labelKey, undefined, link.fallbackLabel)}
                url={link.url}
                textColor={palette.title}
                compact
              />
            ))}
          </View>

          <View style={styles.rightSection}>
            <FooterCopyright color={palette.text} />
            <Text numberOfLines={1} style={[styles.versionText, { color: palette.muted }]}>
              v{versionMetadata.version}
            </Text>
          </View>
        </View>
      )}

      {/* Mobile layout: stacked */}
      {isMobile && (
        <View style={styles.mobileColumn}>
          <View style={styles.mobileLogoSection}>
            <ExpoImage
              source={wordmarkSource}
              style={{ width: wordmarkWidth, height: wordmarkHeight }}
              contentFit='contain'
            />
          </View>

          <View style={styles.mobileLinkSection}>
            {primaryLinks.map((link) => (
              <FooterTextLink
                key={link.labelKey}
                label={t(link.labelKey, undefined, link.fallbackLabel)}
                url={link.url}
                textColor={palette.title}
                compact
              />
            ))}
          </View>

          <View style={styles.mobileMetaSection}>
            <FooterCopyright color={palette.text} />
            <Text numberOfLines={1} style={[styles.versionText, { color: palette.muted }]}>
              v{versionMetadata.version}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = createTypographyStyles({
  footer: {
    width: '100%',
    borderTopWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },

  /* Desktop */
  desktopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 32,
  },
  leftSection: {
    minWidth: 100,
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  rightSection: {
    minWidth: 100,
    alignItems: 'flex-end',
    gap: 4,
  },

  /* Mobile */
  mobileColumn: {
    gap: 20,
  },
  mobileLogoSection: {
    alignItems: 'flex-start',
  },
  mobileLinkSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  mobileMetaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  versionText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

import { useAppTranslation } from '../i18n/useAppTranslation';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
        shellBg: 'rgba(6, 18, 17, 0.62)',
        shellBorder: 'rgba(142, 255, 223, 0.14)',
        title: '#effff9',
        text: 'rgba(239,255,249,0.82)',
        muted: 'rgba(220,255,246,0.58)',
      }
    : {
        shellBg: 'rgba(250, 255, 253, 0.86)',
        shellBorder: 'rgba(11, 90, 95, 0.12)',
        title: '#0b2d31',
        text: 'rgba(11,45,49,0.82)',
        muted: 'rgba(11,45,49,0.54)',
      };

  const shellRadius = isMobile ? 16 : 18;
  const wordmarkWidth = isMobile ? 78 : 92;
  const wordmarkHeight = isMobile ? 26 : 30;

  return (
    <View
      style={[
        styles.outer,
        { paddingHorizontal: isMobile ? 8 : 12, paddingBottom: isMobile ? 8 : 10 },
      ]}
    >
      <View
        style={[
          styles.shell,
          {
            backgroundColor: palette.shellBg,
            borderColor: palette.shellBorder,
            borderRadius: shellRadius,
            paddingHorizontal: isMobile ? 12 : 14,
            paddingVertical: isMobile ? 10 : 11,
          },
        ]}
      >
        <BlurView
          intensity={28}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFillObject, { borderRadius: shellRadius }]}
        />

        <View style={[styles.row, isMobile && styles.rowMobile]}>
          <View style={styles.brandWrap}>
            <ExpoImage
              source={wordmarkSource}
              style={{ width: wordmarkWidth, height: wordmarkHeight }}
              contentFit='contain'
            />
          </View>

          <View style={[styles.linkRow, isMobile && styles.linkRowMobile]}>
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

          <View style={[styles.metaWrap, isMobile && styles.metaWrapMobile]}>
            <FooterCopyright color={palette.text} />
            <Text numberOfLines={1} style={[styles.versionText, { color: palette.muted }]}>
              v{versionMetadata.version}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = createTypographyStyles({
  outer: {
    alignSelf: 'stretch',
    minWidth: 0,
  },
  shell: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  brandWrap: {
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flex: 1,
  },
  linkRowMobile: {
    width: '100%',
    justifyContent: 'flex-start',
    gap: 10,
    flex: 0,
  },
  metaWrap: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 92,
  },
  metaWrapMobile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

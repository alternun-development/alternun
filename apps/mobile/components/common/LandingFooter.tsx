import { useAppTranslation } from '../i18n/useAppTranslation';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { PolicyDrawerContent } from '../auth/AuthFooter';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ChangelogDrawer } from '@alternun/ui';
import SupportButton from './SupportButton';
import { createTypographyStyles } from '../theme/typography';
import AirsBrandMark from '../branding/AirsBrandMark';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { resolvePrimaryLinksForViewport } from './AppInfoFooter.links';
import {
  AIRS_LOGOTIPO_DARK,
  AIRS_LOGOTIPO_LIGHT,
  ALTERNUN_POWERED_BY_LOGO,
  FooterCopyright,
  FooterTextLink,
  FooterTopFade,
  SocialPill,
  SOCIAL_LINKS,
  resolveVersionMetadata,
} from './Footer.shared';
import { getChangelogContent, GITHUB_REPO_URL } from '../../utils/getChangelog';

export default function LandingFooter(): React.JSX.Element {
  const { themeMode, language } = useAppPreferences();
  const { width } = useWindowDimensions();
  const { t } = useAppTranslation('mobile');
  const isDark = themeMode === 'dark';
  const versionMetadata = useMemo(resolveVersionMetadata, []);
  const changelogContent = useMemo(getChangelogContent, []);
  const resolvedApiUrl = resolveMobileApiBaseUrl();

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const handlePrivacyOpen = useCallback(() => setPrivacyOpen(true), []);
  const handlePrivacyClose = useCallback(() => setPrivacyOpen(false), []);
  const handleTermsOpen = useCallback(() => setTermsOpen(true), []);
  const handleTermsClose = useCallback(() => setTermsOpen(false), []);

  const drawerColors = {
    bg: isDark ? '#0d0d1f' : '#f8fafb',
    border: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.1)',
    handle: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
    title: isDark ? '#e8e8ff' : '#0f172a',
    muted: isDark ? 'rgba(232,232,255,0.5)' : '#94a3b8',
    accent: isDark ? '#1ee6b5' : '#0d9488',
    backdrop: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.38)',
  };

  const isMobile = width < 720;
  const isWide = width >= 1120;
  const useCompactFooter = !isWide;
  const wordmarkSource = isDark ? AIRS_LOGOTIPO_LIGHT : AIRS_LOGOTIPO_DARK;
  const primaryLinks = resolvePrimaryLinksForViewport({ isMobile, isWide }, language);

  // Floating orb animations
  const orbLeft = useSharedValue(0);
  const orbRight = useSharedValue(0);

  useEffect(() => {
    const makeFloat = (duration: number): ReturnType<typeof withRepeat> =>
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      );
    orbLeft.value = makeFloat(5800) as unknown as number;
    orbRight.value = makeFloat(7200) as unknown as number;
    return () => {
      cancelAnimation(orbLeft);
      cancelAnimation(orbRight);
    };
  }, [orbLeft, orbRight]);

  const orbLeftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(orbLeft.value, [0, 1], [0, 22]) },
      { translateY: interpolate(orbLeft.value, [0, 1], [0, 18]) },
    ],
  }));

  const orbRightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(orbRight.value, [0, 1], [0, -18]) },
      { translateY: interpolate(orbRight.value, [0, 1], [0, -22]) },
    ],
  }));

  const palette = isDark
    ? {
        shellBodyBg: 'rgba(6, 18, 17, 0.48)',
        shellTopBg: 'rgba(6, 18, 17, 0.10)',
        shellBorder: 'rgba(142, 255, 223, 0.12)',
        glowA: 'rgba(30, 230, 181, 0.16)',
        glowB: 'rgba(98, 208, 255, 0.12)',
        title: '#effff9',
        text: 'rgba(239,255,249,0.82)',
        muted: 'rgba(220,255,246,0.62)',
        socialBg: 'rgba(30,230,181,0.18)',
        socialBorder: 'rgba(173,255,233,0.24)',
        accent: '#1ee6b5',
        markCutout: '#063339',
        bottomBar: 'rgba(0,0,0,0.12)',
      }
    : {
        shellBodyBg: 'rgba(250, 255, 253, 0.72)',
        shellTopBg: 'rgba(250, 255, 253, 0.14)',
        shellBorder: 'rgba(11, 90, 95, 0.08)',
        glowA: 'rgba(30, 230, 181, 0.12)',
        glowB: 'rgba(11, 90, 95, 0.08)',
        title: '#0b2d31',
        text: 'rgba(11,45,49,0.82)',
        muted: 'rgba(11,45,49,0.58)',
        socialBg: 'rgba(11,90,95,0.08)',
        socialBorder: 'rgba(11,90,95,0.14)',
        accent: '#0b5a5f',
        markCutout: '#dffcf3',
        bottomBar: 'rgba(255,255,255,0.2)',
      };

  const shellPadding = isWide ? 20 : isMobile ? 12 : 14;
  const shellRadius = isWide ? 26 : isMobile ? 16 : 20;
  const shellRevealHeight = isWide ? 20 : isMobile ? 12 : 14;
  const brandMarkSize = isWide ? 52 : isMobile ? 36 : 42;
  const wordmarkWidth = isWide ? 126 : isMobile ? 88 : 104;
  const wordmarkHeight = isWide ? 44 : isMobile ? 30 : 36;

  return (
    <>
      <View
        style={[
          styles.outer,
          {
            marginHorizontal: isWide ? 0 : isMobile ? 14 : 18,
            marginTop: isWide ? 36 : 28,
            marginBottom: isWide ? 30 : 22,
            maxWidth: isWide ? 1100 : undefined,
            width: isWide ? '100%' : undefined,
            alignSelf: isWide ? 'center' : 'stretch',
          },
        ]}
      >
        <View
          style={[
            styles.shell,
            {
              borderColor: palette.shellBorder,
              borderRadius: shellRadius,
              padding: shellPadding,
            },
          ]}
        >
          <BlurView
            intensity={isWide ? 48 : 34}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFillObject, { borderRadius: shellRadius }]}
          />
          <View
            pointerEvents='none'
            style={[
              styles.shellSurfaceBody,
              { top: shellRevealHeight, backgroundColor: palette.shellBodyBg },
            ]}
          />
          <FooterTopFade height={shellRevealHeight} color={palette.shellTopBg} />
          <Animated.View
            pointerEvents='none'
            style={[
              styles.glowOrb,
              styles.glowOrbLeft,
              { backgroundColor: palette.glowA },
              orbLeftStyle,
            ]}
          />
          <Animated.View
            pointerEvents='none'
            style={[
              styles.glowOrb,
              styles.glowOrbRight,
              { backgroundColor: palette.glowB },
              orbRightStyle,
            ]}
          />

          {isWide ? (
            <>
              <View style={[styles.topRow, styles.topRowWide]}>
                <View style={[styles.brandBlock, styles.brandBlockWide]}>
                  <View style={styles.brandHeader}>
                    <ExpoImage
                      source={wordmarkSource}
                      style={{ width: wordmarkWidth, height: wordmarkHeight }}
                      contentFit='contain'
                    />
                    <AirsBrandMark
                      size={brandMarkSize}
                      fillColor={palette.accent}
                      cutoutColor={palette.markCutout}
                    />
                  </View>
                  <View style={styles.bylineRow}>
                    <Text style={[styles.bylineText, { color: palette.accent }]}>
                      {t('labels.by')}
                    </Text>
                    <ExpoImage
                      source={ALTERNUN_POWERED_BY_LOGO}
                      style={styles.bylineLogo}
                      contentFit='contain'
                    />
                  </View>
                </View>

                <View style={[styles.linksArea, styles.linksAreaWide]}>
                  <View style={[styles.linkRow, styles.desktopLinkRow]}>
                    {primaryLinks.map((link) => (
                      <FooterTextLink
                        key={link.labelKey}
                        label={t(link.labelKey, undefined, link.fallbackLabel)}
                        url={link.url}
                        onPress={
                          link.labelKey === 'footer.links.privacy'
                            ? handlePrivacyOpen
                            : link.labelKey === 'footer.links.terms'
                            ? handleTermsOpen
                            : undefined
                        }
                        textColor={palette.title}
                        hoverColor={palette.accent}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.socialBlock}>
                  <View style={styles.socialRow}>
                    {SOCIAL_LINKS.map((link) => (
                      <SocialPill
                        key={link.label}
                        {...link}
                        iconColor={palette.accent}
                        backgroundColor={palette.socialBg}
                        borderColor={palette.socialBorder}
                        hoverColor={isDark ? 'rgba(30,230,181,0.24)' : 'rgba(11,90,95,0.14)'}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <Text
                numberOfLines={2}
                style={[
                  styles.taglineText,
                  {
                    color: palette.text,
                    marginTop: 14,
                  },
                ]}
              >
                {t('footer.tagline')}
              </Text>
            </>
          ) : (
            <View style={styles.compactSection}>
              <View style={styles.brandBlock}>
                <View style={[styles.brandHeader, styles.brandHeaderCompact]}>
                  <ExpoImage
                    source={wordmarkSource}
                    style={{ width: wordmarkWidth, height: wordmarkHeight }}
                    contentFit='contain'
                  />
                  <AirsBrandMark
                    size={brandMarkSize}
                    fillColor={palette.accent}
                    cutoutColor={palette.markCutout}
                  />
                </View>
                <View style={styles.bylineRow}>
                  <Text
                    style={[styles.bylineText, styles.bylineTextCompact, { color: palette.accent }]}
                  >
                    {t('labels.by')}
                  </Text>
                  <ExpoImage
                    source={ALTERNUN_POWERED_BY_LOGO}
                    style={styles.bylineLogo}
                    contentFit='contain'
                  />
                </View>
              </View>

              <Text
                numberOfLines={isMobile ? 2 : 1}
                style={[styles.compactTagline, { color: palette.text }]}
              >
                {t('footer.tagline')}
              </Text>

              <View style={styles.compactLinkGrid}>
                {primaryLinks.map((link, index) => (
                  <React.Fragment key={link.labelKey}>
                    <FooterTextLink
                      label={t(link.labelKey, undefined, link.fallbackLabel)}
                      url={link.url}
                      onPress={
                        link.labelKey === 'footer.links.privacy'
                          ? handlePrivacyOpen
                          : link.labelKey === 'footer.links.terms'
                          ? handleTermsOpen
                          : undefined
                      }
                      textColor={palette.title}
                      hoverColor={palette.accent}
                      compact
                      align='center'
                      singleLine
                    />
                    {index < primaryLinks.length - 1 && (
                      <Text style={[styles.compactLinkSeparator, { color: palette.muted }]}>•</Text>
                    )}
                  </React.Fragment>
                ))}
              </View>

              <View style={styles.compactSocialRow}>
                {SOCIAL_LINKS.map((link) => (
                  <SocialPill
                    key={link.label}
                    {...link}
                    compact
                    iconColor={palette.accent}
                    backgroundColor={palette.socialBg}
                    borderColor={palette.socialBorder}
                    hoverColor={isDark ? 'rgba(30,230,181,0.24)' : 'rgba(11,90,95,0.14)'}
                  />
                ))}
              </View>
            </View>
          )}

          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: palette.bottomBar,
                borderColor: palette.shellBorder,
                borderRadius: useCompactFooter ? 16 : 999,
                marginTop: useCompactFooter ? 10 : 14,
                paddingHorizontal: useCompactFooter ? 12 : 14,
                paddingVertical: useCompactFooter ? 8 : 9,
              },
              useCompactFooter && styles.bottomBarCompact,
            ]}
          >
            <FooterCopyright color={palette.title} />
            <View style={styles.bottomRightSection}>
              <ChangelogDrawer
                changelog={changelogContent}
                githubUrl={GITHUB_REPO_URL}
                pageSize={3}
                triggerLabel={`v${versionMetadata.version}`}
              />
              <SupportButton supportEmail='support@alternun.co' palette={palette} />
            </View>
          </View>
        </View>
      </View>

      {/* Privacy Policy Drawer */}
      <Modal
        visible={privacyOpen}
        transparent
        animationType='fade'
        statusBarTranslucent
        onRequestClose={handlePrivacyClose}
        accessibilityViewIsModal
      >
        <View style={drawerStyles.modalContainer}>
          <Pressable
            style={[drawerStyles.backdrop, { backgroundColor: drawerColors.backdrop }]}
            onPress={handlePrivacyClose}
          />
          <View
            style={[
              drawerStyles.sheet,
              { backgroundColor: drawerColors.bg, borderColor: drawerColors.border },
            ]}
          >
            <View style={[drawerStyles.handle, { backgroundColor: drawerColors.handle }]} />
            <View style={[drawerStyles.sheetHeader, { borderBottomColor: drawerColors.border }]}>
              <Text style={[drawerStyles.sheetTitle, { color: drawerColors.title }]}>
                {t('footer.privacy')}
              </Text>
              <TouchableOpacity
                onPress={handlePrivacyClose}
                activeOpacity={0.75}
                style={drawerStyles.closeBtn}
              >
                <Text style={[drawerStyles.closeBtnText, { color: drawerColors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <PolicyDrawerContent
              type='privacy'
              apiUrl={resolvedApiUrl}
              locale={language}
              textPrimary={drawerColors.title}
              textMuted={drawerColors.muted}
              accent={drawerColors.accent}
            />
          </View>
        </View>
      </Modal>

      {/* Terms of Service Drawer */}
      <Modal
        visible={termsOpen}
        transparent
        animationType='fade'
        statusBarTranslucent
        onRequestClose={handleTermsClose}
        accessibilityViewIsModal
      >
        <View style={drawerStyles.modalContainer}>
          <Pressable
            style={[drawerStyles.backdrop, { backgroundColor: drawerColors.backdrop }]}
            onPress={handleTermsClose}
          />
          <View
            style={[
              drawerStyles.sheet,
              { backgroundColor: drawerColors.bg, borderColor: drawerColors.border },
            ]}
          >
            <View style={[drawerStyles.handle, { backgroundColor: drawerColors.handle }]} />
            <View style={[drawerStyles.sheetHeader, { borderBottomColor: drawerColors.border }]}>
              <Text style={[drawerStyles.sheetTitle, { color: drawerColors.title }]}>
                {t('footer.terms')}
              </Text>
              <TouchableOpacity
                onPress={handleTermsClose}
                activeOpacity={0.75}
                style={drawerStyles.closeBtn}
              >
                <Text style={[drawerStyles.closeBtnText, { color: drawerColors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <PolicyDrawerContent
              type='terms'
              apiUrl={resolvedApiUrl}
              locale={language}
              textPrimary={drawerColors.title}
              textMuted={drawerColors.muted}
              accent={drawerColors.accent}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const drawerStyles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '600' },
});

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
  shellSurfaceBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  shellSurfaceTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
    width: 160,
    height: 160,
  },
  glowOrbLeft: {
    left: -52,
    top: -64,
  },
  glowOrbRight: {
    right: -44,
    bottom: -74,
  },
  topRow: {
    gap: 14,
  },
  topRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brandBlock: {
    gap: 2,
  },
  brandBlockWide: {
    minWidth: 188,
    maxWidth: 236,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandHeaderCompact: {
    gap: 8,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 2,
  },
  bylineText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.12,
  },
  bylineTextCompact: {
    fontSize: 11,
  },
  bylineLogo: {
    width: 16,
    height: 16,
    borderRadius: 999,
  },
  linksArea: {
    flex: 1,
    gap: 10,
  },
  linksAreaWide: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  desktopLinkRow: {
    justifyContent: 'center',
  },
  socialBlock: {
    alignItems: 'flex-end',
    gap: 10,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactSection: {
    gap: 10,
  },
  compactTagline: {
    fontSize: 11,
    lineHeight: 16,
  },
  compactLinkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactLinkSeparator: {
    marginHorizontal: 5,
    fontSize: 13,
    fontWeight: '700',
  },
  compactSocialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  taglineText: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomBar: {
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bottomBarCompact: {
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'column',
    gap: 2,
  },
  bottomMeta: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 10,
  },
  bottomRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

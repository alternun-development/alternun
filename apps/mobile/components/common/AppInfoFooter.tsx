import { useAppTranslation } from '../i18n/useAppTranslation';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
import ParticleBubbles from '../dashboard/ParticleBubbles';
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

interface AppInfoFooterProps {
  containerStyle?: StyleProp<ViewStyle>;
}

export default function AppInfoFooter({ containerStyle }: AppInfoFooterProps): React.JSX.Element {
  const { themeMode, language, motionLevel } = useAppPreferences();
  const { width } = useWindowDimensions();
  const { t } = useAppTranslation('mobile');
  const isDark = themeMode === 'dark';
  const versionMetadata = useMemo(resolveVersionMetadata, []);
  const changelogContent = useMemo(getChangelogContent, []);

  const isMobile = width < 720;
  const isWide = width >= 1120;
  const wordmarkSource = isDark ? AIRS_LOGOTIPO_LIGHT : AIRS_LOGOTIPO_DARK;
  const primaryLinks = resolvePrimaryLinksForViewport({ isMobile, isWide }, language);

  // Floating orb animations
  const orbLeft = useSharedValue(0);
  const orbRight = useSharedValue(0);

  useEffect(() => {
    if (motionLevel === 'off') return;
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
  }, [orbLeft, orbRight, motionLevel]);

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
        shellBodyBg: motionLevel === 'off' ? 'rgba(6,18,17,0.58)' : 'rgba(6, 18, 17, 0.46)',
        shellTopBg: motionLevel === 'off' ? 'rgba(6,18,17,0.16)' : 'rgba(6, 18, 17, 0.08)',
        shellBorder: 'rgba(142, 255, 223, 0.16)',
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
        shellBodyBg: motionLevel === 'off' ? 'rgba(245,255,252,0.84)' : 'rgba(245, 255, 252, 0.72)',
        shellTopBg: motionLevel === 'off' ? 'rgba(245,255,252,0.22)' : 'rgba(245, 255, 252, 0.12)',
        shellBorder: 'rgba(11, 90, 95, 0.10)',
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

  const shellPadding = isWide ? 8 : isMobile ? 6 : 9;
  const shellRevealHeight = isWide ? 18 : isMobile ? 12 : 14;
  const brandMarkSize = isWide ? 34 : isMobile ? 26 : 30;
  const wordmarkWidth = isWide ? 84 : isMobile ? 64 : 76;
  const wordmarkHeight = isWide ? 28 : isMobile ? 20 : 24;

  return (
    <View style={[styles.outer, containerStyle]}>
      <View
        style={[
          styles.shell,
          {
            borderColor: palette.shellBorder,
            borderWidth: 1,
            padding: shellPadding,
          },
        ]}
      >
        {motionLevel !== 'off' && (
          <BlurView
            intensity={isWide ? 48 : 34}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View
          pointerEvents='none'
          style={[
            styles.shellSurfaceBody,
            { top: shellRevealHeight, backgroundColor: palette.shellBodyBg },
          ]}
        />
        <FooterTopFade height={shellRevealHeight} color={palette.shellTopBg} />
        {motionLevel === 'full' && (
          <ParticleBubbles color={isDark ? 'rgba(28,203,161,0.22)' : 'rgba(13,148,136,0.18)'} />
        )}
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

        {/* Desktop layout */}
        {!isMobile && (
          <View style={styles.desktopLayout}>
            <View style={styles.brandBlock}>
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
                <Text style={[styles.bylineText, { color: palette.accent }]}>{t('labels.by')}</Text>
                <ExpoImage
                  source={ALTERNUN_POWERED_BY_LOGO}
                  style={styles.bylineLogo}
                  contentFit='contain'
                />
              </View>
            </View>

            <View style={styles.linksBlock}>
              <View style={styles.linkRow}>
                {primaryLinks.map((link) => (
                  <FooterTextLink
                    key={link.labelKey}
                    label={t(link.labelKey, undefined, link.fallbackLabel)}
                    url={link.url}
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
        )}

        {/* Mobile layout — minimal */}
        {isMobile && (
          <View style={styles.mobileLayout}>
            <View style={styles.mobileLinkRow}>
              {primaryLinks.map((link, index) => (
                <React.Fragment key={link.labelKey}>
                  <FooterTextLink
                    label={t(link.labelKey, undefined, link.fallbackLabel)}
                    url={link.url}
                    textColor={palette.title}
                    hoverColor={palette.accent}
                    compact
                    align='center'
                    singleLine
                  />
                  {index < primaryLinks.length - 1 && (
                    <Text style={[styles.mobileLinkSeparator, { color: palette.muted }]}>•</Text>
                  )}
                </React.Fragment>
              ))}
            </View>

            <View style={styles.mobileSocialRow}>
              {SOCIAL_LINKS.map((link) => (
                <SocialPill
                  key={link.label}
                  {...link}
                  compact
                  mobileMini
                  iconColor={palette.accent}
                  backgroundColor={palette.socialBg}
                  borderColor={palette.socialBorder}
                  hoverColor={isDark ? 'rgba(30,230,181,0.24)' : 'rgba(11,90,95,0.14)'}
                />
              ))}
            </View>
          </View>
        )}

        {/* Bottom bar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: palette.bottomBar,
              marginTop: isMobile ? 6 : 10,
            },
          ]}
        >
          <FooterCopyright color={palette.title} />
          <View style={styles.bottomRightSection}>
            <SupportButton supportEmail='support@alternun.co' palette={palette} />
            <ChangelogDrawer
              changelog={changelogContent}
              githubUrl={GITHUB_REPO_URL}
              pageSize={3}
              triggerLabel={`v${versionMetadata.version}`}
            />
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
    marginTop: 'auto',
  },
  shell: {
    overflow: 'hidden',
    position: 'relative',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    width: 120,
    height: 120,
  },
  glowOrbLeft: {
    left: -40,
    top: -50,
  },
  glowOrbRight: {
    right: -34,
    bottom: -56,
  },

  /* Desktop */
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  brandBlock: {
    gap: 0,
    minWidth: 148,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 2,
  },
  bylineText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.12,
  },
  bylineLogo: {
    width: 16,
    height: 16,
    borderRadius: 999,
  },
  linksBlock: {
    flex: 1,
    minWidth: 0,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBlock: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  /* Mobile */
  mobileLayout: {
    gap: 8,
  },
  mobileLinkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileLinkSeparator: {
    marginHorizontal: 5,
    fontSize: 13,
    fontWeight: '700',
  },
  mobileSocialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  /* Bottom bar */
  bottomBar: {
    marginTop: 12,
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 0,
    paddingVertical: 7,
  },
  versionBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bottomMeta: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bottomRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  StyleProp,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { createTypographyStyles } from '../theme/typography';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LogIn,
  Settings as SettingsIcon,
  User,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import LandingFooter from '../common/LandingFooter';
import AnimatedCollapsibleContent from '../common/AnimatedCollapsibleContent';
import { BackToTopButton } from '../common/BackToTopButton';
import { useAppTranslation } from '../i18n/useAppTranslation';
import AirsIntroSettingsMenu from './AirsIntroSettingsMenu';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { SCULPIN_FONT_FAMILY } from '../theme/fonts';
import { HeroVideoNative } from './HeroVideoNative';

const HERO_EXPANSION_RANGE = 420;
const HERO_SOLID_SWAP_SCROLL = 180;
const AUTO_UNMUTE_SCROLL_Y = 88;
const TOP_PAUSE_SCROLL_Y = 6;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const HERO_VIDEO_MOBILE = require('../../assets/videos/landing.mp4');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HERO_VIDEO_DESKTOP = require('../../assets/videos/landing-backup.mp4');
const AIRS_LOGO_DARK = require('../../assets/AIRS-logo-dark.png');
const AIRS_LOGO_DARK_2X = require('../../assets/AIRS-logo-dark-2x.png');
const AIRS_LOGO_LIGHT = require('../../assets/AIRS-logo-light.png');
const AIRS_LOGO_LIGHT_2X = require('../../assets/AIRS-logo-light-2x.png');

type HeroGlassButtonProps = {
  label: string;
  onPress?: () => void;
  width: number | string;
  fontSize: number;
  isDark: boolean;
};

function HeroGlassButton({
  label,
  onPress,
  width,
  fontSize,
  isDark,
}: HeroGlassButtonProps): React.ReactElement {
  const pillBgColor = isDark ? 'rgba(11,90,95,0.25)' : 'rgba(255,255,255,0.25)';
  const pillBgColorHover = isDark ? 'rgba(11,90,95,0.45)' : 'rgba(255,255,255,0.45)';

  const pillBorderColor = isDark ? 'rgba(28,203,161,0.15)' : 'rgba(10,92,97,0.1)';
  const pillBorderColorHover = isDark ? 'rgba(28,203,161,0.3)' : 'rgba(10,92,97,0.2)';

  const pillGlassTint = isDark ? 'dark' : 'light';
  const textColor = isDark ? 'rgba(255,255,255,0.95)' : '#073f45';

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={({ hovered, pressed }) =>
        ({
          ...styles.heroGlassButton,
          width,
          backgroundColor: hovered ? pillBgColorHover : pillBgColor,
          borderColor: hovered ? pillBorderColorHover : pillBorderColor,
          transform: [{ scale: pressed ? 0.98 : hovered ? 1.02 : 1 }],
          shadowColor: '#000',
          shadowOpacity: hovered ? 0.25 : 0.15,
          shadowOffset: { width: 0, height: hovered ? 12 : 8 },
          shadowRadius: hovered ? 24 : 16,
          elevation: hovered ? 8 : 6,
        } as StyleProp<ViewStyle>)
      }
    >
      {({ hovered }) => (
        <>
          <BlurView
            intensity={isDark ? 60 : 50}
            tint={pillGlassTint}
            style={styles.heroGlassBlur}
          />
          <View
            style={[
              styles.heroGlassTint,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)',
              },
            ]}
          />
          <View
            style={[
              styles.heroGlassHighlight,
              {
                backgroundColor: hovered
                  ? isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.18)'
                  : isDark
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(255,255,255,0.08)',
              },
            ]}
          />
          <Text
            style={[
              styles.heroCopyButtonText,
              {
                color: textColor,
                fontSize,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

interface AirsIntroExperienceProps {
  onContinueToDashboard: (dontShowAgain: boolean) => void;
  onSignIn: () => void;
  onOpenSettings?: () => void;
  extraSections?: React.ReactNode;
  headerNavLinks?: Array<{ id: string; label: string; isActive: boolean; onPress: () => void }>;
  accentColor?: string;
  isDark?: boolean;
  showCta?: boolean;
  onActiveSectionChange?: (sectionId: string) => void;
  sectionOffsets?: Record<string, number>;
  heroHeight?: number;
  onHeroNavigate?: (sectionId: string) => void;
}

const AirsIntroExperience = forwardRef<
  { scrollToSection: (offset: number) => void },
  AirsIntroExperienceProps
>(
  (
    {
      onContinueToDashboard,
      onSignIn,
      onOpenSettings: _onOpenSettings,
      extraSections,
      headerNavLinks,
      accentColor: accentColorProp,
      isDark: isDarkProp,
      showCta = false,
      onActiveSectionChange,
      sectionOffsets,
      heroHeight: heroHeightProp,
      onHeroNavigate,
    },
    ref
  ) => {
    const scrollRef = useRef<Animated.ScrollView>(null);

    // Expose scroll method via ref
    useImperativeHandle(
      ref,
      (): { scrollToSection: (offset: number) => void } => ({
        scrollToSection: (offset: number): void => {
          if (scrollRef.current?.scrollTo) {
            scrollRef.current.scrollTo({ y: Math.max(0, offset - 60), animated: true });
          } else if (scrollRef.current?.getNode?.()?.scrollTo) {
            scrollRef.current.getNode().scrollTo({ y: Math.max(0, offset - 60), animated: true });
          }
        },
      }),
      []
    );

    const { themeMode } = useAppPreferences();
    const { t } = useAppTranslation('mobile');
    const isDark = isDarkProp ?? themeMode === 'dark';
    const [profileMenuVisible, setProfileMenuVisible] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [headerNavSettingsMenuVisible, setHeaderNavSettingsMenuVisible] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [hasManualAudioChoice, setHasManualAudioChoice] = useState(false);
    const [hasAutoUnmuted, setHasAutoUnmuted] = useState(false);
    const [hasScrollActivatedPlayback, setHasScrollActivatedPlayback] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isMobile = screenWidth < 720;
    const heroVideoSource = isMobile ? HERO_VIDEO_MOBILE : HERO_VIDEO_DESKTOP;
    const [headerNavMobileMenuVisible, setHeaderNavMobileMenuVisible] = useState(false);
    const headerNavMobileMenuAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(headerNavMobileMenuAnim, {
        toValue: headerNavMobileMenuVisible ? 1 : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    }, [headerNavMobileMenuVisible, headerNavMobileMenuAnim]);

    const scrollY = useRef(new Animated.Value(0)).current;
    const isMutedRef = useRef(isMuted);
    const hasManualAudioChoiceRef = useRef(hasManualAudioChoice);
    const hasAutoUnmutedRef = useRef(hasAutoUnmuted);
    const hasScrollActivatedPlaybackRef = useRef(hasScrollActivatedPlayback);
    const isInTopZoneRef = useRef(true);

    useEffect(() => {
      setIsMuted(true);
      setHasManualAudioChoice(false);
      setHasAutoUnmuted(false);
      setHasScrollActivatedPlayback(false);
      isInTopZoneRef.current = true;
      hasScrollActivatedPlaybackRef.current = false;
    }, []);

    useEffect(() => {
      isMutedRef.current = isMuted;
      hasManualAudioChoiceRef.current = hasManualAudioChoice;
      hasAutoUnmutedRef.current = hasAutoUnmuted;
      hasScrollActivatedPlaybackRef.current = hasScrollActivatedPlayback;
    }, [hasAutoUnmuted, hasManualAudioChoice, hasScrollActivatedPlayback, isMuted]);

    const syncTopZoneState = useCallback((scrollOffset: number): void => {
      const atTop = scrollOffset <= TOP_PAUSE_SCROLL_Y;
      if (isInTopZoneRef.current === atTop) {
        if (!hasScrollActivatedPlaybackRef.current && scrollOffset > TOP_PAUSE_SCROLL_Y) {
          hasScrollActivatedPlaybackRef.current = true;
          setHasScrollActivatedPlayback(true);
        }
        return;
      }
      isInTopZoneRef.current = atTop;
      if (!hasScrollActivatedPlaybackRef.current && scrollOffset > TOP_PAUSE_SCROLL_Y) {
        hasScrollActivatedPlaybackRef.current = true;
        setHasScrollActivatedPlayback(true);
      }
    }, []);

    const maybeAutoUnmuteFromScroll = useCallback((scrollOffset: number): void => {
      if (scrollOffset <= AUTO_UNMUTE_SCROLL_Y) {
        return;
      }

      if (hasManualAudioChoiceRef.current || hasAutoUnmutedRef.current || !isMutedRef.current) {
        return;
      }

      hasAutoUnmutedRef.current = true;
      setHasAutoUnmuted(true);
      setIsMuted(false);
    }, []);

    useEffect(() => {
      const listenerId = scrollY.addListener(({ value }) => {
        maybeAutoUnmuteFromScroll(value);
        syncTopZoneState(value);
        setShowBackToTop(value > 400);

        // Track active section based on scroll position
        if (onActiveSectionChange && sectionOffsets && heroHeightProp) {
          let activeSectionId = 'inicio';
          const entries = Object.entries(sectionOffsets);
          const foundEntry = [...entries]
            .reverse()
            .find(([, sectionOffset]) => value >= sectionOffset - 60);

          if (foundEntry) {
            [activeSectionId] = foundEntry;
          }
          onActiveSectionChange(activeSectionId);
        }
      });

      return (): void => {
        scrollY.removeListener(listenerId);
      };
    }, [
      maybeAutoUnmuteFromScroll,
      scrollY,
      syncTopZoneState,
      onActiveSectionChange,
      sectionOffsets,
      heroHeightProp,
    ]);

    const handleScroll = useMemo(
      () =>
        Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: (event: { nativeEvent: { contentOffset: { y: number } } }): void => {
            const scrollOffset = event?.nativeEvent?.contentOffset?.y;
            if (typeof scrollOffset === 'number') {
              maybeAutoUnmuteFromScroll(scrollOffset);
              syncTopZoneState(scrollOffset);
            }
          },
        }),
      [maybeAutoUnmuteFromScroll, scrollY, syncTopZoneState]
    );

    const heroHeight = Math.max(screenHeight * 1.05, 740);
    const cardStartWidth = Math.min(screenWidth * 0.56, 700);
    const isDesktopView = screenWidth >= 720;
    const isCompactDesktop = isDesktopView && screenWidth < 1280;
    const heroWordmarkHeight = isDesktopView
      ? Math.min(
          Math.max(screenWidth * 0.023, isCompactDesktop ? 35 : 43),
          isCompactDesktop ? 54 : 64
        )
      : Math.min(Math.max(screenWidth * 0.04, 30), 47);
    const heroWordmarkWidth = Math.round(heroWordmarkHeight * 2.68);
    const pillBgColor = isDark ? 'rgba(11,90,95,0.08)' : 'rgba(201,239,234,0.08)';
    const pillBorderColor = isDark ? 'rgba(28,203,161,0.04)' : 'rgba(10,92,97,0.02)';
    const pillGlassTint = isDark ? 'dark' : 'light';
    const headerNavLinkColor = isDark ? 'rgba(255,255,255,0.82)' : '#215b60';
    const headerNavLinkActiveColor = isDark ? '#ffffff' : '#073f45';
    const headerNavLinkActiveBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.76)';
    const headerNavLinkHoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,92,97,0.08)';
    const headerNavDividerColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(7,92,97,0.18)';
    const headerNavSettingsBg = isDark ? 'rgba(5, 16, 18, 0.72)' : 'rgba(11,90,95,0.92)';
    const headerNavSettingsBgHover = isDark ? 'rgba(5, 16, 18, 0.82)' : 'rgba(7,76,81,0.96)';
    const headerNavPillPaddingHorizontal = isCompactDesktop ? 8 : 10;
    const headerNavPillPaddingVertical = isCompactDesktop ? 8 : 10;
    const headerNavPillGap = isCompactDesktop ? 4 : 6;
    const headerNavPillItemPaddingHorizontal = isCompactDesktop ? 13 : 16;
    const headerNavPillItemPaddingVertical = isCompactDesktop ? 8 : 10;
    const headerNavCtaPaddingHorizontal = isCompactDesktop ? 18 : 20;
    const headerNavCtaPaddingVertical = isCompactDesktop ? 8 : 9;
    const headerNavCtaFontSize = isCompactDesktop ? 13 : 14;

    useEffect(() => {
      if (!showCta || isMobile || isCompactDesktop) {
        setHeaderNavSettingsMenuVisible(false);
      }
    }, [isCompactDesktop, isMobile, showCta]);

    const heroBgOpacity = scrollY.interpolate({
      inputRange: [0, HERO_SOLID_SWAP_SCROLL],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    const heroSolidFadeOpacity = scrollY.interpolate({
      inputRange: [0, HERO_SOLID_SWAP_SCROLL],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    const bgScale = scrollY.interpolate({
      inputRange: [0, HERO_EXPANSION_RANGE],
      outputRange: [1, 1.08],
      extrapolate: 'clamp',
    });
    const shadeStartOpacity = isDark ? 0.42 : 0.24;
    const shadeEndOpacity = isDark ? 0.02 : 0;
    const shadeOpacity = scrollY.interpolate({
      inputRange: [0, HERO_SOLID_SWAP_SCROLL],
      outputRange: [shadeStartOpacity, shadeEndOpacity],
      extrapolate: 'clamp',
    });
    const footerOpacity = scrollY.interpolate({
      inputRange: [0, HERO_EXPANSION_RANGE * 0.65],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    const footerTranslateY = scrollY.interpolate({
      inputRange: [0, HERO_EXPANSION_RANGE * 0.7],
      outputRange: [0, 24],
      extrapolate: 'clamp',
    });
    const contentOpacity = scrollY.interpolate({
      inputRange: [0, 120],
      outputRange: [0.94, 1],
      extrapolate: 'clamp',
    });
    const contentTranslateY = scrollY.interpolate({
      inputRange: [0, 120],
      outputRange: [10, 0],
      extrapolate: 'clamp',
    });
    const mediaTagOpacity = scrollY.interpolate({
      inputRange: [0, 28, 72],
      outputRange: [1, 0.72, 0],
      extrapolate: 'clamp',
    });
    const mediaTagTranslateY = scrollY.interpolate({
      inputRange: [0, 72],
      outputRange: [0, 18],
      extrapolate: 'clamp',
    });
    const palette = isDark
      ? {
          pageBg: '#050510',
          contentCard: '#0d0d1f',
          contentBorder: 'rgba(255,255,255,0.1)',
          textPrimary: '#e8e8ff',
          textSecondary: 'rgba(232,232,255,0.7)',
          textMuted: 'rgba(232,232,255,0.74)',
          accent: '#1ccba1',
          mutedButtonBg: 'rgba(255,255,255,0.03)',
          mutedButtonBorder: 'rgba(255,255,255,0.16)',
        }
      : {
          pageBg: '#f6f8fc',
          contentCard: '#ffffff',
          contentBorder: 'rgba(15,23,42,0.12)',
          textPrimary: '#0f172a',
          textSecondary: '#64748b',
          textMuted: '#334155',
          accent: '#0f766e',
          mutedButtonBg: 'rgba(15,23,42,0.03)',
          mutedButtonBorder: 'rgba(15,23,42,0.16)',
        };

    const heroWordmarkSource = isDesktopView
      ? isDark
        ? AIRS_LOGO_LIGHT_2X
        : AIRS_LOGO_DARK_2X
      : isDark
      ? AIRS_LOGO_LIGHT
      : AIRS_LOGO_DARK;
    const heroCopyTop = isMobile
      ? Math.min(heroHeight * 0.29, 240)
      : Math.min(heroHeight * 0.34, 330);
    const heroCopyMaxWidth = isMobile
      ? Math.min(screenWidth - 48, 620)
      : Math.min(screenWidth * 0.82, 1080);
    const heroHeadlineSize = Math.min(Math.max(screenWidth * 0.05, 34), 68);
    const heroHeadlineLineHeight = heroHeadlineSize * 1.04;
    const heroKickerSize = isMobile
      ? Math.min(Math.max(screenWidth * 0.036, 20), 32)
      : Math.min(Math.max(screenWidth * 0.03, 26), 42);
    const heroKickerLineHeight = heroKickerSize * 1.02;
    const heroButtonWidth = isMobile ? '100%' : Math.min(screenWidth * 0.28, 360);
    const heroButtonFontSize = Math.min(Math.max(screenWidth * 0.023, 18), 24);
    const heroFooterTextColor = isDark ? 'rgba(248,251,255,0.96)' : '#020617';
    const heroFooterShadowColor = isDark ? 'rgba(0,0,0,0.28)' : 'transparent';
    const closeProfileMenu = (): void => {
      setProfileMenuVisible(false);
      setSettingsExpanded(false);
    };

    const closeHeaderNavSettingsMenu = (): void => {
      setHeaderNavSettingsMenuVisible(false);
    };

    const headerBarOpacity = scrollY.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    const blurTint = isDark ? 'dark' : 'light';
    const blurHeaderGradientId = React.useId().replace(/[:]/g, '');
    const headerBarGlassColor = isDark ? '#050510' : '#f6f8fc';

    return (
      <View style={[styles.page, { backgroundColor: palette.pageBg }]}>
        {/* Progressive blur header — smooth glass effect that fades in on scroll */}
        <Animated.View
          pointerEvents='none'
          style={[styles.progressiveBlurHeader, { opacity: headerBarOpacity }]}
        >
          {/* Blur layer with a feathered glass fade at the bottom edge */}
          <BlurView intensity={85} tint={blurTint} style={StyleSheet.absoluteFillObject} />
          <Svg
            pointerEvents='none'
            style={StyleSheet.absoluteFillObject}
            width='100%'
            height='100%'
            viewBox='0 0 100 100'
            preserveAspectRatio='none'
          >
            <Defs>
              <LinearGradient id={blurHeaderGradientId} x1='0' y1='0' x2='0' y2='1'>
                <Stop offset='0%' stopColor={headerBarGlassColor} stopOpacity='0.94' />
                <Stop offset='56%' stopColor={headerBarGlassColor} stopOpacity='0.68' />
                <Stop offset='84%' stopColor={headerBarGlassColor} stopOpacity='0.24' />
                <Stop offset='100%' stopColor={headerBarGlassColor} stopOpacity='0' />
              </LinearGradient>
            </Defs>
            <Rect x='0' y='0' width='100' height='100' fill={`url(#${blurHeaderGradientId})`} />
          </Svg>
        </Animated.View>

        {headerNavSettingsMenuVisible || headerNavMobileMenuVisible ? (
          <Pressable
            style={styles.floatingBackdrop}
            onPress={() => {
              if (headerNavSettingsMenuVisible) {
                closeHeaderNavSettingsMenu();
              }
              if (headerNavMobileMenuVisible) {
                setHeaderNavMobileMenuVisible(false);
                setSettingsExpanded(false);
              }
            }}
          />
        ) : null}

        <View pointerEvents='none' style={styles.floatingLeftTop}>
          <View style={styles.heroBrandRow}>
            <View style={styles.heroBrandTextBlock}>
              <ExpoImage
                source={heroWordmarkSource}
                style={{ width: heroWordmarkWidth, height: heroWordmarkHeight }}
                contentFit='contain'
              />
            </View>
          </View>
        </View>

        {/* Header nav — logged-out pill or logged-in clean nav */}
        {headerNavLinks &&
          headerNavLinks.length > 0 &&
          (showCta ? (
            /* Logged-out: pill with nav links on wide desktop, avatar dropdown elsewhere */
            <>
              {isMobile || isCompactDesktop ? (
                <View
                  style={
                    isMobile ? styles.headerNavMobileContainer : styles.headerNavDesktopWrapper
                  }
                  pointerEvents='box-none'
                >
                  <TouchableOpacity
                    onPress={() => setHeaderNavMobileMenuVisible((v) => !v)}
                    activeOpacity={0.7}
                    style={[
                      isMobile
                        ? styles.headerNavMobileAvatarTrigger
                        : styles.headerNavDesktopAvatarTrigger,
                      {
                        backgroundColor: pillBgColor,
                        ...(isMobile
                          ? {}
                          : {
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              minHeight: 38,
                            }),
                      },
                    ]}
                  >
                    <View
                      style={[
                        isMobile
                          ? styles.headerNavMobileAvatarCircle
                          : styles.headerNavDesktopAvatarCircle,
                        {
                          backgroundColor: 'rgba(28,203,161,0.18)',
                          borderWidth: 1.5,
                          borderColor: 'rgba(28,203,161,0.4)',
                        },
                      ]}
                    >
                      <User size={isMobile ? 20 : 16} color='#ffffff' strokeWidth={2.5} />
                    </View>
                    {!isMobile ? <ChevronDown size={14} color='#ffffff' /> : null}
                  </TouchableOpacity>

                  {headerNavMobileMenuVisible && (
                    <Animated.View
                      style={[
                        styles.floatingMenu,
                        isMobile
                          ? styles.headerNavMobileDropdown
                          : styles.headerNavDesktopAvatarDropdown,
                        {
                          backgroundColor: palette.contentCard,
                          borderColor: palette.contentBorder,
                        },
                        !isMobile && { paddingHorizontal: 8, paddingVertical: 8 },
                        {
                          opacity: headerNavMobileMenuAnim,
                          transform: [
                            {
                              scale: headerNavMobileMenuAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1],
                              }),
                            },
                            {
                              translateY: headerNavMobileMenuAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-10, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                      pointerEvents='auto'
                    >
                      {/* Nav links to scroll to sections */}
                      {headerNavLinks.map((link) => (
                        <TouchableOpacity
                          key={link.id}
                          onPress={() => {
                            setHeaderNavMobileMenuVisible(false);
                            link.onPress();
                          }}
                          activeOpacity={0.7}
                          style={styles.headerNavMobileItem}
                        >
                          <Text
                            style={[
                              styles.headerNavMobileText,
                              {
                                color: link.isActive ? palette.accent : palette.textPrimary,
                                fontFamily: link.isActive
                                  ? `${SCULPIN_FONT_FAMILY}-Bold`
                                  : `${SCULPIN_FONT_FAMILY}-Medium`,
                              },
                            ]}
                          >
                            {link.label}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      <View
                        style={[
                          styles.headerNavMobileDivider,
                          { backgroundColor: palette.contentBorder },
                        ]}
                      />

                      <TouchableOpacity
                        style={[
                          styles.floatingMenuItem,
                          { backgroundColor: palette.mutedButtonBg },
                        ]}
                        onPress={() => {
                          setHeaderNavMobileMenuVisible(false);
                          onSignIn();
                        }}
                        activeOpacity={0.82}
                      >
                        <LogIn size={14} color={palette.textPrimary} />
                        <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>
                          {t('labels.signIn')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.floatingMenuItem,
                          { backgroundColor: palette.mutedButtonBg },
                        ]}
                        onPress={() => setSettingsExpanded((prev) => !prev)}
                        activeOpacity={0.82}
                      >
                        <SettingsIcon size={14} color={palette.textPrimary} />
                        <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>
                          {t('labels.settings')}
                        </Text>
                        <View style={styles.floatingMenuItemRight}>
                          {settingsExpanded ? (
                            <ChevronDown size={14} color={palette.textPrimary} />
                          ) : (
                            <ChevronRight size={14} color={palette.textPrimary} />
                          )}
                        </View>
                      </TouchableOpacity>

                      <AnimatedCollapsibleContent expanded={settingsExpanded}>
                        <AirsIntroSettingsMenu palette={palette} />
                      </AnimatedCollapsibleContent>
                    </Animated.View>
                  )}
                </View>
              ) : (
                /* Desktop: one integrated pill with nav links + sign-in + settings */
                <View style={styles.headerNavDesktopWrapper} pointerEvents='box-none'>
                  <Animated.View
                    style={[
                      styles.headerNavPill,
                      {
                        backgroundColor: pillBgColor,
                        borderColor: pillBorderColor,
                        paddingHorizontal: headerNavPillPaddingHorizontal,
                        paddingVertical: headerNavPillPaddingVertical,
                        gap: headerNavPillGap,
                      },
                    ]}
                  >
                    <BlurView
                      intensity={isDark ? 32 : 26}
                      tint={pillGlassTint}
                      style={styles.headerNavPillBlur}
                    />
                    <View
                      style={[
                        styles.headerNavPillTint,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(255,255,255,0.12)',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.headerNavPillHighlight,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(255,255,255,0.42)',
                        },
                      ]}
                    />
                    <View style={styles.headerNavPillContent}>
                      <View style={styles.headerNavLinkGroup}>
                        {headerNavLinks.map((link) => (
                          <Pressable
                            key={link.id}
                            onPress={() => {
                              closeHeaderNavSettingsMenu();
                              link.onPress();
                            }}
                            style={({ hovered, pressed }) => [
                              styles.headerNavPillItem,
                              {
                                paddingHorizontal: headerNavPillItemPaddingHorizontal,
                                paddingVertical: headerNavPillItemPaddingVertical,
                                backgroundColor: link.isActive
                                  ? headerNavLinkActiveBg
                                  : hovered
                                  ? headerNavLinkHoverBg
                                  : 'transparent',
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.headerNavPillText,
                                {
                                  color: link.isActive
                                    ? headerNavLinkActiveColor
                                    : headerNavLinkColor,
                                  fontFamily: link.isActive
                                    ? `${SCULPIN_FONT_FAMILY}-Bold`
                                    : `${SCULPIN_FONT_FAMILY}-Medium`,
                                },
                              ]}
                            >
                              {link.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <View
                        style={[
                          styles.headerNavActionDivider,
                          { backgroundColor: headerNavDividerColor },
                        ]}
                      />

                      <View style={styles.headerNavActionCluster}>
                        <Pressable
                          onPress={() => {
                            closeHeaderNavSettingsMenu();
                            onSignIn();
                          }}
                          style={({ hovered, pressed }) => [
                            styles.headerNavCtaButton,
                            {
                              backgroundColor: hovered ? '#38e9bf' : '#1ee6b5',
                              minHeight: isCompactDesktop ? 38 : 42,
                              paddingHorizontal: headerNavCtaPaddingHorizontal,
                              paddingVertical: headerNavCtaPaddingVertical,
                              opacity: pressed ? 0.92 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.headerNavCtaText,
                              { color: '#07333b', fontSize: headerNavCtaFontSize },
                            ]}
                          >
                            {t('landing.nav.signInCta')}
                          </Text>
                        </Pressable>

                        <View style={styles.headerNavSettingsWrap} pointerEvents='box-none'>
                          <Pressable
                            onPress={() => setHeaderNavSettingsMenuVisible((visible) => !visible)}
                            style={({ hovered, pressed }) => [
                              styles.headerNavSettingsButton,
                              {
                                backgroundColor: hovered
                                  ? headerNavSettingsBgHover
                                  : headerNavSettingsBg,
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.headerNavSettingsButtonTint,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(11,90,95,0.16)'
                                    : 'rgba(255,255,255,0.1)',
                                },
                              ]}
                            />
                            <SettingsIcon size={17} color='#f7fffd' strokeWidth={2.1} />
                          </Pressable>

                          <AnimatedCollapsibleContent
                            expanded={headerNavSettingsMenuVisible}
                            style={[
                              styles.headerNavSettingsDropdown,
                              {
                                backgroundColor: palette.contentCard,
                                borderColor: palette.contentBorder,
                              },
                            ]}
                          >
                            <AirsIntroSettingsMenu
                              palette={palette}
                              onOpenSettings={
                                _onOpenSettings
                                  ? (): void => {
                                      closeHeaderNavSettingsMenu();
                                      _onOpenSettings();
                                    }
                                  : undefined
                              }
                            />
                          </AnimatedCollapsibleContent>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              )}
            </>
          ) : (
            /* Logged-in: clean nav links with underline + avatar */
            <View style={styles.headerNavLoggedInContainer}>
              <View style={styles.headerNavLinksRow}>
                {headerNavLinks.map((link) => (
                  <TouchableOpacity
                    key={link.id}
                    onPress={link.onPress}
                    activeOpacity={0.65}
                    style={styles.headerNavLinkWrap}
                  >
                    <Text
                      style={[
                        styles.headerNavLinkText,
                        {
                          color: link.isActive
                            ? accentColorProp ?? palette.accent
                            : palette.textSecondary,
                          fontFamily: link.isActive
                            ? `${SCULPIN_FONT_FAMILY}-Bold`
                            : `${SCULPIN_FONT_FAMILY}-Medium`,
                        },
                      ]}
                    >
                      {link.label}
                    </Text>
                    {link.isActive && (
                      <View
                        style={[
                          styles.headerNavLinkUnderline,
                          { backgroundColor: accentColorProp ?? palette.accent },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Avatar dropdown trigger */}
              <TouchableOpacity
                style={[
                  styles.headerAvatarTrigger,
                  { backgroundColor: palette.contentCard, borderColor: palette.contentBorder },
                ]}
                activeOpacity={0.86}
                onPress={() => setProfileMenuVisible((prev) => !prev)}
              >
                <View style={[styles.headerAvatar, { backgroundColor: `${palette.accent}22` }]}>
                  <Text style={[styles.headerAvatarText, { color: palette.accent }]}>U</Text>
                </View>
                {profileMenuVisible ? (
                  <ChevronUp size={14} color={palette.textPrimary} />
                ) : (
                  <ChevronDown size={14} color={palette.textPrimary} />
                )}
              </TouchableOpacity>
            </View>
          ))}

        {/* Profile dropdown menu (logged-in state) */}
        {!showCta && profileMenuVisible && (
          <View style={styles.headerDropdownContainer}>
            <View
              style={[
                styles.floatingMenu,
                { backgroundColor: palette.contentCard, borderColor: palette.contentBorder },
              ]}
            >
              <TouchableOpacity
                style={[styles.floatingMenuItem, { backgroundColor: palette.mutedButtonBg }]}
                onPress={() => {
                  setProfileMenuVisible(false);
                  setSettingsExpanded(false);
                  onSignIn();
                }}
                activeOpacity={0.82}
              >
                <LogIn size={14} color={palette.textPrimary} />
                <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>
                  {t('labels.signIn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.floatingMenuItem, { backgroundColor: palette.mutedButtonBg }]}
                onPress={() => setSettingsExpanded((prev) => !prev)}
                activeOpacity={0.82}
              >
                <SettingsIcon size={14} color={palette.textPrimary} />
                <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>
                  {t('labels.settings')}
                </Text>
                <View style={styles.floatingMenuItemRight}>
                  {settingsExpanded ? (
                    <ChevronDown size={13} color={palette.textMuted} />
                  ) : (
                    <ChevronRight size={13} color={palette.textMuted} />
                  )}
                </View>
              </TouchableOpacity>

              <AnimatedCollapsibleContent expanded={settingsExpanded}>
                <AirsIntroSettingsMenu palette={palette} />
              </AnimatedCollapsibleContent>
            </View>
          </View>
        )}

        {!showCta && profileMenuVisible && (
          <Pressable
            style={styles.floatingBackdrop}
            onPress={() => {
              setProfileMenuVisible(false);
              setSettingsExpanded(false);
            }}
          />
        )}

        {!showCta && (
          <View style={styles.floatingRightTop}>
            <TouchableOpacity
              style={[
                styles.floatingProfileTrigger,
                { backgroundColor: palette.contentCard, borderColor: palette.contentBorder },
              ]}
              activeOpacity={0.86}
              onPress={() => setProfileMenuVisible((prev) => !prev)}
            >
              <View style={[styles.floatingAvatar, { backgroundColor: `${palette.accent}22` }]}>
                <Text style={[styles.floatingAvatarText, { color: palette.accent }]}>U</Text>
              </View>
              <ChevronDown size={14} color={palette.textPrimary} />
            </TouchableOpacity>

            {profileMenuVisible ? (
              <View
                style={[
                  styles.floatingMenu,
                  { backgroundColor: palette.contentCard, borderColor: palette.contentBorder },
                ]}
              >
                <TouchableOpacity
                  style={[styles.floatingMenuItem, { backgroundColor: palette.mutedButtonBg }]}
                  onPress={() => {
                    closeProfileMenu();
                    onSignIn();
                  }}
                  activeOpacity={0.82}
                >
                  <LogIn size={14} color={palette.textPrimary} />
                  <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>
                    {t('labels.signIn')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.floatingMenuItem, { backgroundColor: palette.mutedButtonBg }]}
                  onPress={() => setSettingsExpanded((prev) => !prev)}
                  activeOpacity={0.82}
                >
                  <SettingsIcon size={14} color={palette.textPrimary} />
                  <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>
                    {t('labels.settings')}
                  </Text>
                  <View style={styles.floatingMenuItemRight}>
                    {settingsExpanded ? (
                      <ChevronDown size={13} color={palette.textMuted} />
                    ) : (
                      <ChevronRight size={13} color={palette.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>

                <AnimatedCollapsibleContent expanded={settingsExpanded}>
                  <AirsIntroSettingsMenu palette={palette} />
                </AnimatedCollapsibleContent>
              </View>
            ) : null}
          </View>
        )}

        {profileMenuVisible ? (
          <Pressable style={styles.floatingBackdrop} onPress={closeProfileMenu} />
        ) : null}

        <Animated.ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          contentContainerStyle={styles.scrollContent}
        >
          <View
            style={[styles.heroSection, { height: heroHeight, backgroundColor: palette.pageBg }]}
          >
            <Animated.View
              pointerEvents='none'
              style={[
                styles.heroBackground,
                { opacity: heroBgOpacity, transform: [{ scale: bgScale }] },
              ]}
            >
              <HeroVideoNative videoSource={heroVideoSource} />
            </Animated.View>
            <Animated.View
              style={[
                styles.heroSolidFadeLayer,
                { backgroundColor: palette.pageBg, opacity: heroSolidFadeOpacity },
              ]}
            />
            <Animated.View style={[styles.heroShade, { opacity: shadeOpacity }]} />

            {showCta ? (
              <Animated.View
                pointerEvents='box-none'
                style={[
                  styles.heroCopyOverlay,
                  {
                    top: heroCopyTop,
                    opacity: mediaTagOpacity,
                    transform: [{ translateY: mediaTagTranslateY }],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.heroCopyKicker,
                    {
                      color: 'rgba(245, 227, 162, 0.96)',
                      fontSize: heroKickerSize,
                      lineHeight: heroKickerLineHeight,
                    },
                  ]}
                >
                  {t('landing.media.title')}
                </Text>
                <Text
                  style={[
                    styles.heroCopyHeadline,
                    {
                      color: '#ffffff',
                      maxWidth: heroCopyMaxWidth,
                      fontSize: heroHeadlineSize,
                      lineHeight: heroHeadlineLineHeight,
                    },
                  ]}
                >
                  {t('landing.media.subtitle')}
                </Text>
                <View style={[styles.heroCopyActions, isMobile && styles.heroCopyActionsStacked]}>
                  <HeroGlassButton
                    onPress={() => onHeroNavigate?.('como-funciona')}
                    label={t('landing.nav.howItWorks')}
                    width={heroButtonWidth}
                    fontSize={heroButtonFontSize}
                    isDark={isDark}
                  />
                  <HeroGlassButton
                    onPress={onSignIn}
                    label={t('landing.nav.joinNow')}
                    width={heroButtonWidth}
                    fontSize={heroButtonFontSize}
                    isDark={isDark}
                  />
                </View>
              </Animated.View>
            ) : null}

            <Animated.View
              style={[
                styles.heroFooter,
                { opacity: footerOpacity, transform: [{ translateY: footerTranslateY }] },
              ]}
            >
              <View style={styles.heroMetaLeftBlock}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode='tail'
                  style={[
                    styles.heroMetaLeft,
                    { color: heroFooterTextColor, textShadowColor: heroFooterShadowColor },
                  ]}
                >
                  {t('landing.hero.presentedBy')}
                </Text>
              </View>
              <Text
                style={[
                  styles.heroMetaRight,
                  { color: heroFooterTextColor, textShadowColor: heroFooterShadowColor },
                ]}
              >
                {t('landing.hero.scrollToInteract')}
              </Text>
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.contentCard,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              },
              !isMobile && {
                maxWidth: Math.min(cardStartWidth + 40, 760),
                alignSelf: 'center',
                width: '100%',
              },
            ]}
          >
            <View style={styles.contentTitleWrap}>
              <ExpoImage
                source={heroWordmarkSource}
                style={styles.contentTitleLogo}
                contentFit='contain'
              />
            </View>
            <Text style={[styles.contentText, { color: palette.textMuted }]}>
              {t('landing.info.scoreLine')}
            </Text>
            <Text style={[styles.contentText, { color: palette.textMuted }]}>
              {t('landing.info.summaryLine')}
            </Text>
            <View style={styles.minimalActions}>
              <TouchableOpacity activeOpacity={0.75} onPress={() => onContinueToDashboard(false)}>
                <Text style={[styles.linkAction, { color: palette.accent }]}>
                  {t('landing.actions.goToDashboard')}
                </Text>
              </TouchableOpacity>
              {onHeroNavigate && (
                <>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => onHeroNavigate('como-funciona')}
                  >
                    <Text style={[styles.linkAction, { color: palette.accent }]}>
                      {t('landing.nav.howItWorks')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => onHeroNavigate('beneficios')}
                  >
                    <Text style={[styles.linkAction, { color: palette.accent }]}>
                      {t('landing.nav.benefits')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>

          {extraSections}

          <LandingFooter />
        </Animated.ScrollView>

        {/* Back to top button */}
        <BackToTopButton
          visible={showBackToTop}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          isDark={isDark}
          isMobile={isMobile}
        />
      </View>
    );
  }
);

AirsIntroExperience.displayName = 'AirsIntroExperience';

export default AirsIntroExperience;

const styles = createTypographyStyles({
  page: {
    flex: 1,
  },
  floatingLeftTop: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 81,
    maxWidth: '72%',
  },
  floatingRightTop: {
    position: 'absolute',
    top: 18,
    right: 24,
    zIndex: 80,
    alignItems: 'flex-end',
  },
  floatingBackdrop: {
    // Keep the dismiss layer behind the menu so web clicks reach the items.
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  floatingProfileTrigger: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  floatingAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAvatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  floatingMenu: {
    marginTop: 8,
    width: 220,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 6,
    boxShadow: '0px 6px 16px 0px rgba(0, 0, 0, 0.24)',
  },
  floatingMenuItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingMenuText: {
    fontSize: 12,
    fontWeight: '700',
  },
  floatingMenuItemRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 34,
  },
  heroSection: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  heroVideoElement: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#050510',
  },
  heroVideoWebView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  heroSolidFadeLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 6, 24, 0.3)',
  },
  heroTopCopy: {
    position: 'absolute',
    left: 24,
    top: 24,
    right: 24,
    gap: 4,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  heroBrandTextBlock: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 0,
  },
  heroBrandByline: {
    marginTop: 0,
    fontWeight: '700',
    letterSpacing: 0.12,
  },
  heroBrandBylineRow: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  heroBrandBylineLogo: {
    borderRadius: 999,
    opacity: 0.98,
    marginTop: 1,
  },
  heroMediaStage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroFooter: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 3,
  },
  heroMetaLeftBlock: {
    gap: 2,
    flexShrink: 1,
    paddingRight: 10,
  },
  heroMetaLeft: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Medium`,
    color: 'rgba(248,251,255,0.96)',
    fontSize: 17,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMetaRight: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Medium`,
    color: 'rgba(248,251,255,0.98)',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mediaTagTitleOverlay: {
    position: 'absolute',
    top: '50%',
    zIndex: 6,
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTagPillOverlay: {
    position: 'absolute',
    top: '50%',
    zIndex: 7,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTagPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTagSubtitleOverlay: {
    position: 'absolute',
    top: '50%',
    zIndex: 6,
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTagTitle: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Medium`,
    color: 'rgba(245, 227, 162, 0.96)',
    letterSpacing: 0.35,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    width: '100%',
  },
  mediaTagSubtitle: {
    color: 'rgba(245,250,255,0.95)',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    letterSpacing: 0.1,
    marginTop: 0,
    width: '100%',
  },
  contentCard: {
    marginHorizontal: 20,
    marginTop: 18,
    paddingHorizontal: 2,
    paddingVertical: 0,
    gap: 6,
  },
  contentTitleWrap: {
    minHeight: 32,
    justifyContent: 'center',
  },
  contentTitleLogo: {
    width: 92,
    height: 32,
  },
  contentText: {
    fontSize: 12,
    lineHeight: 18,
  },
  minimalActions: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  linkAction: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ── Progressive blur header bar ──────────────────────────────────────────
  progressiveBlurHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 40,
    overflow: 'hidden',
  },

  // ── Logged-out: mobile dropdown nav ───────────────────────────────────────
  headerNavMobileContainer: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 50,
  },
  headerNavMobileAvatarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  headerNavMobileAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,203,161,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(28,203,161,0.4)',
  },
  headerNavMobileTrigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headerNavMobileDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  headerNavMobileItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerNavMobileText: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Medium`,
    fontSize: 15,
  },
  headerNavMobileDivider: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: 12,
  },
  headerNavMobileCta: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  headerNavMobileCtaText: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Bold`,
    fontSize: 13,
  },

  // ── Logged-out: desktop pill with nav links + CTA ─────────────────────────
  headerNavDesktopWrapper: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 50,
  },
  headerNavDesktopAvatarWrap: {
    position: 'relative',
    marginLeft: 4,
  },
  headerNavDesktopAvatarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerNavDesktopAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNavDesktopAvatarDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  // ── Logged-out: pill nav container ────────────────────────────────────────
  headerNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  headerNavPillBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  headerNavPillTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  headerNavPillHighlight: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 1,
    height: 1,
    borderRadius: 999,
    opacity: 0.85,
  },
  headerNavPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    zIndex: 1,
  },
  headerNavLinkGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerNavPillItem: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
  },
  headerNavPillText: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Medium`,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  headerNavActionDivider: {
    width: 1,
    alignSelf: 'stretch',
    borderRadius: 999,
    marginVertical: 6,
  },
  headerNavActionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerNavCtaButton: {
    minHeight: 42,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNavCtaText: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Bold`,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  headerNavSettingsWrap: {
    position: 'relative',
    zIndex: 4,
  },
  headerNavSettingsButton: {
    position: 'relative',
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  headerNavSettingsButtonTint: {
    ...StyleSheet.absoluteFillObject,
  },
  headerNavSettingsDropdown: {
    position: 'absolute',
    top: 58,
    right: 0,
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 14,
    zIndex: 60,
  },

  // ── Logged-in: clean nav + avatar ─────────────────────────────────────────
  headerNavLoggedInContainer: {
    position: 'absolute',
    top: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    zIndex: 50,
  },
  headerNavLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  headerNavLinkWrap: {
    alignItems: 'center',
    gap: 4,
  },
  headerNavLinkText: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Medium`,
    fontSize: 15,
    letterSpacing: 0.1,
  },
  headerNavLinkUnderline: {
    height: 2.5,
    width: '100%',
    borderRadius: 1.5,
    marginTop: 2,
  },
  headerAvatarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 44,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerDropdownContainer: {
    position: 'absolute',
    top: 68,
    right: 24,
    zIndex: 55,
    minWidth: 200,
  },
  heroCopyOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 5,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  heroCopyKicker: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Regular`,
    letterSpacing: 0.08,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroCopyHeadline: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Black`,
    textAlign: 'center',
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginTop: 12,
  },
  heroCopyActions: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  heroCopyActionsStacked: {
    flexDirection: 'column',
    gap: 14,
    width: '100%',
  },
  heroGlassButton: {
    minHeight: 78,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroGlassBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  heroGlassTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  heroGlassHighlight: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 1,
    height: 1,
    borderRadius: 999,
    opacity: 0.85,
  },
  heroCopyButtonText: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Bold`,
    letterSpacing: 0.15,
    textAlign: 'center',
  },
});

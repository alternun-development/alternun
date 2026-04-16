/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/explicit-function-return-type */
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
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { createTypographyStyles } from '../theme/typography';
import { Image as ExpoImage } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
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
import AirsBrandMark from '../branding/AirsBrandMark';
import LandingFooter from '../common/LandingFooter';
import AnimatedCollapsibleContent from '../common/AnimatedCollapsibleContent';
import { BackToTopButton } from '../common/BackToTopButton';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { getAirsIntroVideoUrl } from './airsIntroVideoSource';
import AirsIntroSettingsMenu from './AirsIntroSettingsMenu';
import AirsIntroVideoCard from './AirsIntroVideoCard';
import { useAppPreferences } from '../settings/AppPreferencesProvider';

const AIRS_BG_LIGHT_SRC =
  'https://me7aitdbxq.ufs.sh/f/2wsMIGDMQRdYMNjMlBUYHaeYpxduXPVNwf8mnFA61L7rkcoS';
const HERO_EXPANSION_RANGE = 420;
const HERO_SOLID_SWAP_SCROLL = 180;
const AUTO_UNMUTE_SCROLL_Y = 88;
const TOP_PAUSE_SCROLL_Y = 6;

const AIRS_LOGOTIPO_DARK = require('../../assets/AIRS-logotipo-dark.svg');
const AIRS_LOGOTIPO_LIGHT = require('../../assets/AIRS-logotipo-light.svg');
const ALTERNUN_POWERED_BY_LOGO = require('../../assets/logo.png');
const ALTERNUN_PILL_LOGO_LIGHT = require('../../assets/alternun-black.svg');
const ALTERNUN_PILL_LOGO_DARK = require('../../assets/alternun-white.svg');
// const AIRS_BG_DARK = require('../../assets/images/water_falls-alternun-digital-forge.png'); //TODO CRAFT a same resolutions BG imagen
const AIRS_BG_DARK = 'https://me7aitdbxq.ufs.sh/f/2wsMIGDMQRdYMNjMlBUYHaeYpxduXPVNwf8mnFA61L7rkcoS';

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
    const scrollRef = useRef<any>(null);

    // Expose scroll method via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollToSection: (offset: number) => {
          if (scrollRef.current?.scrollTo) {
            scrollRef.current.scrollTo({ y: Math.max(0, offset - 60), animated: true });
          } else if (scrollRef.current?.getNode?.()?.scrollTo) {
            scrollRef.current.getNode().scrollTo({ y: Math.max(0, offset - 60), animated: true });
          }
        },
      }),
      []
    );

    const { themeMode, language } = useAppPreferences();
    const { t } = useAppTranslation('mobile');
    const isDark = isDarkProp ?? themeMode === 'dark';
    const [profileMenuVisible, setProfileMenuVisible] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [hasManualAudioChoice, setHasManualAudioChoice] = useState(false);
    const [hasAutoUnmuted, setHasAutoUnmuted] = useState(false);
    const [hasScrollActivatedPlayback, setHasScrollActivatedPlayback] = useState(false);
    const [isInTopZone, setIsInTopZone] = useState(true);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const isScreenFocused = useIsFocused();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isMobile = screenWidth < 720;
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
    const videoUri = useMemo(() => getAirsIntroVideoUrl(language), [language]);

    useEffect(() => {
      setIsMuted(true);
      setIsVideoPlaying(false);
      setHasManualAudioChoice(false);
      setHasAutoUnmuted(false);
      setHasScrollActivatedPlayback(false);
      setIsInTopZone(true);
      isInTopZoneRef.current = true;
      hasScrollActivatedPlaybackRef.current = false;
    }, [language]);

    useEffect(() => {
      isMutedRef.current = isMuted;
      hasManualAudioChoiceRef.current = hasManualAudioChoice;
      hasAutoUnmutedRef.current = hasAutoUnmuted;
      hasScrollActivatedPlaybackRef.current = hasScrollActivatedPlayback;
    }, [hasAutoUnmuted, hasManualAudioChoice, hasScrollActivatedPlayback, isMuted]);

    const syncTopZoneState = useCallback((scrollOffset: number) => {
      const atTop = scrollOffset <= TOP_PAUSE_SCROLL_Y;
      if (isInTopZoneRef.current === atTop) {
        if (!hasScrollActivatedPlaybackRef.current && scrollOffset > TOP_PAUSE_SCROLL_Y) {
          hasScrollActivatedPlaybackRef.current = true;
          setHasScrollActivatedPlayback(true);
        }
        return;
      }
      isInTopZoneRef.current = atTop;
      setIsInTopZone(atTop);
      if (!hasScrollActivatedPlaybackRef.current && scrollOffset > TOP_PAUSE_SCROLL_Y) {
        hasScrollActivatedPlaybackRef.current = true;
        setHasScrollActivatedPlayback(true);
      }
    }, []);

    const maybeAutoUnmuteFromScroll = useCallback((scrollOffset: number) => {
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
          for (let i = entries.length - 1; i >= 0; i--) {
            const [sectionId, sectionOffset] = entries[i];
            const sectionTop = sectionOffset - 60;
            if (value >= sectionTop) {
              activeSectionId = sectionId;
              break;
            }
          }
          onActiveSectionChange(activeSectionId);
        }
      });

      return () => {
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
          listener: (event: any) => {
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
    const cardEndWidth = Math.min(screenWidth - 24, 1220);
    const videoControlsIconOnly = cardStartWidth < 220;
    const cardStartHeight = Math.max(cardStartWidth * 0.58, 220);
    const cardEndHeight = Math.min(Math.max(screenHeight * 0.72, 360), 760);
    const mediaTagTitleSize = Math.min(Math.max(screenWidth * 0.031, 14), 26);
    const mediaTagTitleLineHeight = mediaTagTitleSize * 1.02;
    const mediaTagSubtitleSize = Math.min(Math.max(screenWidth * 0.056, 20), 52);
    const mediaTagSubtitleLineHeight = mediaTagSubtitleSize * 1.12;
    const mediaTagPillWidth = Math.min(Math.max(screenWidth * 0.34, 150), 300);
    const mediaTagPillHeight = Math.min(Math.max(screenWidth * 0.058, 34), 48);
    const mediaTagPillLogoWidth = mediaTagPillWidth * 0.74;
    const mediaTagPillLogoHeight = mediaTagPillHeight * 0.58;
    const heroBrandSecondaryColor = isDark ? 'rgba(210,255,245,0.9)' : '#0f766e';
    const heroWordmarkHeight = Math.min(Math.max(screenWidth * 0.066, 38), 66);
    const heroWordmarkWidth = Math.round(heroWordmarkHeight * 2.68);
    const heroBylineSize = Math.min(Math.max(screenWidth * 0.016, 10), 15);
    const heroBylineLineHeight = heroBylineSize * 1.03;
    const heroBylineWidth = heroWordmarkWidth * 0.34;
    const heroBylineLogoSize = Math.min(Math.max(screenWidth * 0.022, 12), 18);
    const heroLogoSize = Math.min(Math.max(screenWidth * 0.084, 50), 84);
    const heroBrandMarkFill = isDark ? '#1ee6b5' : '#0b5a5f';
    const heroBrandMarkCutout = isDark ? '#0b5a5f' : '#ffffff';
    const pillBgColor = isDark ? 'rgba(30,230,181,0.85)' : 'rgba(11,90,95,0.85)';

    const cardWidth = scrollY.interpolate({
      inputRange: [0, HERO_EXPANSION_RANGE],
      outputRange: [cardStartWidth, cardEndWidth],
      extrapolate: 'clamp',
    });
    const cardHeight = scrollY.interpolate({
      inputRange: [0, HERO_EXPANSION_RANGE],
      outputRange: [cardStartHeight, cardEndHeight],
      extrapolate: 'clamp',
    });
    const cardTranslateY = scrollY.interpolate({
      inputRange: [0, HERO_EXPANSION_RANGE],
      outputRange: [88, -22],
      extrapolate: 'clamp',
    });
    const heroBgImageOpacity = scrollY.interpolate({
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
    const mediaTagTitleAnchorY = Animated.add(
      Animated.multiply(Animated.divide(cardHeight, 2), -1),
      new Animated.Value(-96)
    );
    const mediaTagSubtitleAnchorY = Animated.add(
      Animated.divide(cardHeight, 2),
      new Animated.Value(26)
    );
    const mediaTagTitleFinalTranslateY = Animated.add(mediaTagTitleAnchorY, mediaTagTranslateY);
    const mediaTagPillFinalTranslateY = Animated.add(
      mediaTagTitleFinalTranslateY,
      new Animated.Value(-76)
    );
    const mediaTagSubtitleFinalTranslateY = Animated.add(
      mediaTagSubtitleAnchorY,
      mediaTagTranslateY
    );

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

    const heroWordmarkSource = isDark ? AIRS_LOGOTIPO_LIGHT : AIRS_LOGOTIPO_DARK;
    const mediaTagPillLogoSource = isDark ? ALTERNUN_PILL_LOGO_DARK : ALTERNUN_PILL_LOGO_LIGHT;
    const mediaTagPillBackgroundColor = isDark
      ? 'rgba(0, 70, 70, 0.96)'
      : 'rgba(229, 245, 242, 0.96)';
    const mediaTagPillBorderColor = isDark ? 'rgba(34, 248, 199, 0.34)' : 'rgba(0, 70, 70, 0.42)';
    const mediaTagPillShadowColor = isDark ? 'rgba(0,0,0,0.48)' : 'rgba(0, 43, 61, 0.28)';
    const heroBackgroundSource = (isDark ? AIRS_BG_DARK : { uri: AIRS_BG_LIGHT_SRC }) as any;
    const heroFooterTextColor = isDark ? 'rgba(248,251,255,0.96)' : '#020617';
    const heroFooterShadowColor = isDark ? 'rgba(0,0,0,0.28)' : 'transparent';
    const closeProfileMenu = () => {
      setProfileMenuVisible(false);
      setSettingsExpanded(false);
    };

    const toggleMute = () => {
      setHasManualAudioChoice(true);
      setHasAutoUnmuted(true);
      setIsMuted((prev) => !prev);
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

        <View pointerEvents='none' style={styles.floatingLeftTop}>
          <View style={styles.heroBrandRow}>
            <View style={styles.heroBrandTextBlock}>
              <ExpoImage
                source={heroWordmarkSource}
                style={{ width: heroWordmarkWidth, height: heroWordmarkHeight }}
                contentFit='contain'
              />
              <View
                style={[
                  styles.heroBrandBylineRow,
                  {
                    width: heroBylineWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.heroBrandByline,
                    {
                      color: heroBrandSecondaryColor,
                      fontSize: heroBylineSize,
                      lineHeight: heroBylineLineHeight,
                    },
                  ]}
                >
                  {t('labels.by')}
                </Text>
                <ExpoImage
                  source={ALTERNUN_POWERED_BY_LOGO}
                  style={[
                    styles.heroBrandBylineLogo,
                    {
                      width: heroBylineLogoSize,
                      height: heroBylineLogoSize,
                    },
                  ]}
                  contentFit='contain'
                />
              </View>
            </View>
            <AirsBrandMark
              size={heroLogoSize}
              fillColor={heroBrandMarkFill}
              cutoutColor={heroBrandMarkCutout}
            />
          </View>
        </View>

        {/* Header nav — logged-out pill or logged-in clean nav */}
        {headerNavLinks &&
          headerNavLinks.length > 0 &&
          (showCta ? (
            /* Logged-out: pill with nav links + compact avatar dropdown */
            <>
              {isMobile ? (
                /* Mobile: avatar-style trigger → dropdown with nav links + sign in */
                <View style={styles.headerNavMobileContainer} pointerEvents='box-none'>
                  <TouchableOpacity
                    onPress={() => setHeaderNavMobileMenuVisible((v) => !v)}
                    activeOpacity={0.7}
                    style={[styles.headerNavMobileAvatarTrigger, { backgroundColor: pillBgColor }]}
                  >
                    <View style={styles.headerNavMobileAvatarCircle}>
                      <User size={20} color='#ffffff' strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>

                  {headerNavMobileMenuVisible && (
                    <Animated.View
                      style={[
                        styles.floatingMenu,
                        styles.headerNavMobileDropdown,
                        {
                          backgroundColor: palette.contentCard,
                          borderColor: palette.contentBorder,
                        },
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
                                fontWeight: link.isActive ? '700' : '500',
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
                /* Desktop: pill with nav links + compact avatar button → dropdown outside pill */
                <View style={styles.headerNavDesktopWrapper} pointerEvents='box-none'>
                  <Animated.View style={[styles.headerNavPill, { backgroundColor: pillBgColor }]}>
                    {headerNavLinks.map((link) => (
                      <TouchableOpacity
                        key={link.id}
                        onPress={link.onPress}
                        activeOpacity={0.7}
                        style={styles.headerNavPillItem}
                      >
                        <Text
                          style={[
                            styles.headerNavPillText,
                            {
                              color: link.isActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
                              fontWeight: link.isActive ? '700' : '500',
                            },
                          ]}
                        >
                          {link.label}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Avatar trigger — last item inside pill */}
                    <TouchableOpacity
                      onPress={() => setProfileMenuVisible((prev) => !prev)}
                      activeOpacity={0.75}
                      style={[
                        styles.headerNavDesktopAvatarTrigger,
                        {
                          backgroundColor: palette.contentCard,
                          borderColor: palette.contentBorder,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.headerNavDesktopAvatarCircle,
                          { backgroundColor: `${palette.accent}22` },
                        ]}
                      >
                        <User size={15} color={palette.accent} />
                      </View>
                      {profileMenuVisible ? (
                        <ChevronUp size={14} color={palette.textPrimary} />
                      ) : (
                        <ChevronDown size={14} color={palette.textPrimary} />
                      )}
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Dropdown rendered OUTSIDE the pill so it is never clipped */}
                  {profileMenuVisible && (
                    <View
                      style={[
                        styles.floatingMenu,
                        styles.headerNavDesktopAvatarDropdown,
                        {
                          backgroundColor: palette.contentCard,
                          borderColor: palette.contentBorder,
                        },
                      ]}
                      pointerEvents='auto'
                    >
                      <TouchableOpacity
                        style={[
                          styles.floatingMenuItem,
                          { backgroundColor: palette.mutedButtonBg },
                        ]}
                        onPress={() => {
                          closeProfileMenu();
                          onSignIn();
                        }}
                        activeOpacity={0.82}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                    </View>
                  )}
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
                          fontWeight: link.isActive ? '700' : '500',
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
            <Animated.Image
              source={heroBackgroundSource}
              style={[
                styles.heroBackground,
                { opacity: heroBgImageOpacity, transform: [{ scale: bgScale }] },
              ]}
              resizeMode='cover'
            />
            <Animated.View
              style={[
                styles.heroSolidFadeLayer,
                { backgroundColor: palette.pageBg, opacity: heroSolidFadeOpacity },
              ]}
            />
            <Animated.View style={[styles.heroShade, { opacity: shadeOpacity }]} />

            <Animated.View
              style={[styles.heroMediaStage, { transform: [{ translateY: cardTranslateY }] }]}
            >
              <AirsIntroVideoCard
                style={{ width: cardWidth, height: cardHeight }}
                videoUri={videoUri}
                isMuted={isMuted}
                isScreenFocused={isScreenFocused}
                shouldPlayMainTrack={hasScrollActivatedPlayback && isScreenFocused}
                showControls={Boolean(videoUri && hasScrollActivatedPlayback && isScreenFocused)}
                controlsIconOnly={videoControlsIconOnly}
                onToggleMute={toggleMute}
                onPlaybackChange={setIsVideoPlaying}
              />

              {videoUri && (!hasScrollActivatedPlayback || isInTopZone || !isVideoPlaying) ? (
                <>
                  <Animated.View
                    pointerEvents='none'
                    style={[
                      styles.mediaTagPillOverlay,
                      {
                        width: cardWidth,
                        opacity: mediaTagOpacity,
                        transform: [{ translateY: mediaTagPillFinalTranslateY }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.mediaTagPill,
                        {
                          width: mediaTagPillWidth,
                          minHeight: mediaTagPillHeight,
                          backgroundColor: mediaTagPillBackgroundColor,
                          borderColor: mediaTagPillBorderColor,
                          boxShadow: `0px 8px 18px 0px ${mediaTagPillShadowColor}`,
                        },
                      ]}
                    >
                      <ExpoImage
                        source={mediaTagPillLogoSource}
                        style={{
                          width: mediaTagPillLogoWidth,
                          height: mediaTagPillLogoHeight,
                        }}
                        contentFit='contain'
                      />
                    </View>
                  </Animated.View>

                  <Animated.View
                    pointerEvents='none'
                    style={[
                      styles.mediaTagTitleOverlay,
                      {
                        width: cardWidth,
                        opacity: mediaTagOpacity,
                        transform: [{ translateY: mediaTagTitleFinalTranslateY }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mediaTagTitle,
                        {
                          fontSize: mediaTagTitleSize,
                          lineHeight: mediaTagTitleLineHeight,
                        },
                      ]}
                    >
                      {t('landing.media.title')}
                    </Text>
                  </Animated.View>

                  <Animated.View
                    pointerEvents='none'
                    style={[
                      styles.mediaTagSubtitleOverlay,
                      {
                        width: cardWidth,
                        opacity: mediaTagOpacity,
                        transform: [{ translateY: mediaTagSubtitleFinalTranslateY }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mediaTagSubtitle,
                        {
                          fontSize: mediaTagSubtitleSize,
                          lineHeight: mediaTagSubtitleLineHeight,
                        },
                      ]}
                    >
                      {t('landing.media.subtitle')}
                    </Text>
                  </Animated.View>
                </>
              ) : null}
            </Animated.View>

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
    top: 14,
    left: 14,
    zIndex: 81,
    maxWidth: '70%',
  },
  floatingRightTop: {
    position: 'absolute',
    top: 14,
    right: 14,
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
    top: 20,
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
    color: 'rgba(248,251,255,0.96)',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMetaRight: {
    color: 'rgba(248,251,255,0.98)',
    fontSize: 15,
    fontWeight: '700',
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
    color: 'rgba(245, 227, 162, 0.96)',
    fontWeight: '500',
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
    height: 104,
    zIndex: 40,
    overflow: 'hidden',
  },

  // ── Logged-out: mobile dropdown nav ───────────────────────────────────────
  headerNavMobileContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 50,
  },
  headerNavMobileAvatarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 15,
    fontWeight: '500',
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
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Logged-out: desktop pill with avatar inside ───────────────────────────
  headerNavDesktopWrapper: {
    position: 'absolute',
    top: 16,
    right: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    top: 52,
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
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headerNavPillItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerNavPillText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headerNavCtaButton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    marginLeft: 4,
  },
  headerNavCtaText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Logged-in: clean nav + avatar ─────────────────────────────────────────
  headerNavLoggedInContainer: {
    position: 'absolute',
    top: 16,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 50,
  },
  headerNavLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  headerNavLinkWrap: {
    alignItems: 'center',
    gap: 4,
  },
  headerNavLinkText: {
    fontSize: 15,
    fontWeight: '500',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 42,
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
    top: 64,
    right: 20,
    zIndex: 55,
    minWidth: 200,
  },
});

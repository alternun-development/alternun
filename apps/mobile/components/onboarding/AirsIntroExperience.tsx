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
  Easing,
  Pressable,
  StyleSheet,
  StyleProp,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { createShadowStyle } from '../theme/deprecatedStylesHelper';
import { createTypographyStyles } from '../theme/typography';
import { ANEK_EXPANDED_FAMILY, SCULPIN_FONT_FAMILY } from '../theme/fonts';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import {
  ChevronDown,
  ChevronRight,
  ChevronsUp,
  LogIn,
  Settings as SettingsIcon,
  User,
  type LucideProps,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import LandingFooter from '../common/LandingFooter';
import AnimatedCollapsibleContent from '../common/AnimatedCollapsibleContent';
import { BackToTopButton } from '../common/BackToTopButton';
import { useAppTranslation } from '../i18n/useAppTranslation';
import AirsIntroSettingsMenu from './AirsIntroSettingsMenu';
import { resolveHeroWordmarkSource } from './heroWordmarkSource';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { HeroVideoNative } from './HeroVideoNative';

const HERO_EXPANSION_RANGE = 420;
const HERO_SOLID_SWAP_SCROLL = 240;
const AUTO_UNMUTE_SCROLL_Y = 88;
const TOP_PAUSE_SCROLL_Y = 6;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const HERO_VIDEO_MOBILE = require('../../assets/videos/landing.mp4');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HERO_VIDEO_DESKTOP = require('../../assets/videos/landing-backup.mp4');

type HeroGlassButtonProps = {
  label: string;
  onPress?: () => void;
  width: number | string;
  fontSize: number;
  isDark: boolean;
  borderWidth: number;
};

type HeroScrollCueProps = {
  label: string;
  onPress?: () => void;
  isDark: boolean;
  isMobile: boolean;
};

function HeroGlassButton({
  label,
  onPress,
  width,
  fontSize,
  isDark,
  borderWidth,
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
          borderWidth,
          backgroundColor: hovered ? pillBgColorHover : pillBgColor,
          borderColor: hovered ? pillBorderColorHover : pillBorderColor,
          transform: [{ scale: pressed ? 0.98 : hovered ? 1.02 : 1 }],
          ...createShadowStyle({
            color: '#000',
            offsetX: 0,
            offsetY: hovered ? 12 : 8,
            opacity: hovered ? 0.25 : 0.15,
            radius: hovered ? 24 : 16,
            elevation: hovered ? 8 : 6,
          }),
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

function HeroScrollCue({
  label,
  onPress,
  isDark,
  isMobile,
}: HeroScrollCueProps): React.ReactElement {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const ScrollCueIcon = ChevronsUp as React.FC<LucideProps>;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return (): void => {
      animation.stop();
    };
  }, [bounceAnim]);

  const iconTranslateY = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 4, 0],
  });
  const cueOuterBg = isDark ? 'rgba(28,203,161,0.12)' : 'rgba(15,23,42,0.08)';
  const cueOuterBorder = isDark ? 'rgba(28,203,161,0.35)' : 'rgba(28,203,161,0.25)';
  const cueInnerBg = isDark ? 'rgba(28,203,161,0.22)' : 'rgba(28,203,161,0.14)';
  const cueIconColor = isDark ? '#1ee6b5' : '#0d9488';
  const cueWidth = isMobile ? 62 : 72;
  const cueHeight = isMobile ? 42 : 48;

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityHint='Scrolls to the first section below the hero'
      hitSlop={24}
      onPress={onPress}
      style={({ hovered, pressed }) =>
        ({
          ...styles.scrollCuePressable,
          width: cueWidth,
          height: cueHeight,
          backgroundColor: cueOuterBg,
          borderColor: cueOuterBorder,
          padding: 4,
          transform: [{ scale: pressed ? 0.97 : hovered ? 1.02 : 1 }],
          ...createShadowStyle({
            color: '#000',
            offsetX: 0,
            offsetY: hovered ? 10 : 6,
            opacity: hovered ? 0.32 : 0.2,
            radius: hovered ? 20 : 14,
            elevation: hovered ? 10 : 7,
          }),
        } as ViewStyle)
      }
    >
      <View
        style={[
          styles.scrollCueInner,
          {
            width: isMobile ? 34 : 36,
            height: isMobile ? 34 : 36,
            backgroundColor: cueInnerBg,
          },
        ]}
      >
        <Animated.View
          style={{ transform: [{ translateY: iconTranslateY }, { rotate: '180deg' }] }}
        >
          <ScrollCueIcon size={isMobile ? 16 : 18} color={cueIconColor} strokeWidth={2.5} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

interface AirsIntroExperienceProps {
  onContinueToDashboard: (dontShowAgain: boolean) => void;
  onSignIn: () => void;
  onOpenSettings?: () => void;
  renderExtraSections?: (
    heroTransitionProgress: Animated.AnimatedInterpolation<number>
  ) => React.ReactNode;
  headerNavLinks?: Array<{ id: string; label: string; isActive: boolean; onPress: () => void }>;
  accentColor?: string;
  isDark?: boolean;
  showCta?: boolean;
  onActiveSectionChange?: (sectionId: string) => void;
  sectionOffsets?: Map<string, number>;
  heroHeight?: number;
  onHeroNavigate?: (sectionId: string) => void;
}

const AirsIntroExperience = forwardRef<
  { scrollToSection: (offset: number) => void },
  AirsIntroExperienceProps
>(
  (
    {
      onContinueToDashboard: _onContinueToDashboard,
      onSignIn,
      onOpenSettings: _onOpenSettings,
      renderExtraSections,
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
    const [showHeroScrollCue, setShowHeroScrollCue] = useState(true);
    const [logoAtTop, setLogoAtTop] = useState(true);
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isMobile = screenWidth < 720;
    const heroVideoSource = isMobile ? HERO_VIDEO_MOBILE : HERO_VIDEO_DESKTOP;
    const heroHeight = heroHeightProp ?? Math.max(screenHeight * 1.05, 740);
    const isDesktopView = screenWidth >= 720;
    const isCompactDesktop = isDesktopView && screenWidth < 1280;
    const firstSectionOverlap = isMobile ? 240 : isCompactDesktop ? 248 : 272;
    const extraSectionsBaseOffset = heroHeight - firstSectionOverlap;
    const sectionScrollRevealOffset = isMobile ? 28 : isCompactDesktop ? 32 : 36;
    const [headerNavMobileMenuVisible, setHeaderNavMobileMenuVisible] = useState(false);
    const headerNavDropdownAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const anyHeaderMenuVisible =
        headerNavMobileMenuVisible || headerNavSettingsMenuVisible || profileMenuVisible;

      Animated.timing(headerNavDropdownAnim, {
        toValue: anyHeaderMenuVisible ? 1 : 0,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, [
      headerNavDropdownAnim,
      headerNavMobileMenuVisible,
      headerNavSettingsMenuVisible,
      profileMenuVisible,
    ]);

    const scrollY = useRef(new Animated.Value(0)).current;
    const isMutedRef = useRef(isMuted);
    const hasManualAudioChoiceRef = useRef(hasManualAudioChoice);
    const hasAutoUnmutedRef = useRef(hasAutoUnmuted);
    const hasScrollActivatedPlaybackRef = useRef(hasScrollActivatedPlayback);
    const isInTopZoneRef = useRef(true);
    const isHeroScrollCueVisibleRef = useRef(true);

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
        setLogoAtTop(value <= 50);
        const shouldShowHeroScrollCue = value < HERO_EXPANSION_RANGE * 0.65;
        if (isHeroScrollCueVisibleRef.current !== shouldShowHeroScrollCue) {
          isHeroScrollCueVisibleRef.current = shouldShowHeroScrollCue;
          setShowHeroScrollCue(shouldShowHeroScrollCue);
        }

        // Track active section based on scroll position
        if (onActiveSectionChange && sectionOffsets) {
          let activeSectionId = 'inicio';
          const entries = Array.from(sectionOffsets.entries()).map(
            ([sectionId, sectionOffset]): [string, number] => [
              sectionId,
              sectionOffset <= 0 ? 0 : extraSectionsBaseOffset + sectionOffset,
            ]
          );
          const foundEntry = [...entries]
            .reverse()
            .find(([, sectionOffset]) => value >= sectionOffset - sectionScrollRevealOffset);

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
      extraSectionsBaseOffset,
      onActiveSectionChange,
      sectionScrollRevealOffset,
      sectionOffsets,
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

    const heroSideInset = isMobile ? 24 : isCompactDesktop ? 56 : 48;
    const heroWordmarkHeight = isDesktopView
      ? Math.min(
          Math.max(screenWidth * 0.035, isCompactDesktop ? 56 : 72),
          isCompactDesktop ? 100 : 125
        )
      : Math.min(Math.max(screenWidth * 0.065, 45), 80);
    const heroWordmarkWidth = Math.round(heroWordmarkHeight * 2.68);
    const pillBgColor = isDark ? 'rgba(11,90,95,0.18)' : 'rgba(13,148,136,0.16)';
    const pillBorderColor = isDark ? 'rgba(28,203,161,0.24)' : 'rgba(13,148,136,0.32)';
    const pillGlassTint = isDark ? 'dark' : 'light';
    const headerNavLinkColor = isDark ? 'rgba(255,255,255,0.82)' : '#215b60';
    const headerNavLinkActiveColor = isDark ? '#ffffff' : '#073f45';
    const headerNavLinkActiveBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.76)';
    const headerNavLinkHoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,92,97,0.08)';
    const headerNavDividerColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(7,92,97,0.18)';
    const headerNavSettingsBg = isDark ? 'rgba(5, 16, 18, 0.72)' : 'rgba(11,90,95,0.92)';
    const headerNavSettingsBgHover = isDark ? 'rgba(5, 16, 18, 0.82)' : 'rgba(7,76,81,0.96)';
    const headerNavPillPaddingHorizontal = isCompactDesktop ? 12 : 14;
    const headerNavPillPaddingVertical = isCompactDesktop ? 10 : 12;
    const headerNavPillGap = isCompactDesktop ? 6 : 8;
    const headerNavPillItemPaddingHorizontal = isCompactDesktop ? 16 : 20;
    const headerNavPillItemPaddingVertical = isCompactDesktop ? 10 : 12;
    const headerNavCtaPaddingHorizontal = isCompactDesktop ? 18 : 20;
    const headerNavCtaPaddingVertical = isCompactDesktop ? 8 : 9;
    const headerNavCtaFontSize = isCompactDesktop ? 13 : 14;
    const desktopHeaderNavLeft = heroSideInset + heroWordmarkWidth + 28;

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
    const extraSectionsTopPadding = isMobile ? 56 : isCompactDesktop ? 72 : 84;
    const firstSectionEntranceDrop = isMobile ? 8 : isCompactDesktop ? 12 : 16;
    const heroTransitionProgress = scrollY.interpolate({
      inputRange: [0, heroHeight * 0.08, heroHeight * 0.2],
      outputRange: [0, 0.42, 1],
      extrapolate: 'clamp',
    });
    const extraSectionsOpacity = scrollY.interpolate({
      inputRange: [0, heroHeight * 0.08, heroHeight * 0.2],
      outputRange: [0, 0.66, 1],
      extrapolate: 'clamp',
    });
    const extraSectionsTranslateY = scrollY.interpolate({
      inputRange: [0, heroHeight * 0.06, heroHeight * 0.18],
      outputRange: [firstSectionEntranceDrop, 6, 0],
      extrapolate: 'clamp',
    });
    const extraSectionsScale = scrollY.interpolate({
      inputRange: [0, heroHeight * 0.18],
      outputRange: [0.992, 1],
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

    const heroWordmarkSource = resolveHeroWordmarkSource(isDark, logoAtTop);
    const heroCopyTop = isMobile
      ? Math.min(heroHeight * 0.22, 194)
      : Math.min(heroHeight * 0.34, 330);
    const heroCopyMaxWidth = isMobile
      ? Math.min(screenWidth - 40, 620)
      : Math.min(screenWidth * 0.82, 1080);
    const heroHeadlineSize = isMobile
      ? Math.min(Math.max(screenWidth * 0.043, 30), 66)
      : Math.min(Math.max(screenWidth * 0.05, 34), 68);
    const heroHeadlineLineHeight = heroHeadlineSize * 1.04;
    const heroKickerSize = isMobile
      ? Math.min(Math.max(screenWidth * 0.036, 20), 32)
      : Math.min(Math.max(screenWidth * 0.03, 26), 42);
    const heroKickerLineHeight = heroKickerSize * 1.02;
    const heroButtonWidth = isMobile ? '100%' : Math.min(screenWidth * 0.28, 360);
    const heroButtonFontSize = Math.min(Math.max(screenWidth * 0.023, 18), 24);
    const heroButtonBorderWidth = isDesktopView ? 1.35 : 1;
    const headerNavDropdownAnimatedStyle = useMemo(
      () => ({
        opacity: headerNavDropdownAnim,
        transform: [
          {
            scale: headerNavDropdownAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.96, 1],
            }),
          },
          {
            translateY: headerNavDropdownAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-12, 0],
            }),
          },
        ],
      }),
      [headerNavDropdownAnim]
    );
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
    const resolveSectionScrollTarget = useCallback(
      (offset: number): number => {
        if (offset <= 0) {
          return 0;
        }

        return Math.max(extraSectionsBaseOffset + offset - sectionScrollRevealOffset, 0);
      },
      [extraSectionsBaseOffset, sectionScrollRevealOffset]
    );

    useImperativeHandle(
      ref,
      (): { scrollToSection: (offset: number) => void } => ({
        scrollToSection: (offset: number): void => {
          const targetY = resolveSectionScrollTarget(offset);
          if (scrollRef.current?.scrollTo) {
            scrollRef.current.scrollTo({ y: targetY, animated: true });
          } else if (scrollRef.current?.getNode?.()?.scrollTo) {
            scrollRef.current.getNode().scrollTo({ y: targetY, animated: true });
          }
        },
      }),
      [resolveSectionScrollTarget]
    );

    const handleScrollCuePress = useCallback((): void => {
      const firstSectionOffset = sectionOffsets?.get('el-proyecto') ?? extraSectionsTopPadding;
      const targetY = resolveSectionScrollTarget(
        Math.max(firstSectionOffset, extraSectionsTopPadding)
      );
      if (scrollRef.current?.scrollTo) {
        scrollRef.current.scrollTo({ y: targetY, animated: true });
      } else if (scrollRef.current?.getNode?.()?.scrollTo) {
        scrollRef.current.getNode().scrollTo({ y: targetY, animated: true });
      }
      onActiveSectionChange?.('el-proyecto');
    }, [
      extraSectionsTopPadding,
      onActiveSectionChange,
      resolveSectionScrollTarget,
      sectionOffsets,
    ]);

    return (
      <View style={[styles.page, { backgroundColor: palette.pageBg }]}>
        {/* Progressive blur header — smooth glass effect that fades in on scroll */}
        <Animated.View
          pointerEvents='none'
          style={[styles.progressiveBlurHeader, { opacity: headerBarOpacity }]}
        >
          {/* Blur layer with a feathered glass fade at the bottom edge */}
          <BlurView intensity={85} tint={blurTint} style={StyleSheet.absoluteFill} />
          <Svg
            pointerEvents='none'
            style={StyleSheet.absoluteFill}
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

        <View pointerEvents='none' style={[styles.floatingLeftTop, { left: heroSideInset }]}>
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
                  style={[
                    isMobile ? styles.headerNavMobileContainer : styles.headerNavDesktopWrapper,
                    { right: heroSideInset },
                  ]}
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
                        !isMobile && { paddingHorizontal: 12, paddingVertical: 12 },
                        headerNavDropdownAnimatedStyle,
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
                <View
                  style={[
                    styles.headerNavDesktopWrapper,
                    {
                      left: desktopHeaderNavLeft,
                      right: heroSideInset,
                      alignItems: 'flex-end',
                    },
                  ]}
                  pointerEvents='box-none'
                >
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

                          {headerNavSettingsMenuVisible ? (
                            <Animated.View
                              style={[
                                styles.headerNavSettingsDropdown,
                                {
                                  backgroundColor: palette.contentCard,
                                  borderColor: palette.contentBorder,
                                },
                                headerNavDropdownAnimatedStyle,
                              ]}
                            >
                              <AnimatedCollapsibleContent expanded={headerNavSettingsMenuVisible}>
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
                            </Animated.View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              )}
            </>
          ) : (
            /* Logged-in: clean nav links with underline + avatar */
            <View style={[styles.headerNavLoggedInContainer, { right: heroSideInset }]}>
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
                  {
                    backgroundColor: isDark ? 'rgba(4,15,30,0.6)' : 'rgba(255,255,255,0.15)',
                    borderColor: isDark ? 'rgba(28,203,161,0.4)' : 'rgba(15,92,97,0.3)',
                  },
                ]}
                activeOpacity={0.86}
                onPress={() => setProfileMenuVisible((prev) => !prev)}
              >
                <View style={[styles.headerAvatar, { backgroundColor: `${palette.accent}22` }]}>
                  <Text style={[styles.headerAvatarText, { color: palette.accent }]}>U</Text>
                </View>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 5,
                    right: 5,
                  }}
                >
                  {profileMenuVisible ? (
                    <ChevronDown
                      size={18}
                      color={palette.textPrimary}
                      style={{ transform: [{ rotate: '180deg' }] }}
                    />
                  ) : (
                    <ChevronDown size={18} color={palette.textPrimary} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          ))}

        {/* Profile dropdown menu (logged-in state) */}
        {!showCta && profileMenuVisible && (
          <Animated.View
            style={[
              styles.headerDropdownContainer,
              { right: heroSideInset },
              headerNavDropdownAnimatedStyle,
            ]}
          >
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
          </Animated.View>
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
          <View style={[styles.floatingRightTop, { right: heroSideInset }]}>
            <TouchableOpacity
              style={[
                styles.floatingProfileTrigger,
                {
                  backgroundColor: isDark ? 'rgba(4,15,30,0.6)' : 'rgba(255,255,255,0.15)',
                  borderColor: isDark ? 'rgba(28,203,161,0.4)' : 'rgba(15,92,97,0.3)',
                },
              ]}
              activeOpacity={0.86}
              onPress={() => setProfileMenuVisible((prev) => !prev)}
            >
              <View style={[styles.floatingAvatar, { backgroundColor: `${palette.accent}22` }]}>
                <Text style={[styles.floatingAvatarText, { color: palette.accent }]}>U</Text>
              </View>
              <View
                style={{
                  position: 'absolute',
                  bottom: 5,
                  right: 5,
                }}
              >
                {profileMenuVisible ? (
                  <ChevronDown
                    size={18}
                    color={palette.textPrimary}
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                ) : (
                  <ChevronDown size={18} color={palette.textPrimary} />
                )}
              </View>
            </TouchableOpacity>

            {profileMenuVisible ? (
              <Animated.View
                style={[
                  styles.floatingMenu,
                  { backgroundColor: palette.contentCard, borderColor: palette.contentBorder },
                  headerNavDropdownAnimatedStyle,
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
              </Animated.View>
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
              pointerEvents='none'
              style={[
                styles.heroSolidFadeLayer,
                { backgroundColor: palette.pageBg, opacity: heroSolidFadeOpacity },
              ]}
            />
            <Animated.View
              pointerEvents='none'
              style={[styles.heroShade, { opacity: shadeOpacity }]}
            />

            {showCta ? (
              <Animated.View
                pointerEvents='box-none'
                style={[
                  styles.heroCopyOverlay,
                  isMobile && styles.heroCopyOverlayCompact,
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
                <View
                  style={[
                    styles.heroCopyActions,
                    isMobile && styles.heroCopyActionsStacked,
                    { marginTop: isMobile ? 18 : 24 },
                  ]}
                >
                  <HeroGlassButton
                    onPress={() => onHeroNavigate?.('como-funciona')}
                    label={t('landing.nav.howItWorks')}
                    width={heroButtonWidth}
                    fontSize={heroButtonFontSize}
                    isDark={isDark}
                    borderWidth={heroButtonBorderWidth}
                  />
                  <HeroGlassButton
                    onPress={onSignIn}
                    label={t('landing.nav.joinNow')}
                    width={heroButtonWidth}
                    fontSize={heroButtonFontSize}
                    isDark={isDark}
                    borderWidth={heroButtonBorderWidth}
                  />
                </View>
                {isMobile && showHeroScrollCue ? (
                  <Animated.View
                    pointerEvents='box-none'
                    style={[
                      styles.heroScrollCueInline,
                      {
                        opacity: footerOpacity,
                        transform: [{ translateY: footerTranslateY }],
                      },
                    ]}
                  >
                    <HeroScrollCue
                      label={t('landing.hero.scrollCue')}
                      onPress={handleScrollCuePress}
                      isDark={isDark}
                      isMobile={isMobile}
                    />
                  </Animated.View>
                ) : null}
              </Animated.View>
            ) : null}
          </View>

          {renderExtraSections ? (
            <Animated.View
              pointerEvents='box-none'
              style={[
                styles.extraSectionsTransition,
                {
                  marginTop: -firstSectionOverlap,
                  paddingTop: extraSectionsTopPadding,
                  opacity: extraSectionsOpacity,
                  transform: [
                    { translateY: extraSectionsTranslateY },
                    { scale: extraSectionsScale },
                  ],
                },
              ]}
            >
              {renderExtraSections(heroTransitionProgress)}
            </Animated.View>
          ) : null}

          <LandingFooter />
        </Animated.ScrollView>

        {!isMobile && showHeroScrollCue ? (
          <Animated.View
            pointerEvents='box-none'
            style={[
              styles.heroScrollCueOverlay,
              {
                opacity: footerOpacity,
                bottom: isCompactDesktop ? 40 : 44,
                transform: [{ translateY: footerTranslateY }],
              },
            ]}
          >
            <HeroScrollCue
              label={t('landing.hero.scrollCue')}
              onPress={handleScrollCuePress}
              isDark={isDark}
              isMobile={isMobile}
            />
          </Animated.View>
        ) : null}

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
    top: 28,
    zIndex: 81,
    maxWidth: '72%',
  },
  floatingRightTop: {
    position: 'absolute',
    top: 18,
    zIndex: 80,
    alignItems: 'flex-end',
  },
  floatingBackdrop: {
    // Keep the dismiss layer behind the menu so web clicks reach the items.
    ...StyleSheet.absoluteFill,
    zIndex: 40,
  },
  floatingProfileTrigger: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'visible',
  },
  floatingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAvatarText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 24,
    fontWeight: '800',
  },
  floatingMenu: {
    marginTop: 8,
    width: 200,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 8,
    boxShadow: '0px 6px 16px 0px rgba(0, 0, 0, 0.24)',
  },
  floatingMenuItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    gap: 8,
  },
  floatingMenuText: {
    fontFamily: `${SCULPIN_FONT_FAMILY}-Medium`,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
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
    position: 'relative',
    zIndex: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroBackground: {
    ...StyleSheet.absoluteFill,
  },
  heroVideoElement: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#050510',
  },
  heroVideoWebView: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  heroSolidFadeLayer: {
    ...StyleSheet.absoluteFill,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
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
  heroScrollCueOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 90,
    elevation: 90,
  },
  scrollCuePressable: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  scrollCueInner: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraSectionsTransition: {
    position: 'relative',
    // The first section intentionally overlaps the hero. Keep it above the
    // hero so its heading is not masked during the scroll handoff.
    zIndex: 4,
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
    zIndex: 50,
  },
  headerNavMobileAvatarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...createShadowStyle({
      color: '#000',
      offsetX: 0,
      offsetY: 4,
      opacity: 0.18,
      radius: 12,
      elevation: 6,
    }),
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
    ...createShadowStyle({
      color: '#000',
      offsetX: 0,
      offsetY: 2,
      opacity: 0.12,
      radius: 8,
      elevation: 4,
    }),
  },
  headerNavMobileDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    ...createShadowStyle({
      color: '#000',
      offsetX: 0,
      offsetY: 12,
      opacity: 0.3,
      radius: 20,
      elevation: 12,
    }),
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
    top: 28,
    zIndex: 50,
    alignItems: 'center',
  },
  headerNavDesktopAvatarWrap: {
    position: 'relative',
    marginLeft: 4,
  },
  headerNavDesktopAvatarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    top: 50,
    right: 0,
    minWidth: 200,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    zIndex: 100,
    ...createShadowStyle({
      color: '#000',
      offsetX: 0,
      offsetY: 8,
      opacity: 0.2,
      radius: 16,
      elevation: 10,
    }),
  },

  // ── Logged-out: pill nav container ────────────────────────────────────────
  headerNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 999,
    borderWidth: 2,
    overflow: 'visible',
    ...createShadowStyle({
      color: '#000',
      offsetX: 0,
      offsetY: 10,
      opacity: 0.18,
      radius: 18,
      elevation: 6,
    }),
  },
  headerNavPillBlur: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
  },
  headerNavPillTint: {
    ...StyleSheet.absoluteFill,
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
    ...createShadowStyle({
      color: '#000',
      offsetX: 0,
      offsetY: 6,
      opacity: 0.14,
      radius: 12,
      elevation: 5,
    }),
  },
  headerNavSettingsButtonTint: {
    ...StyleSheet.absoluteFill,
  },
  headerNavSettingsDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    ...createShadowStyle({
      color: '#000',
      offsetX: 0,
      offsetY: 14,
      opacity: 0.22,
      radius: 18,
      elevation: 14,
    }),
    zIndex: 60,
  },

  // ── Logged-in: clean nav + avatar ─────────────────────────────────────────
  headerNavLoggedInContainer: {
    position: 'absolute',
    top: 24,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'visible',
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 28,
    fontWeight: '700',
  },
  headerDropdownContainer: {
    position: 'absolute',
    top: 50,
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
  heroCopyOverlayCompact: {
    left: 20,
    right: 20,
    paddingHorizontal: 0,
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
    gap: 12,
    width: '100%',
  },
  heroScrollCueInline: {
    marginTop: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
  },
  heroGlassTint: {
    ...StyleSheet.absoluteFill,
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

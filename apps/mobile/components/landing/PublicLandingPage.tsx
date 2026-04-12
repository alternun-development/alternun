/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { Image as ExpoImage, type ImageContentPosition } from 'expo-image';
import {
  Leaf,
  Zap,
  TrendingUp,
  ShoppingBag,
  Star,
  Award,
  Coins,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  type LucideProps,
} from 'lucide-react-native';

import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { createTypographyStyles } from '../theme/typography';
import AirsIntroExperience from '../onboarding/AirsIntroExperience';
import AirsBrandMark from '../branding/AirsBrandMark';

const LeafIcon = Leaf as React.FC<LucideProps>;
const ZapIcon = Zap as React.FC<LucideProps>;
const TrendingUpIcon = TrendingUp as React.FC<LucideProps>;
const ShoppingBagIcon = ShoppingBag as React.FC<LucideProps>;
const StarIcon = Star as React.FC<LucideProps>;
const AwardIcon = Award as React.FC<LucideProps>;
const CoinsIcon = Coins as React.FC<LucideProps>;
const ChevronLeftIcon = ChevronLeft as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;
const ArrowRightIcon = ArrowRight as React.FC<LucideProps>;
const ChevronDownIcon = ChevronDown as React.FC<LucideProps>;

const TOKEN_IMAGES: Record<'airs' | 'rbi' | 'atn', ImageSourcePropType> = {
  airs: require('../../assets/images/benefits/airs.png'),
  rbi: require('../../assets/images/benefits/rbi.png'),
  atn: require('../../assets/images/benefits/atn.png'),
};

const BENEFIT_IMAGES: Record<'eco' | 'experiencias' | 'premium' | 'cursos', ImageSourcePropType[]> =
  {
    eco: [
      {
        uri: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2070&auto=format&fit=crop',
      },
      {
        uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop',
      },
    ],
    experiencias: [
      {
        uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop',
      },
      {
        uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
      },
    ],
    premium: [
      {
        uri: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?q=80&w=1974&auto=format&fit=crop',
      },
      {
        uri: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=2069&auto=format&fit=crop',
      },
    ],
    cursos: [
      {
        uri: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
      },
      {
        uri: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070&auto=format&fit=crop',
      },
    ],
  };

const TOKEN_IMAGE_FOCI: Record<
  'airs' | 'rbi' | 'atn',
  { contentPosition: ImageContentPosition; zoom: number }
> = {
  airs: { contentPosition: 'center top', zoom: 1.1 },
  rbi: { contentPosition: 'center', zoom: 1.06 },
  atn: { contentPosition: 'center bottom', zoom: 1.18 },
};

// ── Auto-loop interval for ComoFunciona steps (ms) ────────────────────────────
const STEP_LOOP_INTERVAL = 3200;

interface PublicLandingPageProps {
  onSignIn: () => void;
  /** Optional handler for "continue to dashboard" with dontShowAgain flag */
  onContinueToDashboard?: (dontShowAgain: boolean) => void;
  onOpenSettings?: () => void;
}

const NAV_ITEM_IDS = ['inicio', 'el-proyecto', 'como-funciona', 'beneficios'];
const NAV_ITEM_LABEL_KEYS = [
  'landing.nav.start',
  'landing.nav.project',
  'landing.nav.howItWorks',
  'landing.nav.benefits',
];

export default function PublicLandingPage({
  onSignIn,
  onContinueToDashboard,
  onOpenSettings,
}: PublicLandingPageProps): React.JSX.Element {
  const { themeMode } = useAppPreferences();
  const { t } = useAppTranslation('mobile');
  const isDark = themeMode === 'dark';
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const accentColor = isDark ? '#1EE6B5' : '#0d9488';
  const textColor = isDark ? '#e8e8ff' : '#1f2937';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)';

  // Section offset tracking for anchor nav
  const sectionOffsetsRef = useRef<{ [key: string]: number }>({});
  const [activeSection, setActiveSection] = useState('inicio');

  // Build nav items with translated labels
  const navItems = NAV_ITEM_IDS.map((id, idx) => ({
    id,
    label: t(NAV_ITEM_LABEL_KEYS[idx]),
  }));

  const extraSections = (
    <>
      {/* El Proyecto */}
      <View
        onLayout={(e) => {
          sectionOffsetsRef.current['el-proyecto'] = e.nativeEvent.layout.y;
        }}
      >
        <ElProyectoSection
          isDark={isDark}
          accentColor={accentColor}
          textColor={textColor}
          cardBg={cardBg}
          cardBorder={cardBorder}
          isMobile={isMobile}
        />
      </View>

      {/* Cómo funciona */}
      <View
        onLayout={(e) => {
          sectionOffsetsRef.current['como-funciona'] = e.nativeEvent.layout.y;
        }}
      >
        <ComoFuncionaSection
          isDark={isDark}
          accentColor={accentColor}
          textColor={textColor}
          isMobile={isMobile}
        />
      </View>

      {/* Beneficios */}
      <View
        onLayout={(e) => {
          sectionOffsetsRef.current['beneficios'] = e.nativeEvent.layout.y;
        }}
      >
        <BeneficiosSection
          isDark={isDark}
          accentColor={accentColor}
          textColor={textColor}
          cardBg={cardBg}
          cardBorder={cardBorder}
          isMobile={isMobile}
        />
      </View>
    </>
  );

  return (
    <PublicLandingPageWrapper
      onSignIn={onSignIn}
      onContinueToDashboard={onContinueToDashboard}
      onOpenSettings={onOpenSettings}
      extraSections={extraSections}
      navItems={navItems}
      sectionOffsetsRef={sectionOffsetsRef}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      isDark={isDark}
      accentColor={accentColor}
      isMobile={isMobile}
    />
  );
}

interface PublicLandingPageWrapperProps {
  onSignIn: () => void;
  onContinueToDashboard?: (dontShowAgain: boolean) => void;
  onOpenSettings?: () => void;
  extraSections: React.ReactNode;
  navItems: Array<{ id: string; label: string }>;
  sectionOffsetsRef: React.MutableRefObject<{ [key: string]: number }>;
  activeSection: string;
  setActiveSection: (section: string) => void;
  isDark: boolean;
  accentColor: string;
  isMobile: boolean;
}

interface AirsIntroExperienceHandle {
  scrollToSection(offset: number): void;
}

function PublicLandingPageWrapper({
  onSignIn,
  onContinueToDashboard,
  onOpenSettings,
  extraSections,
  navItems,
  sectionOffsetsRef,
  activeSection,
  setActiveSection,
  isDark,
  accentColor,
  isMobile: _isMobile,
}: PublicLandingPageWrapperProps): React.JSX.Element {
  const airsIntroRef = useRef<AirsIntroExperienceHandle | null>(null);
  const handleContinueToDashboard = useCallback(
    (_: boolean): void => {
      onSignIn();
    },
    [onSignIn]
  );
  const { height: screenHeight } = useWindowDimensions();
  const heroHeight = Math.max(screenHeight * 1.05, 740);

  const handleNavPress = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId);
      // Scroll to section with smooth animation
      // For 'inicio' (home/hero), scroll to top (0)
      const sectionOffset = sectionId === 'inicio' ? 0 : sectionOffsetsRef.current[sectionId];
      if (sectionOffset !== undefined && airsIntroRef.current) {
        // Call the exposed scrollToSection method
        airsIntroRef.current?.scrollToSection?.(sectionOffset);
      }
    },
    [setActiveSection, sectionOffsetsRef, airsIntroRef]
  );

  // Callback for scroll-based section tracking
  const handleActiveSectionChange = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId);
    },
    [setActiveSection]
  );

  // Nav links to inject into AirsIntroExperience as headerNavLinks
  const headerNavLinks = navItems.map((item) => ({
    id: item.id,
    label: item.label,
    isActive: activeSection === item.id,
    onPress: () => handleNavPress(item.id),
  }));

  return (
    <View style={styles.publicLandingContainer}>
      <AirsIntroExperience
        ref={airsIntroRef}
        onContinueToDashboard={onContinueToDashboard ?? handleContinueToDashboard}
        onSignIn={onSignIn}
        onOpenSettings={onOpenSettings}
        extraSections={extraSections}
        headerNavLinks={headerNavLinks}
        accentColor={accentColor}
        isDark={isDark}
        showCta={true}
        onActiveSectionChange={handleActiveSectionChange}
        sectionOffsets={sectionOffsetsRef.current}
        heroHeight={heroHeight}
      />
    </View>
  );
}

// ── Shared section prop type ───────────────────────────────────────────────────
interface SectionProps {
  isDark: boolean;
  accentColor: string;
  textColor: string;
  cardBg?: string;
  cardBorder?: string;
  isMobile: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// TokenCard — tap to reveal overview (collapsed by default, overview on press)
// ─────────────────────────────────────────────────────────────────────────────
interface TokenCardProps {
  imageSource: ImageSourcePropType;
  contentPosition: ImageContentPosition;
  imageZoom: number;
  logo: React.FC<LucideProps>;
  title: string;
  subtitle: string;
  overview: string;
  accentColor: string;
  isDark: boolean;
}

function TokenCard({
  imageSource,
  contentPosition,
  imageZoom,
  logo: _LogoIcon,
  title,
  subtitle,
  overview,
  accentColor: _accentColor,
  isDark: _isDark,
}: TokenCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  // Cross-fade animations for title/subtitle vs. overview
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const overviewOpacity = useRef(new Animated.Value(0)).current;
  // Smooth scale transition for fluid entrance
  const contentScale = useRef(new Animated.Value(1)).current;
  // Chevron rotation
  const chevronRotate = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    const toExpanded = !expanded;
    setExpanded(toExpanded);
    // Smooth fluid animation: cross-fade + subtle scale
    Animated.parallel([
      // Title fades out, overview fades in (staggered for smoothness)
      Animated.timing(titleOpacity, {
        toValue: toExpanded ? 0 : 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overviewOpacity, {
        toValue: toExpanded ? 1 : 0,
        duration: toExpanded ? 300 : 240,
        useNativeDriver: true,
      }),
      // Content scales slightly during transition for fluid feel
      Animated.timing(contentScale, {
        toValue: toExpanded ? 1.02 : 1,
        duration: 280,
        useNativeDriver: true,
      }),
      // Chevron rotates smoothly
      Animated.timing(chevronRotate, {
        toValue: toExpanded ? 1 : 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded, titleOpacity, overviewOpacity, contentScale, chevronRotate]);

  const chevronAngle = chevronRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.travelCard}>
      <TouchableOpacity activeOpacity={0.9} onPress={toggle}>
        {/* Fixed-height image — card height never changes */}
        <View style={styles.travelCardImage}>
          <ExpoImage
            source={imageSource}
            contentFit='cover'
            contentPosition={contentPosition}
            style={[
              StyleSheet.absoluteFillObject,
              {
                transform: [{ scale: imageZoom }],
              },
            ]}
          />
          {/* Strong gradient from bottom for contrast */}
          <Animated.View
            style={[
              styles.travelCardGradientBottom,
              {
                opacity: titleOpacity,
                transform: [{ scale: contentScale }],
              },
            ]}
          >
            <View style={styles.travelCardTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.travelCardTitle}>{title}</Text>
                <Text style={styles.travelCardSubtitle}>{subtitle}</Text>
              </View>
              <Animated.View style={{ transform: [{ rotate: chevronAngle }] }}>
                <ChevronDownIcon size={20} color='#fff' strokeWidth={2.5} />
              </Animated.View>
            </View>
          </Animated.View>

          {/* Overview text — positioned same as title/subtitle, cross-fades in */}
          <Animated.View
            style={[
              styles.travelCardGradientBottom,
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                opacity: overviewOpacity,
                transform: [{ scale: contentScale }],
              },
            ]}
            pointerEvents='none'
          >
            <Text style={styles.travelCardOverview}>{overview}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── El Proyecto section ────────────────────────────────────────────────────────
function ElProyectoSection({
  isDark,
  accentColor,
  textColor,
  isMobile,
}: SectionProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');

  // Fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const tokens = [
    {
      key: 'airs',
      imageSource: TOKEN_IMAGES.airs,
      contentPosition: TOKEN_IMAGE_FOCI.airs.contentPosition,
      imageZoom: TOKEN_IMAGE_FOCI.airs.zoom,
      logo: StarIcon,
      title: t('landing.elProyecto.airs.title'),
      subtitle: t('landing.elProyecto.airs.subtitle'),
      overview: t('landing.elProyecto.airs.overview'),
    },
    {
      key: 'rbi',
      imageSource: TOKEN_IMAGES.rbi,
      contentPosition: TOKEN_IMAGE_FOCI.rbi.contentPosition,
      imageZoom: TOKEN_IMAGE_FOCI.rbi.zoom,
      logo: AwardIcon,
      title: t('landing.elProyecto.rbi.title'),
      subtitle: t('landing.elProyecto.rbi.subtitle'),
      overview: t('landing.elProyecto.rbi.overview'),
    },
    {
      key: 'atn',
      imageSource: TOKEN_IMAGES.atn,
      contentPosition: TOKEN_IMAGE_FOCI.atn.contentPosition,
      imageZoom: TOKEN_IMAGE_FOCI.atn.zoom,
      logo: CoinsIcon,
      title: t('landing.elProyecto.atn.title'),
      subtitle: t('landing.elProyecto.atn.subtitle'),
      overview: t('landing.elProyecto.atn.overview'),
    },
  ];

  return (
    <Animated.View
      style={[
        styles.section,
        {
          backgroundColor: isDark ? '#050510' : '#f6f8fc',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        {t('landing.elProyecto.sectionTitle')}
      </Text>

      <View style={[styles.tokenCardsContainer, isMobile && styles.tokenCardsContainerMobile]}>
        {tokens.map((token) => (
          <TokenCard
            key={token.key}
            imageSource={token.imageSource}
            contentPosition={token.contentPosition}
            imageZoom={token.imageZoom}
            logo={token.logo}
            title={token.title}
            subtitle={token.subtitle}
            overview={token.overview}
            accentColor={accentColor}
            isDark={isDark}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Custom inline SVG icons for each step ────────────────────────────────────
function WalletSvgIcon({ color, size }: { color: string; size: number }): React.JSX.Element {
  const Svg = 'svg' as any;
  const Rect = 'rect' as any;
  const Path = 'path' as any;
  const Circle = 'circle' as any;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        <Rect x='2' y='5' width='20' height='15' rx='3' stroke={color} strokeWidth='1.6' />
        <Path d='M2 9h20' stroke={color} strokeWidth='1.6' />
        <Circle cx='17' cy='14' r='1.5' fill={color} />
        <Path d='M6 5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1' stroke={color} strokeWidth='1.6' />
      </Svg>
    </View>
  );
}

function ImpactSvgIcon({ color, size }: { color: string; size: number }): React.JSX.Element {
  const Svg = 'svg' as any;
  const Path = 'path' as any;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        <Path
          d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'
          stroke={color}
          strokeWidth='1.6'
          strokeLinejoin='round'
        />
      </Svg>
    </View>
  );
}

function RbiSvgIcon({ color, size }: { color: string; size: number }): React.JSX.Element {
  const Svg = 'svg' as any;
  const Path = 'path' as any;
  const Circle = 'circle' as any;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        <Path
          d='M3 17l4-8 4 4 4-6 4 10'
          stroke={color}
          strokeWidth='1.6'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <Circle cx='19' cy='17' r='2' fill={color} opacity='0.7' />
      </Svg>
    </View>
  );
}

function ExchangeSvgIcon({ color, size }: { color: string; size: number }): React.JSX.Element {
  const Svg = 'svg' as any;
  const Path = 'path' as any;
  const Circle = 'circle' as any;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        <Path
          d='M7 16V4m0 0L4 7m3-3l3 3'
          stroke={color}
          strokeWidth='1.6'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <Path
          d='M17 8v12m0 0l3-3m-3 3l-3-3'
          stroke={color}
          strokeWidth='1.6'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <Circle cx='7' cy='18' r='2' fill={color} opacity='0.5' />
        <Circle cx='17' cy='6' r='2' fill={color} opacity='0.5' />
      </Svg>
    </View>
  );
}

const STEP_SVG_ICONS = [WalletSvgIcon, ImpactSvgIcon, RbiSvgIcon, ExchangeSvgIcon] as const;

// ── AnimatedBullet — slides + fades in on entrance ────────────────────────────
function AnimatedBullet({
  text,
  index,
  isActive,
  accentColor,
  isDark,
}: {
  text: string;
  index: number;
  isActive: boolean;
  accentColor: string;
  isDark: boolean;
}): React.JSX.Element {
  const translateX = useRef(new Animated.Value(isActive ? 0 : -14)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const dotScale = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.delay(index * 90),
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            tension: 130,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.spring(dotScale, {
            toValue: 1,
            friction: 5,
            tension: 220,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -14, duration: 160, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive, index, translateX, opacity, dotScale]);

  const descColor = isDark ? 'rgba(232,232,255,0.72)' : '#475569';

  return (
    <Animated.View style={[styles.stepBenefitItem, { opacity, transform: [{ translateX }] }]}>
      <Animated.View
        style={[
          styles.stepBulletDotWrap,
          { transform: [{ scale: dotScale }], backgroundColor: `${accentColor}22` },
        ]}
      >
        <View style={[styles.stepBulletDotInner, { backgroundColor: accentColor }]} />
      </Animated.View>
      <Text style={[styles.stepBenefitText, { color: descColor }]}>{text}</Text>
    </Animated.View>
  );
}

// StepCard — used in ComoFunciona, highlights with scale + border glow
// ─────────────────────────────────────────────────────────────────────────────
interface StepCardProps {
  number: string;
  icon: React.FC<LucideProps>;
  title: string;
  description: string;
  benefits: string[];
  isActive: boolean;
  accentColor: string;
  isDark: boolean;
  isMobile: boolean;
  onPress: () => void;
  stepIndex: number;
}

function StepCard({
  number,
  title,
  description,
  benefits,
  isActive,
  accentColor,
  isDark,
  isMobile,
  onPress,
  stepIndex,
}: StepCardProps): React.JSX.Element {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(isActive ? 1 : 0.52)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;
  const titleTranslate = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(isActive ? 1.12 : 1)).current;

  const SvgIcon = STEP_SVG_ICONS[stepIndex % STEP_SVG_ICONS.length];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? (isMobile ? 1.01 : 1.03) : 1,
        friction: 6,
        tension: 160,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: isActive ? 1 : 0,
        duration: 360,
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: isActive ? 1 : 0.52,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: isActive ? 1.12 : 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }),
      ...(isActive
        ? [
            Animated.sequence([
              Animated.spring(iconScaleAnim, {
                toValue: 1.3,
                friction: 4,
                tension: 220,
                useNativeDriver: true,
              }),
              Animated.spring(iconScaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 180,
                useNativeDriver: true,
              }),
            ]),
          ]
        : [Animated.timing(iconScaleAnim, { toValue: 1, duration: 200, useNativeDriver: true })]),
      Animated.spring(titleTranslate, {
        toValue: isActive ? 0 : 4,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    isActive,
    scaleAnim,
    glowAnim,
    contentOpacity,
    iconScaleAnim,
    titleTranslate,
    badgeScale,
    isMobile,
  ]);

  const cardBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)', accentColor],
  });
  const cardBgColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
      isDark ? 'rgba(30,230,181,0.08)' : 'rgba(13,148,136,0.055)',
    ],
  });
  const iconBgColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', `${accentColor}30`],
  });

  const descColor = isDark ? 'rgba(232,232,255,0.65)' : '#64748b';
  const stepNumBg = isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
  const stepNumColor = isDark ? '#e8e8ff' : '#0f172a';
  const titleColor = isActive
    ? isDark
      ? '#e8e8ff'
      : '#0f172a'
    : isDark
    ? 'rgba(232,232,255,0.55)'
    : '#94a3b8';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.stepCardTouchable, isMobile && styles.stepCardMobile]}
    >
      <Animated.View
        style={[
          styles.stepCard,
          {
            backgroundColor: cardBgColor,
            borderColor: cardBorderColor,
            transform: [{ scale: scaleAnim }],
            opacity: contentOpacity,
          },
        ]}
      >
        {/* Top row: SVG icon + step number badge */}
        <View style={styles.stepCardTopRow}>
          <Animated.View
            style={[
              styles.stepIconBadge,
              { backgroundColor: iconBgColor, transform: [{ scale: iconScaleAnim }] },
            ]}
          >
            <SvgIcon
              color={isActive ? accentColor : isDark ? 'rgba(232,232,255,0.35)' : '#94a3b8'}
              size={22}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.stepMobileNumber,
              {
                backgroundColor: isActive ? accentColor : stepNumBg,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <Text
              style={[
                styles.stepIndicatorText,
                { color: isActive ? (isDark ? '#050510' : '#fff') : stepNumColor },
              ]}
            >
              {number}
            </Text>
          </Animated.View>
        </View>

        {/* Title with entrance animation */}
        <Animated.Text
          style={[
            styles.stepTitle,
            { color: titleColor, transform: [{ translateY: titleTranslate }] },
          ]}
        >
          {title}
        </Animated.Text>

        <Text style={[styles.stepDescription, { color: descColor }]}>{description}</Text>

        {/* Benefits — staggered animated bullets */}
        <View style={styles.stepBenefitsList}>
          {benefits.map((benefit, idx) => (
            <AnimatedBullet
              key={idx}
              text={benefit}
              index={idx}
              isActive={isActive}
              accentColor={accentColor}
              isDark={isDark}
            />
          ))}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── ComoFunciona section with auto-loop ───────────────────────────────────────
function ComoFuncionaSection({
  isDark,
  accentColor,
  textColor,
  isMobile,
}: SectionProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [activeStep, setActiveStep] = useState(0);
  const loopTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Section fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const steps = [
    {
      number: '1',
      icon: LeafIcon,
      title: t('landing.comoFunciona.steps.s1.title'),
      description: t('landing.comoFunciona.steps.s1.description'),
      benefits: [
        t('landing.comoFunciona.steps.s1.b1'),
        t('landing.comoFunciona.steps.s1.b2'),
        t('landing.comoFunciona.steps.s1.b3'),
      ],
    },
    {
      number: '2',
      icon: ZapIcon,
      title: t('landing.comoFunciona.steps.s2.title'),
      description: t('landing.comoFunciona.steps.s2.description'),
      benefits: [
        t('landing.comoFunciona.steps.s2.b1'),
        t('landing.comoFunciona.steps.s2.b2'),
        t('landing.comoFunciona.steps.s2.b3'),
      ],
    },
    {
      number: '3',
      icon: TrendingUpIcon,
      title: t('landing.comoFunciona.steps.s3.title'),
      description: t('landing.comoFunciona.steps.s3.description'),
      benefits: [
        t('landing.comoFunciona.steps.s3.b1'),
        t('landing.comoFunciona.steps.s3.b2'),
        t('landing.comoFunciona.steps.s3.b3'),
      ],
    },
    {
      number: '4',
      icon: ShoppingBagIcon,
      title: t('landing.comoFunciona.steps.s4.title'),
      description: t('landing.comoFunciona.steps.s4.description'),
      benefits: [
        t('landing.comoFunciona.steps.s4.b1'),
        t('landing.comoFunciona.steps.s4.b2'),
        t('landing.comoFunciona.steps.s4.b3'),
      ],
    },
  ];

  // Start/restart the auto-loop
  const startLoop = useCallback(() => {
    if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    loopTimerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, STEP_LOOP_INTERVAL);
  }, [steps.length]);

  useEffect(() => {
    startLoop();
    return () => {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    };
  }, [startLoop]);

  const handleStepPress = useCallback(
    (idx: number) => {
      setActiveStep(idx);
      // Restart auto-loop after 8 s idle
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
      loopTimerRef.current = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % steps.length);
      }, STEP_LOOP_INTERVAL);
    },
    [steps.length]
  );

  const bgColor = isDark ? '#050510' : '#f6f8fc';
  const connectorColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)';
  const stepNumBg = isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
  const stepNumColor = isDark ? '#e8e8ff' : '#0f172a';
  const descriptionColor = isDark ? 'rgba(232,232,255,0.65)' : '#64748b';

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STEP_LOOP_INTERVAL,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [activeStep, progressAnim]);

  return (
    <Animated.View
      style={[
        styles.comoFuncionaSection,
        { backgroundColor: bgColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header */}
      <View style={styles.comoFuncionaHeader}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          {t('landing.comoFunciona.sectionTitle')}
        </Text>
        <Text style={[styles.comoFuncionaSubtitle, { color: descriptionColor }]}>
          {t('landing.comoFunciona.subtitle')}
        </Text>
      </View>

      {/* Step indicators with connector line — desktop only */}
      {!isMobile && (
        <View style={styles.stepIndicatorsRow}>
          <View style={[styles.stepConnectorLine, { backgroundColor: connectorColor }]} />
          {/* Active progress overlay */}
          <Animated.View
            style={[
              styles.stepConnectorProgress,
              {
                backgroundColor: accentColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${(activeStep / (steps.length - 1)) * 100}%`],
                }),
              },
            ]}
          />
          {steps.map((step, idx) => (
            <TouchableOpacity
              key={step.number}
              style={styles.stepIndicatorCell}
              onPress={() => handleStepPress(idx)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.stepIndicatorBadge,
                  {
                    backgroundColor: idx === activeStep ? accentColor : stepNumBg,
                    borderColor: idx <= activeStep ? accentColor : 'transparent',
                    borderWidth: 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepIndicatorText,
                    { color: idx === activeStep ? (isDark ? '#050510' : '#fff') : stepNumColor },
                  ]}
                >
                  {step.number}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Progress bar (mobile only) */}
      {isMobile && (
        <View style={[styles.mobileProgressTrack, { backgroundColor: connectorColor }]}>
          <Animated.View
            style={[
              styles.mobileProgressFill,
              {
                backgroundColor: accentColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      )}

      {/* Step cards */}
      <View style={[styles.stepsContainer, isMobile && styles.stepsContainerMobile]}>
        {steps.map((step, idx) => (
          <StepCard
            key={step.number}
            number={step.number}
            icon={step.icon}
            title={step.title}
            description={step.description}
            benefits={step.benefits}
            isActive={idx === activeStep}
            accentColor={accentColor}
            isDark={isDark}
            isMobile={isMobile}
            onPress={() => handleStepPress(idx)}
            stepIndex={idx}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlaceCard — image carousel + press-scale + top-rated badge
// ─────────────────────────────────────────────────────────────────────────────
interface PlaceCardData {
  images: ImageSourcePropType[];
  tags: string[];
  rating: number;
  title: string;
  meta: string;
  isTopRated?: boolean;
  description: string;
  atnLabel: string;
  atnUnit: string;
  ctaLabel: string;
  topRatedLabel: string;
  accentColor: string;
  isDark: boolean;
  onPress?: () => void;
}

const CARD_AUTO_SLIDE_MS = 3000;
const OVERLAY_HIDE_DELAY_MS = 2500;

function PlaceCard({
  images,
  tags,
  rating,
  title,
  meta,
  isTopRated,
  description,
  atnLabel,
  atnUnit,
  ctaLabel,
  topRatedLabel,
  accentColor,
  isDark,
  onPress,
}: PlaceCardData): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Card mount fade-in
  useEffect(() => {
    Animated.timing(fadeInAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Auto-slide gallery
  useEffect(() => {
    if (images.length <= 1) return;
    autoSlideRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, CARD_AUTO_SLIDE_MS);
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    };
  }, [images.length]);

  // Overlay show/hide animation
  const showOverlay = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setOverlayVisible(true);
    Animated.timing(overlayAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    hideTimerRef.current = setTimeout(() => {
      Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setOverlayVisible(false)
      );
    }, OVERLAY_HIDE_DELAY_MS);
  }, [overlayAnim]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    },
    []
  );

  const currentImage = images[currentIndex] ?? images[0] ?? TOKEN_IMAGES.rbi;

  const cardBgColor = isDark ? '#141420' : '#ffffff';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)';
  const titleColor = isDark ? '#e8e8ff' : '#0f172a';
  const descColor = isDark ? 'rgba(232,232,255,0.65)' : '#64748b';
  const metaColor = isDark ? 'rgba(232,232,255,0.45)' : '#94a3b8';

  const manualChangeImage = useCallback(
    (dir: number) => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
      setCurrentIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return images.length - 1;
        if (next >= images.length) return 0;
        return next;
      });
      // restart auto-slide
      autoSlideRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, CARD_AUTO_SLIDE_MS);
      showOverlay();
    },
    [images.length, showOverlay]
  );

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
    showOverlay();
  }, [scaleAnim, showOverlay]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.placeCard,
        {
          backgroundColor: cardBgColor,
          borderColor: cardBorderColor,
          transform: [{ scale: scaleAnim }],
          opacity: fadeInAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.placeCardTouchable}
      >
        {/* Image carousel */}
        <View style={styles.placeCardImageWrap}>
          <Image source={currentImage} style={styles.placeCardImage} resizeMode='cover' />

          {/* Overlay controls — visible only when user interacts */}
          {overlayVisible && (
            <Animated.View
              style={[styles.imageOverlay, { opacity: overlayAnim }]}
              pointerEvents='box-none'
            >
              {/* Tags top-left */}
              <View style={styles.placeCardTagsRow} pointerEvents='none'>
                {tags.map((tag) => (
                  <View key={tag} style={styles.placeCardTag}>
                    <Text style={styles.placeCardTagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Rating top-right */}
              <View style={styles.placeCardRatingBadge} pointerEvents='none'>
                <StarIcon size={12} color='#facc15' strokeWidth={0} fill='#facc15' />
                <Text style={styles.placeCardRatingText}>{rating}</Text>
              </View>

              {/* Prev/Next arrows */}
              {images.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.carouselArrow, styles.carouselArrowLeft]}
                    onPress={() => manualChangeImage(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <ChevronLeftIcon size={18} color='#fff' strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.carouselArrow, styles.carouselArrowRight]}
                    onPress={() => manualChangeImage(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <ChevronRightIcon size={18} color='#fff' strokeWidth={2.5} />
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          )}

          {/* Pagination dots — always visible, small */}
          {images.length > 1 && (
            <View style={styles.paginationDotsRow} pointerEvents='none'>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.paginationDot,
                    idx === currentIndex
                      ? styles.paginationDotActive
                      : styles.paginationDotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.placeCardBody}>
          <View style={styles.placeCardTitleRow}>
            <Text style={[styles.placeCardTitle, { color: titleColor }]} numberOfLines={1}>
              {title}
            </Text>
            {isTopRated && (
              <View style={[styles.topRatedBadge, { borderColor: accentColor }]}>
                <Text style={[styles.topRatedText, { color: accentColor }]}>{topRatedLabel}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.placeCardMeta, { color: metaColor }]}>{meta}</Text>
          <Text style={[styles.placeCardDescription, { color: descColor }]} numberOfLines={3}>
            {description}
          </Text>
          <View style={styles.placeCardFooter}>
            {/* ATN price with coin logo */}
            <View style={styles.placeCardPriceRow}>
              <AirsBrandMark
                size={18}
                fillColor={accentColor}
                cutoutColor={isDark ? '#050510' : '#ffffff'}
              />
              <Text style={[styles.placeCardPrice, { color: titleColor }]}>
                {atnLabel}{' '}
                <Text style={[styles.placeCardPriceSub, { color: metaColor }]}>{atnUnit}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.placeCardButton, { backgroundColor: accentColor }]}
              onPress={onPress}
              activeOpacity={0.82}
            >
              <Text style={[styles.placeCardButtonText, { color: isDark ? '#050510' : '#fff' }]}>
                {ctaLabel}
              </Text>
              <ArrowRightIcon size={14} color={isDark ? '#050510' : '#fff'} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── BeneficiosSection ─────────────────────────────────────────────────────────
function BeneficiosSection({
  isDark,
  accentColor,
  textColor,
  isMobile,
}: SectionProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const topRatedLabel = t('landing.beneficios.topRated');
  const atnUnit = t('landing.beneficios.atnUnit');
  const ctaLabel = t('landing.beneficios.cta');

  const benefits = [
    {
      key: 'eco',
      images: BENEFIT_IMAGES.eco,
      tags: [t('landing.beneficios.cards.eco.tag1'), t('landing.beneficios.cards.eco.tag2')],
      rating: 4.8,
      title: t('landing.beneficios.cards.eco.title'),
      meta: t('landing.beneficios.cards.eco.meta'),
      isTopRated: true,
      description: t('landing.beneficios.cards.eco.description'),
      atnLabel: t('landing.beneficios.cards.eco.atn'),
    },
    {
      key: 'experiencias',
      images: BENEFIT_IMAGES.experiencias,
      tags: [
        t('landing.beneficios.cards.experiencias.tag1'),
        t('landing.beneficios.cards.experiencias.tag2'),
      ],
      rating: 4.9,
      title: t('landing.beneficios.cards.experiencias.title'),
      meta: t('landing.beneficios.cards.experiencias.meta'),
      isTopRated: false,
      description: t('landing.beneficios.cards.experiencias.description'),
      atnLabel: t('landing.beneficios.cards.experiencias.atn'),
    },
    {
      key: 'premium',
      images: BENEFIT_IMAGES.premium,
      tags: [
        t('landing.beneficios.cards.premium.tag1'),
        t('landing.beneficios.cards.premium.tag2'),
      ],
      rating: 4.7,
      title: t('landing.beneficios.cards.premium.title'),
      meta: t('landing.beneficios.cards.premium.meta'),
      isTopRated: false,
      description: t('landing.beneficios.cards.premium.description'),
      atnLabel: t('landing.beneficios.cards.premium.atn'),
    },
    {
      key: 'cursos',
      images: BENEFIT_IMAGES.cursos,
      tags: [t('landing.beneficios.cards.cursos.tag1'), t('landing.beneficios.cards.cursos.tag2')],
      rating: 4.6,
      title: t('landing.beneficios.cards.cursos.title'),
      meta: t('landing.beneficios.cards.cursos.meta'),
      isTopRated: false,
      description: t('landing.beneficios.cards.cursos.description'),
      atnLabel: t('landing.beneficios.cards.cursos.atn'),
    },
  ];

  return (
    <Animated.View
      style={[
        styles.section,
        {
          backgroundColor: isDark ? '#050510' : '#f6f8fc',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        {t('landing.beneficios.sectionTitle')}
      </Text>
      <Text
        style={[styles.beneficiosSubtitle, { color: isDark ? 'rgba(232,232,255,0.7)' : '#64748b' }]}
      >
        {t('landing.beneficios.subtitle')}
      </Text>

      <View
        style={[styles.benefitsCardsContainer, isMobile && styles.benefitsCardsContainerMobile]}
      >
        {benefits.map((benefit) => (
          <PlaceCard
            key={benefit.key}
            images={benefit.images}
            tags={benefit.tags}
            rating={benefit.rating}
            title={benefit.title}
            meta={benefit.meta}
            isTopRated={benefit.isTopRated}
            description={benefit.description}
            atnLabel={benefit.atnLabel}
            atnUnit={atnUnit}
            ctaLabel={ctaLabel}
            topRatedLabel={topRatedLabel}
            accentColor={accentColor}
            isDark={isDark}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = createTypographyStyles({
  publicLandingContainer: {
    flex: 1,
  },
  stickyNavBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    zIndex: 50,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  navItem: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  navAvatar: {
    marginLeft: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 48,
    gap: 28,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
  },

  // ── TravelCard (TokenCard) ───────────────────────────────────────────────────
  tokenCardsContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  tokenCardsContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  travelCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 12,
  },
  travelCardImage: {
    height: 220,
    justifyContent: 'flex-end',
  },
  travelCardGradientBottom: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 36,
    // Strong gradient for dark-mode contrast — white text always legible
    backgroundColor: 'rgba(0,0,0,0.75)',
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0) 100%)',
  },
  travelCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  travelCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  travelCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  travelCardOverview: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    color: 'rgba(255,255,255,0.92)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── ComoFunciona ─────────────────────────────────────────────────────────────
  comoFuncionaSection: {
    paddingHorizontal: 20,
    paddingVertical: 48,
    gap: 32,
  },
  comoFuncionaHeader: {
    alignItems: 'center',
    gap: 12,
  },
  comoFuncionaSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 560,
  },
  stepIndicatorsRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: -16,
    height: 36,
  },
  stepConnectorLine: {
    position: 'absolute',
    left: '12.5%',
    right: '12.5%',
    height: 1,
    top: '50%',
  },
  stepConnectorProgress: {
    position: 'absolute',
    left: '12.5%',
    height: 2,
    top: '50%',
    borderRadius: 1,
  },
  stepIndicatorCell: {
    flex: 1,
    alignItems: 'center',
    zIndex: 2,
  },
  stepIndicatorBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mobileProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  mobileProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stepsContainerMobile: {
    flexDirection: 'column',
  },
  stepCardTouchable: {
    flex: 1,
    minWidth: 200,
    maxWidth: 280,
  },
  stepCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 10,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  stepCardMobile: {
    minWidth: '100%',
    maxWidth: '100%',
  },
  stepCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepMobileNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  stepDescription: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
  stepBenefitsList: {
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  stepBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBulletDotWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepBulletDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  // kept for backwards compat if referenced elsewhere
  stepBenefitDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  stepBenefitDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepBenefitText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },

  // ── PlaceCard (Beneficios) ────────────────────────────────────────────────────
  beneficiosSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -12,
  },
  benefitsCardsContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  benefitsCardsContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  placeCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  placeCardTouchable: {
    flex: 1,
  },
  placeCardImageWrap: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  placeCardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  carouselArrowLeft: { left: 8 },
  carouselArrowRight: { right: 8 },
  placeCardTagsRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
    zIndex: 3,
  },
  placeCardTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(15,15,30,0.6)',
  },
  placeCardTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  placeCardRatingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(15,15,30,0.6)',
    zIndex: 3,
  },
  placeCardRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  paginationDotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    zIndex: 3,
  },
  paginationDot: {
    height: 5,
    borderRadius: 3,
  },
  paginationDotActive: { width: 14, backgroundColor: '#fff' },
  paginationDotInactive: { width: 5, backgroundColor: 'rgba(255,255,255,0.45)' },
  placeCardBody: {
    padding: 16,
    gap: 8,
  },
  placeCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  placeCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  topRatedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  topRatedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  placeCardMeta: {
    fontSize: 12,
    fontWeight: '400',
  },
  placeCardDescription: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  placeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  placeCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeCardPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  placeCardPriceSub: {
    fontSize: 12,
    fontWeight: '400',
  },
  placeCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  placeCardButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

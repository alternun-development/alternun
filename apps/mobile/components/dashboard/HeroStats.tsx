import React, { useState } from 'react';
import { View, ImageBackground, Animated, type ImageSourcePropType } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { HeroPanel } from '@alternun/ui';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { useAppTranslation } from '../i18n/useAppTranslation';

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, @typescript-eslint/no-var-requires
const DASHBOARD_BG =
  require('../../assets/images/pexels-shella-mijos-2438861-5068057@2x-dashboard.png') as ImageSourcePropType; // eslint-disable-line
// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const DASHBOARD_MARK = require('../../assets/SVGs/airs-hero-dashboard.svg') as number;

interface HeroStatsProps {
  totalAIRS: number | null;
  activePositions: number | null;
  tokensHeld: number | null;
  compensationsCompleted: number | null;
  isLoading?: boolean;
  onReload?: () => void;
  previewMode?: boolean;
  isDark?: boolean;
  displayName?: string;
}

export default function HeroStats({
  totalAIRS,
  isLoading = false,
  onReload,
  previewMode = false,
  isDark = true,
  displayName,
}: HeroStatsProps): React.JSX.Element {
  const { motionLevel } = useAppPreferences();
  const t = useAppTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (imageLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [imageLoaded, fadeAnim]);

  const heroImageScale = isDark ? 1 : 1.03;
  const heroImageTranslateY = isDark ? 0 : -12;
  const heroImageBackgroundColor = isDark ? '#0a0f0d' : '#08231f';
  const heroImageOpacity = isDark ? 0.95 : 1;

  // Get localized strings (use fallback defaults matching original Spanish)
  const subtitle = t.t('dashboard.heroPanel.subtitle');
  const statusLabel = t.t('dashboard.heroPanel.statusLabel');
  const progressLabel = `${t.t('dashboard.heroPanel.progressTo')} —`;
  const progressHint = t.t('dashboard.heroPanel.progressHint');
  const maxTierMessage = t.t('dashboard.heroPanel.maxTierReached');
  const heroBrandMark = (
    <ExpoImage source={DASHBOARD_MARK} style={{ width: 58, height: 58 }} contentFit='contain' />
  );

  return (
    <View style={{ marginHorizontal: 12, marginBottom: 12 }}>
      {/* Blur placeholder while loading */}
      {!imageLoaded && (
        <View
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: isDark ? '#0a0f0d' : '#e8f3f0',
            height: 280,
          }}
        />
      )}

      {/* Image with fade-in animation */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        <ImageBackground
          source={DASHBOARD_BG}
          onLoad={() => setImageLoaded(true)}
          style={{ borderRadius: 20, overflow: 'hidden', minHeight: 280 }}
          imageStyle={{
            resizeMode: 'cover',
            borderRadius: 20,
            backgroundColor: heroImageBackgroundColor,
            opacity: heroImageOpacity,
            transform: [{ scale: heroImageScale }, { translateY: heroImageTranslateY }],
            width: '100%',
            height: '100%',
          }}
          progressiveRenderingEnabled
        >
          <HeroPanel
            displayName={displayName}
            score={totalAIRS}
            isLoading={isLoading}
            onReload={onReload}
            previewMode={previewMode}
            isDark={isDark}
            motionLevel={motionLevel}
            brandMark={heroBrandMark}
            subtitle={subtitle}
            statusLabel={statusLabel}
            progressLabel={progressLabel}
            progressHint={progressHint}
            maxTierMessage={maxTierMessage}
            reloadButtonLabel={t.t('dashboard.heroPanel.reloadButton')}
            statusInfoButtonLabel={t.t('dashboard.heroPanel.statusInfoButton')}
            tooltipTitle={t.t('dashboard.heroPanel.statusInfo')}
            tooltipUpdatedLabel={t.t('dashboard.heroPanel.updatedAt')}
            tooltipValidUntilLabel={t.t('dashboard.heroPanel.validUntil')}
          />
        </ImageBackground>
      </Animated.View>
    </View>
  );
}

import React, { useState } from 'react';
import { View, ImageBackground, Animated, type ImageSourcePropType } from 'react-native';
import { HeroPanel } from '@alternun/ui';
import AirsBrandMark from '../branding/AirsBrandMark';
import { palette } from '@alternun/ui';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { useAppTranslation } from '../i18n/useAppTranslation';

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, @typescript-eslint/no-var-requires
const DASHBOARD_BG =
  require('../../assets/images/pexels-shella-mijos-2438861-5068057@2x-dashboard.png') as ImageSourcePropType; // eslint-disable-line

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

  const markFill = isDark ? palette.teal : palette.tealDark;
  const markCutout = isDark ? '#050f0c' : '#eaf8f3';

  // Get localized strings (use fallback defaults matching original Spanish)
  const subtitle = t.t('dashboard.heroPanel.subtitle');
  const statusLabel = t.t('dashboard.heroPanel.statusLabel');
  const progressLabel = `${t.t('dashboard.heroPanel.progressTo')} —`;
  const progressHint = t.t('dashboard.heroPanel.progressHint');
  const maxTierMessage = t.t('dashboard.heroPanel.maxTierReached');

  return (
    <View style={{ marginHorizontal: 12 }}>
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
            backgroundColor: isDark ? '#0a0f0d' : '#e8f3f0',
            opacity: 0.95,
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
            animateOrbs={motionLevel !== 'off'}
            brandMark={<AirsBrandMark size={44} fillColor={markFill} cutoutColor={markCutout} />}
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

import React from 'react';
import { View, ImageBackground, type ImageSourcePropType } from 'react-native';
import { HeroPanel } from '@alternun/ui';
import AirsBrandMark from '../branding/AirsBrandMark';
import { palette } from '@alternun/ui';
import { useAppPreferences } from '../settings/AppPreferencesProvider';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const DASHBOARD_BG =
  require('../../assets/images/pexels-shella-mijos-2438861-5068057@2x-dashboard.png') as ImageSourcePropType;

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
  const markFill = isDark ? palette.teal : palette.tealDark;
  const markCutout = isDark ? '#050f0c' : '#eaf8f3';

  return (
    <View style={{ marginHorizontal: 12 }}>
      <ImageBackground
        source={DASHBOARD_BG}
        style={{ borderRadius: 20, overflow: 'hidden' }}
        imageStyle={{
          resizeMode: 'cover',
          borderRadius: 20,
        }}
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
        />
      </ImageBackground>
    </View>
  );
}

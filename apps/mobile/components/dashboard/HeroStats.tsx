import React from 'react';
import { View } from 'react-native';
import { HeroPanel } from '@alternun/ui';
import AirsBrandMark from '../branding/AirsBrandMark';
import { palette } from '@alternun/ui';
import { useAppPreferences } from '../settings/AppPreferencesProvider';

interface HeroStatsProps {
  totalAIRS: number | null;
  activePositions: number | null;
  tokensHeld: number | null;
  compensationsCompleted: number | null;
  isLoading?: boolean;
  previewMode?: boolean;
  isDark?: boolean;
  displayName?: string;
}

export default function HeroStats({
  totalAIRS,
  isLoading = false,
  previewMode = false,
  isDark = true,
  displayName,
}: HeroStatsProps) {
  const { motionLevel } = useAppPreferences();
  const markFill = isDark ? palette.teal : palette.tealDark;
  const markCutout = isDark ? '#050f0c' : '#eaf8f3';

  return (
    <View style={{ marginHorizontal: 12 }}>
      <HeroPanel
        displayName={displayName}
        score={totalAIRS}
        isLoading={isLoading}
        previewMode={previewMode}
        isDark={isDark}
        animateOrbs={motionLevel !== 'off'}
        brandMark={<AirsBrandMark size={44} fillColor={markFill} cutoutColor={markCutout} />}
      />
    </View>
  );
}

import React from 'react';
import { View } from 'react-native';
import { TrendingUp, Layers, Coins, CheckCircle } from 'lucide-react-native';
import { StatCard, StatCardSkeleton, ThemeProvider } from '@alternun/ui';

interface HeroStatsProps {
  totalAIRS: number | null;
  activePositions: number | null;
  tokensHeld: number | null;
  compensationsCompleted: number | null;
  /** When true, all cards render as skeletons */
  isLoading?: boolean;
  previewMode?: boolean;
  isDark?: boolean;
}

function formatMetric(value: number | null): string {
  if (typeof value !== 'number') return '--';
  return value.toLocaleString();
}

function HeroStatsInner({
  totalAIRS,
  activePositions,
  tokensHeld,
  compensationsCompleted,
  isLoading = false,
  previewMode = false,
  isDark = true,
}: HeroStatsProps) {
  const deltaLabel = previewMode ? 'LOCKED' : '+0';
  const deltaPositive = !previewMode;

  const stats = [
    {
      label: 'Total Airs Earned',
      value: formatMetric(totalAIRS),
      color: '#1ccba1',
      icon: <TrendingUp size={16} color='#1ccba1' />,
    },
    {
      label: 'Active Positions',
      value: formatMetric(activePositions),
      color: '#818cf8',
      icon: <Layers size={16} color='#818cf8' />,
    },
    {
      label: 'Tokens Held',
      value: formatMetric(tokensHeld),
      color: '#f59e0b',
      icon: <Coins size={16} color='#f59e0b' />,
    },
    {
      label: 'Compensations',
      value: formatMetric(compensationsCompleted),
      color: '#34d399',
      icon: <CheckCircle size={16} color='#34d399' />,
    },
  ];

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
      {/* Mesh gradient accent */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: '25%',
          right: '25%',
          height: '100%',
          borderRadius: 100,
          backgroundColor: isDark ? 'rgba(28,203,161,0.04)' : 'rgba(15,118,110,0.08)',
        }}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {stats.map((stat) =>
          isLoading ? (
            <StatCardSkeleton key={stat.label} />
          ) : (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              delta={deltaLabel}
              deltaPositive={deltaPositive}
              accentColor={stat.color}
              icon={stat.icon}
            />
          )
        )}
      </View>
    </View>
  );
}

export default function HeroStats(props: HeroStatsProps) {
  const mode = props.isDark === false ? 'light' : 'dark';
  return (
    <ThemeProvider mode={mode}>
      <HeroStatsInner {...props} />
    </ThemeProvider>
  );
}

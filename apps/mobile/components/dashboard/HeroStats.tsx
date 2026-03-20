import React from 'react';
import { View, Text } from 'react-native';
import { createTypographyStyles } from '../theme/typography';
import { TrendingUp, Layers, Coins, CheckCircle } from 'lucide-react-native';

interface HeroStatsProps {
  totalAIRS: number | null;
  activePositions: number | null;
  tokensHeld: number | null;
  compensationsCompleted: number | null;
  previewMode?: boolean;
  isDark?: boolean;
}

function formatMetric(value: number | null): string {
  if (typeof value !== 'number') {
    return '--';
  }

  return value.toLocaleString();
}

export default function HeroStats({
  totalAIRS,
  activePositions,
  tokensHeld,
  compensationsCompleted,
  previewMode = false,
  isDark = true,
}: HeroStatsProps) {
  const deltaLabel = previewMode ? 'LOCKED' : '+0';
  const palette = isDark
    ? {
        mesh: 'rgba(28,203,161,0.04)',
        cardBg: 'rgba(255,255,255,0.04)',
        cardBorder: 'rgba(255,255,255,0.08)',
        value: '#e8e8ff',
        label: 'rgba(232,232,255,0.7)',
      }
    : {
        mesh: 'rgba(15,118,110,0.08)',
        cardBg: '#ffffff',
        cardBorder: 'rgba(15,23,42,0.14)',
        value: '#0f172a',
        label: '#334155',
      };

  const stats = [
    {
      label: 'Total Airs Earned',
      value: formatMetric(totalAIRS),
      delta: deltaLabel,
      positive: !previewMode,
      icon: TrendingUp,
      color: '#1ccba1',
    },
    {
      label: 'Active Positions',
      value: formatMetric(activePositions),
      delta: deltaLabel,
      positive: !previewMode,
      icon: Layers,
      color: '#818cf8',
    },
    {
      label: 'Tokens Held',
      value: formatMetric(tokensHeld),
      delta: deltaLabel,
      positive: !previewMode,
      icon: Coins,
      color: '#f59e0b',
    },
    {
      label: 'Compensations',
      value: formatMetric(compensationsCompleted),
      delta: deltaLabel,
      positive: !previewMode,
      icon: CheckCircle,
      color: '#34d399',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.meshGradient, { backgroundColor: palette.mesh }]} />
      <View style={styles.grid}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <View
              key={stat.label}
              style={[
                styles.card,
                { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconBg, { backgroundColor: `${stat.color}18` }]}>
                  <Icon size={16} color={stat.color} />
                </View>
                <View
                  style={[
                    styles.delta,
                    stat.positive ? styles.deltaPositive : styles.deltaNegative,
                  ]}
                >
                  <Text
                    style={[
                      styles.deltaText,
                      stat.positive ? styles.deltaTextPositive : styles.deltaTextNegative,
                    ]}
                  >
                    {stat.delta}
                  </Text>
                </View>
              </View>
              <Text style={[styles.value, { color: palette.value }]}>{stat.value}</Text>
              <Text style={[styles.label, { color: palette.label }]}>{stat.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = createTypographyStyles({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    position: 'relative',
  },
  meshGradient: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: '100%',
    borderRadius: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#00001e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 5,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delta: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  deltaPositive: {
    backgroundColor: 'rgba(28,203,161,0.12)',
  },
  deltaNegative: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deltaTextPositive: {
    color: '#1ccba1',
  },
  deltaTextNegative: {
    color: '#ef4444',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
  },
});

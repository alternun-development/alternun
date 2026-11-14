import React from 'react';
import { Text, View } from 'react-native';
import { MetricInfoTooltip } from '../dashboard/MetricInfoTooltip';
import type { ProfileStatsProps } from './ProfileStats.types';

/**
 * The figures under the profile name (Airs, projects, CO₂). Each label has the same info
 * button as the dashboard metrics, which explains what the figure means.
 */
export default function ProfileStats({
  items,
  isDark,
  c,
  openInfoLabel,
  closeInfoLabel,
}: ProfileStatsProps): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 ? (
            <View style={{ width: 1, backgroundColor: c.muted, opacity: 0.18, height: 40 }} />
          ) : null}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: -0.02,
                color: c.text,
                fontFamily: 'monospace',
              }}
            >
              {item.value}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: c.muted,
                  letterSpacing: 0.08,
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </Text>
              <MetricInfoTooltip
                testID={`profile-stat-info-${item.key}`}
                title={item.info.title}
                accessibilityLabel={openInfoLabel(item.label)}
                description={item.info.description}
                closeLabel={closeInfoLabel}
                isDark={isDark}
              />
            </View>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

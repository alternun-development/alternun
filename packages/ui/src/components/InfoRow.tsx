/**
 * InfoRow — Alternun Design System
 *
 * A label / value pair displayed on one line with space-between layout.
 * Covers the pattern repeated across PoolVault, CertificateGallery, TokenPortfolio modals.
 *
 * Usage:
 *   <InfoRow label="Position"   value="POS-000" />
 *   <InfoRow label="Total Value" value="$0.00" valueAccent />
 *   <InfoRow label="Status"     value="Active" valueBold />
 *   <InfoRow label="Sold"       value="0.0%" spacing={8} />
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, spacing as sp } from '../tokens/spacing';

export interface InfoRowProps {
  label: string;
  value: string | number;
  /** Renders value in accent (teal) colour */
  valueAccent?: boolean;
  /** Renders value in bold */
  valueBold?: boolean;
  /** Bottom margin */
  spacing?: number;
  style?: ViewStyle;
}

export function InfoRow({
  label,
  value,
  valueAccent = false,
  valueBold = false,
  spacing: marginBottom = 0,
  style,
}: InfoRowProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, { marginBottom }, style]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <Text
        style={[
          styles.value,
          {
            color: valueAccent ? theme.accent : theme.textPrimary,
            fontWeight: valueBold ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sp[2],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flexShrink: 0,
  },
  value: {
    fontSize: fontSize.sm,
    flexShrink: 1,
    textAlign: 'right',
  },
});

import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SectionHeaderSkeleton } from './SkeletonLoader';
import { radius, spacing, fontSize } from '../tokens/spacing';

interface SectionContainerProps {
  title: string;
  subtitle?: string;
  /** Optional badge count or action element */
  trailing?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function SectionContainer({
  title,
  subtitle,
  trailing,
  children,
  isLoading = false,
  style,
  contentStyle,
}: SectionContainerProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
        style,
      ]}
    >
      {isLoading ? (
        <SectionHeaderSkeleton />
      ) : (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
            ) : null}
          </View>
          {trailing}
        </View>
      )}

      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: 'Sculpin-Bold',
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    marginTop: 2,
  },
});

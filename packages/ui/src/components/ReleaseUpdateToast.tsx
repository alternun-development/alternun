import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { RotateCcw, type LucideProps } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, spacing } from '../tokens/spacing';
import { useWindowDimensions } from 'react-native';

const UpdateIcon = RotateCcw as React.FC<LucideProps>;

export interface ReleaseUpdateToastProps {
  eyebrow?: string;
  title: string;
  message: string;
  laterLabel?: string;
  reloadLabel?: string;
  bottomOffset?: number;
  onLater: () => void;
  onReload: () => void;
}

export function ReleaseUpdateToast({
  eyebrow = 'Update available',
  title,
  message,
  laterLabel = 'Later',
  reloadLabel = 'Reload',
  bottomOffset = 24,
  onLater,
  onReload,
}: ReleaseUpdateToastProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 540;
  const webFixedPositionStyle =
    Platform.OS === 'web' ? ({ position: 'fixed' } as unknown as ViewStyle) : undefined;
  const compactButtonStyle = isCompact ? styles.buttonStack : null;

  return (
    <View
      pointerEvents='box-none'
      style={[styles.root, webFixedPositionStyle, { bottom: bottomOffset }]}
    >
      <View
        accessibilityRole='alert'
        accessibilityLiveRegion='polite'
        style={[
          styles.card,
          {
            backgroundColor: theme.isDark ? 'rgba(5,5,16,0.94)' : 'rgba(255,255,255,0.96)',
            borderColor: theme.noticeBorder,
            shadowColor: theme.isDark ? '#000000' : '#0f172a',
          },
        ]}
      >
        <View style={styles.copyRow}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: theme.accentMuted,
                borderColor: theme.noticeBorder,
              },
            ]}
          >
            <UpdateIcon size={18} color={theme.accent} strokeWidth={2.25} />
          </View>

          <View style={styles.copy}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
          </View>
        </View>

        <View style={[styles.actions, isCompact && styles.actionsStack]}>
          <Pressable
            accessibilityRole='button'
            onPress={onLater}
            style={({ pressed }) => [
              styles.secondaryButton,
              compactButtonStyle,
              {
                backgroundColor: theme.secondaryBtnBg,
                borderColor: theme.secondaryBtnBorder,
              },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryText, { color: theme.secondaryBtnText }]}>
              {laterLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole='button'
            onPress={onReload}
            style={({ pressed }) => [
              styles.primaryButton,
              compactButtonStyle,
              { backgroundColor: theme.primaryBtnBg },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.primaryText, { color: theme.primaryBtnText }]}>{reloadLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 80,
    alignItems: 'center',
    paddingHorizontal: spacing[3],
  },
  card: {
    width: '100%',
    maxWidth: 720,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 10,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Sculpin-Bold',
  },
  title: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  message: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing[4],
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionsStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
  },
  secondaryButton: {
    minWidth: 112,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonStack: {
    width: '100%',
  },
  secondaryText: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  primaryButton: {
    minWidth: 112,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.86,
  },
});

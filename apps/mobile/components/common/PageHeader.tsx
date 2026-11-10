import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PageHeaderProps, SectionHeadingProps } from './PageHeader.types';

/**
 * Compact page title shared by the Explorer and the manage views: a 36px mark (icon or back
 * button), a one-line title, an optional one-line subtitle and right-aligned actions.
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  leading,
  actions,
  palette,
  testID,
}: PageHeaderProps): React.JSX.Element {
  return (
    <View testID={testID} style={styles.row}>
      {leading ??
        (icon ? (
          <View style={[styles.mark, { backgroundColor: palette.fill }]}>{icon}</View>
        ) : null)}
      <View style={styles.copy}>
        <Text
          testID={testID ? `${testID}-title` : undefined}
          accessibilityRole='header'
          numberOfLines={1}
          style={[styles.title, { color: palette.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: palette.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

/** Title of a block inside a page (a card or a form), same scale everywhere. */
export function SectionHeading({
  title,
  trailing,
  color,
  testID,
}: SectionHeadingProps): React.JSX.Element {
  return (
    <View testID={testID} style={styles.sectionRow}>
      <Text accessibilityRole='header' style={[styles.sectionTitle, { color }]}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

/** Square icon button sized to the header mark. */
export const HEADER_BUTTON_SIZE = 36;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: HEADER_BUTTON_SIZE },
  mark: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: 'Sculpin-Bold', fontSize: 21, lineHeight: 25, letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 17 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: { fontFamily: 'Sculpin-Bold', fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
});

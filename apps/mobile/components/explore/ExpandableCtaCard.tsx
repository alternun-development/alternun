import React from 'react';
import { ArrowUpRight, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ExpandableCtaCardProps } from './types';

/** A compact call-to-action that opens into its full form in place. */
export function ExpandableCtaCard({
  testID,
  title,
  description,
  actionLabel,
  closeLabel,
  icon: Icon,
  palette,
  expanded,
  onExpandedChange,
  children,
}: ExpandableCtaCardProps): React.JSX.Element {
  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: palette.surfaceStrong, borderColor: palette.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: palette.mist }]}>
          <Icon size={22} color={palette.primary} strokeWidth={1.8} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.description, { color: palette.muted }]}>{description}</Text>
        </View>
        {expanded ? (
          <Pressable
            testID={`${testID}-close`}
            accessibilityRole='button'
            accessibilityLabel={closeLabel}
            hitSlop={8}
            onPress={() => onExpandedChange(false)}
            style={[styles.close, { borderColor: palette.border }]}
          >
            <X size={16} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>
      {expanded ? (
        <View style={styles.body}>{children}</View>
      ) : (
        <Pressable
          testID={`${testID}-open`}
          accessibilityRole='button'
          accessibilityState={{ expanded: false }}
          onPress={() => onExpandedChange(true)}
          style={[styles.action, { backgroundColor: palette.primary }]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ArrowUpRight size={16} color='#063c32' strokeWidth={2.6} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 16,
    // Same lift as the profile and dashboard section cards.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  title: { fontFamily: 'Sculpin-Bold', fontSize: 19, letterSpacing: -0.4 },
  description: { fontSize: 13, lineHeight: 19 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { gap: 12 },
  action: {
    minHeight: 46,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { color: '#063c32', fontSize: 15, fontWeight: '900' },
});

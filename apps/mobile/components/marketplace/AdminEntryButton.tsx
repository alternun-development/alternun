import React from 'react';
import { ShieldCheck } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import type { AdminEntryButtonProps } from './AdminEntryButton.types';

/** Link from Explore to the admin panel. The panel authorizes the person again on arrival. */
export function AdminEntryButton({
  label,
  url,
  color,
  borderColor,
  testID,
  openUrl = async (target) => Linking.openURL(target),
}: AdminEntryButtonProps): React.JSX.Element {
  return (
    <Pressable
      testID={testID}
      accessibilityRole='link'
      onPress={() => void openUrl(url)}
      style={[styles.button, { borderColor }]}
    >
      <ShieldCheck size={16} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
  },
  label: { fontSize: 13, fontWeight: '800' },
});

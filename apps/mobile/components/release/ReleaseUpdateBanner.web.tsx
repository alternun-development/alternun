import { useReleaseUpdate } from '@alternun/update';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: currentVersion } = require('../../package.json') as { version: string };

export default function ReleaseUpdateBanner() {
  const state = useReleaseUpdate({
    currentVersion,
    mode: process.env.EXPO_PUBLIC_RELEASE_UPDATE_MODE ?? 'auto',
  });

  const message = useMemo(() => {
    if (!state.remoteVersion) {
      return 'A newer release is ready.';
    }

    return `Release ${state.remoteVersion} is ready.`;
  }, [state.remoteVersion]);

  if (!state.enabled || !state.available) {
    return null;
  }

  return (
    <View pointerEvents='box-none' style={styles.root}>
      <View accessibilityRole='alert' style={styles.card}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Update available</Text>
          <Text style={styles.title}>{message}</Text>
          <Text style={styles.body}>Reload to pick up the latest app and worker bundle.</Text>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole='button' onPress={state.dismiss} style={styles.secondary}>
            <Text style={styles.secondaryText}>Later</Text>
          </Pressable>
          <Pressable accessibilityRole='button' onPress={state.reload} style={styles.primary}>
            <Text style={styles.primaryText}>Reload</Text>
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
    bottom: 72,
    zIndex: 60,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(28, 203, 161, 0.24)',
    backgroundColor: 'rgba(5, 5, 16, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    boxShadow: '0px 18px 36px rgba(0, 0, 0, 0.22)',
  },
  copy: {
    gap: 4,
  },
  eyebrow: {
    color: '#73f0c8',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    color: '#f5f7fa',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    color: 'rgba(245, 247, 250, 0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  secondary: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245, 247, 250, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryText: {
    color: '#f5f7fa',
    fontSize: 14,
    fontWeight: '600',
  },
  primary: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(28, 203, 161, 0.25)',
    backgroundColor: '#1ccba1',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: {
    color: '#071018',
    fontSize: 14,
    fontWeight: '700',
  },
});

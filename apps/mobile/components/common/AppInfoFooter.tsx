import Constants from 'expo-constants';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAppPreferences } from '../settings/AppPreferencesProvider';

type FooterVariant = 'layout' | 'card';

interface VersionMetadata {
  version: string;
  source: string;
}

export interface AppInfoFooterProps {
  variant?: FooterVariant;
}

function resolveVersionMetadata(): VersionMetadata {
  const nativeVersion = Constants.nativeApplicationVersion;
  const nativeBuild = Constants.nativeBuildVersion;
  const expoConfigVersion = Constants.expoConfig?.version;

  if (nativeVersion && nativeBuild) {
    return {
      version: `${nativeVersion} (${nativeBuild})`,
      source: 'nativeApplicationVersion/nativeBuildVersion',
    };
  }

  if (nativeVersion) {
    return {
      version: nativeVersion,
      source: 'nativeApplicationVersion',
    };
  }

  if (expoConfigVersion) {
    return {
      version: expoConfigVersion,
      source: 'expoConfig.version',
    };
  }

  return {
    version: 'unknown',
    source: 'unavailable',
  };
}

function resolveAuthHostLabel(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return 'not-configured';
  }

  try {
    return new URL(supabaseUrl).host;
  } catch {
    return supabaseUrl.replace(/^https?:\/\//, '').split('/')[0] ?? supabaseUrl;
  }
}

function resolveRuntimeEnv(): string {
  return process.env.EXPO_PUBLIC_ENV ?? process.env.EXPO_PUBLIC_STAGE ?? process.env.NODE_ENV ?? 'unknown';
}

export default function AppInfoFooter({ variant = 'layout' }: AppInfoFooterProps): any {
  const { themeMode } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const versionMetadata = useMemo(resolveVersionMetadata, []);
  const authHostLabel = useMemo(resolveAuthHostLabel, []);
  const runtimeEnv = useMemo(resolveRuntimeEnv, []);

  const containerStyle = variant === 'layout' ? styles.layoutContainer : styles.cardContainer;
  const primaryTextColor = isDark ? 'rgba(232,232,255,0.84)' : '#0f172a';
  const secondaryTextColor = isDark ? 'rgba(232,232,255,0.54)' : '#475569';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)';
  const backgroundColor =
    variant === 'layout'
      ? (isDark ? 'rgba(5,5,16,0.92)' : 'rgba(255,255,255,0.9)')
      : 'transparent';

  return (
    <View
      style={[
        styles.base,
        containerStyle,
        {
          borderTopColor: borderColor,
          backgroundColor,
        },
      ]}
    >
      <Text style={[styles.primaryText, { color: primaryTextColor }]}>
        AIRS v{versionMetadata.version}
      </Text>
      <Text style={[styles.secondaryText, { color: secondaryTextColor }]}>
        Source: {versionMetadata.source} | Env: {runtimeEnv} | Platform: {Platform.OS} | Auth: {authHostLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderTopWidth: 1,
    gap: 2,
  },
  layoutContainer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  cardContainer: {
    marginTop: 8,
    paddingTop: 10,
  },
  primaryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryText: {
    fontSize: 10,
    lineHeight: 14,
  },
});

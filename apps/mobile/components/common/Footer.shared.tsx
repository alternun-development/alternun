import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { Instagram, Send, Twitter, Youtube } from 'lucide-react-native';
import { Linking, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import developmentVersionManifest from '../../../../version.development.json';
import productionVersionManifest from '../../../../version.production.json';
import { useAppTranslation } from '../i18n/useAppTranslation';
import type { FooterPrimaryLink } from './AppInfoFooter.links';

export type LinkIconProps = {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
};

export type LinkIcon = React.ComponentType<LinkIconProps>;

export interface FooterLink {
  label: string;
  url: string;
  icon?: LinkIcon;
}

export interface VersionMetadata {
  version: string;
  source: string;
}

type VersionManifest = {
  version?: string | null;
  build?: number | null;
  environment?: string | null;
};

type ExpoImageSource = React.ComponentProps<typeof ExpoImage>['source'];

// Metro asset loading still relies on require() for local image modules here.
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const AIRS_LOGO_DARK = require('../../assets/SVGs/AIRS-logo-dark.svg') as ExpoImageSource;
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const AIRS_LOGO_LIGHT = require('../../assets/SVGs/AIRS-logo-light.svg') as ExpoImageSource;
// Keep footer version aligned with the branch-specific version manifest used by releases.
const DEVELOPMENT_VERSION_MANIFEST = developmentVersionManifest as VersionManifest;
const PRODUCTION_VERSION_MANIFEST = productionVersionManifest as VersionManifest;

function trimVersion(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveExpoConstantsFallback(): {
  nativeApplicationVersion?: string | null;
  nativeBuildVersion?: string | null;
} {
  try {
    // Lazy-load to avoid pulling native modules into environments that only need
    // the version manifest fallback.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoConstants = require('expo-constants') as {
      default?: {
        nativeApplicationVersion?: string | null;
        nativeBuildVersion?: string | null;
      };
    };

    return expoConstants.default ?? {};
  } catch {
    return {};
  }
}

function resolveRuntimeHostname(): string | null {
  const explicitOrigin =
    trimVersion(process.env.EXPO_PUBLIC_ORIGIN) ??
    trimVersion(typeof window !== 'undefined' ? window.location.origin : null);

  if (!explicitOrigin) {
    return null;
  }

  try {
    return new URL(explicitOrigin).hostname.trim().toLowerCase();
  } catch {
    return explicitOrigin.trim().toLowerCase();
  }
}

function isDevelopmentRuntime(hostname: string | null): boolean {
  if (!hostname) {
    return true;
  }

  return (
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('::1') ||
    hostname.includes('testnet') ||
    hostname.includes('development')
  );
}

export const SOCIAL_LINKS: FooterLink[] = [
  { label: 'Telegram', url: 'https://t.me/+4dPOLQ3otkE4NjIx#', icon: Send },
  { label: 'X', url: 'https://x.com/Alternun_io', icon: Twitter },
  { label: 'Instagram', url: 'https://www.instagram.com/Alternun.io/', icon: Instagram },
  { label: 'YouTube', url: 'https://www.youtube.com/@alternun_io', icon: Youtube },
];

export function resolveVersionMetadata(): VersionMetadata {
  const runtimeHostname = resolveRuntimeHostname();
  const developmentRuntime = isDevelopmentRuntime(runtimeHostname);
  const selectedManifest = developmentRuntime
    ? DEVELOPMENT_VERSION_MANIFEST
    : PRODUCTION_VERSION_MANIFEST;
  const selectedVersion = trimVersion(selectedManifest.version);

  if (selectedVersion) {
    return {
      version: selectedVersion,
      source: developmentRuntime ? 'version.development.json' : 'version.production.json',
    };
  }

  const expoConstants = resolveExpoConstantsFallback();
  const nativeVersion = trimVersion(expoConstants.nativeApplicationVersion);
  const nativeBuild = trimVersion(expoConstants.nativeBuildVersion);

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

  return { version: 'unknown', source: 'unavailable' };
}

export function openExternalUrl(url: string): void {
  void Linking.openURL(url).catch(() => undefined);
}

export function SocialPill({
  label,
  url,
  icon: Icon,
  iconColor,
  backgroundColor,
  borderColor,
  compact = false,
  hoverColor,
  mobileMini = false,
}: FooterLink & {
  iconColor: string;
  backgroundColor: string;
  borderColor: string;
  compact?: boolean;
  hoverColor?: string;
  mobileMini?: boolean;
}): React.JSX.Element | null {
  if (!Icon) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => openExternalUrl(url)}
      style={({ hovered, pressed }) =>
        [
          styles.socialPill,
          compact && styles.socialPillCompact,
          mobileMini && styles.socialPillMobileMini,
          hovered && styles.socialPillHovered,
          pressed && styles.socialPillPressed,
          {
            backgroundColor: pressed || hovered ? hoverColor ?? borderColor : backgroundColor,
            borderColor: hovered ? iconColor : borderColor,
          },
        ] as StyleProp<ViewStyle>
      }
    >
      <Icon size={mobileMini ? 10 : compact ? 14 : 16} color={iconColor} strokeWidth={2.1} />
    </Pressable>
  );
}

export function FooterTextLink({
  label,
  url,
  onPress,
  textColor,
  compact = false,
  hoverColor,
  align = 'left',
  singleLine = false,
  style,
}: {
  label: string;
  url: FooterPrimaryLink['url'];
  onPress?: () => void;
  textColor: string;
  compact?: boolean;
  hoverColor?: string;
  align?: 'left' | 'center';
  singleLine?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress ?? (() => openExternalUrl(url))}
      style={({ hovered, pressed }) =>
        [
          styles.textLinkPressable,
          compact && styles.textLinkPressableCompact,
          hovered && styles.textLinkPressableHovered,
          pressed && styles.textLinkPressablePressed,
          style,
        ] as StyleProp<ViewStyle>
      }
    >
      {({ hovered, pressed }) => (
        <Text
          numberOfLines={singleLine ? 1 : undefined}
          ellipsizeMode={singleLine ? 'clip' : undefined}
          style={[
            styles.textLinkText,
            compact && styles.textLinkTextCompact,
            align === 'center' && styles.textLinkTextCenter,
            hovered && styles.textLinkTextHovered,
            pressed && styles.textLinkTextPressed,
            { color: hovered ? hoverColor ?? textColor : textColor },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function FooterTopFade({
  height,
  color,
}: {
  height: number;
  color: string;
}): React.JSX.Element {
  const gradientId = React.useId().replace(/[:]/g, '');

  return (
    <View pointerEvents='none' style={[styles.footerTopFade, { height }]}>
      <Svg width='100%' height='100%' viewBox='0 0 100 100' preserveAspectRatio='none'>
        <Defs>
          <LinearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
            <Stop offset='0%' stopColor={color} stopOpacity='0' />
            <Stop offset='30%' stopColor={color} stopOpacity='0.04' />
            <Stop offset='100%' stopColor={color} stopOpacity='0.92' />
          </LinearGradient>
        </Defs>
        <Rect x='0' y='0' width='100' height='100' fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

export function FooterCopyright({ color }: { color: string }): React.JSX.Element {
  const footerYear = new Date().getFullYear();
  const [isHovered, setIsHovered] = React.useState(false);
  const { t } = useAppTranslation('mobile');

  return (
    <View onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Text style={[styles.copyrightText, { color }]}>
        {`(c) ${footerYear} `}
        <Pressable onPress={() => openExternalUrl('https://alternun.io')}>
          <Text
            style={[
              styles.copyrightText,
              { color },
              isHovered && { textDecorationLine: 'underline' },
            ]}
          >
            Alternun
          </Text>
        </Pressable>
        {'. '}
        <Text>{t('footer.copyright').split('Alternun. ')[1] || 'All rights reserved.'}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  socialPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialPillCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  socialPillMobileMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  socialPillHovered: {
    transform: [{ translateY: -1 }, { scale: 1.04 }],
    boxShadow: '0px 8px 18px rgba(30, 230, 181, 0.18)',
  },
  socialPillPressed: {
    transform: [{ scale: 0.98 }],
  },
  textLinkPressable: {
    minHeight: 22,
    justifyContent: 'center',
  },
  textLinkPressableCompact: {
    minHeight: 22,
  },
  textLinkPressableHovered: {
    transform: [{ translateY: -1 }],
  },
  textLinkPressablePressed: {
    opacity: 0.65,
  },
  textLinkText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.12,
  },
  textLinkTextCompact: {
    fontSize: 13,
  },
  textLinkTextCenter: {
    textAlign: 'center',
  },
  textLinkTextHovered: {
    textDecorationLine: 'underline',
  },
  textLinkTextPressed: {
    opacity: 0.7,
  },
  footerTopFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  copyrightText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

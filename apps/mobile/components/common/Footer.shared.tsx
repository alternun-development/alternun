import { useAppTranslation, } from '../i18n/useAppTranslation';
import Constants from 'expo-constants';
import { Image as ExpoImage, } from 'expo-image';
import React from 'react';
import {
  Instagram,
  Send,
  Twitter,
  Youtube,
} from 'lucide-react-native';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
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

type MobilePackageJson = { version?: string | null };

type ExpoImageSource = React.ComponentProps<typeof ExpoImage>['source'];

// Metro asset loading still relies on require() for local image modules here.
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const AIRS_LOGOTIPO_DARK = require('../../assets/AIRS-logotipo-dark.svg',) as ExpoImageSource;
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const AIRS_LOGOTIPO_LIGHT = require('../../assets/AIRS-logotipo-light.svg',) as ExpoImageSource;
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const ALTERNUN_POWERED_BY_LOGO = require('../../assets/logo.png',) as ExpoImageSource;
// Keep footer version aligned with the app package version used in this workspace.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MOBILE_PACKAGE = require('../../package.json',) as MobilePackageJson;

export const SOCIAL_LINKS: FooterLink[] = [
  { label: 'Telegram', url: 'https://t.me/+4dPOLQ3otkE4NjIx#', icon: Send, },
  { label: 'X', url: 'https://x.com/Alternun_io', icon: Twitter, },
  { label: 'Instagram', url: 'https://www.instagram.com/Alternun.io/', icon: Instagram, },
  { label: 'YouTube', url: 'https://www.youtube.com/@alternun_io', icon: Youtube, },
];

export function resolveVersionMetadata(): VersionMetadata {
  const packageVersion = MOBILE_PACKAGE.version?.trim();
  const nativeVersion = Constants.nativeApplicationVersion as string | null | undefined;
  const nativeBuild = Constants.nativeBuildVersion as string | null | undefined;
  const expoConfig = Constants.expoConfig as { version?: string | null | undefined } | null | undefined;
  const expoConfigVersion = expoConfig?.version;

  if (packageVersion) {
    return {
      version: packageVersion,
      source: 'apps/mobile/package.json',
    };
  }

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

export function openExternalUrl(url: string,): void {
  void Linking.openURL(url,).catch(() => undefined,);
}

export function SocialPill({
  label,
  url,
  icon: Icon,
  iconColor,
  backgroundColor,
  borderColor,
  compact = false,
}: FooterLink & {
  iconColor: string;
  backgroundColor: string;
  borderColor: string;
  compact?: boolean;
},): React.JSX.Element | null {
  if (!Icon) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => openExternalUrl(url,)}
      style={({ pressed, },) => [
        styles.socialPill,
        compact && styles.socialPillCompact,
        {
          backgroundColor: pressed ? borderColor : backgroundColor,
          borderColor,
        },
      ]}
    >
      <Icon size={compact ? 14 : 16} color={iconColor} strokeWidth={2.1} />
    </Pressable>
  );
}

export function FooterTextLink({
  label,
  url,
  textColor,
  compact = false,
}: {
  label: string;
  url: FooterPrimaryLink['url'];
  textColor: string;
  compact?: boolean;
},): React.JSX.Element {
  return (
    <Pressable
      onPress={() => openExternalUrl(url,)}
      style={({ pressed, },) => [styles.textLinkPressable, compact && styles.textLinkPressableCompact, pressed && styles.textLinkPressablePressed,]}
    >
      <Text style={[styles.textLinkText, compact && styles.textLinkTextCompact, { color: textColor, },]}>{label}</Text>
    </Pressable>
  );
}

export function FooterCopyright({
  color,
}: {
  color: string;
},): React.JSX.Element {
  const { t, } = useAppTranslation('mobile');
  const footerYear = new Date().getFullYear();

  return (
    <Text style={[styles.copyrightText, { color, },]}>
      {t('footer.copyright', { year: footerYear, }, `(c) ${footerYear} Alternun.`)}
    </Text>
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
  textLinkPressable: {
    minHeight: 22,
    justifyContent: 'center',
  },
  textLinkPressableCompact: {
    minHeight: 20,
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
    fontSize: 12,
  },
  copyrightText: {
    fontSize: 11,
    fontWeight: '700',
  },
},);

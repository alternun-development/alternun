import type React from 'react';
import type { ImageSourcePropType } from 'react-native';

/** Social networks the share sheet links to. */
export type SocialPlatform = 'X' | 'Facebook' | 'Instagram' | 'LinkedIn';

/**
 * An image to share or download: a bundled asset or URL (`source`), or one made on demand
 * (`load`, e.g. a QR code rendered to a PNG data URI).
 */
export interface ShareImage {
  fileName: string;
  source?: ImageSourcePropType | string;
  load?: () => Promise<string>;
}

/** What is shared: a message, an optional public link and an optional image. */
export interface ShareContent {
  title: string;
  message: string;
  url?: string | null;
  image?: ShareImage | null;
}

/** The image ready to hand to the platform: a local/remote URI and, on web, the file. */
export interface PreparedShareImage {
  uri: string;
  file?: File;
}

/** Messages the share flow shows after an action. */
export type ShareNotice =
  | 'copied'
  | 'copyError'
  | 'shareError'
  | 'downloaded'
  | 'downloadError'
  | 'instagramHint'
  | null;

export interface ShareContext {
  content: ShareContent;
  image: PreparedShareImage | null;
  imageStatus: 'none' | 'loading' | 'ready' | 'failed';
  notice: ShareNotice;
}

export type ShareEvent =
  | { type: 'SHARE' }
  | { type: 'COPY' }
  | { type: 'DOWNLOAD' }
  | { type: 'SOCIAL'; platform: SocialPlatform }
  | { type: 'DISMISS' };

/** Platform operations behind the share machine (injectable in tests). */
export interface ShareServices {
  prepareImage: (image: ShareImage) => Promise<PreparedShareImage>;
  shareNative: (content: ShareContent, image: PreparedShareImage | null) => Promise<void>;
  copyText: (text: string) => Promise<void>;
  downloadImage: (image: PreparedShareImage, fileName: string) => Promise<void>;
  openComposer: (platform: SocialPlatform, text: string, url?: string | null) => void;
}

export interface SharePalette {
  text: string;
  muted: string;
  border: string;
  accent: string;
  surface: string;
}

export interface ShareActionsProps {
  content: ShareContent;
  palette?: SharePalette;
  /** Show the link row with its copy button (on by default when there is a link). */
  showLink?: boolean;
  disabled?: boolean;
  /** Tests pass their own platform operations. */
  services?: Partial<ShareServices>;
}

export interface ShareSheetProps {
  visible: boolean;
  content: ShareContent | null;
  onClose: () => void;
  /** Drawn above the actions: the medal, a QR code... Defaults to the image. */
  preview?: React.ReactNode;
  services?: Partial<ShareServices>;
}

export interface ShareButtonProps {
  label: string;
  onPress: () => void;
  size?: 'regular' | 'large';
  disabled?: boolean;
  accessibilityLabel?: string;
}

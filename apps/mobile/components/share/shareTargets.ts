import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import { File as DeviceFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Platform, Share } from 'react-native';
import type {
  PreparedShareImage,
  ShareContent,
  ShareImage,
  ShareServices,
  SocialPlatform,
} from './share.types';

/** Platform side of sharing: images, the system share sheet, the clipboard and social links. */

const FALLBACK_APP_URL = 'https://airs.alternun.co';

/** Public origin of the app, for links people open from social media. */
export function resolvePublicAppUrl(): string {
  const configured = process.env.EXPO_PUBLIC_ORIGIN?.trim();
  const runtime =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location?.origin : undefined;
  // Empty values count as unset, so `??` would not do here.
  const origin = configured ? configured : runtime ? runtime : FALLBACK_APP_URL;
  return origin.replace(/\/+$/, '');
}

/** MIME type from the file name (bundled art is WebP, generated images PNG). */
export function imageMimeType(fileName: string): string {
  if (/\.webp$/i.test(fileName)) return 'image/webp';
  if (/\.jpe?g$/i.test(fileName)) return 'image/jpeg';
  return 'image/png';
}

/** The message followed by the link, once. */
export function shareText(content: Pick<ShareContent, 'message' | 'url'>): string {
  const { message, url } = content;
  if (!url || message.includes(url)) return message;
  return `${message} ${url}`;
}

export function isMobileShareBrowser(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

export function socialComposerUrl(
  platform: SocialPlatform,
  caption: string,
  shareUrl?: string | null
): string {
  switch (platform) {
    case 'X':
      return `https://x.com/intent/post?text=${encodeURIComponent(caption)}`;
    case 'Facebook':
      return shareUrl
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        : 'https://www.facebook.com/';
    case 'Instagram':
      return 'https://www.instagram.com/';
    case 'LinkedIn':
      return shareUrl
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        : 'https://www.linkedin.com/feed/';
  }
}

/** Opens the network's own composer: a user-initiated HTTPS link, never automatic posting. */
export function openComposer(
  platform: SocialPlatform,
  caption: string,
  shareUrl?: string | null
): void {
  const url = socialComposerUrl(platform, caption, shareUrl);
  if (Platform.OS !== 'web') {
    void Linking.openURL(url).catch(() => {});
    return;
  }
  if (isMobileShareBrowser()) window.location.assign(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** Turns a bundled asset, a URL or a generated data URI into something the platform shares. */
export async function prepareShareImage(image: ShareImage): Promise<PreparedShareImage> {
  const generated = image.load ? await image.load() : null;
  if (generated) {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(generated)).blob();
      return {
        uri: generated,
        file: new File([blob], image.fileName, { type: imageMimeType(image.fileName) }),
      };
    }
    const file = new DeviceFile(Paths.cache, image.fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(base64ToBytes(generated.replace(/^data:[^,]*,/, '')));
    return { uri: file.uri };
  }

  const { source } = image;
  if (!source) throw new Error('No image to share');
  const remote =
    typeof source === 'string'
      ? source
      : typeof source === 'object' && !Array.isArray(source) && 'uri' in source
      ? source.uri
      : null;
  const asset = remote ? Asset.fromURI(remote) : Asset.fromModule(source as number);
  if (Platform.OS !== 'web') {
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('Image unavailable');
    return { uri: asset.localUri };
  }
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('Image unavailable');
  const blob = await response.blob();
  return {
    uri: asset.uri,
    file: new File([blob], image.fileName, { type: blob.type || imageMimeType(image.fileName) }),
  };
}

function webCanShareFile(file: File | undefined): boolean {
  return Boolean(
    file &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
  );
}

/** The system share sheet, with the image when there is one. */
export async function shareNative(
  content: ShareContent,
  image: PreparedShareImage | null
): Promise<void> {
  const text = shareText(content);
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      throw new Error('Sharing unavailable');
    }
    if (image?.file && webCanShareFile(image.file)) {
      await navigator.share({ files: [image.file], text, title: content.title });
      return;
    }
    // The link travels as `url`; keep it out of the text so apps do not show it twice.
    await navigator.share({
      title: content.title,
      text: content.url
        ? content.message
            .replace(content.url, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
        : content.message,
      ...(content.url ? { url: content.url } : {}),
    });
    return;
  }
  if (image && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(image.uri, {
      mimeType: imageMimeType(image.uri),
      dialogTitle: text,
    });
    return;
  }
  await Share.share({ title: content.title, message: text });
}

export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

/** Saves the image: a file download on web, the system sheet ("Guardar imagen") on devices. */
export async function downloadImage(image: PreparedShareImage, fileName: string): Promise<void> {
  if (Platform.OS !== 'web') {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Download unavailable');
    await Sharing.shareAsync(image.uri, { mimeType: imageMimeType(fileName) });
    return;
  }
  const blob = image.file ?? (await (await fetch(image.uri)).blob());
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The real platform operations; the share machine uses these unless a test overrides them. */
export const defaultShareServices: ShareServices = {
  prepareImage: prepareShareImage,
  shareNative,
  copyText,
  downloadImage,
  openComposer,
};

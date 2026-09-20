import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { MILESTONE_SHARE_IMAGES } from './badgeAssets';

export type PreparedMilestoneImage = {
  uri: string;
  file?: File;
  shareUrl?: string;
  displayName?: string;
  previewUri?: string;
};
export type SocialPlatform = 'X' | 'Facebook' | 'Instagram' | 'LinkedIn';

export async function prepareMilestoneImage(
  key: string,
  remote?: { imageUrl: string; shareUrl: string; displayName: string }
): Promise<PreparedMilestoneImage> {
  const source = MILESTONE_SHARE_IMAGES[key];
  if (!source) throw new Error('No milestone share image');
  const asset = remote ? Asset.fromURI(remote.imageUrl) : Asset.fromModule(source);
  if (Platform.OS !== 'web') {
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('Milestone image is unavailable');
    return {
      uri: asset.localUri,
      shareUrl: remote?.shareUrl,
      displayName: remote?.displayName,
      previewUri: remote?.imageUrl,
    };
  }
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('Unable to prepare milestone image');
  const blob = await response.blob();
  return {
    uri: asset.uri,
    shareUrl: remote?.shareUrl,
    displayName: remote?.displayName,
    previewUri: remote?.imageUrl,
    file: new File([blob], `airs-${key}.png`, { type: 'image/png' }),
  };
}

export function canShareMilestoneFile(image: PreparedMilestoneImage): boolean {
  return (
    Platform.OS !== 'web' ||
    Boolean(
      image.file &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [image.file] })
    )
  );
}

export async function shareMilestoneImage(
  image: PreparedMilestoneImage,
  caption: string
): Promise<void> {
  if (Platform.OS === 'web') {
    if (!image.file || !canShareMilestoneFile(image)) throw new Error('File sharing unavailable');
    await navigator.share({ files: [image.file], text: caption, title: 'AIRS milestone' });
  } else {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
    await Sharing.shareAsync(image.uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: caption,
    });
  }
}

export function downloadMilestoneImage(image: PreparedMilestoneImage): void {
  if (!image.file || Platform.OS !== 'web') throw new Error('Download unavailable');
  const url = URL.createObjectURL(image.file);
  const link = document.createElement('a');
  link.href = url;
  link.download = image.file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function socialComposerUrl(
  platform: SocialPlatform,
  caption: string,
  shareUrl?: string
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

export async function publishMilestoneImage(
  key: string,
  token: string
): Promise<PreparedMilestoneImage> {
  const response = await fetch(
    `${resolveMobileApiBaseUrl().replace(/\/+$/, '')}/v1/airs/milestones/share`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone: key }),
    }
  );
  if (!response.ok) throw new Error('Unable to publish personalized milestone');
  const result = (await response.json()) as {
    imageUrl: string;
    shareUrl: string;
    displayName: string;
  };
  if (!result.imageUrl || !result.shareUrl || !result.displayName)
    throw new Error('Incomplete milestone response');
  return prepareMilestoneImage(key, result);
}

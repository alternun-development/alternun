import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { MILESTONE_SHARE_IMAGES } from './badgeAssets';

export type PreparedMilestoneImage = {
  uri: string;
  file?: File;
  shareUrl?: string;
  displayName?: string;
  previewUri?: string;
};

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

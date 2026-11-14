import type React from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { HonorAwardClient } from '../../utils/honorAwards';
import type { UserAvatarChoice, UserAvatarClient, UserAvatarKind } from '../../utils/userAvatar';

export interface AvatarPresetArtProps {
  preset: string;
  size: number;
}

export interface UserAvatarProps {
  size: number;
  /** Shown when there is no photo, no chosen art and no fallback image. */
  initials: string;
  /** Someone else's choice (ranking); defaults to the signed-in person's. */
  choice?: UserAvatarChoice;
  /** Someone else's photo; pass null to never show a photo. */
  socialUrl?: string | null;
  /** Image shown instead of initials when nothing is chosen and there is no photo. */
  fallback?: ImageSourcePropType | null;
  initialsColor?: string;
  initialsBackground?: string;
}

export interface AvatarOption {
  key: string;
  kind: UserAvatarKind | null;
  ref: string | null;
  label: string;
  render: (size: number) => React.ReactNode;
}

export interface AvatarPickerProps {
  visible: boolean;
  onClose: () => void;
  /** Airs score: unlocks the tier and milestone badges the person can wear. */
  score: number;
  initials: string;
  client: UserAvatarClient;
  honorAwards?: HonorAwardClient | null;
  /** What the default option shows when there is no social photo (e.g. the tier badge). */
  fallback?: ImageSourcePropType | null;
}

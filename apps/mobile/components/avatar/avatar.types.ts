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
}

export interface AvatarFlipProps {
  /** The avatar the person chose (or their photo / initials). */
  front: React.ReactNode;
  /** The tier badge shown on the back; without it the avatar never turns. */
  back?: React.ReactNode;
  flipped: boolean;
  size: number;
}

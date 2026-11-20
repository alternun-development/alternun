import React from 'react';
import { Image, Text, View } from 'react-native';
import { useUserAvatarState } from '../../utils/userAvatar';
import HonorAwardEmblem from '../honorAwards/HonorAwardEmblem';
import { ACHIEVEMENT_ARTWORK, STATUS_BADGES } from '../profile/badgeAssets';
import AvatarPresetArt, { isAvatarPreset } from './AvatarPresetArt';
import type { UserAvatarProps } from './avatar.types';

/**
 * A person's avatar: the illustration or badge they chose, otherwise the photo of the social
 * account they signed in with, otherwise the fallback image or their initials.
 */
export default function UserAvatar({
  size,
  initials,
  choice,
  socialUrl,
  fallback,
  initialsColor = '#050510',
  initialsBackground = '#1de9b6',
}: UserAvatarProps): React.JSX.Element {
  const store = useUserAvatarState();
  const current = choice ?? store.choice;
  const photo = socialUrl !== undefined ? socialUrl : store.socialUrl;
  const box = { width: size, height: size };
  const ref = current.ref ?? '';

  if (current.kind === 'preset' && isAvatarPreset(ref)) {
    return <AvatarPresetArt preset={ref} size={size} />;
  }
  if (current.kind === 'tier' && STATUS_BADGES[ref]) {
    return <Image source={STATUS_BADGES[ref]} style={box} resizeMode='contain' />;
  }
  if (current.kind === 'achievement' && ACHIEVEMENT_ARTWORK[ref]) {
    return <Image source={ACHIEVEMENT_ARTWORK[ref]} style={box} resizeMode='contain' />;
  }
  if (current.kind === 'honor_award' && current.art?.tier) {
    return (
      <View style={[box, { alignItems: 'center', justifyContent: 'center' }]}>
        <HonorAwardEmblem
          tier={current.art.tier}
          kind={current.art.kind}
          title={current.art.title}
          imageUrl={current.art.badgeImageUrl}
          artPreset={current.art.artPreset}
          size={size * 0.86}
        />
      </View>
    );
  }
  if (photo) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: photo }}
        style={[box, { borderRadius: size / 2 }]}
      />
    );
  }
  if (fallback) {
    return <Image source={fallback} style={box} resizeMode='contain' />;
  }
  return (
    <View
      style={[
        box,
        {
          borderRadius: size / 2,
          backgroundColor: initialsBackground,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: initialsColor }}>
        {initials}
      </Text>
    </View>
  );
}

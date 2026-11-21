import { useAuth } from '../auth/AppAuthProvider';
import { resolveSessionTokenWithRetry } from '../auth/sessionToken';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import ShareActions from '../share/ShareActions';
import ShareButton from '../share/ShareButton';
import type { ShareContent, ShareServices } from '../share/share.types';
import { AIRS_MILESTONES, type AchievementDef, type ColorPalette } from './AchievementBadge';
import { MILESTONE_DETAIL_ARTWORK, LOCKED_ACHIEVEMENT_ARTWORK } from './badgeAssets';
import { ACHIEVEMENT_UNLOCK_STEPS } from './achievementUnlockSteps';
import { publishMilestoneImage, type PreparedMilestoneImage } from './milestoneSharing';

export default function AchievementDetailsModal({
  def,
  score,
  c,
  onClose,
}: {
  def: AchievementDef;
  score: number | null;
  c: ColorPalette;
  onClose: () => void;
}): React.JSX.Element {
  const { client } = useAuth();
  const modalBackground = c.bg === '#050f0c' ? '#10201c' : '#ffffff';
  const { t } = useAppTranslation('mobile');
  const { width, height } = useWindowDimensions();
  const [image, setImage] = useState<PreparedMilestoneImage | null>(null);
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  const threshold = AIRS_MILESTONES[def.key];
  const artwork = def.unlocked
    ? MILESTONE_DETAIL_ARTWORK[def.key]
    : LOCKED_ACHIEVEMENT_ARTWORK[def.key];
  const canCelebrate = def.unlocked && threshold != null;
  const copy = (key: string, fallback: string): string =>
    t(`profile.milestoneDetails.${key}`, undefined, fallback);
  const caption = t(
    'profile.milestoneDetails.caption',
    { milestone: def.label },
    'I just reached {{milestone}} on Airs by Alternun! 🌱 https://airs.alternun.co #Airs #Alternun'
  ).replace('https://airs.alternun.co', image?.shareUrl ?? 'https://airs.alternun.co');
  const closeLabel = copy('close', 'Close achievement details');

  useEffect(() => {
    if (!canCelebrate || retry === 0) return;
    let active = true;
    setFailed(false);
    void resolveSessionTokenWithRetry(client)
      .then((token) => {
        if (!token) throw new Error('Sign in to share your milestone');
        return publishMilestoneImage(def.key, token);
      })
      .then((value) => {
        if (active) setImage(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [def.key, canCelebrate, retry, client]);

  // The published image goes to the shared share actions: the system sheet, X, LinkedIn,
  // Instagram, the public link and saving the image.
  const shareContent = useMemo<ShareContent | null>(
    () =>
      image
        ? {
            title: copy('shareTitle', 'Share your milestone'),
            message: caption,
            url: image.shareUrl ?? null,
            image: { fileName: `airs-${def.key}.png`, source: image.previewUri ?? image.uri },
          }
        : null,
    // `copy` and `caption` are derived from `t`, `def` and `image`.
    [image, caption, def.key, t]
  );
  // The image was prepared when it was published: no second download.
  const shareServices = useMemo<Partial<ShareServices> | undefined>(
    () =>
      image
        ? { prepareImage: () => Promise.resolve({ uri: image.uri, file: image.file }) }
        : undefined,
    [image]
  );
  const button = (label: string, onPress: () => void, disabled = false): React.JSX.Element => (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: modalBackground,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ color: c.text, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType='fade' onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
          accessibilityRole='button'
          accessibilityLabel={closeLabel}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: Math.min(460, width - 32),
            maxHeight: height - 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#b5985e80',
            backgroundColor: modalBackground,
            overflow: 'hidden',
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 4 }}
          >
            <Text
              accessibilityRole='header'
              style={{ color: c.text, fontWeight: '700', fontSize: 18, flex: 1 }}
            >
              {def.label}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole='button'
              accessibilityLabel={closeLabel}
              style={{ padding: 10 }}
            >
              <Text style={{ color: c.text, fontSize: 22 }}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 14 }}>
            {image?.previewUri ? (
              <Image
                source={{ uri: image.previewUri }}
                resizeMode='contain'
                style={{ width: '100%', maxWidth: 260, aspectRatio: 1, alignSelf: 'center' }}
                accessibilityLabel={image.displayName}
              />
            ) : artwork ? (
              <Image
                source={artwork}
                resizeMode='contain'
                style={{ width: 176, height: 176, alignSelf: 'center' }}
                accessible={false}
              />
            ) : (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <def.icon size={64} color={def.color} />
              </View>
            )}
            <Text
              style={{
                color: def.unlocked ? c.accent : c.muted,
                textAlign: 'center',
                fontWeight: '700',
              }}
            >
              {def.unlocked
                ? copy('earned', 'Milestone reached')
                : copy('locked', 'Not yet achieved')}
            </Text>
            {!image && (
              <Text style={{ color: c.text, lineHeight: 21 }}>
                {threshold != null
                  ? def.unlocked
                    ? t(
                        'profile.milestoneDetails.reached',
                        { amount: threshold.toLocaleString() },
                        'You reached the {{amount}} AIRS milestone. Celebrate your progress in the Alternun ecosystem.'
                      )
                    : score == null
                    ? copy('unavailable', 'Your AIRS balance is currently unavailable.')
                    : t(
                        'profile.milestoneDetails.remaining',
                        { amount: Math.max(0, threshold - score).toLocaleString() },
                        '{{amount}} more AIRS to reach this milestone.'
                      )
                  : def.unlocked
                  ? copy(
                      'accountInfo',
                      'This badge recognizes your verified participation in the AIRS community.'
                    )
                  : copy('unlockTitle', 'How to unlock')}
              </Text>
            )}
            {!def.unlocked && (
              <View style={{ gap: 10 }}>
                {threshold != null && (
                  <Text style={{ color: c.text, fontWeight: '700' }}>
                    {copy('unlockTitle', 'How to unlock')}
                  </Text>
                )}
                <Text style={{ color: c.text, lineHeight: 21 }}>
                  {threshold != null
                    ? t(
                        'profile.milestoneDetails.unlockAirs',
                        { amount: threshold.toLocaleString() },
                        'Reach {{amount}} AIRS by participating in eligible activities from the dashboard. AIRS count once credited to your balance.'
                      )
                    : t(
                        `profile.milestoneDetails.unlockSteps.${def.key}`,
                        undefined,
                        ACHIEVEMENT_UNLOCK_STEPS[def.key] ??
                          copy(
                            'unlockFallback',
                            'Contact the Alternun team to learn the requirements for this achievement.'
                          )
                      )}
                </Text>
                {threshold == null && def.key !== 'account_confirmed' && (
                  <Text style={{ color: c.muted, lineHeight: 19, fontSize: 12 }}>
                    {copy(
                      'recognition',
                      'This badge unlocks after your achievement is confirmed. If you have already completed it, contact the Alternun team for help.'
                    )}
                  </Text>
                )}
              </View>
            )}
            {def.unlockedAt && (
              <Text style={{ color: c.muted, fontSize: 12 }}>
                {new Date(def.unlockedAt).toLocaleDateString()}
              </Text>
            )}
            {canCelebrate && (
              <>
                <Text style={{ color: c.text, fontWeight: '700' }}>
                  {copy('shareTitle', 'Share your milestone')}
                </Text>
                <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>
                  {retry === 0
                    ? copy(
                        'publishHint',
                        'Create a public image with your display name and this earned badge to share on social media.'
                      )
                    : copy(
                        'appsHint',
                        'Choose an installed app from your device’s share menu. For Instagram, share the image or save it to attach to a post.'
                      )}
                </Text>
                {retry === 0 ? (
                  <View style={{ alignItems: 'center' }}>
                    <ShareButton
                      size='large'
                      label={copy('createImage', 'Create share image')}
                      onPress={() => setRetry(1)}
                    />
                  </View>
                ) : null}
                {shareContent ? (
                  <>
                    <ShareActions
                      key={shareContent.url ?? image?.uri}
                      content={shareContent}
                      services={shareServices}
                      palette={{
                        text: c.text,
                        muted: c.muted,
                        border: c.border,
                        accent: c.accent,
                        surface: modalBackground,
                      }}
                    />
                    <Text selectable style={{ color: c.muted, lineHeight: 18, fontSize: 12 }}>
                      {caption}
                    </Text>
                  </>
                ) : null}
                {retry > 0 && !image && !failed && (
                  <Text accessibilityLiveRegion='polite' style={{ color: c.muted }}>
                    {copy('preparing', 'Preparing your image…')}
                  </Text>
                )}
                {failed && (
                  <>
                    {button(copy('retry', 'Retry image'), () => setRetry((value) => value + 1))}
                    <Text style={{ color: c.muted }}>
                      {copy('imageError', 'The image could not be prepared. Please retry.')}
                    </Text>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

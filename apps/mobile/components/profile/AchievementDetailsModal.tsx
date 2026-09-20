import { useAuth } from '../auth/AppAuthProvider';
import { resolveSessionTokenWithRetry } from '../auth/sessionToken';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { AIRS_MILESTONES, type AchievementDef, type ColorPalette } from './AchievementBadge';
import { MILESTONE_DETAIL_ARTWORK, LOCKED_ACHIEVEMENT_ARTWORK } from './badgeAssets';
import { ACHIEVEMENT_UNLOCK_STEPS } from './achievementUnlockSteps';
import {
  canShareMilestoneFile,
  downloadMilestoneImage,
  publishMilestoneImage,
  shareMilestoneImage,
  socialComposerUrl,
  type PreparedMilestoneImage,
  type SocialPlatform,
} from './milestoneSharing';

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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
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
    'I just reached {{milestone}} on AIRS by Alternun! 🌱 https://airs.alternun.co #AIRS #Alternun'
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

  const handleShare = async (platform?: SocialPlatform): Promise<void> => {
    if (!image || !canCelebrate || busy) return;
    setBusy(true);
    setNotice('');
    try {
      if (canShareMilestoneFile(image)) {
        await shareMilestoneImage(image, caption);
      } else {
        // Browser composers cannot attach local files through a URL. Keep the
        // image and caption available instead of pretending they were posted.
        if (platform && Platform.OS === 'web')
          window.open(
            socialComposerUrl(platform, caption, image.shareUrl),
            '_blank',
            'noopener,noreferrer'
          );
        if (!platform || platform === 'Instagram') downloadMilestoneImage(image);
        setNotice(
          platform && platform !== 'Instagram'
            ? copy(
                'previewHint',
                'Your post link includes the personalized image preview. The social network controls when it appears.'
              )
            : copy('attach', 'Image saved. Attach it to your post and paste the caption below.')
        );
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError'))
        setNotice(
          copy('shareError', 'Unable to open sharing. Save the image and copy the caption instead.')
        );
    } finally {
      setBusy(false);
    }
  };
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
            {artwork ? (
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
                {image?.previewUri && (
                  <Image
                    source={{ uri: image.previewUri }}
                    resizeMode='contain'
                    style={{ width: '100%', aspectRatio: 1 }}
                    accessibilityLabel={image.displayName}
                  />
                )}
                {retry === 0 && (
                  <>
                    <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>
                      {copy(
                        'publishHint',
                        'Create a public image with your display name and this earned badge to share on social media.'
                      )}
                    </Text>
                    {button(copy('createImage', 'Create share image'), () => setRetry(1))}
                  </>
                )}
                <Text style={{ color: c.text, fontWeight: '700' }}>
                  {copy('shareTitle', 'Share your milestone')}
                </Text>
                <Text selectable style={{ color: c.muted, lineHeight: 20, fontSize: 13 }}>
                  {caption}
                </Text>
                <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>
                  {copy(
                    'shareHint',
                    'Share the personalized image through your device, or use its public preview link on X, Facebook and LinkedIn. For Instagram, attach the saved image and paste your caption.'
                  )}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(['X', 'Facebook', 'Instagram', 'LinkedIn'] as const).map((platform) => (
                    <React.Fragment key={platform}>
                      {button(
                        platform,
                        () => {
                          void handleShare(platform);
                        },
                        !image || busy
                      )}
                    </React.Fragment>
                  ))}
                  {button(
                    copy('share', 'Share image…'),
                    () => {
                      void handleShare();
                    },
                    !image || busy
                  )}
                  {Platform.OS === 'web' &&
                    button(
                      copy('download', 'Save image'),
                      () => {
                        if (image) downloadMilestoneImage(image);
                      },
                      !image
                    )}
                  {button(copy('copy', 'Copy caption'), () => {
                    void Clipboard.setStringAsync(caption)
                      .then((copied) =>
                        setNotice(
                          copied
                            ? copy('copied', 'Caption copied.')
                            : copy('copyError', 'Select the caption above to copy it.')
                        )
                      )
                      .catch(() =>
                        setNotice(copy('copyError', 'Select the caption above to copy it.'))
                      );
                  })}
                </View>
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
                {notice ? (
                  <Text accessibilityLiveRegion='polite' style={{ color: c.muted, fontSize: 12 }}>
                    {notice}
                  </Text>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

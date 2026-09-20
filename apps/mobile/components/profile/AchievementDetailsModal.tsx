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
import { ChevronDown, ChevronUp, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { AIRS_MILESTONES, type AchievementDef, type ColorPalette } from './AchievementBadge';
import { MILESTONE_DETAIL_ARTWORK, LOCKED_ACHIEVEMENT_ARTWORK } from './badgeAssets';
import { ACHIEVEMENT_UNLOCK_STEPS } from './achievementUnlockSteps';
import {
  canShareMilestoneFile,
  canShareMilestoneLink,
  openMilestoneComposer,
  downloadMilestoneImage,
  publishMilestoneImage,
  shareMilestoneImage,
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
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
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

  const handleShare = async (): Promise<void> => {
    if (!image || !canCelebrate || busy) return;
    setBusy(true);
    setNotice('');
    try {
      // Keep navigator.share in the original tap; the image is prepared beforehand.
      if (canShareMilestoneFile(image) || canShareMilestoneLink(image)) {
        await shareMilestoneImage(image, caption);
      } else {
        setSocialExpanded(true);
        setToolsExpanded(true);
        setNotice(
          copy('browserFallback', 'Choose a social link, or save the image and copy your caption.')
        );
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setToolsExpanded(true);
        setNotice(
          copy('shareError', 'Unable to open sharing. Save the image and copy the caption instead.')
        );
      }
    } finally {
      setBusy(false);
    }
  };
  const handleSocial = (platform: SocialPlatform): void => {
    if (!image) return;
    openMilestoneComposer(platform, caption, image.shareUrl);
  };
  const handleDownload = (): void => {
    if (!image) return;
    try {
      downloadMilestoneImage(image);
      setNotice(copy('attach', 'Image saved. Attach it to your post and paste the caption below.'));
    } catch {
      setNotice(copy('downloadError', 'Unable to save the image. Try Share with apps instead.'));
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
                  button(copy('createImage', 'Create share image'), () => setRetry(1))
                ) : image ? (
                  <Pressable
                    accessibilityRole='button'
                    accessibilityLabel={copy('shareApps', 'Share with apps')}
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    onPress={() => {
                      void handleShare();
                    }}
                    style={{
                      minHeight: 44,
                      borderRadius: 14,
                      backgroundColor: '#10dbb1',
                      opacity: busy ? 0.5 : 1,
                      flexDirection: 'row',
                      gap: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                    }}
                  >
                    <Share2 size={18} color='#052d28' />
                    <Text style={{ color: '#052d28', fontWeight: '700' }}>
                      {copy('shareApps', 'Share with apps')}
                    </Text>
                  </Pressable>
                ) : null}
                {image && (
                  <View style={{ borderTopWidth: 1, borderColor: c.border }}>
                    {Platform.OS === 'web' && (
                      <>
                        <Pressable
                          accessibilityRole='button'
                          accessibilityLabel={copy('socialLinks', 'Social links')}
                          accessibilityState={{ expanded: socialExpanded }}
                          onPress={() => setSocialExpanded((value) => !value)}
                          style={{
                            minHeight: 44,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text style={{ color: c.text, fontSize: 13 }}>
                            {copy('socialLinks', 'Social links')}
                          </Text>
                          {socialExpanded ? (
                            <ChevronUp size={16} color={c.muted} />
                          ) : (
                            <ChevronDown size={16} color={c.muted} />
                          )}
                        </Pressable>
                        {socialExpanded && (
                          <View style={{ gap: 8, paddingBottom: 10 }}>
                            <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>
                              {copy(
                                'linksHint',
                                'Share the public preview link. To attach the image in an app, use Share with apps.'
                              )}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {(['X', 'Facebook', 'LinkedIn'] as const).map((platform) => (
                                <React.Fragment key={platform}>
                                  {button(platform, () => handleSocial(platform))}
                                </React.Fragment>
                              ))}
                            </View>
                          </View>
                        )}
                      </>
                    )}
                    <Pressable
                      accessibilityRole='button'
                      accessibilityLabel={copy('saveCaption', 'Save & caption')}
                      accessibilityState={{ expanded: toolsExpanded }}
                      onPress={() => setToolsExpanded((value) => !value)}
                      style={{
                        minHeight: 44,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ color: c.text, fontSize: 13 }}>
                        {copy('saveCaption', 'Save & caption')}
                      </Text>
                      {toolsExpanded ? (
                        <ChevronUp size={16} color={c.muted} />
                      ) : (
                        <ChevronDown size={16} color={c.muted} />
                      )}
                    </Pressable>
                    {toolsExpanded && (
                      <View style={{ gap: 10 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {Platform.OS === 'web' &&
                            button(copy('download', 'Save image'), handleDownload)}
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
                        <Text selectable style={{ color: c.muted, lineHeight: 18, fontSize: 12 }}>
                          {caption}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
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

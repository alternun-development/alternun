import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import type { HonorAward } from '../../utils/honorAwards';
import {
  setUserAvatarState,
  useUserAvatarState,
  type UserAvatarKind,
} from '../../utils/userAvatar';
import HonorAwardEmblem from '../honorAwards/HonorAwardEmblem';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { AIRS_MILESTONES } from '../profile/AchievementBadge';
import { ACHIEVEMENT_ARTWORK, STATUS_BADGES } from '../profile/badgeAssets';
import AvatarPresetArt, { AVATAR_PRESETS } from './AvatarPresetArt';
import UserAvatar from './UserAvatar';
import type { AvatarOption, AvatarPickerProps } from './avatar.types';

const MINT = '#1de9b6';
const OPTION_SIZE = 64;
const TIER_MINIMUMS: ReadonlyArray<[string, number]> = [
  ['bronze', 0],
  ['silver', 1000],
  ['gold', 5000],
];

/**
 * Lets a person choose their avatar: the photo of their social account, one of the app's
 * illustrations, or a badge they hold (tiers, Airs milestones, claimed honor awards).
 */
export default function AvatarPicker({
  visible,
  onClose,
  score,
  initials,
  client,
  honorAwards,
}: AvatarPickerProps): React.JSX.Element | null {
  const { t, locale } = useAppTranslation('mobile');
  const { choice, socialUrl } = useUserAvatarState();
  const [awards, setAwards] = useState<HonorAward[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible || !honorAwards) return undefined;
    let active = true;
    honorAwards
      .list()
      .then((items) => {
        if (active) setAwards(items.filter((award) => award.status === 'claimed'));
      })
      .catch(() => {
        if (active) setAwards([]);
      });
    return () => {
      active = false;
    };
  }, [honorAwards, visible]);

  const sections = useMemo(() => {
    const presetLabel = (key: string): string => t(`profile.avatar.presets.${key}`, undefined, key);
    const own: AvatarOption[] = [
      {
        key: 'default',
        kind: null,
        ref: null,
        label: socialUrl
          ? t('profile.avatar.socialPhoto', undefined, 'Tu foto')
          : t('profile.avatar.initials', undefined, 'Tus iniciales'),
        render: (size) => (
          <UserAvatar
            size={size}
            initials={initials}
            choice={{ kind: null, ref: null, art: null }}
            socialUrl={socialUrl}
          />
        ),
      },
    ];
    const presets: AvatarOption[] = AVATAR_PRESETS.map((preset) => ({
      key: `preset:${preset}`,
      kind: 'preset',
      ref: preset,
      label: presetLabel(preset),
      render: (size) => <AvatarPresetArt preset={preset} size={size} />,
    }));
    const tiers: AvatarOption[] = TIER_MINIMUMS.filter(
      ([tier, min]) => score >= min && STATUS_BADGES[tier]
    ).map(([tier]) => ({
      key: `tier:${tier}`,
      kind: 'tier',
      ref: tier,
      label: t(`profile.tierLabels.${tier}`, undefined, tier),
      render: (size) => (
        <Image
          source={STATUS_BADGES[tier]}
          style={{ width: size, height: size }}
          resizeMode='contain'
        />
      ),
    }));
    const milestones: AvatarOption[] = Object.entries(AIRS_MILESTONES)
      .filter(([key, threshold]) => score >= threshold && ACHIEVEMENT_ARTWORK[key])
      .map(([key, threshold]) => ({
        key: `achievement:${key}`,
        kind: 'achievement',
        ref: key,
        label: `${threshold.toLocaleString(locale)} Airs`,
        render: (size) => (
          <Image
            source={ACHIEVEMENT_ARTWORK[key]}
            style={{ width: size, height: size }}
            resizeMode='contain'
          />
        ),
      }));
    const honors: AvatarOption[] = awards.map((award) => ({
      key: `honor_award:${award.id}`,
      kind: 'honor_award',
      ref: award.id,
      label: award.recipe.title,
      render: (size) => (
        <HonorAwardEmblem
          tier={award.recipe.tier}
          kind={award.recipe.kind}
          title={award.recipe.title}
          imageUrl={award.recipe.badgeImageUrl}
          artPreset={award.recipe.artPreset}
          size={size * 0.9}
        />
      ),
    }));
    return [
      { key: 'own', title: t('profile.avatar.sections.own', undefined, 'Tu foto'), options: own },
      {
        key: 'presets',
        title: t('profile.avatar.sections.presets', undefined, 'Ilustraciones'),
        options: presets,
      },
      {
        key: 'badges',
        title: t('profile.avatar.sections.badges', undefined, 'Tus insignias y galardones'),
        options: [...tiers, ...milestones, ...honors],
      },
    ];
  }, [awards, initials, locale, score, socialUrl, t]);

  if (!visible) return null;

  const selectedKey = choice.kind ? `${choice.kind}:${choice.ref ?? ''}` : 'default';

  async function select(option: AvatarOption): Promise<void> {
    setBusyKey(option.key);
    setFailed(false);
    try {
      const saved = await client.set(option.kind as UserAvatarKind | null, option.ref);
      setUserAvatarState({ choice: saved });
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Modal transparent visible animationType='fade' onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('profile.avatar.title', undefined, 'Elige tu avatar')}
            </Text>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={t('profile.avatar.close', undefined, 'Cerrar')}
              onPress={onClose}
              style={styles.close}
            >
              <X size={18} color='#ffffff' />
            </Pressable>
          </View>
          {failed ? (
            <Text style={styles.error}>
              {t(
                'profile.avatar.error',
                undefined,
                'No pudimos guardar tu avatar. Inténtalo de nuevo.'
              )}
            </Text>
          ) : null}
          <ScrollView contentContainerStyle={styles.body}>
            {sections.map((section) =>
              section.options.length > 0 ? (
                <View key={section.key} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.grid}>
                    {section.options.map((option) => {
                      const selected = option.key === selectedKey;
                      return (
                        <Pressable
                          key={option.key}
                          accessibilityRole='button'
                          accessibilityLabel={option.label}
                          accessibilityState={{ selected, busy: busyKey === option.key }}
                          disabled={busyKey !== null}
                          onPress={() => void select(option)}
                          style={[styles.option, selected && styles.optionSelected]}
                        >
                          <View style={styles.optionArt}>
                            {option.render(OPTION_SIZE)}
                            {busyKey === option.key ? (
                              <ActivityIndicator style={StyleSheet.absoluteFill} color='#ffffff' />
                            ) : null}
                          </View>
                          <Text numberOfLines={2} style={styles.optionLabel}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,7,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#04140f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,233,182,0.25)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: { color: MINT, fontSize: 20, fontWeight: '800', flex: 1 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  error: { color: '#ff8a8a', fontSize: 13, paddingHorizontal: 20, marginTop: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  section: { gap: 10, marginTop: 10 },
  sectionTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    width: 84,
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: { borderColor: MINT, backgroundColor: 'rgba(29,233,182,0.08)' },
  optionArt: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center' },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, FileText, Share2, X } from 'lucide-react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import HonorAwardCard from './HonorAwardCard';
import { HONOR_TIER_PALETTES, honorText } from './honorAwardTheme';
import type { HonorAwardInspectModalProps } from './honorAwards.types';

const MINT = '#1de9b6';

/** Card view (tap to flip front/back) and the mission detail of an award. */
export default function HonorAwardInspectModal({
  award,
  onClose,
}: HonorAwardInspectModalProps): React.JSX.Element | null {
  const { t } = useAppTranslation('mobile');
  const { motionLevel } = useAppPreferences();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stage, setStage] = useState<'card' | 'mission'>('card');
  const [showBack, setShowBack] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!award) return;
    setStage('card');
    setShowBack(false);
    flip.setValue(0);
    entrance.setValue(motionLevel === 'off' ? 1 : 0);
    if (motionLevel !== 'off') {
      Animated.spring(entrance, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }).start();
    }
  }, [award, entrance, flip, motionLevel]);

  if (!award) return null;
  const palette = HONOR_TIER_PALETTES[award.recipe.tier];
  const cardWidth = Math.min(300, width - 64);

  function toggleSide(): void {
    const next = !showBack;
    setShowBack(next);
    if (motionLevel === 'off') {
      flip.setValue(next ? 1 : 0);
      return;
    }
    Animated.timing(flip, {
      toValue: next ? 1 : 0,
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function go(path: string): void {
    onClose();
    router.push(path as never);
  }

  async function share(): Promise<void> {
    if (!award) return;
    const message = honorText(
      t,
      'profile.honorAwards.shareMessage',
      'Obtuve el galardón "{{title}}" en Airs{{partner}}.',
      {
        title: award.recipe.title,
        partner: award.partner ? ` · ${award.partner.displayName}` : '',
      }
    );
    try {
      await Share.share({ message });
    } catch {
      // Sharing is optional: closing the sheet or an unsupported browser is not an error.
    }
  }

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const entranceScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Modal transparent visible animationType='fade' onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {stage === 'card' ? (
          <Animated.View
            style={[styles.cardStage, { opacity: entrance, transform: [{ scale: entranceScale }] }]}
          >
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={honorText(
                t,
                'profile.honorAwards.inspect.flip',
                'Toca para ver el reverso'
              )}
              onPress={toggleSide}
              style={{ width: cardWidth, height: cardWidth * 1.4 }}
            >
              <Animated.View
                style={[
                  styles.face,
                  { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
                ]}
              >
                <HonorAwardCard award={award} side='front' width={cardWidth} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.face,
                  { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
                ]}
              >
                <HonorAwardCard award={award} side='back' width={cardWidth} />
              </Animated.View>
            </Pressable>
            <Text style={styles.hint}>
              {honorText(t, 'profile.honorAwards.inspect.flip', 'Toca para ver el reverso')}
            </Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole='button'
                onPress={() => void share()}
                style={[styles.pill, { borderColor: '#7c83ff' }]}
              >
                <Share2 size={16} color='#c9ccff' />
                <Text style={[styles.pillText, { color: '#c9ccff' }]}>
                  {honorText(t, 'profile.honorAwards.inspect.share', 'Compartir')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole='button'
                onPress={() => setStage('mission')}
                style={[styles.pill, { borderColor: MINT }]}
              >
                <FileText size={16} color={MINT} />
                <Text style={[styles.pillText, { color: MINT }]}>
                  {honorText(t, 'profile.honorAwards.inspect.viewMission', 'Ver misión')}
                </Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={honorText(t, 'profile.honorAwards.inspect.close', 'Cerrar')}
              onPress={onClose}
              style={styles.close}
            >
              <X size={18} color='#ffffff' />
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.missionSheet}>
            <View style={styles.missionHeader}>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel={honorText(t, 'profile.honorAwards.inspect.back', 'Volver')}
                onPress={() => setStage('card')}
                style={styles.iconButton}
              >
                <ArrowLeft size={18} color='#ffffff' />
              </Pressable>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel={honorText(t, 'profile.honorAwards.inspect.close', 'Cerrar')}
                onPress={onClose}
                style={styles.iconButton}
              >
                <X size={18} color='#ffffff' />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.missionBody}>
              <Text style={styles.missionTitle}>{award.recipe.title}</Text>
              {award.recipe.classification ? (
                <Text style={styles.missionClassification}>{award.recipe.classification}</Text>
              ) : null}
              {award.recipe.airsAmount > 0 ? (
                <View style={[styles.airsChip, { backgroundColor: palette.frame }]}>
                  <Text style={styles.airsChipText}>
                    {honorText(t, 'profile.honorAwards.airsAmount', '+{{amount}} Airs', {
                      amount: award.recipe.airsAmount,
                    })}
                  </Text>
                </View>
              ) : null}
              {award.recipe.purpose ? (
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>
                    {honorText(t, 'profile.honorAwards.mission.purpose', 'Propósito:')}
                  </Text>
                  <Text style={styles.blockText}>{award.recipe.purpose}</Text>
                </View>
              ) : null}

              {award.partner ? (
                <View style={styles.block}>
                  <Text style={styles.sectionLabel}>
                    {honorText(t, 'profile.honorAwards.supportedBy', 'Con el apoyo de:')}
                  </Text>
                  <View style={styles.partnerRow}>
                    {award.partner.logoUrl ? (
                      <Image source={{ uri: award.partner.logoUrl }} style={styles.partnerLogo} />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partnerName}>{award.partner.displayName}</Text>
                      {award.partner.description ? (
                        <Text numberOfLines={4} style={styles.blockText}>
                          {award.partner.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole='link'
                    onPress={() => go(`/explore/enterprise/${award.partner?.slug ?? ''}`)}
                    style={[styles.linkPill, { borderColor: '#ffffff' }]}
                  >
                    <ExternalLink size={14} color='#ffffff' />
                    <Text style={styles.linkText}>
                      {honorText(t, 'profile.honorAwards.mission.visitPartner', 'Visitar página')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {award.project ? (
                <View style={styles.block}>
                  <Text style={styles.sectionLabel}>
                    {honorText(t, 'profile.honorAwards.mission.projectData', 'Datos del proyecto:')}
                  </Text>
                  <Text style={styles.partnerName}>{award.project.title}</Text>
                  {award.recipe.venueName ? (
                    <Text style={styles.blockText}>
                      {[award.recipe.venueName, award.recipe.venueLocation]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole='link'
                    onPress={() => go(`/explore/${award.project?.slug ?? ''}`)}
                    style={[styles.linkPill, { borderColor: MINT }]}
                  >
                    <ExternalLink size={14} color={MINT} />
                    <Text style={[styles.linkText, { color: MINT }]}>
                      {honorText(t, 'profile.honorAwards.mission.viewProject', 'Ver proyecto')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,7,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cardStage: { alignItems: 'center' },
  face: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { fontWeight: '700' },
  close: {
    marginTop: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionSheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: '#04140f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,233,182,0.25)',
    overflow: 'hidden',
  },
  missionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  missionBody: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  missionTitle: { color: MINT, fontSize: 28, fontWeight: '800' },
  missionClassification: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  airsChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 4,
  },
  airsChipText: { color: '#ffffff', fontWeight: '800' },
  block: {
    marginTop: 14,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(29,233,182,0.18)',
    paddingTop: 12,
  },
  blockLabel: { color: '#ffffff', fontWeight: '800' },
  blockText: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19 },
  sectionLabel: { color: MINT, fontWeight: '700', fontSize: 13 },
  partnerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  partnerLogo: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#ffffff' },
  partnerName: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  linkPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  linkText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
});

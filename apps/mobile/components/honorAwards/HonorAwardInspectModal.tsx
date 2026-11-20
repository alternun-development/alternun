import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { ArrowLeft, Compass, Repeat, Sprout, X } from 'lucide-react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import HonorAwardCard, { HONOR_CARD_RATIO } from './HonorAwardCard';
import HonorAwardMedalPocket, { HonorMedalActions } from './HonorAwardMedalPocket';
import HonorAwardPartnerMark from './HonorAwardPartnerMark';
import { presetArt } from './honorAwardArt';
import { honorText } from './honorAwardTheme';
import type { HonorAwardInspectModalProps } from './honorAwards.types';

const MINT = '#1de9b6';
/** From this sheet width the card sits in its own column, as in the design. */
const TWO_COLUMNS = 400;

function SectionHeading({ label }: { label: string }): React.JSX.Element {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingText}>{label}</Text>
      <View style={styles.headingLine} />
    </View>
  );
}

/** Concentric rings with a compass: the project mark when the project has no logo. */
function ProjectMark({ size }: { size: number }): React.JSX.Element {
  return (
    <View style={[styles.projectMark, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox='0 0 100 100'>
        {[48, 40, 32, 24].map((r, index) => (
          <Circle
            key={r}
            cx={50}
            cy={50}
            r={r}
            fill='none'
            stroke={MINT}
            strokeWidth={1.2}
            opacity={0.12 + index * 0.12}
          />
        ))}
        <Circle cx={50} cy={50} r={13} fill='none' stroke='#ffffff' strokeWidth={1.6} />
      </Svg>
      <View style={styles.projectMarkIcon}>
        <Compass size={size * 0.17} color='#ffffff' />
      </View>
    </View>
  );
}

/**
 * A legacy medal: first the medal on its holographic pocket (share it or see the mission),
 * then the mission: the flippable card on the left; the purpose, the ally and the project.
 */
export default function HonorAwardInspectModal({
  award,
  onClose,
  demo = false,
  initialStage = 'medal',
  locked = false,
  howToEarn,
}: HonorAwardInspectModalProps): React.JSX.Element | null {
  const { t, locale } = useAppTranslation('mobile');
  const { motionLevel } = useAppPreferences();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stage, setStage] = useState<'medal' | 'mission'>(initialStage);
  const [showBack, setShowBack] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!award) return;
    setStage(initialStage);
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
  }, [award, entrance, flip, initialStage, motionLevel]);

  if (!award) return null;
  const { recipe, partner, project } = award;
  const flipLabel = honorText(t, 'profile.honorAwards.inspect.flip', 'Clic para ver reverso');

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

  function visitPartner(): void {
    if (!partner) return;
    if (partner.websiteUrl) {
      void Linking.openURL(partner.websiteUrl).catch(() => {});
      return;
    }
    go(`/explore/enterprise/${partner.slug}`);
  }

  if (stage === 'medal') {
    const entranceScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
    return (
      <Modal transparent visible animationType='fade' onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.medalStage,
              { opacity: entrance, transform: [{ scale: entranceScale }] },
            ]}
          >
            <HonorAwardMedalPocket
              award={award}
              width={Math.min(264, width - 80)}
              grayscale={locked}
            />
            <HonorMedalActions
              award={award}
              demo={demo}
              locked={locked}
              onViewMission={() => setStage('mission')}
              onClose={onClose}
            />
          </Animated.View>
        </View>
      </Modal>
    );
  }

  const sheetWidth = Math.min(760, width - 24);
  const wide = sheetWidth >= TWO_COLUMNS;
  const cardWidth = wide
    ? Math.min(220, Math.max(112, sheetWidth * 0.27))
    : Math.min(220, sheetWidth - 96);
  const asideWidth = sheetWidth >= 600 ? 140 : 108;
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const hasPresetMark = !!presetArt(recipe.artPreset)?.partnerMark;
  const canVisitPartner = !demo && !!partner && (!!partner.websiteUrl || !!partner.slug);

  return (
    <Modal transparent visible animationType='fade' onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.missionSheet, { width: sheetWidth }]}>
          <View style={styles.missionHeader}>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={honorText(t, 'profile.honorAwards.inspect.back', 'Volver')}
              onPress={() => setStage('medal')}
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
          <ScrollView
            contentContainerStyle={[styles.missionBody, wide ? styles.missionBodyWide : null]}
          >
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={flipLabel}
              onPress={toggleSide}
              style={[styles.cardColumn, wide ? null : styles.cardColumnStacked]}
            >
              <View style={{ width: cardWidth, height: cardWidth * HONOR_CARD_RATIO }}>
                <Animated.View
                  style={[
                    styles.face,
                    { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
                  ]}
                >
                  <HonorAwardCard award={award} side='front' width={cardWidth} grayscale={locked} />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.face,
                    { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
                  ]}
                >
                  <HonorAwardCard award={award} side='back' width={cardWidth} />
                </Animated.View>
              </View>
              <View style={styles.flipChip}>
                <Repeat size={10} color='#b8f5e4' />
                <Text style={styles.flipChipText}>{flipLabel}</Text>
              </View>
            </Pressable>

            <View style={styles.details}>
              <Text style={styles.missionTitle}>{recipe.title}</Text>
              {recipe.classification ? (
                <Text style={styles.missionClassification}>{recipe.classification}</Text>
              ) : null}
              {recipe.airsAmount > 0 ? (
                <View style={styles.airsChip}>
                  <Text style={styles.airsChipText}>
                    {honorText(t, 'profile.honorAwards.airsAmount', '+{{amount}} Airs', {
                      amount: recipe.airsAmount,
                    })}
                  </Text>
                </View>
              ) : null}
              {recipe.purpose ? (
                <View style={styles.purpose}>
                  <Text style={styles.purposeLabel}>
                    {honorText(t, 'profile.honorAwards.mission.purpose', 'Propósito:')}
                  </Text>
                  <Text style={styles.bodyText}>{recipe.purpose}</Text>
                </View>
              ) : null}
              {howToEarn ? (
                <View style={styles.purpose} testID='honor-award-how-to-earn'>
                  <Text style={styles.purposeLabel}>
                    {honorText(t, 'profile.honorAwards.howToEarn.title', '¿Cómo obtenerla?')}
                  </Text>
                  <Text style={styles.bodyText}>{howToEarn}</Text>
                </View>
              ) : null}

              {partner ? (
                <View style={styles.block}>
                  <SectionHeading
                    label={honorText(t, 'profile.honorAwards.supportedBy', 'Con el apoyo de:')}
                  />
                  <View style={styles.blockRow}>
                    <View style={[styles.blockAside, { width: asideWidth }]}>
                      {/* The card's own white mark reads on this dark sheet; then the ally logo. */}
                      {partner.logoUrl && !hasPresetMark ? (
                        <Image
                          accessibilityLabel={partner.displayName}
                          source={{ uri: partner.logoUrl }}
                          style={{ width: asideWidth, height: asideWidth * 0.42 }}
                          resizeMode='contain'
                        />
                      ) : (
                        <HonorAwardPartnerMark
                          partner={partner}
                          // The bundled mark fills the column; the text wordmark is smaller.
                          width={asideWidth * (hasPresetMark ? 1.4 : 1.8)}
                          locale={locale}
                          artPreset={recipe.artPreset}
                          light
                        />
                      )}
                      {canVisitPartner ? (
                        <Pressable
                          accessibilityRole='link'
                          onPress={visitPartner}
                          style={styles.visitPill}
                        >
                          <Text style={styles.visitPillText}>
                            {honorText(
                              t,
                              'profile.honorAwards.mission.visitPartner',
                              'Visitar sitio / página'
                            )}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {partner.description ? (
                      <Text style={[styles.smallText, styles.blockMain]}>
                        {partner.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {project ? (
                <View style={styles.block}>
                  <SectionHeading
                    label={honorText(
                      t,
                      'profile.honorAwards.mission.projectData',
                      'Datos del proyecto:'
                    )}
                  />
                  <View style={styles.blockRow}>
                    <View style={[styles.blockAside, { width: asideWidth }]}>
                      <ProjectMark size={Math.min(96, asideWidth)} />
                    </View>
                    <View style={styles.blockMain}>
                      <Text style={styles.projectName}>{project.title}</Text>
                      {project.location ? (
                        <Text style={styles.smallText}>{project.location}</Text>
                      ) : null}
                      {project.description ? (
                        <>
                          <View style={styles.dashed} />
                          <Text style={styles.smallText}>{project.description}</Text>
                        </>
                      ) : null}
                      {demo || !project.slug ? null : (
                        <Pressable
                          accessibilityRole='link'
                          onPress={() => go(`/explore/${project.slug}`)}
                          style={styles.projectButton}
                        >
                          <View style={styles.projectButtonPill}>
                            <Text style={styles.projectButtonText}>
                              {honorText(
                                t,
                                'profile.honorAwards.mission.viewProject',
                                'Ver proyecto'
                              )}
                            </Text>
                          </View>
                          <View style={styles.projectButtonBadge}>
                            <Sprout size={15} color={MINT} />
                          </View>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
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
    padding: 12,
  },
  medalStage: { alignItems: 'center' },
  missionSheet: {
    maxHeight: '94%',
    backgroundColor: '#04110d',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,233,182,0.2)',
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
  missionBody: { paddingHorizontal: 18, paddingBottom: 28, gap: 20 },
  missionBodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 22 },
  cardColumn: { alignItems: 'center', gap: 10, paddingTop: 4 },
  cardColumnStacked: { alignSelf: 'center' },
  face: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },
  flipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f5a49',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  flipChipText: { color: '#b8f5e4', fontSize: 9, fontWeight: '600' },
  details: { flex: 1, gap: 2 },
  missionTitle: { color: MINT, fontSize: 28, fontFamily: 'Sculpin-Bold', lineHeight: 34 },
  missionClassification: { color: '#ffffff', fontSize: 18, fontFamily: 'Sculpin-Medium' },
  airsChip: {
    alignSelf: 'flex-start',
    backgroundColor: MINT,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginTop: 10,
  },
  airsChipText: { color: '#04140f', fontFamily: 'Sculpin-Bold', fontSize: 17 },
  purpose: { marginTop: 18, gap: 4 },
  purposeLabel: { color: '#ffffff', fontFamily: 'Sculpin-Bold', fontSize: 15 },
  bodyText: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 19 },
  smallText: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, lineHeight: 16 },
  block: { marginTop: 26, gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingText: { color: MINT, fontWeight: '700', fontSize: 13 },
  headingLine: { flex: 1, height: 1, backgroundColor: 'rgba(29,233,182,0.7)' },
  blockRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  blockAside: { alignItems: 'center', gap: 8 },
  blockMain: { flex: 1, gap: 2 },
  visitPill: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  visitPillText: { color: '#ffffff', fontWeight: '500', fontSize: 10.5 },
  projectMark: { alignItems: 'center', justifyContent: 'center' },
  projectMarkIcon: { position: 'absolute' },
  projectName: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  dashed: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.55)',
    marginVertical: 10,
  },
  // "Ver proyecto": a white outline pill with a mint badge that overlaps its left end.
  projectButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingLeft: 14,
  },
  projectButtonPill: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingLeft: 26,
    paddingRight: 16,
    paddingVertical: 4,
  },
  projectButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 11.5 },
  projectButtonBadge: {
    position: 'absolute',
    left: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: MINT,
    backgroundColor: '#04110d',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import { X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { IntentGuideModalProps, IntentKey } from './types';

export const INTENT_KEYS: readonly IntentKey[] = ['collaborate', 'propose', 'donate'];
const GUIDE_STEPS = ['step1', 'step2', 'step3'] as const;

export function isIntentKey(value: unknown): value is IntentKey {
  return typeof value === 'string' && (INTENT_KEYS as readonly string[]).includes(value);
}

/** How to take part for one Explorer intent: what it means, three steps and where to go next. */
export function IntentGuideModal({
  intent,
  icon: Icon,
  palette,
  t,
  actions,
  onClose,
}: IntentGuideModalProps): React.JSX.Element {
  return (
    <Modal transparent visible={intent !== null} animationType='fade' onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          testID='explorer-intent-guide-backdrop'
          accessibilityRole='button'
          accessibilityLabel={t('explorer.intents.guide.close')}
          onPress={onClose}
          style={styles.backdrop}
        />
        {intent ? (
          <View
            testID={`explorer-intent-guide-${intent}`}
            accessibilityViewIsModal
            style={[
              styles.sheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.header}>
                {Icon ? (
                  <View style={[styles.mark, { backgroundColor: palette.fill }]}>
                    <Icon size={18} color='#baffdf' strokeWidth={1.9} />
                  </View>
                ) : null}
                <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>
                  {t(`explorer.intents.${intent}.label`)}
                </Text>
                <Pressable
                  testID='explorer-intent-guide-close'
                  accessibilityRole='button'
                  accessibilityLabel={t('explorer.intents.guide.close')}
                  hitSlop={8}
                  onPress={onClose}
                  style={[styles.close, { borderColor: palette.border }]}
                >
                  <X size={16} color={palette.muted} />
                </Pressable>
              </View>
              <Text style={[styles.intro, { color: palette.muted }]}>
                {t(`explorer.intents.${intent}.guide.intro`)}
              </Text>
              <View style={styles.steps}>
                {GUIDE_STEPS.map((step, index) => (
                  <View key={step} style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: palette.mist }]}>
                      <Text style={[styles.stepNumberText, { color: palette.primaryDeep }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={[styles.stepText, { color: palette.text }]}>
                      {t(`explorer.intents.${intent}.guide.${step}`)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.actions}>
                {actions.map((action) => (
                  <Pressable
                    key={action.testID}
                    testID={action.testID}
                    accessibilityRole='button'
                    onPress={action.onPress}
                    style={[
                      styles.action,
                      action.primary
                        ? { backgroundColor: palette.fill }
                        : { borderWidth: 1, borderColor: palette.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        { color: action.primary ? '#effff7' : palette.text },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 10, 8, 0.62)' },
  sheet: { width: '100%', maxWidth: 460, maxHeight: '90%', borderWidth: 1, borderRadius: 22 },
  content: { padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: 'Sculpin-Bold', fontSize: 18, lineHeight: 23 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: { fontSize: 14, lineHeight: 20 },
  steps: { gap: 10 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '900' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  action: {
    minHeight: 42,
    borderRadius: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 14, fontWeight: '900' },
});

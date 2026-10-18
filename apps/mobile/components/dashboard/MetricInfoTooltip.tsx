import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import type { MetricInfoTooltipProps } from './MetricInfoTooltip.types';

export function MetricInfoTooltip({
  testID,
  title,
  accessibilityLabel,
  description,
  closeLabel,
  isDark,
}: MetricInfoTooltipProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const surfaceColor = isDark ? '#182231' : '#FFFFFF';
  const borderColor = isDark ? '#71809E' : '#64748B';
  const titleColor = isDark ? '#F3F6FC' : '#25304A';
  const bodyColor = isDark ? '#D0D8E8' : '#475569';

  const close = (): void => {
    setIsVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        testID={`${testID}-trigger`}
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: isVisible }}
        activeOpacity={0.72}
        onPress={() => setIsVisible(true)}
        style={[styles.trigger, { borderColor, backgroundColor: surfaceColor }]}
      >
        <Text style={[styles.triggerText, { color: bodyColor }]}>?</Text>
      </TouchableOpacity>

      {isVisible && (
        <Modal transparent visible animationType='fade' onRequestClose={close} statusBarTranslucent>
          <Pressable testID={`${testID}-backdrop`} onPress={close} style={styles.backdrop}>
            <Pressable
              testID={`${testID}-popover`}
              accessibilityRole='alert'
              accessibilityLabel={title}
              accessibilityViewIsModal
              onPress={(event) => event.stopPropagation()}
              style={[styles.popover, { backgroundColor: surfaceColor, borderColor }]}
            >
              <View style={styles.copy}>
                <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
                <Text style={[styles.description, { color: bodyColor }]}>{description}</Text>
              </View>
              <TouchableOpacity
                testID={`${testID}-close`}
                accessibilityRole='button'
                accessibilityLabel={closeLabel}
                activeOpacity={0.72}
                onPress={close}
                style={[styles.closeButton, { borderColor }]}
              >
                <Text style={[styles.closeText, { color: titleColor }]}>{closeLabel}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  triggerText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  popover: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 18,
    boxShadow: '0px 16px 34px rgba(0,0,0,0.34)',
  },
  copy: {
    gap: 8,
  },
  title: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  description: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  closeButton: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  closeText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
});

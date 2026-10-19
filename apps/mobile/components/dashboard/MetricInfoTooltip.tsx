import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Info, type LucideProps } from 'lucide-react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { TOOLTIP_MODAL } from '../theme/tooltipModal';
import type { MetricInfoTooltipProps } from './MetricInfoTooltip.types';

const InfoIcon = Info as React.FC<LucideProps>;

export function MetricInfoTooltip({
  testID,
  title,
  accessibilityLabel,
  description,
  closeLabel,
  isDark,
}: MetricInfoTooltipProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
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
        hitSlop={TOOLTIP_MODAL.iconHitSlop}
        style={styles.trigger}
      >
        <InfoIcon
          size={TOOLTIP_MODAL.iconSize}
          color={isDark ? '#D0D8E8' : '#475569'}
          strokeWidth={TOOLTIP_MODAL.iconStrokeWidth}
        />
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
              style={styles.popover}
            >
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity
                  testID={`${testID}-close`}
                  accessibilityRole='button'
                  accessibilityLabel={closeLabel}
                  onPress={close}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.description}>{description}</Text>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: TOOLTIP_MODAL.backdropColor,
    alignItems: 'center',
    justifyContent: 'center',
    padding: TOOLTIP_MODAL.viewportPadding,
  },
  popover: {
    width: '100%',
    maxWidth: TOOLTIP_MODAL.maxWidth,
    paddingHorizontal: TOOLTIP_MODAL.paddingHorizontal,
    paddingVertical: TOOLTIP_MODAL.paddingVertical,
    gap: 8,
    borderRadius: TOOLTIP_MODAL.borderRadius,
    borderWidth: TOOLTIP_MODAL.borderWidth,
    borderColor: TOOLTIP_MODAL.borderColor,
    backgroundColor: TOOLTIP_MODAL.surfaceColor,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: TOOLTIP_MODAL.titleFontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: TOOLTIP_MODAL.titleColor,
  },
  description: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: TOOLTIP_MODAL.bodyFontSize,
    lineHeight: TOOLTIP_MODAL.bodyLineHeight,
    color: TOOLTIP_MODAL.bodyColor,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: TOOLTIP_MODAL.closeColor,
    fontSize: 18,
  },
});

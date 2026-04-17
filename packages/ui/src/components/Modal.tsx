/**
 * Modal — Alternun Design System
 *
 * A composable modal shell used across dashboard actions (TokenPortfolio,
 * PoolVault, CertificateGallery, CompensationFlow).
 *
 * Provides:
 *   • Backdrop (semi-transparent overlay, tap to dismiss)
 *   • Centred / bottom-sheet positioning
 *   • Standard header with title + close button
 *   • Scrollable body slot
 *   • Optional footer slot for action buttons
 *
 * Usage:
 *   <Modal
 *     visible={open}
 *     title="Deposit Token"
 *     onClose={() => setOpen(false)}
 *   >
 *     <InfoRow label="Token" value="#000" />
 *     <Button title="Confirm" onPress={handleConfirm} fullWidth />
 *   </Modal>
 *
 *   // Bottom-sheet variant
 *   <Modal visible={open} title="Connect Wallet" position="bottom" onClose={onClose}>
 *     ...
 *   </Modal>
 */

import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, fontSize, spacing } from '../tokens/spacing';

export interface ModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** 'center' (default) or 'bottom' sheet */
  position?: 'center' | 'bottom';
  children: React.ReactNode;
  /** Rendered below the scrollable body, outside the scroll */
  footer?: React.ReactNode;
  style?: ViewStyle;
  /** Max height of the content scroll area. Default: 480 */
  maxContentHeight?: number;
}

export function Modal({
  visible,
  title,
  onClose,
  position = 'center',
  children,
  footer,
  style,
  maxContentHeight = 480,
}: ModalProps) {
  const { theme } = useTheme();

  const dialogRadius =
    position === 'bottom'
      ? {
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }
      : { borderRadius: radius['2xl'] };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={position === 'bottom' ? 'slide' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
          <TouchableWithoutFeedback
            onPress={() => {
              /* stop propagation */
            }}
          >
            <View
              style={[
                styles.dialog,
                dialogRadius,
                position === 'bottom' && styles.dialogBottom,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.isDark ? '#000000' : '#0f172a',
                },
                style,
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                  {title}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={styles.closeBtn}
                  hitSlop={8}
                >
                  <Text style={[styles.closeX, { color: theme.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView
                style={{ maxHeight: maxContentHeight }}
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps='handled'
              >
                {children}
              </ScrollView>

              {/* Footer */}
              {footer ? (
                <View style={[styles.footer, { borderTopColor: theme.divider }]}>{footer}</View>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  dialogBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 9999,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    flex: 1,
    fontFamily: 'Sculpin-Bold',
  },
  closeBtn: {
    padding: 4,
    marginLeft: spacing[2],
  },
  closeX: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  body: {
    padding: spacing[4],
    gap: spacing[3],
  },
  footer: {
    borderTopWidth: 1,
    padding: spacing[4],
  },
});

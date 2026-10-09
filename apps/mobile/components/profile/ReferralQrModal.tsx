import { Copy, Share2, X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAppTranslation } from '../i18n/useAppTranslation';
import type { ColorPalette } from './AchievementBadge';

interface ReferralQrModalProps {
  visible: boolean;
  referralCode: string;
  referralLink: string;
  displayLink: string;
  hasValidLink: boolean;
  copied: boolean;
  isDark: boolean;
  c: ColorPalette;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
}

export function ReferralQrModal({
  visible,
  referralCode,
  referralLink,
  displayLink,
  hasValidLink,
  copied,
  isDark,
  c,
  onCopy,
  onShare,
  onClose,
}: ReferralQrModalProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const { width, height } = useWindowDimensions();
  const modalBackground = isDark ? '#10201c' : '#ffffff';
  const qrSize = Math.max(156, Math.min(240, width - 112));
  const closeLabel = t('profile.referral.closeQr', undefined, 'Close referral QR code');
  const copyLabel = t('profile.referral.copy', undefined, 'Copy');
  const shareLabel = t('profile.referral.share', undefined, 'Share');
  const shareAccessibilityLabel = t(
    'profile.referral.shareTitle',
    undefined,
    'Share your referral link'
  );

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') {
      return;
    }

    const webGlobal = globalThis as unknown as {
      addEventListener?: (event: string, listener: (event: { key?: string }) => void) => void;
      removeEventListener?: (event: string, listener: (event: { key?: string }) => void) => void;
    };
    const handleKeyDown = (event: { key?: string }): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    webGlobal.addEventListener?.('keydown', handleKeyDown);
    return () => webGlobal.removeEventListener?.('keydown', handleKeyDown);
  }, [onClose, visible]);

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <View style={styles.centered}>
        <Pressable
          testID='referral-qr-backdrop'
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          accessibilityRole='button'
          accessibilityLabel={closeLabel}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              width: Math.min(420, width - 32),
              maxHeight: height - 48,
              borderColor: c.cardBorder,
              backgroundColor: modalBackground,
            },
          ]}
        >
          <View style={styles.header}>
            <Text accessibilityRole='header' style={[styles.title, { color: c.text }]}>
              {t('profile.referral.qrTitle', undefined, 'Your referral QR code')}
            </Text>
            <Pressable
              testID='referral-qr-close'
              accessibilityRole='button'
              accessibilityLabel={closeLabel}
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={20} color={c.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.description, { color: c.muted }]}>
              {t('profile.referral.qrDescription', undefined, 'Scan to open your referral link.')}
            </Text>

            {hasValidLink ? (
              <View
                accessible
                accessibilityRole='image'
                accessibilityLabel={t(
                  'profile.referral.qrAccessibilityLabel',
                  undefined,
                  'QR code for your referral link'
                )}
                style={styles.qrSurface}
              >
                <QRCode
                  value={referralLink}
                  size={qrSize}
                  color='#111827'
                  backgroundColor='#ffffff'
                  quietZone={12}
                />
              </View>
            ) : (
              <Text accessibilityLiveRegion='polite' style={styles.unavailable}>
                {t('profile.referral.linkUnavailable', undefined, 'Referral link unavailable.')}
              </Text>
            )}

            <View style={[styles.details, { borderColor: c.cardBorder }]}>
              <Text style={[styles.detailLabel, { color: c.muted }]}>
                {t('profile.referral.codeLabel', undefined, 'Referral code')}
              </Text>
              <Text selectable style={[styles.code, { color: c.text }]}>
                {referralCode}
              </Text>
              {hasValidLink ? (
                <Text selectable style={[styles.link, { color: c.muted }]}>
                  {displayLink}
                </Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel={copyLabel}
                accessibilityState={{ disabled: !hasValidLink }}
                disabled={!hasValidLink}
                onPress={onCopy}
                style={[
                  styles.action,
                  {
                    borderColor: c.cardBorder,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                    opacity: hasValidLink ? 1 : 0.45,
                  },
                ]}
              >
                <Copy size={16} color={c.accent} strokeWidth={2.2} />
                <Text style={[styles.actionText, { color: c.accent }]}>
                  {copied ? t('profile.referral.copied', undefined, 'Copied') : copyLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel={shareAccessibilityLabel}
                accessibilityState={{ disabled: !hasValidLink }}
                disabled={!hasValidLink}
                onPress={onShare}
                style={[
                  styles.action,
                  {
                    borderColor: `${c.accent}40`,
                    backgroundColor: `${c.accent}14`,
                    opacity: hasValidLink ? 1 : 0.45,
                  },
                ]}
              >
                <Share2 size={16} color={c.accent} strokeWidth={2.2} />
                <Text style={[styles.actionText, { color: c.accent }]}>{shareLabel}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'stretch',
    gap: 14,
    padding: 20,
    paddingTop: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  qrSurface: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 4,
  },
  unavailable: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    paddingVertical: 28,
    textAlign: 'center',
  },
  details: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 5,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  link: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

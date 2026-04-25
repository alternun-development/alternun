import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { createTypographyStyles } from '../theme/typography';
import { X, Gift } from 'lucide-react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';

interface WelcomeBonusModalProps {
  visible: boolean;
  onClose: () => void;
  onClaim: () => Promise<void>;
  onDisableShowing?: () => void;
  alreadyClaimed?: boolean;
}

export default function WelcomeBonusModal({
  visible,
  onClose,
  onClaim,
  onDisableShowing,
  alreadyClaimed = false,
}: WelcomeBonusModalProps) {
  const t = useAppTranslation();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const handleClaim = async () => {
    if (alreadyClaimed || isClaiming) return;

    setIsClaiming(true);
    try {
      await onClaim();
      setClaimSuccess(true);
      setTimeout(() => {
        onClose();
        setClaimSuccess(false);
      }, 2000);
    } catch {
      setIsClaiming(false);
    }
  };

  if (alreadyClaimed && !claimSuccess) {
    return (
      <Modal visible={visible} transparent animationType='fade'>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color='rgba(232,232,255,0.6)' />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <Gift size={48} color='#1ccba1' />
            </View>

            <Text style={styles.title}>{t.t('dashboard.welcomeBonusModal.alreadyClaimed')}</Text>
            <Text style={styles.message}>
              {t.t('dashboard.welcomeBonusModal.alreadyClaimedMessage')}
            </Text>

            <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
              <Text style={styles.buttonText}>
                {t.t('dashboard.welcomeBonusModal.alreadyClaimed')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (claimSuccess) {
    return (
      <Modal visible={visible} transparent animationType='fade'>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.iconContainer}>
              <Gift size={48} color='#1ccba1' />
            </View>

            <Text style={styles.title}>{t.t('dashboard.welcomeBonusModal.successTitle')}</Text>
            <Text style={styles.message}>{t.t('dashboard.welcomeBonusModal.successMessage')}</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType='slide'>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color='rgba(232,232,255,0.6)' />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Gift size={64} color='#1ccba1' />
          </View>

          <Text style={styles.title}>{t.t('dashboard.welcomeBonusModal.title')}</Text>
          <Text style={styles.subtitle}>{t.t('dashboard.welcomeBonusModal.subtitle')}</Text>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>{t.t('dashboard.welcomeBonusModal.amount')}</Text>
          </View>

          <Text style={styles.description}>{t.t('dashboard.welcomeBonusModal.description')}</Text>

          <TouchableOpacity
            style={[styles.button, isClaiming && styles.buttonDisabled]}
            onPress={() => {
              void handleClaim();
            }}
            disabled={isClaiming}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isClaiming
                ? t.t('dashboard.welcomeBonusModal.claimingButton')
                : t.t('dashboard.welcomeBonusModal.claimButton')}
            </Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onDisableShowing?.();
                onClose();
              }}
              style={styles.dontShowButton}
            >
              <Text style={styles.dontShowButtonText}>Don't show again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = createTypographyStyles({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,16,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d0d1f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
    zIndex: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e8e8ff',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: 'rgba(232,232,255,0.7)',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1ccba1',
    marginBottom: 16,
    textAlign: 'center',
  },
  amountContainer: {
    backgroundColor: 'rgba(28,203,161,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.3)',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1ccba1',
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    color: 'rgba(232,232,255,0.7)',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1ccba1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(28,203,161,0.4)',
    opacity: 0.6,
  },
  buttonText: {
    color: '#0a0f0d',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  dontShowButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,232,255,0.2)',
    borderRadius: 8,
  },
  dontShowButtonText: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 12,
  },
});

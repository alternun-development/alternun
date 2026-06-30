import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import PinPad, { PIN_LENGTH } from './PinPad';

interface PinSetupScreenProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  onCancel: () => void;
  onConfirmed: (pin: string) => void;
}

type Step = 'create' | 'confirm';

export default function PinSetupScreen({
  visible,
  isDark,
  accent,
  onCancel,
  onConfirmed,
}: PinSetupScreenProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [step, setStep] = useState<Step>('create');
  const [firstPin, setFirstPin] = useState('');
  const [value, setValue] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const titleColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';

  const reset = (): void => {
    setStep('create');
    setFirstPin('');
    setValue('');
    setMismatch(false);
  };

  const handleCancel = (): void => {
    reset();
    onCancel();
  };

  const handleChange = (next: string): void => {
    setMismatch(false);
    setValue(next);

    if (next.length !== PIN_LENGTH) return;

    if (step === 'create') {
      setFirstPin(next);
      setValue('');
      setStep('confirm');
      return;
    }

    // step === 'confirm'
    if (next === firstPin) {
      const confirmedPin = firstPin;
      reset();
      onConfirmed(confirmedPin);
      return;
    }

    setMismatch(true);
    setValue('');
    setStep('create');
    setFirstPin('');
  };

  const title =
    step === 'create'
      ? t('wallet.pin.setup.createTitle', undefined, 'Create your wallet PIN')
      : t('wallet.pin.setup.confirmTitle', undefined, 'Confirm your PIN');

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={handleCancel}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Pressable style={styles.closeArea} onPress={handleCancel}>
          <Text style={[styles.closeText, { color: mutedColor }]}>
            {t('shared.actions.cancel', undefined, 'Cancel')}
          </Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>
            {t(
              'wallet.pin.setup.explainer',
              undefined,
              'This 4-digit PIN encrypts your wallet on this device only. Alternun never sees it and cannot recover your wallet if you forget this PIN and lose your backup phrase.'
            )}
          </Text>

          {mismatch ? (
            <Text style={[styles.mismatch, { color: errorColor }]}>
              {t('wallet.pin.setup.mismatch', undefined, "PINs didn't match. Try again.")}
            </Text>
          ) : null}

          <View style={styles.padWrap}>
            <PinPad value={value} onChange={handleChange} isDark={isDark} accent={accent} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  closeArea: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 32,
    gap: 12,
  },
  title: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  mismatch: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
  padWrap: {
    marginTop: 24,
  },
});

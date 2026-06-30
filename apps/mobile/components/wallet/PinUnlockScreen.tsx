import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import PinPad from './PinPad';

interface PinUnlockScreenProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  title?: string;
  /** Resolves with whether the PIN was accepted. Throw to surface an unexpected error. */
  onSubmit: (pin: string) => Promise<{ verified: boolean; lockedUntil?: string }>;
  onUnlocked: () => void;
  onCancel: () => void;
}

function formatCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PinUnlockScreen({
  visible,
  isDark,
  accent,
  title,
  onSubmit,
  onUnlocked,
  onCancel,
}: PinUnlockScreenProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const isLocked = Boolean(lockedUntil && new Date(lockedUntil).getTime() > now);

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (!visible) {
      setValue('');
      setError(null);
      setLockedUntil(null);
      setSubmitting(false);
    }
  }, [visible]);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const titleColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';

  const handleChange = (next: string): void => {
    setError(null);
    setValue(next);

    if (next.length !== 4 || submitting || isLocked) return;

    void (async (): Promise<void> => {
      setSubmitting(true);
      try {
        const result = await onSubmit(next);
        if (result.verified) {
          onUnlocked();
          return;
        }

        setValue('');
        if (result.lockedUntil) {
          setLockedUntil(result.lockedUntil);
        } else {
          setError(t('wallet.pin.unlock.incorrect', undefined, 'Incorrect PIN. Try again.'));
        }
      } catch {
        setValue('');
        setError(
          t('wallet.pin.unlock.error', undefined, 'Something went wrong. Please try again.')
        );
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Pressable style={styles.closeArea} onPress={onCancel}>
          <Text style={[styles.closeText, { color: mutedColor }]}>
            {t('shared.actions.cancel', undefined, 'Cancel')}
          </Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={[styles.title, { color: titleColor }]}>
            {title ?? t('wallet.pin.unlock.title', undefined, 'Enter your PIN')}
          </Text>

          {isLocked && lockedUntil ? (
            <Text style={[styles.error, { color: errorColor }]}>
              {t('wallet.pin.unlock.locked', undefined, 'Too many attempts. Try again in')}{' '}
              {formatCountdown(lockedUntil)}
            </Text>
          ) : error ? (
            <Text style={[styles.error, { color: errorColor }]}>{error}</Text>
          ) : null}

          <View style={styles.padWrap}>
            <PinPad
              value={value}
              onChange={handleChange}
              isDark={isDark}
              accent={accent}
              disabled={submitting || isLocked}
            />
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
    gap: 16,
  },
  title: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  error: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  padWrap: {
    marginTop: 12,
  },
});

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Eye, EyeOff, type LucideProps } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { exportMnemonicKeystore } from '@alternun/wallet';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';

const EyeIcon = Eye as React.FC<LucideProps>;
const EyeOffIcon = EyeOff as React.FC<LucideProps>;

interface WalletBackupScreenProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  mnemonic: string;
  pin: string;
  onDone: () => void;
}

function pickVerificationIndices(wordCount: number): number[] {
  const indices = new Set<number>();
  while (indices.size < Math.min(2, wordCount)) {
    indices.add(Math.floor(Math.random() * wordCount));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

type Step = 'reveal' | 'verify' | 'export';

export default function WalletBackupScreen({
  visible,
  isDark,
  accent,
  mnemonic,
  pin,
  onDone,
}: WalletBackupScreenProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [step, setStep] = useState<Step>('reveal');
  const [revealed, setRevealed] = useState(false);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmPlaintext, setConfirmPlaintext] = useState(false);

  const words = useMemo(() => mnemonic.trim().split(/\s+/), [mnemonic]);
  const verificationIndices = useMemo(() => pickVerificationIndices(words.length), [words.length]);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const titleColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)';

  const handleVerify = (): void => {
    const allCorrect = verificationIndices.every(
      (index) => (verifyInputs[index] ?? '').trim().toLowerCase() === words[index].toLowerCase()
    );

    if (!allCorrect) {
      setVerifyError(
        t(
          'wallet.backup.verifyError',
          undefined,
          "That doesn't match. Check your backup and try again."
        )
      );
      return;
    }

    setVerifyError(null);
    setStep('export');
  };

  const handleExportKeystore = async (): Promise<void> => {
    setExporting(true);
    try {
      const keystore = await exportMnemonicKeystore(pin, mnemonic);
      const file = new File(Paths.cache, 'alternun-wallet-backup.json');
      file.write(JSON.stringify(keystore, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
      } else {
        Alert.alert(
          t('wallet.backup.shareUnavailableTitle', undefined, 'Sharing unavailable'),
          t(
            'wallet.backup.shareUnavailableBody',
            undefined,
            'This device cannot share files. Your wallet is still safely stored on this device.'
          )
        );
      }
    } catch {
      Alert.alert(
        t('wallet.backup.exportErrorTitle', undefined, 'Export failed'),
        t(
          'wallet.backup.exportErrorBody',
          undefined,
          'Could not create the backup file. Please try again.'
        )
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportPlaintext = async (): Promise<void> => {
    if (!confirmPlaintext) return;
    setExporting(true);
    try {
      const file = new File(Paths.cache, 'alternun-wallet-recovery-phrase.txt');
      file.write(mnemonic);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/plain' });
      }
    } catch {
      Alert.alert(
        t('wallet.backup.exportErrorTitle', undefined, 'Export failed'),
        t(
          'wallet.backup.exportErrorBody',
          undefined,
          'Could not create the backup file. Please try again.'
        )
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType='fade'>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 'reveal' && (
            <>
              <Text style={[styles.title, { color: titleColor }]}>
                {t('wallet.backup.revealTitle', undefined, 'Back up your recovery phrase')}
              </Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>
                {t(
                  'wallet.backup.revealSubtitle',
                  undefined,
                  'This is the only way to recover your wallet. Alternun does not keep a copy — write it down and store it somewhere safe.'
                )}
              </Text>

              {!revealed ? (
                <Pressable
                  style={[styles.revealGate, { backgroundColor: cardBg }]}
                  onPress={() => setRevealed(true)}
                >
                  <EyeIcon size={28} color={accent} />
                  <Text style={[styles.revealGateText, { color: titleColor }]}>
                    {t('wallet.backup.tapToReveal', undefined, 'Tap to reveal')}
                  </Text>
                </Pressable>
              ) : (
                <>
                  <View style={[styles.wordsGrid, { backgroundColor: cardBg }]}>
                    {words.map((word, index) => (
                      <View key={index} style={styles.wordChip}>
                        <Text style={[styles.wordIndex, { color: mutedColor }]}>{index + 1}</Text>
                        <Text style={[styles.wordText, { color: titleColor }]}>{word}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    style={[styles.primaryButton, { backgroundColor: accent }]}
                    onPress={() => setStep('verify')}
                  >
                    <Text style={styles.primaryButtonText}>
                      {t('wallet.backup.savedIt', undefined, "I've saved it")}
                    </Text>
                  </Pressable>
                </>
              )}
            </>
          )}

          {step === 'verify' && (
            <>
              <Text style={[styles.title, { color: titleColor }]}>
                {t('wallet.backup.verifyTitle', undefined, 'Confirm your backup')}
              </Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>
                {t(
                  'wallet.backup.verifySubtitle',
                  undefined,
                  'Enter the requested words from your phrase.'
                )}
              </Text>

              {verificationIndices.map((index) => (
                <View key={index} style={styles.verifyRow}>
                  <Text style={[styles.verifyLabel, { color: mutedColor }]}>
                    {t('wallet.backup.wordNumber', undefined, 'Word')} #{index + 1}
                  </Text>
                  <TextInput
                    style={[styles.verifyInput, { color: titleColor, backgroundColor: cardBg }]}
                    autoCapitalize='none'
                    autoCorrect={false}
                    value={verifyInputs[index] ?? ''}
                    onChangeText={(text) => setVerifyInputs((prev) => ({ ...prev, [index]: text }))}
                  />
                </View>
              ))}

              {verifyError ? (
                <Text style={[styles.error, { color: errorColor }]}>{verifyError}</Text>
              ) : null}

              <Pressable
                style={[styles.primaryButton, { backgroundColor: accent }]}
                onPress={handleVerify}
              >
                <Text style={styles.primaryButtonText}>
                  {t('shared.actions.continue', undefined, 'Continue')}
                </Text>
              </Pressable>
            </>
          )}

          {step === 'export' && (
            <>
              <Text style={[styles.title, { color: titleColor }]}>
                {t('wallet.backup.exportTitle', undefined, 'Save a backup file (optional)')}
              </Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>
                {t(
                  'wallet.backup.exportSubtitle',
                  undefined,
                  'This export is your only backup — there is no copy on our servers.'
                )}
              </Text>

              <Pressable
                style={[styles.primaryButton, { backgroundColor: accent }]}
                onPress={() => void handleExportKeystore()}
                disabled={exporting}
              >
                <Text style={styles.primaryButtonText}>
                  {t('wallet.backup.exportKeystore', undefined, 'Export encrypted backup file')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.checkboxRow]}
                onPress={() => setConfirmPlaintext((prev) => !prev)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: accent,
                      backgroundColor: confirmPlaintext ? accent : 'transparent',
                    },
                  ]}
                >
                  {confirmPlaintext ? <EyeOffIcon size={12} color='#fff' /> : null}
                </View>
                <Text style={[styles.checkboxLabel, { color: mutedColor }]}>
                  {t(
                    'wallet.backup.plaintextWarning',
                    undefined,
                    'I understand this exposes my funds if this file is stolen'
                  )}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.secondaryButton,
                  { borderColor: accent, opacity: confirmPlaintext ? 1 : 0.4 },
                ]}
                onPress={() => void handleExportPlaintext()}
                disabled={!confirmPlaintext || exporting}
              >
                <Text style={[styles.secondaryButtonText, { color: accent }]}>
                  {t(
                    'wallet.backup.exportPlaintext',
                    undefined,
                    'Export plain text recovery phrase'
                  )}
                </Text>
              </Pressable>

              <Pressable style={styles.finishButton} onPress={onDone}>
                <Text style={[styles.finishButtonText, { color: accent }]}>
                  {t('shared.actions.done', undefined, 'Done')}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
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
  scrollContent: {
    gap: 16,
    paddingBottom: 48,
  },
  title: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    lineHeight: 20,
  },
  revealGate: {
    borderRadius: 18,
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  revealGateText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
    fontWeight: '700',
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '30%',
  },
  wordIndex: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    fontWeight: '600',
  },
  wordText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  verifyRow: {
    gap: 6,
  },
  verifyLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '600',
  },
  verifyInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 15,
  },
  error: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
  },
  finishButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  finishButtonText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
  },
});

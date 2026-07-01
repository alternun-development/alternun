import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Eye, type LucideProps } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { exportMnemonicKeystore } from '@alternun/wallet';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';

const EyeIcon = Eye as React.FC<LucideProps>;
const CheckIcon = Check as React.FC<LucideProps>;

interface WalletBackupScreenProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  mnemonic: string;
  pin: string;
  onDone: () => void;
  /** Skip straight to the export step (used when re-exporting an existing wallet, where PIN
   * re-entry already re-authenticates the user — the word-verification step exists to confirm a
   * *brand-new* backup was actually written down, not needed again here). Defaults to the full
   * reveal -> verify -> export onboarding flow. */
  initialStep?: Step;
}

const VERIFICATION_WORD_COUNT = 3;

function pickVerificationIndices(wordCount: number): number[] {
  const indices = new Set<number>();
  while (indices.size < Math.min(VERIFICATION_WORD_COUNT, wordCount)) {
    indices.add(Math.floor(Math.random() * wordCount));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

// expo-file-system's File/Paths class API (v19) has no web implementation — `validatePath()` is
// declared in its types but only backed natively (iOS/Android); calling it on web throws
// "this.validatePath is not a function". Browsers don't need a filesystem write + share-sheet
// round trip anyway — a direct Blob download covers the same "save this file" goal natively.
function downloadFileOnWeb(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type Step = 'reveal' | 'verify' | 'export';

export default function WalletBackupScreen({
  visible,
  isDark,
  accent,
  mnemonic,
  pin,
  onDone,
  initialStep,
}: WalletBackupScreenProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [step, setStep] = useState<Step>(initialStep ?? 'reveal');
  const [revealed, setRevealed] = useState(false);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmPlaintext, setConfirmPlaintext] = useState(false);
  const [acknowledgedSafety, setAcknowledgedSafety] = useState(false);
  // Shown inline rather than via Alert.alert, which is a no-op on web (react-native-web's
  // Alert.alert renders nothing — export failures there were invisible to the user).
  const [exportNotice, setExportNotice] = useState<{ message: string; isError: boolean } | null>(
    null
  );

  // Re-initialize whenever this screen is (re-)opened — it's a long-lived component instance
  // toggled via `visible`, not remounted, so without this a second open (e.g. re-export from the
  // wallet tab after already completing the creation flow once) would resume on stale state.
  useEffect(() => {
    if (visible) {
      setStep(initialStep ?? 'reveal');
      setRevealed(false);
      setVerifyInputs({});
      setVerifyError(null);
      setConfirmPlaintext(false);
      setAcknowledgedSafety(false);
      setExportNotice(null);
    }
  }, [visible]);

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
    setExportNotice(null);
    try {
      const keystore = await exportMnemonicKeystore(pin, mnemonic);
      const content = JSON.stringify(keystore, null, 2);

      if (Platform.OS === 'web') {
        downloadFileOnWeb('alternun-wallet-backup.json', content, 'application/json');
      } else {
        const file = new File(Paths.cache, 'alternun-wallet-backup.json');
        file.write(content);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
        } else {
          setExportNotice({
            message: t(
              'wallet.backup.shareUnavailableBody',
              undefined,
              'This device cannot share files. Your wallet is still safely stored on this device.'
            ),
            isError: false,
          });
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        '[WalletBackupScreen] export keystore failed:',
        error instanceof Error ? error.message : error
      );
      setExportNotice({
        message: t(
          'wallet.backup.exportErrorBody',
          undefined,
          'Could not create the backup file. Please try again.'
        ),
        isError: true,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPlaintext = async (): Promise<void> => {
    if (!confirmPlaintext) return;
    setExporting(true);
    setExportNotice(null);
    try {
      if (Platform.OS === 'web') {
        downloadFileOnWeb('alternun-wallet-recovery-phrase.txt', mnemonic, 'text/plain');
      } else {
        const file = new File(Paths.cache, 'alternun-wallet-recovery-phrase.txt');
        file.write(mnemonic);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, { mimeType: 'text/plain' });
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        '[WalletBackupScreen] export plaintext failed:',
        error instanceof Error ? error.message : error
      );
      setExportNotice({
        message: t(
          'wallet.backup.exportErrorBody',
          undefined,
          'Could not create the backup file. Please try again.'
        ),
        isError: true,
      });
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

                  <View style={[styles.disclaimerBox, { backgroundColor: cardBg }]}>
                    <Text style={[styles.disclaimerText, { color: errorColor }]}>
                      {t(
                        'wallet.backup.disclaimer',
                        undefined,
                        'Write this down on paper and store it somewhere safe and offline. Do not take a screenshot, do not save it in a notes app, email, or cloud storage. Anyone with these words can take your funds. If you lose them, Alternun cannot recover your wallet — they are gone for good.'
                      )}
                    </Text>
                  </View>

                  <Pressable
                    style={[styles.checkboxRow]}
                    onPress={() => setAcknowledgedSafety((prev) => !prev)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: accent,
                          backgroundColor: acknowledgedSafety ? accent : 'transparent',
                        },
                      ]}
                    >
                      {acknowledgedSafety ? (
                        <CheckIcon size={14} color='#fff' strokeWidth={3} />
                      ) : null}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: mutedColor }]}>
                      {t(
                        'wallet.backup.safetyAcknowledge',
                        undefined,
                        "I've written down my recovery phrase on paper and stored it somewhere safe. I understand Alternun cannot recover it for me."
                      )}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.primaryButton,
                      { backgroundColor: accent, opacity: acknowledgedSafety ? 1 : 0.4 },
                    ]}
                    onPress={() => setStep('verify')}
                    disabled={!acknowledgedSafety}
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
                  'We picked these at random to make sure you actually wrote down your phrase correctly — enter them exactly as shown.'
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
                    spellCheck={false}
                    // See WalletRestoreFlow.tsx's mnemonic input comment — react-native-web
                    // defaults autoComplete to 'on', which would let browsers offer to
                    // save/autofill individual recovery-phrase words.
                    autoComplete='off'
                    textContentType='none'
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

              <Pressable style={styles.backLink} onPress={() => setStep('reveal')}>
                <Text style={[styles.backLinkText, { color: accent }]}>
                  {t('wallet.backup.viewPhraseAgain', undefined, 'View phrase again')}
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

              {exportNotice ? (
                <Text
                  style={[
                    styles.subtitle,
                    { color: exportNotice.isError ? errorColor : mutedColor },
                  ]}
                >
                  {exportNotice.message}
                </Text>
              ) : null}

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
                  {confirmPlaintext ? <CheckIcon size={14} color='#fff' strokeWidth={3} /> : null}
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
  disclaimerBox: {
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  disclaimerText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
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
  backLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backLinkText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
});

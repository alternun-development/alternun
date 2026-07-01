import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  importMnemonicKeystore,
  deriveWalletBundle,
  storeMnemonic,
  createPinDigest,
  type AlternunKeystoreV1,
} from '@alternun/wallet';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import PinPad from './PinPad';
import { restoreWallet, type AuthClient, type WalletAccountRecord } from './walletApiClient';
import { isTestnetRuntime } from '../../utils/runtimeConfig';

interface WalletImportKeystoreFlowProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  onCancel: () => void;
  onComplete: (account: WalletAccountRecord) => void;
}

type Step = 'json' | 'pin' | 'restoring' | 'failed';

export default function WalletImportKeystoreFlow({
  visible,
  isDark,
  accent,
  client,
  onCancel,
  onComplete,
}: WalletImportKeystoreFlowProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [step, setStep] = useState<Step>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [parsedKeystore, setParsedKeystore] = useState<AlternunKeystoreV1 | null>(null);
  const [pin, setPin] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';

  const reset = (): void => {
    setStep('json');
    setJsonInput('');
    setJsonError(null);
    setParsedKeystore(null);
    setPin('');
    setRestoreError(null);
  };

  const handleClose = (): void => {
    reset();
    onCancel();
  };

  const handleJsonContinue = (): void => {
    setJsonError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput.trim());
    } catch {
      setJsonError(
        t(
          'wallet.import.invalidJson',
          undefined,
          'Could not parse the JSON — check for formatting errors.'
        )
      );
      return;
    }
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as Record<string, unknown>).alternunKeystoreVersion !== 1
    ) {
      setJsonError(
        t(
          'wallet.import.invalidKeystore',
          undefined,
          'This does not look like an Alternun wallet backup file. Make sure you exported it from the "Export encrypted backup file" option.'
        )
      );
      return;
    }
    setParsedKeystore(parsed as AlternunKeystoreV1);
    setStep('pin');
  };

  const handlePinChange = (next: string): void => {
    setPin(next);
    if (next.length !== 4) return;
    void executeImport(next);
  };

  const executeImport = async (enteredPin: string): Promise<void> => {
    if (!parsedKeystore) return;
    setStep('restoring');
    try {
      const mnemonic = await importMnemonicKeystore(enteredPin, parsedKeystore);
      if (!mnemonic) {
        setPin('');
        setRestoreError(
          t(
            'wallet.import.wrongPin',
            undefined,
            'Incorrect PIN — this is the PIN you used when you exported the backup file.'
          )
        );
        setStep('pin');
        return;
      }

      const bundle = deriveWalletBundle(mnemonic, 0, isTestnetRuntime() ? 'testnet' : 'mainnet');
      await storeMnemonic(enteredPin, mnemonic);
      const digest = await createPinDigest(enteredPin);
      const { account } = await restoreWallet(client, {
        pinSalt: digest.salt,
        pinHash: digest.hash,
        account: {
          derivationIndex: bundle.accountIndex,
          evmAddress: bundle.evm.address,
          bitcoinAddress: bundle.bitcoin.address,
          solanaAddress: bundle.solana.address,
          isPrimary: true,
        },
      });
      reset();
      onComplete(account);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        '[WalletImportKeystoreFlow] import failed:',
        error instanceof Error ? error.message : error
      );
      setRestoreError(error instanceof Error ? error.message : String(error));
      setStep('failed');
    }
  };

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Pressable style={styles.closeArea} onPress={handleClose}>
          <Text style={[styles.closeText, { color: mutedColor }]}>
            {t('shared.actions.cancel', undefined, 'Cancel')}
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: textColor }]}>
          {t('wallet.import.title', undefined, 'Import backup file')}
        </Text>

        {step === 'json' && (
          <>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
              {t(
                'wallet.import.subtitle',
                undefined,
                'Paste the contents of your exported .json backup file, then enter the PIN you used when you exported it.'
              )}
            </Text>
            <TextInput
              style={[styles.jsonInput, { backgroundColor: cardBg, color: textColor }]}
              value={jsonInput}
              onChangeText={(text) => {
                setJsonInput(text);
                setJsonError(null);
              }}
              placeholder={t(
                'wallet.import.placeholder',
                undefined,
                '{ "alternunKeystoreVersion": 1, ... }'
              )}
              placeholderTextColor={mutedColor}
              autoCapitalize='none'
              autoCorrect={false}
              autoComplete='off'
              multiline
              numberOfLines={6}
            />
            {jsonError ? (
              <Text style={[styles.error, { color: errorColor }]}>{jsonError}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              activeOpacity={0.8}
              onPress={handleJsonContinue}
            >
              <Text style={styles.primaryBtnText}>
                {t('shared.actions.continue', undefined, 'Continue')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'pin' && (
          <View style={styles.pinStep}>
            <Text style={[styles.pinTitle, { color: textColor }]}>
              {t('wallet.import.pinTitle', undefined, 'Enter your export PIN')}
            </Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
              {t(
                'wallet.import.pinSubtitle',
                undefined,
                'This is the PIN you entered when you exported this backup file, not your current wallet PIN.'
              )}
            </Text>
            {restoreError ? (
              <Text style={[styles.error, { color: errorColor }]}>{restoreError}</Text>
            ) : null}
            <PinPad value={pin} onChange={handlePinChange} isDark={isDark} accent={accent} />
          </View>
        )}

        {step === 'restoring' && (
          <View style={styles.centered}>
            <ActivityIndicator size='large' color={accent} />
            <Text style={[styles.pinTitle, { color: textColor }]}>
              {t('wallet.import.restoring', undefined, 'Importing your wallet…')}
            </Text>
          </View>
        )}

        {step === 'failed' && (
          <View style={styles.centered}>
            <Text style={[styles.pinTitle, { color: errorColor }]}>
              {t('wallet.import.failedTitle', undefined, 'Import failed')}
            </Text>
            {restoreError ? (
              <Text style={[styles.error, { color: mutedColor, textAlign: 'center' }]}>
                {restoreError}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 16 }]}
              activeOpacity={0.8}
              onPress={() => setStep('json')}
            >
              <Text style={styles.primaryBtnText}>
                {t('wallet.send.retry', undefined, 'Try again')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 24 },
  closeArea: { alignSelf: 'flex-end', padding: 8 },
  closeText: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 14, fontWeight: '600' },
  title: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 22, fontWeight: '800', marginTop: 8 },
  subtitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  jsonInput: {
    borderRadius: 14,
    padding: 14,
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  primaryBtnText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  pinStep: { alignItems: 'center', gap: 12, marginTop: 8 },
  pinTitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});

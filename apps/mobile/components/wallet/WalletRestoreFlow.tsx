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
  createPinDigest,
  deriveWalletBundle,
  storeMnemonic,
  validateMnemonic,
} from '@alternun/wallet';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import PinSetupScreen from './PinSetupScreen';
import { restoreWallet, type AuthClient, type WalletAccountRecord } from './walletApiClient';
import { isTestnetRuntime } from '../../utils/runtimeConfig';

interface WalletRestoreFlowProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  onCancel: () => void;
  onComplete: (account: WalletAccountRecord) => void;
}

type Stage = 'mnemonic' | 'pin' | 'restoring' | 'failed';

export default function WalletRestoreFlow({
  visible,
  isDark,
  accent,
  client,
  onCancel,
  onComplete,
}: WalletRestoreFlowProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [stage, setStage] = useState<Stage>('mnemonic');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [mnemonicError, setMnemonicError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const titleColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)';

  const reset = (): void => {
    setStage('mnemonic');
    setMnemonicInput('');
    setMnemonicError(null);
    setRestoreError(null);
  };

  const handleClose = (): void => {
    reset();
    onCancel();
  };

  const handleMnemonicContinue = (): void => {
    const trimmed = mnemonicInput.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!validateMnemonic(trimmed)) {
      setMnemonicError(
        t(
          'wallet.restore.invalidMnemonic',
          undefined,
          "That doesn't look like a valid 12-24 word recovery phrase. Check for typos or extra spaces."
        )
      );
      return;
    }
    setMnemonicError(null);
    setMnemonicInput(trimmed);
    setStage('pin');
  };

  const handlePinConfirmed = (pin: string): void => {
    void (async (): Promise<void> => {
      setStage('restoring');
      try {
        const bundle = deriveWalletBundle(
          mnemonicInput,
          0,
          isTestnetRuntime() ? 'testnet' : 'mainnet'
        );
        await storeMnemonic(pin, mnemonicInput);
        const digest = await createPinDigest(pin);
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
          '[WalletRestoreFlow] restore failed:',
          error instanceof Error ? error.message : error
        );
        setRestoreError(error instanceof Error ? error.message : String(error));
        setStage('failed');
      }
    })();
  };

  return (
    <>
      <Modal visible={visible && stage === 'mnemonic'} transparent animationType='fade'>
        <View style={[styles.container, { backgroundColor: bg }]}>
          <Pressable style={styles.closeArea} onPress={handleClose}>
            <Text style={[styles.closeText, { color: mutedColor }]}>
              {t('shared.actions.cancel', undefined, 'Cancel')}
            </Text>
          </Pressable>

          <Text style={[styles.title, { color: titleColor }]}>
            {t('wallet.restore.title', undefined, 'Restore your wallet')}
          </Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>
            {t(
              'wallet.restore.subtitle',
              undefined,
              'Enter your 12-24 word recovery phrase, exactly as you wrote it down.'
            )}
          </Text>

          <TextInput
            style={[styles.mnemonicInput, { backgroundColor: cardBg, color: titleColor }]}
            value={mnemonicInput}
            onChangeText={(text) => {
              setMnemonicInput(text);
              setMnemonicError(null);
            }}
            placeholder={t('wallet.restore.placeholder', undefined, 'word1 word2 word3 ...')}
            placeholderTextColor={mutedColor}
            autoCapitalize='none'
            autoCorrect={false}
            spellCheck={false}
            // react-native-web's TextInput defaults autoComplete to 'on' when unset — without
            // this, browsers may offer to save/autofill the recovery phrase into their password
            // manager or form-fill history. 'off' is the correct value for a field this sensitive
            // (there's no standard autocomplete token for "BIP-39 mnemonic").
            autoComplete='off'
            textContentType='none'
            multiline
            numberOfLines={4}
          />

          {mnemonicError ? (
            <Text style={[styles.error, { color: errorColor }]}>{mnemonicError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accent }]}
            activeOpacity={0.8}
            onPress={handleMnemonicContinue}
          >
            <Text style={styles.primaryBtnText}>
              {t('shared.actions.continue', undefined, 'Continue')}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <PinSetupScreen
        visible={visible && stage === 'pin'}
        isDark={isDark}
        accent={accent}
        onCancel={handleClose}
        onConfirmed={handlePinConfirmed}
      />

      <Modal visible={visible && stage === 'restoring'} transparent>
        <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
          <ActivityIndicator size='large' color={accent} />
          <Text style={[styles.loadingText, { color: titleColor }]}>
            {t('wallet.restore.restoring', undefined, 'Restoring your wallet…')}
          </Text>
        </View>
      </Modal>

      <Modal visible={visible && stage === 'failed'} transparent>
        <View style={[styles.loadingContainer, { backgroundColor: bg, paddingHorizontal: 24 }]}>
          <Text style={[styles.loadingText, { color: errorColor, textAlign: 'center' }]}>
            {t('wallet.restore.failedTitle', undefined, 'Could not restore wallet')}
          </Text>
          {restoreError ? (
            <Text style={[styles.error, { color: mutedColor, textAlign: 'center' }]}>
              {restoreError}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 8 }]}
            activeOpacity={0.8}
            onPress={() => setStage('pin')}
          >
            <Text style={styles.primaryBtnText}>
              {t('wallet.send.retry', undefined, 'Try again')}
            </Text>
          </TouchableOpacity>
          <Pressable onPress={handleClose}>
            <Text style={[styles.closeText, { color: mutedColor, marginTop: 12 }]}>
              {t('shared.actions.cancel', undefined, 'Cancel')}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </>
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
  title: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  mnemonicInput: {
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 15,
    fontWeight: '600',
  },
});

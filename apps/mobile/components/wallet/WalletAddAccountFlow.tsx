/**
 * WalletAddAccountFlow — adds a second (or third, etc.) HD account derived from
 * the user's existing recovery phrase.
 *
 * Industry-standard HD wallet model: one mnemonic, multiple derived accounts
 * at consecutive derivation indices (m/44'/coin'/0'/0/N). No new mnemonic is
 * generated or stored — the existing one (already in secure storage) covers
 * every additional account automatically.
 *
 * Server: calls addWalletAccount (POST /v1/wallet/accounts), NOT setupWallet.
 * That's intentional: setup() is first-wallet-only and correctly rejects with
 * ConflictException when a wallet already exists.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deriveWalletBundle, unlockMnemonicWithDiagnosis } from '@alternun/wallet';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import PinPad from './PinPad';
import {
  addWalletAccount,
  verifyWalletPin,
  type AuthClient,
  type WalletAccountRecord,
} from './walletApiClient';
import { isTestnetRuntime } from '../../utils/runtimeConfig';

interface WalletAddAccountFlowProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  /** Existing accounts — used to determine the next derivation index. */
  existingAccounts: WalletAccountRecord[];
  onCancel: () => void;
  onComplete: (account: WalletAccountRecord) => void;
}

type Step = 'intro' | 'pin' | 'deriving' | 'failed';

export default function WalletAddAccountFlow({
  visible,
  isDark,
  accent,
  client,
  existingAccounts,
  onCancel,
  onComplete,
}: WalletAddAccountFlowProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [step, setStep] = useState<Step>('intro');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';

  // Next derivation index = max existing + 1 (gaps are fine for display purposes)
  const nextIndex =
    existingAccounts.reduce((max, a) => Math.max(max, a.derivationIndex ?? 0), -1) + 1;

  const reset = (): void => {
    setStep('intro');
    setPin('');
    setError(null);
  };

  const handleClose = (): void => {
    reset();
    onCancel();
  };

  const handlePinChange = (next: string): void => {
    setPin(next);
    if (next.length !== 4) return;
    void executeAdd(next);
  };

  const executeAdd = async (confirmedPin: string): Promise<void> => {
    setStep('deriving');
    try {
      // Gate via server rate-limited verify-pin
      const result = await verifyWalletPin(client, confirmedPin);
      if (!result.verified) {
        setError(
          result.lockedUntil
            ? t('wallet.pin.unlock.locked', undefined, 'Too many attempts. Try again later.')
            : t('wallet.pin.unlock.incorrect', undefined, 'Incorrect PIN. Try again.')
        );
        setPin('');
        setStep('pin');
        return;
      }

      // Decrypt the existing mnemonic from local secure storage
      const unlock = await unlockMnemonicWithDiagnosis(confirmedPin);
      if (!unlock.ok) {
        setError(
          unlock.reason === 'no_vault'
            ? 'Your wallet is not stored on this device. Restore it first using your recovery phrase.'
            : t(
                'wallet.addAccount.unlockFailed',
                undefined,
                'Incorrect PIN — local decryption failed.'
              )
        );
        setStep('failed');
        return;
      }
      const mnemonic = unlock.mnemonic;

      // Derive the next HD account from the same mnemonic
      const bundle = deriveWalletBundle(
        mnemonic,
        nextIndex,
        isTestnetRuntime() ? 'testnet' : 'mainnet'
      );

      const { account } = await addWalletAccount(client, {
        derivationIndex: bundle.accountIndex,
        evmAddress: bundle.evm.address,
        bitcoinAddress: bundle.bitcoin.address,
        solanaAddress: bundle.solana.address,
        isPrimary: false,
      });

      reset();
      onComplete(account);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[WalletAddAccountFlow] failed:', err instanceof Error ? err.message : err);
      setError(err instanceof Error ? err.message : String(err));
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
          {t('wallet.addAccount.title', undefined, 'Add account')}
        </Text>

        {step === 'intro' && (
          <>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
              {t(
                'wallet.addAccount.subtitle',
                { index: nextIndex + 1 },
                `This will add Account #${
                  nextIndex + 1
                } derived from your existing recovery phrase — no new backup phrase is needed.`
              )}
            </Text>
            <Text style={[styles.note, { color: mutedColor }]}>
              {t(
                'wallet.addAccount.note',
                undefined,
                'Your existing recovery phrase and PIN give you access to all accounts.'
              )}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              activeOpacity={0.8}
              onPress={() => setStep('pin')}
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
              {t('wallet.addAccount.pinTitle', undefined, 'Enter your wallet PIN')}
            </Text>
            {error ? <Text style={[styles.error, { color: errorColor }]}>{error}</Text> : null}
            <PinPad value={pin} onChange={handlePinChange} isDark={isDark} accent={accent} />
          </View>
        )}

        {step === 'deriving' && (
          <View style={styles.centered}>
            <ActivityIndicator size='large' color={accent} />
            <Text style={[styles.pinTitle, { color: textColor }]}>
              {t('wallet.addAccount.deriving', undefined, 'Deriving account…')}
            </Text>
          </View>
        )}

        {step === 'failed' && (
          <View style={styles.centered}>
            <Text style={[styles.pinTitle, { color: errorColor }]}>
              {t('wallet.addAccount.failed', undefined, 'Could not add account')}
            </Text>
            {error ? (
              <Text style={[styles.error, { color: mutedColor, textAlign: 'center' }]}>
                {error}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 16 }]}
              activeOpacity={0.8}
              onPress={() => setStep('intro')}
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
  subtitle: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 14, lineHeight: 20, marginTop: 12 },
  note: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    fontStyle: 'italic',
  },
  error: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 13, fontWeight: '600', marginTop: 8 },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  primaryBtnText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  pinStep: { alignItems: 'center', gap: 16, marginTop: 8 },
  pinTitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});

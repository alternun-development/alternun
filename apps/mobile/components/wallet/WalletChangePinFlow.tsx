/**
 * WalletChangePinFlow — lets the user change their wallet PIN without generating
 * a new recovery phrase.
 *
 * Flow:
 *   1. Enter current PIN → verified server-side (rate-limited) + used to decrypt vault
 *   2. Enter new PIN (create + confirm)
 *   3. Re-encrypt vault with new PIN + update server PIN digest via /restore
 *
 * Security note: the mnemonic never leaves the device. Re-encryption happens
 * entirely client-side — the server only receives the new PIN digest (salt+hash),
 * same as during initial wallet creation.
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
import {
  createPinDigest,
  deriveWalletBundle,
  storeMnemonic,
  unlockMnemonicWithDiagnosis,
} from '@alternun/wallet';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import PinPad from './PinPad';
import PinSetupScreen from './PinSetupScreen';
import {
  restoreWallet,
  verifyWalletPin,
  type AuthClient,
  type WalletAccountRecord,
} from './walletApiClient';
import { isTestnetRuntime } from '../../utils/runtimeConfig';

interface WalletChangePinFlowProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  primaryAccount: WalletAccountRecord | null;
  onCancel: () => void;
  onComplete: () => void;
}

type Step = 'current_pin' | 'new_pin' | 'saving' | 'done' | 'failed';

export default function WalletChangePinFlow({
  visible,
  isDark,
  accent,
  client,
  primaryAccount,
  onCancel,
  onComplete,
}: WalletChangePinFlowProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [step, setStep] = useState<Step>('current_pin');
  const [currentPin, setCurrentPin] = useState('');
  const [currentPinError, setCurrentPinError] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';

  const reset = (): void => {
    setStep('current_pin');
    setCurrentPin('');
    setCurrentPinError(null);
    setMnemonic('');
    setError(null);
  };

  const handleClose = (): void => {
    reset();
    onCancel();
  };

  const handleCurrentPinChange = (next: string): void => {
    setCurrentPin(next);
    if (next.length !== 4) return;

    void (async () => {
      // Step 1a: verify server-side (rate limit gate)
      const verifyResult = await verifyWalletPin(client, next);
      if (!verifyResult.verified) {
        setCurrentPinError(
          verifyResult.lockedUntil
            ? t('wallet.pin.unlock.locked', undefined, 'Too many attempts. Try again later.')
            : t('wallet.pin.unlock.incorrect', undefined, 'Incorrect PIN. Try again.')
        );
        setCurrentPin('');
        return;
      }

      // Step 1b: decrypt vault locally
      const unlock = await unlockMnemonicWithDiagnosis(next);
      if (!unlock.ok) {
        setCurrentPinError(
          unlock.reason === 'no_vault'
            ? t('wallet.addAccount.noVaultTitle', undefined, 'Recovery phrase not on this device.')
            : t('wallet.pin.unlock.incorrect', undefined, 'Incorrect PIN. Try again.')
        );
        setCurrentPin('');
        return;
      }

      setMnemonic(unlock.mnemonic);
      setStep('new_pin');
    })();
  };

  const handleNewPinConfirmed = (newPin: string): void => {
    void (async () => {
      setStep('saving');
      try {
        // Re-encrypt local vault with new PIN
        await storeMnemonic(newPin, mnemonic);

        // Update server PIN digest so verify-pin still works
        const digest = await createPinDigest(newPin);

        if (primaryAccount) {
          const bundle = deriveWalletBundle(
            mnemonic,
            primaryAccount.derivationIndex,
            isTestnetRuntime() ? 'testnet' : 'mainnet'
          );
          await restoreWallet(client, {
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
        }

        setStep('done');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[WalletChangePinFlow] failed:', err instanceof Error ? err.message : err);
        setError(err instanceof Error ? err.message : String(err));
        setStep('failed');
      }
    })();
  };

  return (
    <>
      {/* Current PIN entry */}
      {visible && step === 'current_pin' && (
        <Modal visible transparent animationType='fade' onRequestClose={handleClose}>
          <View style={[styles.container, { backgroundColor: bg }]}>
            <Pressable style={styles.closeArea} onPress={handleClose}>
              <Text style={[styles.closeText, { color: mutedColor }]}>
                {t('shared.actions.cancel', undefined, 'Cancel')}
              </Text>
            </Pressable>
            <Text style={[styles.title, { color: textColor }]}>
              {t('wallet.changePin.title', undefined, 'Change wallet PIN')}
            </Text>
            <View style={styles.pinStep}>
              <Text style={[styles.pinTitle, { color: textColor }]}>
                {t('wallet.changePin.currentPin', undefined, 'Enter your current PIN')}
              </Text>
              {currentPinError ? (
                <Text style={[styles.error, { color: errorColor }]}>{currentPinError}</Text>
              ) : null}
              <PinPad
                value={currentPin}
                onChange={handleCurrentPinChange}
                isDark={isDark}
                accent={accent}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* New PIN setup */}
      <PinSetupScreen
        visible={visible && step === 'new_pin'}
        isDark={isDark}
        accent={accent}
        onCancel={handleClose}
        onConfirmed={handleNewPinConfirmed}
      />

      {/* Saving / done / error */}
      {visible && (step === 'saving' || step === 'done' || step === 'failed') && (
        <Modal visible transparent animationType='fade'>
          <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={styles.centered}>
              {step === 'saving' && (
                <>
                  <ActivityIndicator size='large' color={accent} />
                  <Text style={[styles.pinTitle, { color: textColor }]}>
                    {t('wallet.changePin.saving', undefined, 'Updating PIN…')}
                  </Text>
                </>
              )}
              {step === 'done' && (
                <>
                  <Text style={[styles.pinTitle, { color: textColor }]}>
                    {t('wallet.changePin.done', undefined, 'PIN updated successfully')}
                  </Text>
                  <Text
                    style={[
                      styles.subtitle,
                      { color: mutedColor, textAlign: 'center', marginTop: 8 },
                    ]}
                  >
                    {t(
                      'wallet.changePin.doneDesc',
                      undefined,
                      'Your wallet is now encrypted with your new PIN. Remember it — Alternun cannot recover it.'
                    )}
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 24 }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      reset();
                      onComplete();
                    }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {t('shared.actions.done', undefined, 'Done')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {step === 'failed' && (
                <>
                  <Text style={[styles.pinTitle, { color: errorColor }]}>
                    {t('wallet.changePin.failed', undefined, 'PIN change failed')}
                  </Text>
                  {error ? (
                    <Text style={[styles.error, { color: mutedColor, textAlign: 'center' }]}>
                      {error}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 16 }]}
                    activeOpacity={0.8}
                    onPress={handleClose}
                  >
                    <Text style={styles.primaryBtnText}>
                      {t('wallet.send.retry', undefined, 'Try again')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 24 },
  closeArea: { alignSelf: 'flex-end', padding: 8 },
  closeText: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 14, fontWeight: '600' },
  title: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 22, fontWeight: '800', marginTop: 8 },
  subtitle: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 14, lineHeight: 20 },
  error: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
});

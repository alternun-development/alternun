import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  createPinDigest,
  deriveWalletBundle,
  generateMnemonic,
  storeMnemonic,
} from '@alternun/wallet';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import PinSetupScreen from './PinSetupScreen';
import WalletBackupScreen from './WalletBackupScreen';
import { setupWallet, type AuthClient, type WalletAccountRecord } from './walletApiClient';
import { isTestnetRuntime } from '../../utils/runtimeConfig';

interface WalletCreationFlowProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  onCancel: () => void;
  onComplete: (account: WalletAccountRecord) => void;
}

type Stage = 'pin' | 'generating' | 'backup' | 'registering' | 'registerFailed';

export default function WalletCreationFlow({
  visible,
  isDark,
  accent,
  client,
  onCancel,
  onComplete,
}: WalletCreationFlowProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [stage, setStage] = useState<Stage>('pin');
  const [pin, setPin] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [bundle, setBundle] = useState<ReturnType<typeof deriveWalletBundle> | null>(null);
  // Distinct from PinSetupScreen's internal "PINs didn't match" error — this is for failures from
  // generateMnemonic/storeMnemonic. Shown inline rather than via Alert.alert, which is a no-op on
  // web (react-native-web's Alert.alert renders nothing — errors there were invisible).
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const registrationRef = useRef<Promise<WalletAccountRecord | null> | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';

  // Reset internal state only after the parent has actually hidden this flow (visible -> false),
  // never inside the same tick as the onComplete/onCancel callback that triggers that hide —
  // doing it there raced the parent's state update and could flash PinSetupScreen back onscreen
  // for a frame even on a successful creation, since `stage` flipped to 'pin' before `visible`
  // flipped to false.
  useEffect(() => {
    if (!visible) {
      setStage('pin');
      setMnemonic('');
      setPin('');
      setBundle(null);
      setGenerationError(null);
      setRegisterError(null);
      registrationRef.current = null;
    }
  }, [visible]);

  const handlePinConfirmed = async (confirmedPin: string): Promise<void> => {
    setPin(confirmedPin);
    setGenerationError(null);
    setStage('generating');

    try {
      const generatedMnemonic = generateMnemonic(256); // 24 words
      const derivedBundle = deriveWalletBundle(
        generatedMnemonic,
        0,
        isTestnetRuntime() ? 'testnet' : 'mainnet'
      );
      await storeMnemonic(confirmedPin, generatedMnemonic);

      setMnemonic(generatedMnemonic);
      setBundle(derivedBundle);
      setStage('backup');

      // Kick off server registration in the background while the user reads/backs up their
      // phrase — public addresses + PIN digest only, no secret material. handleBackupDone awaits
      // this same promise rather than calling registerWithServer a second time.
      registrationRef.current = registerWithServer(confirmedPin, derivedBundle);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        '[WalletCreationFlow] wallet generation failed:',
        error instanceof Error ? error.message : error
      );
      setGenerationError(error instanceof Error ? error.message : String(error));
      setStage('pin');
    }
  };

  const registerWithServer = async (
    confirmedPin: string,
    accountBundle: ReturnType<typeof deriveWalletBundle>
  ): Promise<WalletAccountRecord | null> => {
    try {
      const digest = await createPinDigest(confirmedPin);
      const { account } = await setupWallet(client, {
        pinSalt: digest.salt,
        pinHash: digest.hash,
        account: {
          derivationIndex: accountBundle.accountIndex,
          evmAddress: accountBundle.evm.address,
          bitcoinAddress: accountBundle.bitcoin.address,
          solanaAddress: accountBundle.solana.address,
          isPrimary: true,
        },
      });
      return account;
    } catch (error) {
      // Non-fatal here: the wallet already exists locally (storeMnemonic succeeded) — the catch
      // in handleBackupDone surfaces this as a retryable error rather than silently dropping the
      // flow, since the user already saw and confirmed their backup phrase at this point.
      // eslint-disable-next-line no-console
      console.error(
        '[WalletCreationFlow] registerWithServer failed:',
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  };

  const handleBackupDone = (): void => {
    setStage('registering');
    const pending = registrationRef.current ?? Promise.resolve(null);
    void pending
      .then((account) => {
        if (account) {
          onComplete(account);
        } else {
          setRegisterError(
            t(
              'wallet.creation.registerErrorBody',
              undefined,
              'Your wallet was created on this device, but we could not finish registering it. Please check your connection and try again.'
            )
          );
          setStage('registerFailed');
        }
      })
      .catch((error: unknown) => {
        setRegisterError(error instanceof Error ? error.message : String(error));
        setStage('registerFailed');
      });
  };

  const handleRetryRegistration = (): void => {
    if (!bundle) {
      // Should not happen (registerFailed only follows a successful local generation), but fall
      // back to a clean restart rather than retrying with no data.
      setStage('pin');
      return;
    }
    setRegisterError(null);
    setStage('registering');
    registrationRef.current = registerWithServer(pin, bundle);
    void registrationRef.current
      .then((account) => {
        if (account) {
          onComplete(account);
        } else {
          setRegisterError(
            t(
              'wallet.creation.registerErrorBody',
              undefined,
              'Your wallet was created on this device, but we could not finish registering it. Please check your connection and try again.'
            )
          );
          setStage('registerFailed');
        }
      })
      .catch((error: unknown) => {
        setRegisterError(error instanceof Error ? error.message : String(error));
        setStage('registerFailed');
      });
  };

  return (
    <>
      <PinSetupScreen
        visible={visible && stage === 'pin'}
        isDark={isDark}
        accent={accent}
        onCancel={onCancel}
        onConfirmed={(confirmedPin) => void handlePinConfirmed(confirmedPin)}
        externalError={generationError}
      />

      <Modal visible={visible && (stage === 'generating' || stage === 'registering')} transparent>
        <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
          <ActivityIndicator size='large' color={accent} />
          <Text style={[styles.loadingText, { color: textColor }]}>
            {stage === 'generating'
              ? t('wallet.creation.generating', undefined, 'Creating your wallet…')
              : t('wallet.creation.registering', undefined, 'Finishing up…')}
          </Text>
        </View>
      </Modal>

      <Modal visible={visible && stage === 'registerFailed'} transparent>
        <View style={[styles.loadingContainer, { backgroundColor: bg, paddingHorizontal: 24 }]}>
          <Text style={[styles.loadingText, { color: textColor, textAlign: 'center' }]}>
            {t('wallet.creation.registerErrorTitle', undefined, 'Almost done')}
          </Text>
          {registerError ? (
            <Text style={[styles.errorText, { color: errorColor }]}>{registerError}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: accent }]}
            activeOpacity={0.8}
            onPress={handleRetryRegistration}
          >
            <Text style={styles.retryBtnText}>
              {t('wallet.send.retry', undefined, 'Try again')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel}>
            <Text style={[styles.cancelText, { color: mutedColor }]}>
              {t('shared.actions.cancel', undefined, 'Cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <WalletBackupScreen
        visible={visible && stage === 'backup'}
        isDark={isDark}
        accent={accent}
        mnemonic={mnemonic}
        pin={pin}
        onDone={handleBackupDone}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  retryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  retryBtnText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  cancelText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '600',
  },
});

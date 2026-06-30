import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, View } from 'react-native';
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

interface WalletCreationFlowProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  onCancel: () => void;
  onComplete: (account: WalletAccountRecord) => void;
}

type Stage = 'pin' | 'generating' | 'backup' | 'registering';

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
  const registrationRef = useRef<Promise<WalletAccountRecord | null> | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';

  const handlePinConfirmed = async (confirmedPin: string): Promise<void> => {
    setPin(confirmedPin);
    setStage('generating');

    try {
      const generatedMnemonic = generateMnemonic(256); // 24 words
      const bundle = deriveWalletBundle(generatedMnemonic, 0);
      await storeMnemonic(confirmedPin, generatedMnemonic);

      setMnemonic(generatedMnemonic);
      setStage('backup');

      // Kick off server registration in the background while the user reads/backs up their
      // phrase — public addresses + PIN digest only, no secret material. handleBackupDone awaits
      // this same promise rather than calling registerWithServer a second time.
      registrationRef.current = registerWithServer(confirmedPin, bundle);
    } catch (error) {
      Alert.alert(
        t('wallet.creation.generationErrorTitle', undefined, 'Could not create wallet'),
        error instanceof Error ? error.message : String(error)
      );
      setStage('pin');
    }
  };

  const registerWithServer = async (
    confirmedPin: string,
    bundle: ReturnType<typeof deriveWalletBundle>
  ): Promise<WalletAccountRecord | null> => {
    try {
      const digest = await createPinDigest(confirmedPin);
      const { account } = await setupWallet(client, {
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
      return account;
    } catch (error) {
      // Non-fatal here: the wallet already exists locally (storeMnemonic succeeded). Surface this
      // so the user knows to retry, rather than silently leaving the server unaware of the wallet.
      Alert.alert(
        t('wallet.creation.registerErrorTitle', undefined, 'Almost done'),
        t(
          'wallet.creation.registerErrorBody',
          undefined,
          'Your wallet was created on this device, but we could not finish registering it. Please check your connection — you can retry from the wallet screen.'
        )
      );
      return null;
    }
  };

  const handleBackupDone = (): void => {
    setStage('registering');
    const pending = registrationRef.current ?? Promise.resolve(null);
    void pending.then((account) => {
      registrationRef.current = null;
      setStage('pin');
      setMnemonic('');
      setPin('');
      if (account) {
        onComplete(account);
      } else {
        onCancel();
      }
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
});

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
  signBitcoinTransaction,
  signEvmTransaction,
  signSolanaTransaction,
  unlockMnemonic,
} from '@alternun/wallet';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import PinPad from './PinPad';
import {
  CHAIN_META,
  CHAIN_ORDER,
  formatChainAmount,
  isValidChainAddress,
  parseChainAmountToSmallestUnit,
} from './chainMeta';
import {
  broadcastWalletTransaction,
  getWalletNetworkParams,
  verifyWalletPin,
  type AuthClient,
  type WalletAccountRecord,
  type WalletChain,
  type WalletNetworkParams,
} from './walletApiClient';
import { isTestnetRuntime } from '../../utils/runtimeConfig';

interface WalletSendModalProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  account: WalletAccountRecord;
  onClose: () => void;
  onSent: () => void;
}

type Step = 'form' | 'review' | 'pin' | 'sending' | 'success' | 'error';

// Rough fee estimates for the review step — must stay consistent with sign.ts's own estimate
// (signBitcoinTransaction recomputes the same vsize formula; EVM/Solana fees shown here are the
// actual values used at signing time since they come straight from networkParams).
const BITCOIN_ESTIMATED_VSIZE_1IN_2OUT = 11 + 68 + 31 * 2;

export default function WalletSendModal({
  visible,
  isDark,
  accent,
  client,
  account,
  onClose,
  onSent,
}: WalletSendModalProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [chain, setChain] = useState<WalletChain>('evm');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewNetworkParams, setReviewNetworkParams] = useState<WalletNetworkParams | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';

  const reset = (): void => {
    setChain('evm');
    setRecipient('');
    setAmount('');
    setStep('form');
    setPin('');
    setErrorMessage('');
    setTxHash('');
    setReviewNetworkParams(null);
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const estimatedFeeLabel = (): string => {
    if (!reviewNetworkParams) return '';
    if (reviewNetworkParams.chain === 'evm') {
      const feeWei = BigInt(reviewNetworkParams.gasPriceWei) * 21000n;
      return `${formatChainAmount(feeWei.toString(), 'evm')} ETH`;
    }
    if (reviewNetworkParams.chain === 'bitcoin') {
      const feeSats = BigInt(
        Math.ceil(BITCOIN_ESTIMATED_VSIZE_1IN_2OUT * reviewNetworkParams.feeRateSatsPerVb)
      );
      return `${formatChainAmount(feeSats.toString(), 'bitcoin')} BTC (estimate)`;
    }
    return t('wallet.send.feeNegligible', undefined, 'Negligible (paid in SOL)');
  };

  const handleContinue = (): void => {
    setErrorMessage('');
    const trimmedRecipient = recipient.trim();
    if (!trimmedRecipient) {
      setErrorMessage(t('wallet.send.errorRecipient', undefined, 'Enter a recipient address.'));
      return;
    }
    if (!isValidChainAddress(trimmedRecipient, chain, isTestnetRuntime() ? 'testnet' : 'mainnet')) {
      setErrorMessage(
        t(
          'wallet.send.errorInvalidAddress',
          { unit: CHAIN_META[chain].unit },
          "That doesn't look like a valid {{unit}} address."
        )
      );
      return;
    }
    try {
      const parsed = parseChainAmountToSmallestUnit(amount, chain);
      if (parsed <= 0n) {
        setErrorMessage(t('wallet.send.errorAmount', undefined, 'Enter a valid amount.'));
        return;
      }
    } catch {
      setErrorMessage(t('wallet.send.errorAmount', undefined, 'Enter a valid amount.'));
      return;
    }

    setLoadingReview(true);
    void getWalletNetworkParams(client, chain)
      .then((params) => {
        setReviewNetworkParams(params);
        setStep('review');
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setLoadingReview(false));
  };

  const handlePinChange = (next: string): void => {
    setPin(next);
    if (next.length !== 4) return;
    void executeSend(next);
  };

  const executeSend = async (confirmedPin: string): Promise<void> => {
    setStep('sending');
    try {
      const verifyResult = await verifyWalletPin(client, confirmedPin);
      if (!verifyResult.verified) {
        setErrorMessage(
          verifyResult.lockedUntil
            ? t('wallet.pin.unlock.locked', undefined, 'Too many attempts. Try again later.')
            : t('wallet.pin.unlock.incorrect', undefined, 'Incorrect PIN. Try again.')
        );
        setPin('');
        setStep('pin');
        return;
      }

      const mnemonic = await unlockMnemonic(confirmedPin);
      if (!mnemonic) {
        setErrorMessage(
          t(
            'wallet.send.errorLocalUnlock',
            undefined,
            'Could not unlock your wallet on this device.'
          )
        );
        setStep('error');
        return;
      }

      // Re-fetch rather than reuse the review snapshot — EVM nonce/Bitcoin UTXOs/Solana blockhash
      // can go stale between review and PIN confirm (user reads the review screen for a while).
      const networkParams = await getWalletNetworkParams(client, chain);
      const amountSmallestUnit = parseChainAmountToSmallestUnit(amount, chain);

      let signed: string;
      if (chain === 'evm' && networkParams.chain === 'evm') {
        signed = await signEvmTransaction(mnemonic, account.derivationIndex, {
          to: recipient.trim() as `0x${string}`,
          valueWei: amountSmallestUnit,
          nonce: networkParams.nonce,
          gasPriceWei: BigInt(networkParams.gasPriceWei),
          chainId: networkParams.chainId,
        });
      } else if (chain === 'bitcoin' && networkParams.chain === 'bitcoin') {
        signed = signBitcoinTransaction(mnemonic, account.derivationIndex, {
          utxos: networkParams.utxos.map((u) => ({
            txid: u.txid,
            vout: u.vout,
            valueSats: u.valueSats,
          })),
          toAddress: recipient.trim(),
          changeAddress: account.bitcoinAddress,
          amountSats: amountSmallestUnit,
          feeRateSatsPerVb: networkParams.feeRateSatsPerVb,
          network: isTestnetRuntime() ? 'testnet' : 'mainnet',
        });
      } else if (chain === 'solana' && networkParams.chain === 'solana') {
        signed = signSolanaTransaction(mnemonic, account.derivationIndex, {
          toAddress: recipient.trim(),
          lamports: Number(amountSmallestUnit),
          recentBlockhash: networkParams.recentBlockhash,
        });
      } else {
        throw new Error('Network parameters did not match the selected chain.');
      }

      const { txHash: hash } = await broadcastWalletTransaction(client, chain, signed);
      setTxHash(hash);
      setStep('success');
      onSent();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStep('error');
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
          {t('wallet.send.title', undefined, 'Send')}
        </Text>

        {step === 'form' && (
          <View style={styles.form}>
            <View style={styles.chainTabs}>
              {CHAIN_ORDER.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setChain(c)}
                  style={[
                    styles.chainTab,
                    {
                      backgroundColor: chain === c ? `${accent}1c` : cardBg,
                      borderColor: chain === c ? accent : 'transparent',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chainDot, { backgroundColor: CHAIN_META[c].dotColor }]} />
                  <Text style={[styles.chainTabText, { color: chain === c ? accent : mutedColor }]}>
                    {CHAIN_META[c].unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: mutedColor }]}>
              {t('wallet.send.recipientLabel', undefined, 'Recipient address')}
            </Text>
            <TextInput
              value={recipient}
              onChangeText={setRecipient}
              placeholder={t('wallet.send.recipientPlaceholder', undefined, 'Paste address')}
              placeholderTextColor={mutedColor}
              autoCapitalize='none'
              autoCorrect={false}
              style={[styles.input, { backgroundColor: cardBg, color: textColor }]}
            />

            <Text style={[styles.label, { color: mutedColor }]}>
              {t('wallet.send.amountLabel', { unit: CHAIN_META[chain].unit }, 'Amount ({{unit}})')}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder='0.0'
              placeholderTextColor={mutedColor}
              keyboardType='decimal-pad'
              style={[styles.input, { backgroundColor: cardBg, color: textColor }]}
            />

            {errorMessage ? (
              <Text style={[styles.error, { color: errorColor }]}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: accent, opacity: loadingReview ? 0.6 : 1 },
              ]}
              activeOpacity={0.8}
              onPress={handleContinue}
              disabled={loadingReview}
            >
              {loadingReview ? (
                <ActivityIndicator size='small' color='#fff' />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {t('shared.actions.continue', undefined, 'Continue')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'review' && (
          <View style={styles.form}>
            <View style={[styles.reviewRow, { borderBottomColor: `${mutedColor}33` }]}>
              <Text style={[styles.reviewLabel, { color: mutedColor }]}>
                {t('wallet.send.reviewAsset', undefined, 'Asset')}
              </Text>
              <Text style={[styles.reviewValue, { color: textColor }]}>
                {CHAIN_META[chain].unit}
              </Text>
            </View>
            <View style={[styles.reviewRow, { borderBottomColor: `${mutedColor}33` }]}>
              <Text style={[styles.reviewLabel, { color: mutedColor }]}>
                {t('wallet.send.reviewRecipient', undefined, 'To')}
              </Text>
              <Text style={[styles.reviewValue, { color: textColor }]} numberOfLines={1}>
                {recipient.trim()}
              </Text>
            </View>
            <View style={[styles.reviewRow, { borderBottomColor: `${mutedColor}33` }]}>
              <Text style={[styles.reviewLabel, { color: mutedColor }]}>
                {t('wallet.send.reviewAmount', undefined, 'Amount')}
              </Text>
              <Text style={[styles.reviewValue, { color: textColor }]}>
                {amount} {CHAIN_META[chain].unit}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: mutedColor }]}>
                {t('wallet.send.reviewFee', undefined, 'Estimated network fee')}
              </Text>
              <Text style={[styles.reviewValue, { color: textColor }]}>{estimatedFeeLabel()}</Text>
            </View>

            {errorMessage ? (
              <Text style={[styles.error, { color: errorColor }]}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              activeOpacity={0.8}
              onPress={() => setStep('pin')}
            >
              <Text style={styles.primaryBtnText}>
                {t('wallet.send.confirmAndSend', undefined, 'Confirm & Send')}
              </Text>
            </TouchableOpacity>

            <Pressable style={styles.backLink} onPress={() => setStep('form')}>
              <Text style={[styles.backLinkText, { color: accent }]}>
                {t('shared.actions.cancel', undefined, 'Cancel')}
              </Text>
            </Pressable>
          </View>
        )}

        {step === 'pin' && (
          <View style={styles.pinStep}>
            <Text style={[styles.pinTitle, { color: textColor }]}>
              {t('wallet.send.pinTitle', undefined, 'Confirm with your PIN')}
            </Text>
            {errorMessage ? (
              <Text style={[styles.error, { color: errorColor }]}>{errorMessage}</Text>
            ) : null}
            <PinPad value={pin} onChange={handlePinChange} isDark={isDark} accent={accent} />
          </View>
        )}

        {step === 'sending' && (
          <View style={styles.centered}>
            <ActivityIndicator size='large' color={accent} />
            <Text style={[styles.pinTitle, { color: textColor }]}>
              {t('wallet.send.sending', undefined, 'Sending…')}
            </Text>
          </View>
        )}

        {step === 'success' && (
          <View style={styles.centered}>
            <Text style={[styles.pinTitle, { color: textColor }]}>
              {t('wallet.send.success', undefined, 'Transaction sent')}
            </Text>
            <Text style={[styles.hashText, { color: mutedColor }]} selectable>
              {txHash}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 24 }]}
              activeOpacity={0.8}
              onPress={handleClose}
            >
              <Text style={styles.primaryBtnText}>
                {t('shared.actions.done', undefined, 'Done')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'error' && (
          <View style={styles.centered}>
            <Text style={[styles.pinTitle, { color: errorColor }]}>
              {t('wallet.send.failed', undefined, 'Could not send transaction')}
            </Text>
            <Text style={[styles.error, { color: mutedColor }]}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 24 }]}
              activeOpacity={0.8}
              onPress={() => setStep('form')}
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
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  form: {
    gap: 8,
  },
  chainTabs: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  chainTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chainTabText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
  },
  error: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
  pinStep: {
    alignItems: 'center',
    gap: 16,
  },
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
  },
  hashText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  reviewLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '600',
  },
  reviewValue: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  backLinkText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
});

import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy as CopyIcon, Check as CheckIcon } from 'lucide-react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { CHAIN_META, CHAIN_ORDER, addressForChain } from './chainMeta';
import type { WalletChain } from './walletApiClient';
import type { WalletAccountRecord } from './walletApiClient';

interface WalletReceiveModalProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  account: WalletAccountRecord;
  onClose: () => void;
}

export default function WalletReceiveModal({
  visible,
  isDark,
  accent,
  account,
  onClose,
}: WalletReceiveModalProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [chain, setChain] = useState<WalletChain>('evm');
  const [copied, setCopied] = useState(false);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)';

  const address = addressForChain(account, chain);

  const handleCopy = (): void => {
    void Clipboard.setStringAsync(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Pressable style={styles.closeArea} onPress={onClose}>
          <Text style={[styles.closeText, { color: mutedColor }]}>
            {t('shared.actions.done', undefined, 'Done')}
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: textColor }]}>
          {t('wallet.receive.title', undefined, 'Receive')}
        </Text>

        <View style={styles.chainTabs}>
          {CHAIN_ORDER.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => {
                setChain(c);
                setCopied(false);
              }}
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

        <View style={[styles.addressCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.addressLabel, { color: mutedColor }]}>
            {CHAIN_META[chain].label}
          </Text>
          <Text style={[styles.addressValue, { color: textColor }]} selectable>
            {address}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.copyBtn, { backgroundColor: accent }]}
          activeOpacity={0.8}
          onPress={handleCopy}
        >
          {copied ? <CheckIcon size={16} color='#fff' /> : <CopyIcon size={16} color='#fff' />}
          <Text style={styles.copyBtnText}>
            {copied
              ? t('profile.wallet.addressCopied', undefined, 'Copied')
              : t('wallet.receive.copyAddress', undefined, 'Copy address')}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.warning, { color: mutedColor }]}>
          {t(
            'wallet.receive.warning',
            { network: CHAIN_META[chain].label },
            'Only send {{network}} assets to this address.'
          )}
        </Text>
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
  chainTabs: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
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
  addressCard: {
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  addressLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  addressValue: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 15,
    fontWeight: '600',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  copyBtnText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  warning: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});

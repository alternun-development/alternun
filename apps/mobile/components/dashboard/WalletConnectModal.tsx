import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, } from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import { X, Smartphone, Globe, } from 'lucide-react-native';
import { useAppTranslation, } from '../i18n/useAppTranslation';

interface WalletConnectModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (walletType: string) => void;
}

const WALLETS = [
  { id: 'metamask', name: 'MetaMask', descriptionKey: 'walletModal.wallets.metamask.description', icon: Globe, },
  { id: 'walletconnect', name: 'WalletConnect', descriptionKey: 'walletModal.wallets.walletconnect.description', icon: Smartphone, },
];

export default function WalletConnectModal({ visible, onClose, onConnect, }: WalletConnectModalProps,) {
  const { t, } = useAppTranslation('mobile',);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('walletModal.title',)}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="rgba(232,232,255,0.6)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {t('walletModal.subtitle',)}
          </Text>
          <View style={styles.walletList}>
            {WALLETS.map((wallet,) => {
              const Icon = wallet.icon;
              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={styles.walletOption}
                  onPress={() => onConnect(wallet.id,)}
                  activeOpacity={0.8}
                >
                  <View style={styles.walletIcon}>
                    <Icon size={20} color="#1ccba1" />
                  </View>
                  <View style={styles.walletInfo}>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    <Text style={styles.walletDesc}>{t(wallet.descriptionKey,)}</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              );
            },)}
          </View>
          <Text style={styles.disclaimer}>
            {t('walletModal.disclaimer',)}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = createTypographyStyles({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,16,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d0d1f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#e8e8ff',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  walletList: {
    gap: 10,
    marginBottom: 20,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(28,203,161,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '600',
  },
  walletDesc: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    color: 'rgba(232,232,255,0.3)',
    fontSize: 20,
  },
  disclaimer: {
    color: 'rgba(232,232,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
},);

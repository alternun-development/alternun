import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { CHAIN_META, formatChainAmount } from './chainMeta';
import { getWalletActivity, type AuthClient, type WalletActivityEntry } from './walletApiClient';

interface WalletActivityModalProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  onClose: () => void;
}

function truncateHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}

export default function WalletActivityModal({
  visible,
  isDark,
  accent,
  client,
  onClose,
}: WalletActivityModalProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WalletActivityEntry[]>([]);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)';

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    void getWalletActivity(client)
      .then(({ activity }) => setEntries(activity))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [visible, client]);

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Pressable style={styles.closeArea} onPress={onClose}>
          <Text style={[styles.closeText, { color: mutedColor }]}>
            {t('shared.actions.done', undefined, 'Done')}
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: textColor }]}>
          {t('wallet.activity.title', undefined, 'Activity')}
        </Text>

        {loading ? (
          <ActivityIndicator size='large' color={accent} style={{ marginTop: 40 }} />
        ) : entries.length === 0 ? (
          <Text style={[styles.empty, { color: mutedColor }]}>
            {t('wallet.activity.empty', undefined, 'No recent activity yet.')}
          </Text>
        ) : (
          <View style={styles.list}>
            {entries.map((entry) => (
              <View
                key={`${entry.chain}-${entry.hash}`}
                style={[styles.row, { backgroundColor: cardBg }]}
              >
                <View style={[styles.dot, { backgroundColor: CHAIN_META[entry.chain].dotColor }]} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: textColor }]}>
                    {entry.direction === 'in'
                      ? t('wallet.activity.received', undefined, 'Received')
                      : entry.direction === 'out'
                      ? t('wallet.activity.sent', undefined, 'Sent')
                      : t('wallet.activity.self', undefined, 'Self transfer')}
                  </Text>
                  <Text style={[styles.rowHash, { color: mutedColor }]}>
                    {truncateHash(entry.hash)}
                  </Text>
                </View>
                <View style={styles.rowAmountWrap}>
                  <Text style={[styles.rowAmount, { color: textColor }]}>
                    {entry.direction === 'out' ? '-' : entry.direction === 'in' ? '+' : ''}
                    {formatChainAmount(entry.amount, entry.chain)} {CHAIN_META[entry.chain].unit}
                  </Text>
                  {!entry.confirmed && (
                    <Text style={[styles.pending, { color: accent }]}>
                      {t('wallet.activity.pending', undefined, 'Pending')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
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
  empty: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
  rowHash: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
  },
  rowAmountWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowAmount: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
  pending: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

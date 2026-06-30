import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check as CheckIcon, type LucideProps } from 'lucide-react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import {
  listWalletAccounts,
  setPrimaryWalletAccount,
  type AuthClient,
  type WalletAccountRecord,
} from './walletApiClient';

const Check = CheckIcon as React.FC<LucideProps>;

interface WalletManageModalProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  onClose: () => void;
  /** Called after the default/primary account changes, so the parent can refresh balances/addresses. */
  onPrimaryChanged: (accounts: WalletAccountRecord[]) => void;
}

function truncateMiddle(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function WalletManageModal({
  visible,
  isDark,
  accent,
  client,
  onClose,
  onPrimaryChanged,
}: WalletManageModalProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [accounts, setAccounts] = useState<WalletAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)';

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    void listWalletAccounts(client)
      .then(({ accounts: next }) => setAccounts(next))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, [visible, client]);

  const handleSetPrimary = (accountId: string): void => {
    setSwitchingId(accountId);
    void setPrimaryWalletAccount(client, accountId)
      .then(({ accounts: next }) => {
        setAccounts(next);
        onPrimaryChanged(next);
      })
      .catch(() => {
        // Best-effort UI refresh; the account list re-fetch above already shows current state.
      })
      .finally(() => setSwitchingId(null));
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
          {t('wallet.manage.title', undefined, 'Your wallets')}
        </Text>
        <Text style={[styles.subtitle, { color: mutedColor }]}>
          {t(
            'wallet.manage.subtitle',
            undefined,
            'The default wallet is used for balances, send/receive, and reward payouts.'
          )}
        </Text>

        {loading ? (
          <ActivityIndicator size='large' color={accent} style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.list}>
            {accounts.map((account) => (
              <View key={account.id} style={[styles.row, { backgroundColor: cardBg }]}>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: textColor }]}>
                    {account.label?.trim() ??
                      (account.walletType === 'external'
                        ? t('wallet.manage.externalLabel', undefined, 'External wallet')
                        : t('wallet.manage.alternunLabel', undefined, 'Alternun wallet'))}
                  </Text>
                  <Text style={[styles.rowAddress, { color: mutedColor }]}>
                    {truncateMiddle(account.evmAddress)}
                  </Text>
                </View>
                {account.isPrimary ? (
                  <View style={[styles.defaultBadge, { backgroundColor: `${accent}18` }]}>
                    <Check size={14} color={accent} strokeWidth={3} />
                    <Text style={[styles.defaultBadgeText, { color: accent }]}>
                      {t('wallet.manage.default', undefined, 'Default')}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.setDefaultBtn, { borderColor: `${accent}44` }]}
                    activeOpacity={0.7}
                    disabled={switchingId === account.id}
                    onPress={() => handleSetPrimary(account.id)}
                  >
                    {switchingId === account.id ? (
                      <ActivityIndicator size='small' color={accent} />
                    ) : (
                      <Text style={[styles.setDefaultBtnText, { color: accent }]}>
                        {t('wallet.manage.setDefault', undefined, 'Set as default')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
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
    marginTop: 8,
  },
  subtitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  list: {
    gap: 10,
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
  },
  rowAddress: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  defaultBadgeText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    fontWeight: '700',
  },
  setDefaultBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  setDefaultBtnText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '700',
  },
});

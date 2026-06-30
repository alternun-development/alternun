import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check as CheckIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  X as XIcon,
  type LucideProps,
} from 'lucide-react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import {
  deleteWalletAccount,
  generateExternalChallenge,
  listWalletAccounts,
  setPrimaryWalletAccount,
  verifyAndLinkExternalWallet,
  type AuthClient,
  type WalletAccountRecord,
} from './walletApiClient';
import { createWeb3WalletBridge } from '../auth/walletBridge';

const Check = CheckIcon as React.FC<LucideProps>;
const Plus = PlusIcon as React.FC<LucideProps>;
const Trash = TrashIcon as React.FC<LucideProps>;
const X = XIcon as React.FC<LucideProps>;

type SubView = 'list' | 'addMenu' | 'connectingExternal' | 'confirmDelete';

interface WalletManageModalProps {
  visible: boolean;
  isDark: boolean;
  accent: string;
  client: AuthClient;
  onClose: () => void;
  onPrimaryChanged: (accounts: WalletAccountRecord[]) => void;
  onAddWallet: () => void; // open WalletCreationFlow
  onRestoreWallet: () => void; // open WalletRestoreFlow
  onImportKeystore: () => void; // open keystore/seed import flow
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
  onAddWallet,
  onRestoreWallet,
  onImportKeystore,
}: WalletManageModalProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [accounts, setAccounts] = useState<WalletAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [subView, setSubView] = useState<SubView>('list');
  const [deleteTarget, setDeleteTarget] = useState<WalletAccountRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [connectingError, setConnectingError] = useState<string | null>(null);

  const bg = isDark ? '#0d0d1f' : '#f8fafb';
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const mutedColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(15,23,42,0.55)';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)';
  const errorColor = isDark ? '#ff8a8a' : '#c0392b';
  const warningColor = '#f59e0b';

  const refresh = async (): Promise<void> => {
    setLoading(true);
    try {
      const { accounts: next } = await listWalletAccounts(client);
      setAccounts(next);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setSubView('list');
      setDeleteTarget(null);
      setConnectingError(null);
      return;
    }
    void refresh();
  }, [visible]);

  const handleSetPrimary = (accountId: string): void => {
    setSwitchingId(accountId);
    void setPrimaryWalletAccount(client, accountId)
      .then(({ accounts: next }) => {
        setAccounts(next);
        onPrimaryChanged(next);
      })
      .catch(() => {})
      .finally(() => setSwitchingId(null));
  };

  const handleDeletePress = (account: WalletAccountRecord): void => {
    setDeleteTarget(account);
    setSubView('confirmDelete');
  };

  const handleConfirmDelete = (): void => {
    if (!deleteTarget) return;
    setDeleting(true);
    void deleteWalletAccount(client, deleteTarget.id)
      .then(({ accounts: next }) => {
        setAccounts(next);
        onPrimaryChanged(next);
        setDeleteTarget(null);
        setSubView('list');
      })
      .catch((err: unknown) => {
        setConnectingError(err instanceof Error ? err.message : String(err));
        setSubView('list');
      })
      .finally(() => setDeleting(false));
  };

  const handleConnectMetaMask = async (): Promise<void> => {
    setConnectingError(null);
    setSubView('connectingExternal');
    try {
      const bridge = createWeb3WalletBridge();
      const result = await bridge.connect('metamask');
      const address = result.walletAddress;

      const { challenge, nonce } = await generateExternalChallenge(client);
      const provider = (
        window as typeof window & {
          ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
          };
        }
      ).ethereum;
      if (!provider) throw new Error('MetaMask is not installed or not detected.');

      const signature = (await provider.request({
        method: 'personal_sign',
        params: [challenge, address],
      })) as string;

      await verifyAndLinkExternalWallet(client, address, nonce, signature, 'MetaMask');
      await refresh();
      setSubView('list');
    } catch (err: unknown) {
      setConnectingError(err instanceof Error ? err.message : String(err));
      setSubView('list');
    }
  };

  const renderList = (): React.JSX.Element => (
    // Wrap in View (not Fragment) so it's one flex child — fragments whose children become
    // direct siblings of the closeArea Pressable in the flex-1 container can cause
    // unexpected space distribution, pushing content to the bottom.
    <View style={styles.listContent}>
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

      {connectingError ? (
        <Text style={[styles.error, { color: errorColor }]}>{connectingError}</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator size='large' color={accent} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.accountsScroll}>
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
                  {truncateMiddle(account.evmAddress ?? account.solanaAddress ?? '')}
                </Text>
              </View>

              <View style={styles.rowActions}>
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
                        {t('wallet.manage.setDefault', undefined, 'Set default')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                  onPress={() => handleDeletePress(account)}
                >
                  <Trash size={16} color={errorColor} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}
        onPress={() => setSubView('addMenu')}
        activeOpacity={0.7}
      >
        <Plus size={16} color={accent} />
        <Text style={[styles.addBtnText, { color: accent }]}>
          {t('wallet.manage.add', undefined, 'Add wallet')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAddMenu = (): React.JSX.Element => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSubView('list')} style={styles.backBtn}>
          <X size={20} color={mutedColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>
          {t('wallet.manage.addTitle', undefined, 'Add a wallet')}
        </Text>
      </View>

      <View style={styles.menuList}>
        <TouchableOpacity
          style={[styles.menuOption, { backgroundColor: cardBg }]}
          activeOpacity={0.7}
          onPress={() => {
            setSubView('list');
            onAddWallet();
          }}
        >
          <Text style={[styles.menuOptionTitle, { color: textColor }]}>
            {t('wallet.manage.createNew', undefined, 'Create a new wallet')}
          </Text>
          <Text style={[styles.menuOptionDesc, { color: mutedColor }]}>
            {t(
              'wallet.manage.createNewDesc',
              undefined,
              'Generate a brand-new recovery phrase and set a PIN'
            )}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuOption, { backgroundColor: cardBg }]}
          activeOpacity={0.7}
          onPress={() => {
            setSubView('list');
            onRestoreWallet();
          }}
        >
          <Text style={[styles.menuOptionTitle, { color: textColor }]}>
            {t('wallet.manage.importPhrase', undefined, 'Import from recovery phrase')}
          </Text>
          <Text style={[styles.menuOptionDesc, { color: mutedColor }]}>
            {t('wallet.manage.importPhraseDesc', undefined, 'Enter your 12-24 word backup phrase')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuOption, { backgroundColor: cardBg }]}
          activeOpacity={0.7}
          onPress={() => {
            setSubView('list');
            onImportKeystore();
          }}
        >
          <Text style={[styles.menuOptionTitle, { color: textColor }]}>
            {t('wallet.manage.importKeystore', undefined, 'Import encrypted backup file')}
          </Text>
          <Text style={[styles.menuOptionDesc, { color: mutedColor }]}>
            {t('wallet.manage.importKeystoreDesc', undefined, 'Upload your .json keystore export')}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={[styles.menuOption, { backgroundColor: cardBg }]}
            activeOpacity={0.7}
            onPress={() => void handleConnectMetaMask()}
          >
            <Text style={[styles.menuOptionTitle, { color: textColor }]}>
              {t('wallet.manage.connectMetaMask', undefined, 'Connect MetaMask')}
            </Text>
            <Text style={[styles.menuOptionDesc, { color: mutedColor }]}>
              {t(
                'wallet.manage.connectMetaMaskDesc',
                undefined,
                'Link your existing MetaMask address via signature proof'
              )}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderConnecting = (): React.JSX.Element => (
    <View style={styles.centered}>
      <ActivityIndicator size='large' color={accent} />
      <Text style={[styles.statusText, { color: textColor }]}>
        {t('wallet.manage.connectingExternal', undefined, 'Connecting to MetaMask…')}
      </Text>
      <Text style={[styles.statusSubText, { color: mutedColor }]}>
        {t('wallet.manage.signPrompt', undefined, 'Approve the signature request in your wallet')}
      </Text>
    </View>
  );

  const renderConfirmDelete = (): React.JSX.Element => {
    if (!deleteTarget) return <></>;
    const isPrimary = deleteTarget.isPrimary;
    const isOnly = accounts.length <= 1;
    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSubView('list')} style={styles.backBtn}>
            <X size={20} color={mutedColor} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: errorColor }]}>
            {t('wallet.manage.deleteTitle', undefined, 'Remove wallet')}
          </Text>
        </View>

        <View
          style={[
            styles.warningBox,
            { backgroundColor: `${warningColor}1a`, borderColor: `${warningColor}44` },
          ]}
        >
          <Text style={[styles.warningText, { color: warningColor }]}>
            {isOnly
              ? t(
                  'wallet.manage.deleteOnlyWarning',
                  undefined,
                  'You cannot remove your only wallet. Create or restore another wallet first.'
                )
              : isPrimary
              ? t(
                  'wallet.manage.deletePrimaryWarning',
                  undefined,
                  'This is your default wallet. Removing it will automatically promote another account as default. Make sure you have your backup phrase before proceeding.'
                )
              : t(
                  'wallet.manage.deleteWarning',
                  undefined,
                  'Make sure you have backed up the recovery phrase for this wallet before removing it. This action cannot be undone.'
                )}
          </Text>
        </View>

        <View style={[styles.row, { backgroundColor: cardBg }]}>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, { color: textColor }]}>
              {deleteTarget.label?.trim() ??
                (deleteTarget.walletType === 'external'
                  ? t('wallet.manage.externalLabel', undefined, 'External wallet')
                  : t('wallet.manage.alternunLabel', undefined, 'Alternun wallet'))}
            </Text>
            <Text style={[styles.rowAddress, { color: mutedColor }]}>
              {truncateMiddle(deleteTarget.evmAddress ?? deleteTarget.solanaAddress ?? '')}
            </Text>
          </View>
        </View>

        {!isOnly && (
          <TouchableOpacity
            style={[
              styles.deleteConfirmBtn,
              { backgroundColor: errorColor, opacity: deleting ? 0.6 : 1 },
            ]}
            activeOpacity={0.8}
            disabled={deleting}
            onPress={handleConfirmDelete}
          >
            {deleting ? (
              <ActivityIndicator size='small' color='#fff' />
            ) : (
              <Text style={styles.deleteConfirmBtnText}>
                {t('wallet.manage.deleteConfirm', undefined, 'Remove this wallet')}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => setSubView('list')} style={styles.cancelLink}>
          <Text style={[styles.cancelLinkText, { color: mutedColor }]}>
            {t('shared.actions.cancel', undefined, 'Cancel')}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Pressable style={styles.closeArea} onPress={onClose}>
          <Text style={[styles.closeText, { color: mutedColor }]}>
            {t('shared.actions.done', undefined, 'Done')}
          </Text>
        </Pressable>

        {subView === 'list' && renderList()}
        {subView === 'addMenu' && renderAddMenu()}
        {subView === 'connectingExternal' && renderConnecting()}
        {subView === 'confirmDelete' && renderConfirmDelete()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 24 },
  // listContent wraps renderList so it's ONE flex child (not a fragment's children).
  listContent: { flexShrink: 1 },
  accountsScroll: { flexGrow: 0 },
  closeArea: { alignSelf: 'flex-end', padding: 8 },
  closeText: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 14, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 16,
  },
  addBtnText: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 14, fontWeight: '700' },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 10 },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 14, fontWeight: '700' },
  rowAddress: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 12 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  defaultBadgeText: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 11, fontWeight: '700' },
  setDefaultBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  setDefaultBtnText: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 12, fontWeight: '700' },
  deleteBtn: { padding: 6 },
  error: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  menuList: { gap: 12, marginTop: 16 },
  menuOption: { borderRadius: 16, padding: 16, gap: 4 },
  menuOptionTitle: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 14, fontWeight: '700' },
  menuOptionDesc: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 12, lineHeight: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  statusText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusSubText: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 13, textAlign: 'center' },
  warningBox: { borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  warningText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  deleteConfirmBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  deleteConfirmBtnText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { fontFamily: ANEK_EXPANDED_FAMILY, fontSize: 13, fontWeight: '600' },
});

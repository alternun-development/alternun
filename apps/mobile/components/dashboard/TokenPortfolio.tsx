import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { createTypographyStyles } from '../theme/typography';
import { Plus, ArrowUpFromLine, Flame, ArrowRightLeft, X } from 'lucide-react-native';
import { StatusPill } from '@alternun/ui';
import SearchFilterBar, { type SearchFilterOption } from '../common/SearchFilterBar';
import { ImpactToken, TokenState } from './types';

interface TokenPortfolioProps {
  tokens: ImpactToken[];
  onBuyToken: () => void;
  onDepositToPool: (token: ImpactToken, costBasis: number, profitShare: number) => void;
  onRetireToken: (token: ImpactToken) => void;
  onTransferToken: (token: ImpactToken, recipient: string) => void;
}

type FilterType = 'All' | TokenState;

const FILTER_OPTIONS: SearchFilterOption[] = [
  { key: 'All', label: 'Todos' },
  { key: 'Free', label: 'Libre' },
  { key: 'Deposited', label: 'Depositado' },
  { key: 'Consumed', label: 'Retirado' },
];

export default function TokenPortfolio({
  tokens,
  onBuyToken,
  onDepositToPool,
  onRetireToken,
  onTransferToken,
}: TokenPortfolioProps) {
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const [depositModal, setDepositModal] = useState<ImpactToken | null>(null);
  const [retireModal, setRetireModal] = useState<ImpactToken | null>(null);
  const [transferModal, setTransferModal] = useState<ImpactToken | null>(null);
  const [costBasis, setCostBasis] = useState('');
  const [profitShare, setProfitShare] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  const filtered = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return tokens.filter((token) => {
      const matchesFilter = filter === 'All' || token.state === filter;
      const matchesSearch =
        !normalizedQuery ||
        token.tokenId.toLowerCase().includes(normalizedQuery) ||
        token.projectName.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, tokens]);

  const handleDeposit = () => {
    if (!depositModal) return;
    onDepositToPool(depositModal, parseFloat(costBasis) || 0, parseFloat(profitShare) || 0);
    setDepositModal(null);
    setCostBasis('');
    setProfitShare('');
  };

  const handleTransfer = () => {
    if (!transferModal || !recipientAddress) return;
    onTransferToken(transferModal, recipientAddress);
    setTransferModal(null);
    setRecipientAddress('');
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>ImpactToken Portfolio</Text>
          <Text style={styles.sectionSubtitle}>{tokens.length} tokens total</Text>
        </View>
        <TouchableOpacity style={styles.buyButton} onPress={onBuyToken} activeOpacity={0.8}>
          <Plus size={14} color='#050510' />
          <Text style={styles.buyButtonText}>Buy Token</Text>
        </TouchableOpacity>
      </View>

      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        placeholder='Buscar token o proyecto...'
        filters={FILTER_OPTIONS}
        activeFilter={filter}
        onChangeFilter={(filterKey) => setFilter(filterKey as FilterType)}
      />

      {/* Token Cards */}
      <View style={styles.tokenGrid}>
        {filtered.map((token) => (
          <View key={token.tokenId} style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <Text style={styles.tokenId}>{token.tokenId}</Text>
              <StatusPill status={token.state} />
            </View>
            <Text style={styles.tokenProject}>{token.projectName}</Text>
            <Text style={styles.tokenPrice}>${token.acquisitionPrice.toLocaleString()}</Text>
            <Text style={styles.tokenPriceLabel}>Acquisition Price</Text>

            {token.state === 'Free' && (
              <View style={styles.tokenActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setDepositModal(token)}
                  activeOpacity={0.8}
                >
                  <ArrowUpFromLine size={12} color='#1ccba1' />
                  <Text style={styles.actionBtnText}>Deposit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnGhost}
                  onPress={() => setRetireModal(token)}
                  activeOpacity={0.8}
                >
                  <Flame size={12} color='rgba(232,232,255,0.6)' />
                  <Text style={styles.actionBtnGhostText}>Retire</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnGhost}
                  onPress={() => setTransferModal(token)}
                  activeOpacity={0.8}
                >
                  <ArrowRightLeft size={12} color='rgba(232,232,255,0.6)' />
                  <Text style={styles.actionBtnGhostText}>Transfer</Text>
                </TouchableOpacity>
              </View>
            )}
            {token.state === 'Deposited' && (
              <View style={styles.depositedBadge}>
                <Text style={styles.depositedBadgeText}>In Pool Vault</Text>
              </View>
            )}
            {token.state === 'Consumed' && (
              <View style={styles.consumedBadge}>
                <Text style={styles.consumedBadgeText}>Retired</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Deposit Modal */}
      <Modal visible={!!depositModal} transparent animationType='slide'>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit to Pool</Text>
              <TouchableOpacity onPress={() => setDepositModal(null)}>
                <X size={20} color='rgba(232,232,255,0.6)' />
              </TouchableOpacity>
            </View>
            {depositModal && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Token</Text>
                  <Text style={styles.modalInfoValue}>{depositModal.tokenId}</Text>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Cost Basis (USD)</Text>
                  <TextInput
                    style={styles.input}
                    value={costBasis}
                    onChangeText={setCostBasis}
                    keyboardType='decimal-pad'
                    placeholder='Enter cost basis'
                    placeholderTextColor='rgba(232,232,255,0.3)'
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Profit Share (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={profitShare}
                    onChangeText={setProfitShare}
                    keyboardType='decimal-pad'
                    placeholder='Enter profit share %'
                    placeholderTextColor='rgba(232,232,255,0.3)'
                  />
                </View>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleDeposit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Confirm Deposit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Retire Modal */}
      <Modal visible={!!retireModal} transparent animationType='fade'>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Retire Token</Text>
              <TouchableOpacity onPress={() => setRetireModal(null)}>
                <X size={20} color='rgba(232,232,255,0.6)' />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Retiring {retireModal?.tokenId} will permanently consume it and credit Airs to your
              account. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.ghostButton}
                onPress={() => setRetireModal(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.ghostButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => {
                  if (retireModal) onRetireToken(retireModal);
                  setRetireModal(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dangerButtonText}>Retire Token</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transfer Modal */}
      <Modal visible={!!transferModal} transparent animationType='fade'>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Token</Text>
              <TouchableOpacity onPress={() => setTransferModal(null)}>
                <X size={20} color='rgba(232,232,255,0.6)' />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Recipient Address</Text>
              <TextInput
                style={styles.input}
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                placeholder='0x...'
                placeholderTextColor='rgba(232,232,255,0.3)'
                autoCapitalize='none'
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.ghostButton}
                onPress={() => setTransferModal(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.ghostButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleTransfer}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Transfer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = createTypographyStyles({
  section: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#e8e8ff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.02,
  },
  sectionSubtitle: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1ccba1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buyButtonText: {
    color: '#050510',
    fontSize: 13,
    fontWeight: '700',
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tokenCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#00001e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenId: {
    color: 'rgba(232,232,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillFree: {
    backgroundColor: 'rgba(28,203,161,0.12)',
    borderColor: 'rgba(28,203,161,0.25)',
  },
  pillDeposited: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  pillConsumed: {
    backgroundColor: 'rgba(148,163,184,0.1)',
    borderColor: 'rgba(148,163,184,0.2)',
  },
  pillTextFree: {
    color: '#1ccba1',
    fontSize: 10,
    fontWeight: '600',
  },
  pillTextDeposited: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '600',
  },
  pillTextConsumed: {
    color: 'rgba(148,163,184,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  tokenProject: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 11,
    marginBottom: 10,
  },
  tokenPrice: {
    color: '#e8e8ff',
    fontSize: 18,
    fontWeight: '700',
  },
  tokenPriceLabel: {
    color: 'rgba(232,232,255,0.35)',
    fontSize: 10,
    marginBottom: 12,
  },
  tokenActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(28,203,161,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#1ccba1',
    fontSize: 10,
    fontWeight: '600',
  },
  actionBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnGhostText: {
    color: 'rgba(232,232,255,0.6)',
    fontSize: 10,
    fontWeight: '500',
  },
  depositedBadge: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  depositedBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '600',
  },
  consumedBadge: {
    backgroundColor: 'rgba(148,163,184,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  consumedBadgeText: {
    color: 'rgba(148,163,184,0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,16,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0d0d1f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    paddingBottom: 40,
  },
  modalDialog: {
    backgroundColor: '#0d0d1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    margin: 20,
    padding: 24,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#e8e8ff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoLabel: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 13,
  },
  modalInfoValue: {
    color: '#e8e8ff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalDesc: {
    color: 'rgba(232,232,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: 'rgba(232,232,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    color: '#e8e8ff',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1ccba1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#050510',
    fontSize: 15,
    fontWeight: '700',
  },
  ghostButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: 'rgba(232,232,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

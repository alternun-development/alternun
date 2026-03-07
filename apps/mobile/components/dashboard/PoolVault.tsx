import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import { DollarSign, X } from 'lucide-react-native';
import { PoolPosition } from './types';

interface PoolVaultProps {
  positions: PoolPosition[];
  onClaimProceeds: (position: PoolPosition) => void;
}

export default function PoolVault({ positions, onClaimProceeds }: PoolVaultProps) {
  const [claimModal, setClaimModal] = useState<PoolPosition | null>(null);

  const handleClaim = () => {
    if (claimModal) {
      onClaimProceeds(claimModal);
      setClaimModal(null);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>PoolVault Positions</Text>
          <Text style={styles.sectionSubtitle}>{positions.length} active positions</Text>
        </View>
      </View>

      <View style={styles.positionList}>
        {positions.map((position) => {
          const soldPct = (position.soldUSD / position.totalValueUSD) * 100;
          return (
            <View key={position.positionId} style={styles.positionCard}>
              <View style={styles.positionHeader}>
                <View>
                  <Text style={styles.positionId}>{position.positionId}</Text>
                  <Text style={styles.positionToken}>Token: {position.tokenId}</Text>
                </View>
                <View style={[styles.statusBadge, position.isClosed ? styles.statusClosed : styles.statusOpen]}>
                  <Text style={[styles.statusText, position.isClosed ? styles.statusTextClosed : styles.statusTextOpen]}>
                    {position.isClosed ? 'Closed' : 'Open'}
                  </Text>
                </View>
              </View>

              <View style={styles.positionStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Value</Text>
                  <Text style={styles.statValue}>${position.totalValueUSD.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Remaining</Text>
                  <Text style={[styles.statValue, position.isClosed && styles.statValueMuted]}>
                    ${position.remainingUSD.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Profit Share</Text>
                  <Text style={[styles.statValue, styles.statValueAccent]}>{position.profitShare}%</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Sold</Text>
                  <Text style={styles.progressValue}>
                    ${position.soldUSD.toLocaleString()} / ${position.totalValueUSD.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(soldPct, 100)}%` as any }]} />
                </View>
                <Text style={styles.progressPct}>{soldPct.toFixed(1)}%</Text>
              </View>

              <TouchableOpacity
                style={[styles.claimButton, position.isClosed ? styles.claimButtonActive : styles.claimButtonDisabled]}
                onPress={() => position.isClosed && setClaimModal(position)}
                activeOpacity={position.isClosed ? 0.8 : 1}
              >
                <DollarSign size={14} color={position.isClosed ? '#050510' : 'rgba(232,232,255,0.3)'} />
                <Text style={[styles.claimButtonText, position.isClosed ? styles.claimButtonTextActive : styles.claimButtonTextDisabled]}>
                  {position.isClosed ? 'Claim Proceeds' : 'Awaiting Close'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Claim Modal */}
      <Modal visible={!!claimModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Claim Proceeds</Text>
              <TouchableOpacity onPress={() => setClaimModal(null)}>
                <X size={20} color="rgba(232,232,255,0.6)" />
              </TouchableOpacity>
            </View>
            {claimModal && (
              <>
                <View style={styles.claimInfo}>
                  <View style={styles.claimInfoRow}>
                    <Text style={styles.claimInfoLabel}>Position</Text>
                    <Text style={styles.claimInfoValue}>{claimModal.positionId}</Text>
                  </View>
                  <View style={styles.claimInfoRow}>
                    <Text style={styles.claimInfoLabel}>Total Value</Text>
                    <Text style={styles.claimInfoValue}>${claimModal.totalValueUSD.toLocaleString()}</Text>
                  </View>
                  <View style={styles.claimInfoRow}>
                    <Text style={styles.claimInfoLabel}>Profit Share</Text>
                    <Text style={[styles.claimInfoValue, styles.claimInfoAccent]}>{claimModal.profitShare}%</Text>
                  </View>
                  <View style={[styles.claimInfoRow, styles.claimInfoTotal]}>
                    <Text style={styles.claimTotalLabel}>Estimated Payout</Text>
                    <Text style={styles.claimTotalValue}>
                      ${(claimModal.totalValueUSD * (1 + claimModal.profitShare / 100)).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.ghostButton} onPress={() => setClaimModal(null)} activeOpacity={0.8}>
                    <Text style={styles.ghostButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleClaim} activeOpacity={0.8}>
                    <Text style={styles.primaryButtonText}>Confirm Claim</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  positionList: {
    gap: 12,
  },
  positionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#00001e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  positionId: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  positionToken: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusOpen: {
    backgroundColor: 'rgba(28,203,161,0.1)',
    borderColor: 'rgba(28,203,161,0.25)',
  },
  statusClosed: {
    backgroundColor: 'rgba(129,140,248,0.1)',
    borderColor: 'rgba(129,140,248,0.25)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextOpen: {
    color: '#1ccba1',
  },
  statusTextClosed: {
    color: '#818cf8',
  },
  positionStats: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '600',
  },
  statValueMuted: {
    color: 'rgba(232,232,255,0.3)',
  },
  statValueAccent: {
    color: '#1ccba1',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 11,
  },
  progressValue: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 11,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1ccba1',
    borderRadius: 3,
  },
  progressPct: {
    color: '#1ccba1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  claimButtonActive: {
    backgroundColor: '#1ccba1',
    shadowColor: '#1ccba1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  claimButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  claimButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  claimButtonTextActive: {
    color: '#050510',
  },
  claimButtonTextDisabled: {
    color: 'rgba(232,232,255,0.3)',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,16,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalDialog: {
    backgroundColor: '#0d0d1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
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
  claimInfo: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  claimInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimInfoLabel: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 13,
  },
  claimInfoValue: {
    color: '#e8e8ff',
    fontSize: 13,
    fontWeight: '600',
  },
  claimInfoAccent: {
    color: '#1ccba1',
  },
  claimInfoTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 10,
    marginTop: 4,
  },
  claimTotalLabel: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '600',
  },
  claimTotalValue: {
    color: '#1ccba1',
    fontSize: 16,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
  primaryButton: {
    flex: 1,
    backgroundColor: '#1ccba1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#050510',
    fontSize: 14,
    fontWeight: '700',
  },
});

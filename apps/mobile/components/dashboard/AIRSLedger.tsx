import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingCart, Layers, Leaf, Flame, DollarSign, Copy, Check } from 'lucide-react-native';
import { AIRSEntry } from './types';

interface AIRSLedgerProps {
  entries: AIRSEntry[];
}

const REFERENCE_TYPE_ICONS: Record<AIRSEntry['referenceType'], any> = {
  token_purchase: ShoppingCart,
  pool_deposit: Layers,
  compensation: Leaf,
  retire: Flame,
  claim: DollarSign,
};

const REFERENCE_TYPE_LABELS: Record<AIRSEntry['referenceType'], string> = {
  token_purchase: 'Purchase',
  pool_deposit: 'Deposit',
  compensation: 'Compensation',
  retire: 'Retire',
  claim: 'Claim',
};

const REFERENCE_TYPE_COLORS: Record<AIRSEntry['referenceType'], string> = {
  token_purchase: '#818cf8',
  pool_deposit: '#f59e0b',
  compensation: '#1ccba1',
  retire: '#f87171',
  claim: '#34d399',
};

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export default function AIRSLedger({ entries }: AIRSLedgerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, hash: string) => {
    // Copy to clipboard (using native fallback)
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>AIRS Ledger</Text>
          <Text style={styles.sectionSubtitle}>Impact activity rewards feed</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>
            +{entries.reduce((s, e) => s + e.amountAIRS, 0).toLocaleString()} AIRS
          </Text>
        </View>
      </View>

      <View style={styles.feed}>
        {entries.map((entry, index) => {
          const Icon = REFERENCE_TYPE_ICONS[entry.referenceType];
          const color = REFERENCE_TYPE_COLORS[entry.referenceType];
          const isCopied = copiedId === entry.id;
          return (
            <View key={entry.id} style={styles.entryRow}>
              <View style={[styles.entryIcon, { backgroundColor: `${color}18` }]}>
                <Icon size={14} color={color} />
              </View>
              <View style={styles.entryContent}>
                <View style={styles.entryTop}>
                  <Text style={styles.entryReason}>{entry.reason}</Text>
                  <Text style={styles.entryAmount}>+{entry.amountAIRS} AIRS</Text>
                </View>
                <View style={styles.entryBottom}>
                  <View style={[styles.refTypePill, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
                    <Text style={[styles.refTypeText, { color }]}>{REFERENCE_TYPE_LABELS[entry.referenceType]}</Text>
                  </View>
                  <Text style={styles.entryTime}>{formatTimeAgo(entry.timestamp)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.hashRow}
                  onPress={() => handleCopy(entry.id, entry.onChainReference)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.hashText}>{truncateHash(entry.onChainReference)}</Text>
                  {isCopied ? (
                    <Check size={11} color="#1ccba1" />
                  ) : (
                    <Copy size={11} color="rgba(232,232,255,0.3)" />
                  )}
                </TouchableOpacity>
              </View>
              {index < entries.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  totalBadge: {
    backgroundColor: 'rgba(28,203,161,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  totalBadgeText: {
    color: '#1ccba1',
    fontSize: 12,
    fontWeight: '700',
  },
  feed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  entryContent: {
    flex: 1,
    gap: 4,
  },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryReason: {
    color: '#e8e8ff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  entryAmount: {
    color: '#1ccba1',
    fontSize: 13,
    fontWeight: '700',
  },
  entryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refTypePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  refTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  entryTime: {
    color: 'rgba(232,232,255,0.35)',
    fontSize: 11,
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  hashText: {
    color: 'rgba(232,232,255,0.3)',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  divider: {
    position: 'absolute',
    left: 62,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

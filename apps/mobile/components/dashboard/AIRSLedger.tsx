import React, { useState, } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, } from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import { ShoppingCart, Leaf, Flame, DollarSign, Gift, Copy, Check, } from 'lucide-react-native';
import { AIRSEntry, } from './types';

interface AIRSLedgerProps {
  balance: number;
  lifetimeEarned: number;
  entries: AIRSEntry[];
  isDark: boolean;
}

interface Palette {
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  title: string;
  subtitle: string;
  copy: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  line: string;
  badgeBg: string;
  badgeBorder: string;
  feedBg: string;
  feedBorder: string;
  chipBg: string;
}

const REFERENCE_TYPE_ICONS: Record<AIRSEntry['referenceType'], React.ElementType> = {
  allied_commerce: ShoppingCart,
  validated_regenerative_action: Leaf,
  compensation: Flame,
  profile_completion_bonus: Gift,
  correction: DollarSign,
};

const REFERENCE_TYPE_LABELS: Record<AIRSEntry['referenceType'], string> = {
  allied_commerce: 'Comercio aliado',
  validated_regenerative_action: 'Acción regenerativa',
  compensation: 'Compensación',
  profile_completion_bonus: 'Bono de perfil',
  correction: 'Corrección',
};

const REFERENCE_TYPE_COLORS: Record<AIRSEntry['referenceType'], string> = {
  allied_commerce: '#1ccba1',
  validated_regenerative_action: '#55d6a1',
  compensation: '#f59e0b',
  profile_completion_bonus: '#818cf8',
  correction: '#f87171',
};

function getPalette(isDark: boolean,): Palette {
  return isDark
    ? {
      cardBg: 'rgba(11,18,27,0.96)',
      cardBorder: 'rgba(124,146,182,0.18)',
      cardShadow: 'rgba(0,0,0,0.34)',
      title: '#DCE5FF',
      subtitle: '#93A4C8',
      copy: '#B5C0D6',
      muted: '#7F8AA4',
      accent: '#27C8A3',
      accentSoft: 'rgba(39,200,163,0.12)',
      accentStrong: '#4DE2BC',
      line: 'rgba(154,170,202,0.14)',
      badgeBg: 'rgba(39,200,163,0.12)',
      badgeBorder: 'rgba(39,200,163,0.24)',
      feedBg: 'rgba(255,255,255,0.04)',
      feedBorder: 'rgba(255,255,255,0.08)',
      chipBg: 'rgba(255,255,255,0.08)',
    }
    : {
      cardBg: '#FBFCFE',
      cardBorder: 'rgba(112,124,151,0.22)',
      cardShadow: 'rgba(12,18,38,0.14)',
      title: '#313A91',
      subtitle: '#566287',
      copy: '#636A82',
      muted: '#7A8098',
      accent: '#11826B',
      accentSoft: 'rgba(17,130,107,0.10)',
      accentStrong: '#0E8D71',
      line: 'rgba(69,80,118,0.12)',
      badgeBg: 'rgba(17,130,107,0.10)',
      badgeBorder: 'rgba(17,130,107,0.18)',
      feedBg: '#F3F6FB',
      feedBorder: 'rgba(119,126,155,0.18)',
      chipBg: 'rgba(49,58,145,0.08)',
    };
}

function formatTimeAgo(date: Date,): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000,);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60,);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24,)}d`;
}

function formatAmount(amount: number,): string {
  const formatted = Math.abs(amount,).toLocaleString('es-ES', {
    maximumFractionDigits: 2,
  },);

  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatSourceAmount(entry: AIRSEntry,): string | null {
  if (entry.sourceAmount == null) {
    return null;
  }

  const amount = entry.sourceAmount.toLocaleString('es-ES', {
    maximumFractionDigits: 2,
  },);

  return `${amount} ${entry.sourceCurrency ?? 'USD'}`;
}

function truncateReference(reference: string,): string {
  if (reference.length <= 18) {
    return reference;
  }

  return `${reference.slice(0, 8,)}…${reference.slice(-6,)}`;
}

function MiniStat({
  label,
  value,
  p,
  compact,
}: {
  label: string;
  value: string;
  p: Palette;
  compact: boolean;
},): React.JSX.Element {
  return (
    <View
      style={[
        styles.statCard,
        compact && styles.statCardCompact,
        { backgroundColor: p.accentSoft, borderColor: p.badgeBorder, },
      ]}
    >
      <Text style={[styles.statLabel, compact && styles.statLabelCompact, { color: p.subtitle, },]}>
        {label}
      </Text>
      <Text style={[styles.statValue, compact && styles.statValueCompact, { color: p.title, },]}>
        {value}
      </Text>
    </View>
  );
}

export default function AIRSLedger({
  balance,
  lifetimeEarned,
  entries,
  isDark,
}: AIRSLedgerProps,): React.JSX.Element {
  const [copiedId, setCopiedId,] = useState<string | null>(null,);
  const { width, } = useWindowDimensions();
  const compact = width < 520;
  const p = getPalette(isDark,);

  const handleCopy = (id: string, reference: string,): void => {
    setCopiedId(id,);
    const cb = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (cb?.writeText) {
      void cb.writeText(reference,).catch(() => {},);
    }
    setTimeout(() => setCopiedId(null,), 1800,);
  };

  return (
    <View style={styles.section}>
      <View
        style={[
          styles.card,
          compact && styles.cardCompact,
          {
            backgroundColor: p.cardBg,
            borderColor: p.cardBorder,
            boxShadow: compact ? `0px 10px 22px ${p.cardShadow}` : `0px 14px 32px ${p.cardShadow}`,
          },
        ]}
      >
        <View style={[styles.sectionHeader, compact && styles.sectionHeaderCompact,]}>
          <View style={styles.headerCopy}>
            <Text style={[styles.sectionTitle, { color: p.title, },]}>AIRS acumulados</Text>
            <Text style={[styles.sectionSubtitle, { color: p.subtitle, },]}>
              Balance actual y actividad reciente
            </Text>
          </View>
          <View
            style={[styles.totalBadge, { backgroundColor: p.badgeBg, borderColor: p.badgeBorder, },]}
          >
            <Text style={[styles.totalBadgeText, { color: p.accent, },]}>
              {balance.toLocaleString('es-ES',)} AIRS
            </Text>
          </View>
        </View>

        <View style={[styles.summaryRow, compact && styles.summaryRowCompact,]}>
          <MiniStat
            label='Saldo'
            value={`${balance.toLocaleString('es-ES',)} AIRS`}
            p={p}
            compact={compact}
          />
          <MiniStat
            label='Acumulado de por vida'
            value={`${lifetimeEarned.toLocaleString('es-ES',)} AIRS`}
            p={p}
            compact={compact}
          />
        </View>

        <Text style={[styles.note, { color: p.copy, },]}>
          Ganas 5 AIRS por cada USD en comercio aliado o acciones regenerativas validadas. Completa
          tu perfil para desbloquear el bono de 10 AIRS.
        </Text>

        <View style={[styles.feed, { backgroundColor: p.feedBg, borderColor: p.feedBorder, },]}>
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: p.title, },]}>
                No hay movimientos todavía
              </Text>
              <Text style={[styles.emptyText, { color: p.muted, },]}>
                Cuando registres comercio aliado o acciones regenerativas validadas, aparecerán
                aquí.
              </Text>
            </View>
          ) : (
            entries.map((entry, index,) => {
              const Icon = REFERENCE_TYPE_ICONS[entry.referenceType];
              const color = REFERENCE_TYPE_COLORS[entry.referenceType];
              const isCopied = copiedId === entry.id;
              const sourceAmount = formatSourceAmount(entry,);

              return (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={[styles.entryIcon, { backgroundColor: `${color}18`, },]}>
                    <Icon size={14} color={color} />
                  </View>

                  <View style={styles.entryContent}>
                    <View style={styles.entryTop}>
                      <Text style={[styles.entryReason, { color: p.title, },]}>{entry.reason}</Text>
                      <Text style={[styles.entryAmount, { color, },]}>
                        {formatAmount(entry.amountAIRS,)} AIRS
                      </Text>
                    </View>

                    <View style={styles.entryBottom}>
                      <View
                        style={[
                          styles.refTypePill,
                          { backgroundColor: `${color}18`, borderColor: `${color}30`, },
                        ]}
                      >
                        <Text style={[styles.refTypeText, { color, },]}>
                          {REFERENCE_TYPE_LABELS[entry.referenceType]}
                        </Text>
                      </View>
                      {sourceAmount ? (
                        <Text style={[styles.entrySource, { color: p.muted, },]}>{sourceAmount}</Text>
                      ) : null}
                      <Text style={[styles.entryTime, { color: p.muted, },]}>
                        {formatTimeAgo(entry.timestamp,)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.hashRow, { backgroundColor: p.chipBg, },]}
                      onPress={() => handleCopy(entry.id, entry.reference,)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.hashText, { color: p.copy, },]}>
                        {truncateReference(entry.reference,)}
                      </Text>
                      {isCopied ? (
                        <Check size={11} color='#1ccba1' />
                      ) : (
                        <Copy size={11} color='rgba(232,232,255,0.35)' />
                      )}
                    </TouchableOpacity>
                  </View>

                  {index < entries.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: p.line, },]} />
                  )}
                </View>
              );
            },)
          )}
        </View>
      </View>
    </View>
  );
}

const styles = createTypographyStyles({
  section: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  cardCompact: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  sectionHeaderCompact: {
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.45,
    fontFamily: 'Sculpin-Bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  totalBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  summaryRowCompact: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  statCardCompact: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statLabelCompact: {
    fontSize: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    fontFamily: 'Sculpin-Bold',
  },
  statValueCompact: {
    fontSize: 16,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  feed: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  emptyState: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
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
    gap: 10,
    alignItems: 'center',
  },
  entryReason: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  entryAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  entryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  refTypePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  refTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  entrySource: {
    fontSize: 11,
    fontWeight: '600',
  },
  entryTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  hashText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  divider: {
    position: 'absolute',
    left: 62,
    right: 0,
    bottom: 0,
    height: 1,
  },
},);

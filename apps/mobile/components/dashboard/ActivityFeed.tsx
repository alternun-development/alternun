import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Leaf,
  ShoppingCart,
  UserCheck,
  UserPlus,
  Award,
  Gift,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  type LucideProps,
} from 'lucide-react-native';
import SearchFilterBar, { type SearchFilterOption } from '../common/SearchFilterBar';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import type { AIRSEntry } from './types';

const LeafIcon = Leaf as React.FC<LucideProps>;
const CartIcon = ShoppingCart as React.FC<LucideProps>;
const UserCheckIcon = UserCheck as React.FC<LucideProps>;
const UserPlusIcon = UserPlus as React.FC<LucideProps>;
const AwardIcon = Award as React.FC<LucideProps>;
const GiftIcon = Gift as React.FC<LucideProps>;
const AllIcon = SlidersHorizontal as React.FC<LucideProps>;
const PrevIcon = ChevronLeft as React.FC<LucideProps>;
const NextIcon = ChevronRight as React.FC<LucideProps>;

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = 'compensation' | 'purchase' | 'profile' | 'account' | 'reward' | 'certificate';

interface ActivityItem {
  id: string;
  type: ActivityType;
  action: string;
  source: string;
  airs: number;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSourceKindToType(referenceType: AIRSEntry['referenceType']): ActivityType {
  switch (referenceType) {
    case 'allied_commerce':
      return 'purchase';
    case 'validated_regenerative_action':
      return 'compensation';
    case 'compensation':
      return 'compensation';
    case 'profile_completion_bonus':
      return 'reward';
    case 'referral_bonus' as AIRSEntry['referenceType']:
      return 'account';
    case 'correction':
      return 'profile';
    default:
      return 'profile';
  }
}

function formatEntryDate(timestamp: Date): string {
  try {
    return timestamp.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function airsEntryToActivityItem(entry: AIRSEntry): ActivityItem {
  return {
    id: entry.id,
    type: mapSourceKindToType(entry.referenceType),
    action: entry.reason ?? '',
    source: entry.reference ?? entry.referenceType,
    airs: Math.abs(entry.amountAIRS),
    date: formatEntryDate(entry.timestamp),
  };
}

function getIcon(type: ActivityType, color: string): React.ReactNode {
  const props = { size: 16, color };
  switch (type) {
    case 'compensation':
      return <LeafIcon {...props} />;
    case 'purchase':
      return <CartIcon {...props} />;
    case 'profile':
      return <UserCheckIcon {...props} />;
    case 'account':
      return <UserPlusIcon {...props} />;
    case 'certificate':
      return <AwardIcon {...props} />;
    case 'reward':
      return <GiftIcon {...props} />;
  }
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface ActivityRowProps {
  item: ActivityItem;
  isDark: boolean;
  isLast: boolean;
  animValue: Animated.Value;
  actionLabel: string;
}

function ActivityRow({
  item,
  isDark,
  isLast,
  animValue,
  actionLabel,
}: ActivityRowProps): React.JSX.Element {
  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const textColor = isDark ? '#e8fff6' : '#0b2d31';
  const mutedColor = isDark ? 'rgba(232,255,246,0.55)' : 'rgba(11,45,49,0.55)';
  const divColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: divColor },
        {
          opacity: animValue,
          transform: [
            { translateX: animValue.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.rowAction}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isDark ? 'rgba(30,230,181,0.10)' : 'rgba(13,148,136,0.08)' },
          ]}
        >
          {getIcon(item.type, accent)}
        </View>
        <Text style={[styles.rowActionText, { color: textColor }]} numberOfLines={1}>
          {actionLabel}
        </Text>
      </View>
      <Text style={[styles.rowSource, { color: mutedColor }]} numberOfLines={1}>
        {item.source}
      </Text>
      <Text style={[styles.rowAirs, { color: accent }]}>+{item.airs}</Text>
      <Text style={[styles.rowDate, { color: mutedColor }]}>{item.date}</Text>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

interface ActivityFeedProps {
  isDark: boolean;
  entries?: AIRSEntry[];
  isLoading?: boolean;
}

export default function ActivityFeed({
  isDark,
  entries = [],
  isLoading = false,
}: ActivityFeedProps): React.JSX.Element {
  const [scope, setScope] = useState<'personal' | 'network'>('personal');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActivityType | 'all'>('all');
  const [page, setPage] = useState(0);
  const rowAnims = useRef<Map<string, Animated.Value>>(new Map());
  const t = useAppTranslation();

  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const bg = isDark ? '#050f0c' : '#f0fdf9';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,90,95,0.12)';
  const textColor = isDark ? '#e8fff6' : '#0b2d31';
  const mutedColor = isDark ? 'rgba(232,255,246,0.55)' : 'rgba(11,45,49,0.55)';
  const headerBg = isDark ? 'rgba(30,230,181,0.06)' : 'rgba(13,148,136,0.06)';
  const pillActiveBg = isDark ? 'rgba(30,230,181,0.15)' : 'rgba(13,148,136,0.12)';
  const pillInactiveBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,90,95,0.06)';

  const activities: ActivityItem[] = entries.map(airsEntryToActivityItem);

  const getActivityActionText = (type: ActivityType): string => {
    switch (type) {
      case 'compensation':
        return t.t('dashboard.activityFeed.activityTypes.compensation');
      case 'purchase':
        return t.t('dashboard.activityFeed.activityTypes.purchase');
      case 'profile':
        return t.t('dashboard.activityFeed.activityTypes.profile');
      case 'account':
        return t.t('dashboard.activityFeed.activityTypes.account');
      case 'reward':
        return t.t('dashboard.activityFeed.activityTypes.reward');
      case 'certificate':
        return t.t('dashboard.activityFeed.activityTypes.certificate');
    }
  };

  const FILTERS: SearchFilterOption[] = [
    { key: 'all', label: t.t('dashboard.activityFeed.filters.all'), icon: AllIcon },
    {
      key: 'compensation',
      label: t.t('dashboard.activityFeed.filters.compensation'),
      icon: LeafIcon,
    },
    { key: 'purchase', label: t.t('dashboard.activityFeed.filters.purchase'), icon: CartIcon },
    { key: 'profile', label: t.t('dashboard.activityFeed.filters.profile'), icon: UserCheckIcon },
    { key: 'account', label: t.t('dashboard.activityFeed.filters.account'), icon: UserPlusIcon },
    { key: 'reward', label: t.t('dashboard.activityFeed.filters.reward'), icon: GiftIcon },
  ];

  const filtered = activities.filter((a) => {
    const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q || a.action.toLowerCase().includes(q) || a.source.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const animateRow = useCallback((id: string): void => {
    if (!rowAnims.current.has(id)) {
      rowAnims.current.set(id, new Animated.Value(0));
    }
    const anim = rowAnims.current.get(id);
    if (anim) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, []);

  useEffect(() => {
    pageItems.forEach((item) => animateRow(item.id));
  }, [page, activeFilter, search, animateRow, pageItems]);

  // Reset page when entries change
  useEffect(() => {
    setPage(0);
  }, [entries]);

  const subtitleKey =
    scope === 'network'
      ? 'dashboard.activityFeed.subtitle.global'
      : 'dashboard.activityFeed.subtitle.user';
  const subtitleRaw = t.t(subtitleKey);
  const [subtitleBefore, subtitleAfter] = subtitleRaw.includes('Airs')
    ? subtitleRaw.split('Airs')
    : [subtitleRaw, ''];

  const SCOPE_FILTERS: { key: 'personal' | 'network'; label: string }[] = [
    { key: 'personal', label: t.t('dashboard.activityFeed.tabs.user') },
    { key: 'network', label: t.t('dashboard.activityFeed.tabs.global') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t.t('dashboard.activityFeed.title')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
            {subtitleBefore}
            <Text style={{ fontWeight: '700', color: textColor }}>Airs</Text>
            {subtitleAfter}
          </Text>
        </View>
        <View style={[styles.liveIndicator, { borderColor: accent }]}>
          <View style={[styles.liveDot, { backgroundColor: accent }]} />
          <Text style={[styles.liveText, { color: accent }]}>Live</Text>
        </View>
      </View>

      {/* Scope pills */}
      <View style={styles.scopeRow}>
        {SCOPE_FILTERS.map((f) => {
          const active = scope === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => {
                setScope(f.key);
                setPage(0);
              }}
              activeOpacity={0.7}
              style={[
                styles.scopePill,
                {
                  backgroundColor: active ? pillActiveBg : pillInactiveBg,
                  borderColor: active ? accent : 'transparent',
                },
              ]}
            >
              <Text style={[styles.scopePillText, { color: active ? accent : mutedColor }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SearchFilterBar
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder={t.t('dashboard.activityFeed.search')}
        filters={FILTERS}
        activeFilter={activeFilter}
        onChangeFilter={(filterKey) => {
          setActiveFilter(filterKey as ActivityType | 'all');
          setPage(0);
        }}
      />

      <View style={[styles.table, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={[styles.tableHeader, { backgroundColor: headerBg }]}>
          <Text style={[styles.thAction, { color: accent }]}>
            {t.t('dashboard.activityFeed.tableHeaders.action')}
          </Text>
          <Text style={[styles.thCell, { color: accent }]}>
            {t.t('dashboard.activityFeed.tableHeaders.source')}
          </Text>
          <Text style={[styles.thCell, { color: accent }]}>
            {t.t('dashboard.activityFeed.tableHeaders.airs')}
          </Text>
          <Text style={[styles.thCell, { color: accent }]}>
            {t.t('dashboard.activityFeed.tableHeaders.date')}
          </Text>
        </View>

        {scope === 'network' ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              Actividad global de la red — próximamente
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={accent} />
          </View>
        ) : pageItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              {entries.length === 0
                ? t.t('dashboard.activityFeed.empty')
                : t.t('dashboard.activityFeed.empty')}
            </Text>
          </View>
        ) : (
          pageItems.map((item, idx) => {
            if (!rowAnims.current.get(item.id)) {
              rowAnims.current.set(item.id, new Animated.Value(0));
            }
            return (
              <ActivityRow
                key={item.id}
                item={item}
                isDark={isDark}
                isLast={idx === pageItems.length - 1}
                animValue={rowAnims.current.get(item.id) as Animated.Value}
                actionLabel={getActivityActionText(item.type)}
              />
            );
          })
        )}
      </View>

      {filtered.length > PAGE_SIZE && (
        <View style={styles.pagination}>
          <Text style={[styles.pageInfo, { color: mutedColor }]}>
            {`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} de ${
              filtered.length
            }`}
          </Text>
          <View style={styles.pageButtons}>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              activeOpacity={0.7}
              style={[styles.pageBtn, { borderColor: cardBorder, opacity: page === 0 ? 0.35 : 1 }]}
            >
              <PrevIcon size={15} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.pageNum, { color: accent }]}>
              {page + 1} / {totalPages}
            </Text>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              activeOpacity={0.7}
              style={[
                styles.pageBtn,
                { borderColor: cardBorder, opacity: page >= totalPages - 1 ? 0.35 : 1 },
              ]}
            >
              <NextIcon size={15} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export type { ActivityType, ActivityItem };

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 8,
    position: 'relative',
    zIndex: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  scopePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  scopePillText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: 'Sculpin-Bold',
  },
  sectionSubtitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    fontWeight: '700',
  },
  table: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  thAction: {
    flex: 2.2,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  thCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: 'Sculpin-Bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowAction: {
    flex: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  rowSource: {
    flex: 1,
    fontSize: 12,
    textAlign: 'right',
  },
  rowAirs: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  rowDate: {
    flex: 1,
    fontSize: 11,
    textAlign: 'right',
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pageInfo: {
    fontSize: 12,
  },
  pageButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNum: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
});

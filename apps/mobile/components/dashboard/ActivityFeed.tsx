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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  type LucideProps,
} from 'lucide-react-native';
import SearchFilterBar, { type SearchFilterOption } from '../common/SearchFilterBar';
import ColumnLanes from '../common/ColumnLanes';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { useAppTranslation } from '../i18n/useAppTranslation';
import type {
  AIRSEntry,
  ActivitySortDirection as SortDirection,
  ActivitySortKey as SortKey,
} from './types';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

const LeafIcon = Leaf as React.FC<LucideProps>;
const SortIcon = ArrowUpDown as React.FC<LucideProps>;
const SortAscIcon = ArrowUp as React.FC<LucideProps>;
const SortDescIcon = ArrowDown as React.FC<LucideProps>;
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
  /** Milliseconds since epoch, for sorting by date. */
  time: number;
}

const SORT_KEYS: readonly SortKey[] = ['action', 'source', 'airs', 'date'];
/** Text sorts A to Z first; Airs and dates start with the largest and newest. */
const FIRST_DIRECTION: Record<SortKey, SortDirection> = {
  action: 'asc',
  source: 'asc',
  airs: 'desc',
  date: 'desc',
};

/** Local fallback order; signed-in activity is sorted by the API before paging. */
function compareActivity(sort: SortKey, direction: SortDirection) {
  const sign = direction === 'asc' ? 1 : -1;
  return (left: ActivityItem, right: ActivityItem): number => {
    const result =
      sort === 'airs'
        ? left.airs - right.airs
        : sort === 'date'
        ? left.time - right.time
        : sort === 'action'
        ? left.type.localeCompare(right.type)
        : left.source.toLowerCase().localeCompare(right.source.toLowerCase());
    return result * sign || right.time - left.time;
  };
}

interface ActivityLedgerEntry {
  id: string;
  sourceKind: AIRSEntry['referenceType'];
  sourceRef: string | null;
  notes: string | null;
  airsDelta: number;
  recordedAt: string;
}

interface ActivityResult {
  entries: ActivityLedgerEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AuthClient {
  getSessionToken(): Promise<string | null>;
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
    airs: entry.amountAIRS,
    date: formatEntryDate(entry.timestamp),
    time: entry.timestamp.getTime(),
  };
}

function ledgerEntryToActivityItem(entry: ActivityLedgerEntry): ActivityItem {
  return {
    id: entry.id,
    type: mapSourceKindToType(entry.sourceKind),
    action: entry.notes ?? entry.sourceKind,
    source: entry.sourceRef ?? entry.sourceKind,
    airs: entry.airsDelta,
    date: formatEntryDate(new Date(entry.recordedAt)),
    time: Date.parse(entry.recordedAt) || 0,
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
  /** Column weights: action, source, Airs, date. */
  columns: number[];
}

function ActivityRow({
  item,
  isDark,
  isLast,
  animValue,
  actionLabel,
  columns,
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
      <View style={[styles.rowAction, { flex: columns[0] }]}>
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
      <Text style={[styles.rowSource, { flex: columns[1], color: mutedColor }]} numberOfLines={1}>
        {item.source}
      </Text>
      <Text
        style={[styles.rowAirs, { flex: columns[2], color: item.airs >= 0 ? accent : '#dc2626' }]}
        numberOfLines={1}
      >
        {item.airs > 0 ? '+' : ''}
        {item.airs}
      </Text>
      <Text style={[styles.rowDate, { flex: columns[3], color: mutedColor }]} numberOfLines={1}>
        {item.date}
      </Text>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 5;
/** Starting column weights (action, source, Airs, date) and how far each can shrink. */
const COLUMN_WEIGHTS = [2.2, 1, 1, 1];
const MIN_COLUMN_WEIGHTS = [0.9, 0.45, 0.45, 0.6];

interface ActivityFeedProps {
  isDark: boolean;
  entries?: AIRSEntry[];
  isLoading?: boolean;
  client: AuthClient;
  signedIn: boolean;
}

export default function ActivityFeed({
  isDark,
  entries = [],
  isLoading = false,
  client,
  signedIn,
}: ActivityFeedProps): React.JSX.Element {
  const [scope, setScope] = useState<'personal' | 'network'>('personal');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActivityType | 'all'>('all');
  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState(COLUMN_WEIGHTS);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc',
  });
  const [remoteResult, setRemoteResult] = useState<ActivityResult | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const rowAnims = useRef<Map<string, Animated.Value>>(new Map());
  const t = useAppTranslation();

  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const bg = isDark ? '#050f0c' : '#f0fdf9';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,90,95,0.12)';
  const textColor = isDark ? '#e8fff6' : '#0b2d31';
  const mutedColor = isDark ? 'rgba(232,255,246,0.55)' : 'rgba(11,45,49,0.55)';
  const headerBg = isDark ? 'rgba(30,230,181,0.06)' : 'rgba(13,148,136,0.06)';
  const headers = (['action', 'source', 'airs', 'date'] as const).map((key) =>
    t.t(`dashboard.activityFeed.tableHeaders.${key}`)
  );
  const pillActiveBg = isDark ? 'rgba(30,230,181,0.15)' : 'rgba(13,148,136,0.12)';
  const pillInactiveBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,90,95,0.06)';

  const fetchActivity = useCallback(async (): Promise<void> => {
    if (!signedIn) {
      setRemoteResult(null);
      return;
    }

    setRemoteLoading(true);
    setRemoteError(null);
    try {
      const token = await client.getSessionToken();
      if (!token) {
        throw new Error('No session token available');
      }
      const apiScope = scope === 'network' ? 'global' : scope;
      const params = new URLSearchParams({
        scope: apiScope,
        page: String(page + 1),
        limit: String(PAGE_SIZE),
        sort: sort.key,
        direction: sort.direction,
      });
      if (search.trim()) params.set('search', search.trim());
      if (activeFilter !== 'all')
        params.set(
          'source_kind',
          activeFilter === 'reward'
            ? 'profile_completion_bonus'
            : activeFilter === 'account'
            ? 'referral_bonus'
            : activeFilter === 'profile'
            ? 'correction'
            : activeFilter === 'purchase'
            ? 'allied_commerce'
            : 'compensation'
        );

      const response = await fetch(
        `${resolveMobileApiBaseUrl()}/v1/airs/activity?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to load activity (${response.status})`);
      }
      setRemoteResult((await response.json()) as ActivityResult);
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Failed to load activity');
    } finally {
      setRemoteLoading(false);
    }
  }, [activeFilter, client, page, scope, search, signedIn, sort]);

  useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  const localActivities = entries.map(airsEntryToActivityItem);
  const activities: ActivityItem[] = remoteResult
    ? remoteResult.entries.map(ledgerEntryToActivityItem)
    : localActivities;

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

  const filtered = activities
    .filter((a) => {
      const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q || a.action.toLowerCase().includes(q) || a.source.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    })
    .sort(compareActivity(sort.key, sort.direction));

  const useRemotePagination = signedIn && remoteResult !== null;
  const totalItems = useRemotePagination ? remoteResult.totalCount : filtered.length;
  const totalPages = useRemotePagination
    ? remoteResult.totalPages
    : Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useRemotePagination
    ? activities
    : filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(30,230,181,0.14)' : 'rgba(13,148,136,0.16)',
          boxShadow: isDark
            ? '0px 12px 36px rgba(30,230,181,0.08), inset 0px 0px 24px rgba(30,230,181,0.04)'
            : '0px 10px 28px rgba(13,148,136,0.10)',
        },
      ]}
    >
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
              testID={`airs-activity-scope-${f.key}`}
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
          {headers.map((header, index) => {
            const key = SORT_KEYS[index];
            const active = sort.key === key;
            const Icon = !active ? SortIcon : sort.direction === 'asc' ? SortAscIcon : SortDescIcon;
            return (
              <TouchableOpacity
                key={key}
                testID={`airs-activity-sort-${key}`}
                accessibilityRole='button'
                accessibilityLabel={t.t('dashboard.activityFeed.sortBy', { column: header })}
                accessibilityState={{ selected: active }}
                activeOpacity={0.7}
                onPress={() => {
                  setSort((current) =>
                    current.key === key
                      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
                      : { key, direction: FIRST_DIRECTION[key] }
                  );
                  setPage(0);
                }}
                style={[
                  styles.thButton,
                  index === 0 ? styles.thAction : styles.thCell,
                  { flex: columns[index] },
                ]}
              >
                <Text style={[styles.thText, { color: accent }]} numberOfLines={1}>
                  {header}
                </Text>
                <Icon size={12} color={accent} style={{ opacity: active ? 1 : 0.45 }} />
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading || remoteLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={accent} />
          </View>
        ) : remoteError ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: mutedColor }]}>{remoteError}</Text>
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
                columns={columns}
              />
            );
          })
        )}
        {!isLoading && !remoteLoading && !remoteError && pageItems.length > 0 ? (
          <ColumnLanes
            weights={columns}
            minWeights={MIN_COLUMN_WEIGHTS}
            onChange={setColumns}
            inset={14}
            color={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
            activeColor={accent}
            labels={headers.slice(0, -1).map((header, index) =>
              t.t('dashboard.activityFeed.resizeColumn', {
                left: header,
                right: headers[index + 1],
              })
            )}
          />
        ) : null}
      </View>

      {totalItems > PAGE_SIZE && (
        <View style={styles.pagination}>
          <Text style={[styles.pageInfo, { color: mutedColor }]}>
            {`${page * PAGE_SIZE + 1}–${Math.min(
              (page + 1) * PAGE_SIZE,
              totalItems
            )} de ${totalItems}`}
          </Text>
          <View style={styles.pageButtons}>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              activeOpacity={0.7}
              testID='airs-activity-prev-page'
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
              testID='airs-activity-next-page'
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
  thButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thAction: {
    minWidth: 0,
    paddingRight: 8,
  },
  thCell: {
    minWidth: 0,
    paddingLeft: 8,
    justifyContent: 'flex-end',
  },
  thText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowAction: {
    minWidth: 0,
    paddingRight: 8,
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
    minWidth: 0,
    paddingLeft: 8,
    fontSize: 12,
    textAlign: 'right',
  },
  rowAirs: {
    minWidth: 0,
    paddingLeft: 8,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  rowDate: {
    minWidth: 0,
    paddingLeft: 8,
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

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

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'compensation',
    action: '',
    source: 'Servientrega',
    airs: 120,
    date: 'Ene 15 / 2026',
  },
  {
    id: '2',
    type: 'purchase',
    action: '',
    source: 'Servientrega',
    airs: 80,
    date: 'Ene 15 / 2026',
  },
  { id: '3', type: 'profile', action: '', source: 'Servientrega', airs: 5, date: 'Ene 15 / 2026' },
  {
    id: '4',
    type: 'compensation',
    action: '',
    source: 'Servientrega',
    airs: 120,
    date: 'Ene 15 / 2026',
  },
  { id: '5', type: 'account', action: '', source: 'Servientrega', airs: 10, date: 'Ene 14 / 2026' },
  { id: '6', type: 'reward', action: '', source: 'Alternun', airs: 25, date: 'Ene 13 / 2026' },
  { id: '7', type: 'compensation', action: '', source: 'DHL', airs: 120, date: 'Ene 12 / 2026' },
  { id: '8', type: 'certificate', action: '', source: 'Alternun', airs: 50, date: 'Ene 11 / 2026' },
  { id: '9', type: 'purchase', action: '', source: 'FedEx', airs: 80, date: 'Ene 10 / 2026' },
  { id: '10', type: 'profile', action: '', source: 'Alternun', airs: 15, date: 'Ene 9 / 2026' },
  { id: '11', type: 'compensation', action: '', source: 'Rappi', airs: 120, date: 'Ene 8 / 2026' },
  { id: '12', type: 'account', action: '', source: 'Alternun', airs: 20, date: 'Ene 7 / 2026' },
];

const PAGE_SIZE = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

interface RowProps {
  item: ActivityItem;
  isDark: boolean;
  isLast: boolean;
  animValue: Animated.Value;
}

interface ActivityRowProps extends Omit<RowProps, 'item'> {
  item: ActivityItem;
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
      {/* Action */}
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
      {/* Source */}
      <Text style={[styles.rowSource, { color: mutedColor }]}>{item.source}</Text>
      {/* Airs */}
      <Text style={[styles.rowAirs, { color: accent }]}>+{item.airs}</Text>
      {/* Date */}
      <Text style={[styles.rowDate, { color: mutedColor }]}>{item.date}</Text>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ActivityFeedProps {
  isDark: boolean;
}

export default function ActivityFeed({ isDark }: ActivityFeedProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActivityType | 'all'>('all');
  const [page, setPage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>(MOCK_ACTIVITIES);
  const [viewMode, setViewMode] = useState<'global' | 'user'>('user');
  const rowAnims = useRef<Map<string, Animated.Value>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useAppTranslation();

  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const bg = isDark ? '#050f0c' : '#f0fdf9';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,90,95,0.12)';
  const textColor = isDark ? '#e8fff6' : '#0b2d31';
  const mutedColor = isDark ? 'rgba(232,255,246,0.55)' : 'rgba(11,45,49,0.55)';
  const headerBg = isDark ? 'rgba(30,230,181,0.06)' : 'rgba(13,148,136,0.06)';

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

  // Filtered + searched list
  const filtered = activities.filter((a) => {
    const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q || a.action.toLowerCase().includes(q) || a.source.toLowerCase().includes(q);

    // Filter by view mode
    const isUserActivity = a.source === 'Alternun';
    const matchesViewMode = viewMode === 'global' ? !isUserActivity : isUserActivity;

    return matchesFilter && matchesSearch && matchesViewMode;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Animate new rows
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

  // Simulated real-time polling
  useEffect((): (() => void) => {
    let idCounter = MOCK_ACTIVITIES.length + 1;
    pollRef.current = setInterval(() => {
      const newItem: ActivityItem = {
        id: String(idCounter++),
        type: 'compensation',
        action: '',
        source: 'Live update',
        airs: 120,
        date: t.t('dashboard.activityFeed.now'),
      };
      setActivities((prev) => [newItem, ...prev]);
    }, 30000); // every 30s simulate a new event

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [t]);

  const handleRefresh = (): void => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t.t('dashboard.activityFeed.title')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
            {viewMode === 'global' ? (
              t.t('dashboard.activityFeed.subtitle.global')
            ) : (
              <>
                {t.t('dashboard.activityFeed.subtitle.user').split(' ')[0]}{' '}
                <Text style={{ fontWeight: '700', color: textColor }}>Airs</Text> By Alternun.
              </>
            )}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} activeOpacity={0.7} style={styles.refreshBtn}>
          {isRefreshing ? (
            <ActivityIndicator size='small' color={accent} />
          ) : (
            <View style={[styles.liveIndicator, { borderColor: accent }]}>
              <View style={[styles.liveDot, { backgroundColor: accent }]} />
              <Text style={[styles.liveText, { color: accent }]}>Live</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* View mode tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          onPress={() => {
            setViewMode('global');
            setPage(0);
          }}
          style={[
            styles.tab,
            viewMode === 'global' && {
              borderBottomWidth: 2,
              borderBottomColor: accent,
            },
          ]}
        >
          <Text
            style={[
              styles.tabLabel,
              {
                color: viewMode === 'global' ? textColor : mutedColor,
                fontWeight: viewMode === 'global' ? '600' : '400',
              },
            ]}
          >
            {t.t('dashboard.activityFeed.tabs.global')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setViewMode('user');
            setPage(0);
          }}
          style={[
            styles.tab,
            viewMode === 'user' && {
              borderBottomWidth: 2,
              borderBottomColor: accent,
            },
          ]}
        >
          <Text
            style={[
              styles.tabLabel,
              {
                color: viewMode === 'user' ? textColor : mutedColor,
                fontWeight: viewMode === 'user' ? '600' : '400',
              },
            ]}
          >
            {t.t('dashboard.activityFeed.tabs.user')}
          </Text>
        </TouchableOpacity>
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

      {/* Table */}
      <View style={[styles.table, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {/* Table header */}
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

        {/* Rows */}
        {isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={accent} />
          </View>
        ) : pageItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              {t.t('dashboard.activityFeed.empty')}
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

      {/* Pagination */}
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
    </View>
  );
}

// ─── Type export (for external use) ──────────────────────────────────────────
export type { ActivityType, ActivityItem };

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    marginBottom: 14,
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
  refreshBtn: {
    paddingTop: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  tabsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tab: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: ANEK_EXPANDED_FAMILY,
  },
});

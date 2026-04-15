import React, { useCallback, useEffect, useRef, useState, } from 'react';
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
import SearchFilterBar, { type SearchFilterOption, } from '../common/SearchFilterBar';

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
    action: 'Compensación ambiental',
    source: 'Servientrega',
    airs: 120,
    date: 'Ene 15 / 2026',
  },
  {
    id: '2',
    type: 'purchase',
    action: 'Compra de compensación',
    source: 'Servientrega',
    airs: 80,
    date: 'Ene 15 / 2026',
  },
  {
    id: '3',
    type: 'profile',
    action: 'Perfil completado',
    source: 'Servientrega',
    airs: 5,
    date: 'Ene 15 / 2026',
  },
  {
    id: '4',
    type: 'compensation',
    action: 'Compensación ambiental',
    source: 'Servientrega',
    airs: 120,
    date: 'Ene 15 / 2026',
  },
  {
    id: '5',
    type: 'account',
    action: 'Crear cuenta',
    source: 'Servientrega',
    airs: 10,
    date: 'Ene 14 / 2026',
  },
  {
    id: '6',
    type: 'reward',
    action: 'Recompensa de referido',
    source: 'Alternun',
    airs: 25,
    date: 'Ene 13 / 2026',
  },
  {
    id: '7',
    type: 'compensation',
    action: 'Compensación ambiental',
    source: 'DHL',
    airs: 120,
    date: 'Ene 12 / 2026',
  },
  {
    id: '8',
    type: 'certificate',
    action: 'Certificado emitido',
    source: 'Alternun',
    airs: 50,
    date: 'Ene 11 / 2026',
  },
  {
    id: '9',
    type: 'purchase',
    action: 'Compra de compensación',
    source: 'FedEx',
    airs: 80,
    date: 'Ene 10 / 2026',
  },
  {
    id: '10',
    type: 'profile',
    action: 'Verificación completada',
    source: 'Alternun',
    airs: 15,
    date: 'Ene 9 / 2026',
  },
  {
    id: '11',
    type: 'compensation',
    action: 'Compensación ambiental',
    source: 'Rappi',
    airs: 120,
    date: 'Ene 8 / 2026',
  },
  {
    id: '12',
    type: 'account',
    action: 'Wallet conectada',
    source: 'Alternun',
    airs: 20,
    date: 'Ene 7 / 2026',
  },
];

const PAGE_SIZE = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ActivityType, string> = {
  compensation: 'Compensación',
  purchase: 'Compra',
  profile: 'Perfil',
  account: 'Cuenta',
  reward: 'Recompensa',
  certificate: 'Certificado',
};

const FILTERS: SearchFilterOption[] = [
  { key: 'all', label: 'Todos', icon: AllIcon, },
  { key: 'compensation', label: 'Compensación', icon: LeafIcon, },
  { key: 'purchase', label: 'Compra', icon: CartIcon, },
  { key: 'profile', label: 'Perfil', icon: UserCheckIcon, },
  { key: 'account', label: 'Cuenta', icon: UserPlusIcon, },
  { key: 'reward', label: 'Recompensa', icon: GiftIcon, },
];

function getIcon(type: ActivityType, color: string,): React.ReactNode {
  const props = { size: 16, color, };
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

function ActivityRow({ item, isDark, isLast, animValue, }: RowProps,) {
  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const textColor = isDark ? '#e8fff6' : '#0b2d31';
  const mutedColor = isDark ? 'rgba(232,255,246,0.55)' : 'rgba(11,45,49,0.55)';
  const divColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: divColor, },
        {
          opacity: animValue,
          transform: [
            { translateX: animValue.interpolate({ inputRange: [0, 1,], outputRange: [-12, 0,], },), },
          ],
        },
      ]}
    >
      {/* Action */}
      <View style={styles.rowAction}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isDark ? 'rgba(30,230,181,0.10)' : 'rgba(13,148,136,0.08)', },
          ]}
        >
          {getIcon(item.type, accent,)}
        </View>
        <Text style={[styles.rowActionText, { color: textColor, },]} numberOfLines={1}>
          {item.action}
        </Text>
      </View>
      {/* Source */}
      <Text style={[styles.rowSource, { color: mutedColor, },]}>{item.source}</Text>
      {/* Airs */}
      <Text style={[styles.rowAirs, { color: accent, },]}>+{item.airs}</Text>
      {/* Date */}
      <Text style={[styles.rowDate, { color: mutedColor, },]}>{item.date}</Text>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ActivityFeedProps {
  isDark: boolean;
}

export default function ActivityFeed({ isDark, }: ActivityFeedProps,) {
  const [search, setSearch,] = useState('',);
  const [activeFilter, setActiveFilter,] = useState<ActivityType | 'all'>('all',);
  const [page, setPage,] = useState(0,);
  const [isRefreshing, setIsRefreshing,] = useState(false,);
  const [activities, setActivities,] = useState<ActivityItem[]>(MOCK_ACTIVITIES,);
  const rowAnims = useRef<Record<string, Animated.Value>>({},);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null,);

  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const bg = isDark ? '#050f0c' : '#f0fdf9';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,90,95,0.12)';
  const textColor = isDark ? '#e8fff6' : '#0b2d31';
  const mutedColor = isDark ? 'rgba(232,255,246,0.55)' : 'rgba(11,45,49,0.55)';
  const headerBg = isDark ? 'rgba(30,230,181,0.06)' : 'rgba(13,148,136,0.06)';

  // Filtered + searched list
  const filtered = activities.filter((a,) => {
    const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q || a.action.toLowerCase().includes(q,) || a.source.toLowerCase().includes(q,);
    return matchesFilter && matchesSearch;
  },);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE,),);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE,);

  // Animate new rows
  const animateRow = useCallback((id: string,) => {
    if (!rowAnims.current[id]) {
      rowAnims.current[id] = new Animated.Value(0,);
    }
    Animated.timing(rowAnims.current[id], {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic,),
      useNativeDriver: false,
    },).start();
  }, [],);

  useEffect(() => {
    pageItems.forEach((item,) => animateRow(item.id,),);
  }, [page, activeFilter, search, animateRow, pageItems,],);

  // Simulated real-time polling
  useEffect(() => {
    let idCounter = MOCK_ACTIVITIES.length + 1;
    pollRef.current = setInterval(() => {
      const newItem: ActivityItem = {
        id: String(idCounter++,),
        type: 'compensation',
        action: 'Compensación ambiental',
        source: 'Live update',
        airs: 120,
        date: 'Ahora',
      };
      setActivities((prev,) => [newItem, ...prev,],);
    }, 30000,); // every 30s simulate a new event

    return () => {
      if (pollRef.current) clearInterval(pollRef.current,);
    };
  }, [],);

  const handleRefresh = () => {
    setIsRefreshing(true,);
    setTimeout(() => setIsRefreshing(false,), 800,);
  };

  return (
    <View style={[styles.container, { backgroundColor: bg, },]}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: textColor, },]}>Actividad reciente</Text>
          <Text style={[styles.sectionSubtitle, { color: mutedColor, },]}>
            Así has acumulado tus <Text style={{ fontWeight: '700', color: textColor, }}>Airs</Text>{' '}
            By Alternun.
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} activeOpacity={0.7} style={styles.refreshBtn}>
          {isRefreshing ? (
            <ActivityIndicator size='small' color={accent} />
          ) : (
            <View style={[styles.liveIndicator, { borderColor: accent, },]}>
              <View style={[styles.liveDot, { backgroundColor: accent, },]} />
              <Text style={[styles.liveText, { color: accent, },]}>Live</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <SearchFilterBar
        value={search}
        onChangeText={(value,) => {
          setSearch(value,);
          setPage(0,);
        }}
        placeholder='Buscar actividad o fuente...'
        filters={FILTERS}
        activeFilter={activeFilter}
        onChangeFilter={(filterKey,) => {
          setActiveFilter(filterKey as ActivityType | 'all',);
          setPage(0,);
        }}
      />

      {/* Table */}
      <View style={[styles.table, { backgroundColor: cardBg, borderColor: cardBorder, },]}>
        {/* Table header */}
        <View style={[styles.tableHeader, { backgroundColor: headerBg, },]}>
          <Text style={[styles.thAction, { color: accent, },]}>Acción</Text>
          <Text style={[styles.thCell, { color: accent, },]}>Fuente</Text>
          <Text style={[styles.thCell, { color: accent, },]}>Airs</Text>
          <Text style={[styles.thCell, { color: accent, },]}>Fecha</Text>
        </View>

        {/* Rows */}
        {isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={accent} />
          </View>
        ) : pageItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: mutedColor, },]}>
              Sin actividad para esta búsqueda.
            </Text>
          </View>
        ) : (
          pageItems.map((item, idx,) => {
            if (!rowAnims.current[item.id]) {
              rowAnims.current[item.id] = new Animated.Value(0,);
            }
            return (
              <ActivityRow
                key={item.id}
                item={item}
                isDark={isDark}
                isLast={idx === pageItems.length - 1}
                animValue={rowAnims.current[item.id]}
              />
            );
          },)
        )}
      </View>

      {/* Pagination */}
      <View style={styles.pagination}>
        <Text style={[styles.pageInfo, { color: mutedColor, },]}>
          {`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length,)} de ${
            filtered.length
          }`}
        </Text>
        <View style={styles.pageButtons}>
          <TouchableOpacity
            onPress={() => setPage((p,) => Math.max(0, p - 1,),)}
            disabled={page === 0}
            activeOpacity={0.7}
            style={[styles.pageBtn, { borderColor: cardBorder, opacity: page === 0 ? 0.35 : 1, },]}
          >
            <PrevIcon size={15} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.pageNum, { color: accent, },]}>
            {page + 1} / {totalPages}
          </Text>
          <TouchableOpacity
            onPress={() => setPage((p,) => Math.min(totalPages - 1, p + 1,),)}
            disabled={page >= totalPages - 1}
            activeOpacity={0.7}
            style={[
              styles.pageBtn,
              { borderColor: cardBorder, opacity: page >= totalPages - 1 ? 0.35 : 1, },
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
export type { ActivityType, ActivityItem, };
export { TYPE_LABELS, };

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
  },
  sectionSubtitle: {
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
  },
  thCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
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
},);

import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { Bell, ArrowLeft, Search, Archive, Inbox } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ScreenShell from '../components/common/ScreenShell';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import { NotificationItem } from '../components/dashboard/NotificationDropdown';

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_CONFIG: Record<string, { icon: React.FC<any>; color: string; bg: string }> = {
  success: {
    icon: Bell as React.FC<any>,
    color: '#1ccba1',
    bg: 'rgba(28,203,161,0.12)',
  },
  error: {
    icon: Bell as React.FC<any>,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
  },
  info: {
    icon: Bell as React.FC<any>,
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.12)',
  },
  warning: {
    icon: Bell as React.FC<any>,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
};

// Mock notifications - in real app, these would come from state/context
const MOCK_NOTIFICATIONS: (NotificationItem & { archived?: boolean })[] = [
  {
    id: '1',
    type: 'success',
    title: 'Transaction confirmed',
    body: 'Your transaction of 100 AIRS has been successfully processed.',
    timestamp: new Date(Date.now() - 5 * 60000),
    read: false,
    archived: false,
  },
  {
    id: '2',
    type: 'info',
    title: 'New feature available',
    body: 'Check out our new dashboard analytics for better insights.',
    timestamp: new Date(Date.now() - 2 * 3600000),
    read: false,
    archived: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Low balance',
    body: 'Your AIRS balance is below 50. Consider adding more.',
    timestamp: new Date(Date.now() - 1 * 86400000),
    read: true,
    archived: false,
  },
  {
    id: '4',
    type: 'success',
    title: 'Reward earned',
    body: 'You earned 50 AIRS from community contribution.',
    timestamp: new Date(Date.now() - 3 * 86400000),
    read: true,
    archived: true,
  },
];

type FilterTab = 'inbox' | 'archived';

export default function NotificationsScreen(): React.JSX.Element {
  const router = useRouter();
  const { themeMode } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('inbox');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: false }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const c = isDark
    ? {
        bg: '#050f0c',
        cardBg: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        text: '#e8fff6',
        muted: 'rgba(232,255,246,0.6)',
        accent: '#1EE6B5',
        headerText: '#e8e8ff',
        itemBg: 'rgba(255,255,255,0.04)',
        itemBorder: 'rgba(255,255,255,0.06)',
        unreadDot: '#1ccba1',
        inputBg: 'rgba(255,255,255,0.04)',
        inputBorder: 'rgba(255,255,255,0.08)',
        inputText: '#e8fff6',
        tabActive: '#1EE6B5',
        tabInactive: 'rgba(232,255,246,0.4)',
      }
    : {
        bg: '#f0fdf9',
        cardBg: 'rgba(255,255,255,0.85)',
        border: 'rgba(11,90,95,0.12)',
        text: '#0b2d31',
        muted: 'rgba(11,45,49,0.6)',
        accent: '#0d9488',
        headerText: '#0f172a',
        itemBg: 'rgba(15,23,42,0.03)',
        itemBorder: 'rgba(15,23,42,0.08)',
        unreadDot: '#0d9488',
        inputBg: 'rgba(15,23,42,0.04)',
        inputBorder: 'rgba(11,90,95,0.12)',
        inputText: '#0b2d31',
        tabActive: '#0d9488',
        tabInactive: 'rgba(11,45,49,0.4)',
      };

  // Filter notifications based on active tab and search
  const filteredNotifications = useMemo(() => {
    let notifs = MOCK_NOTIFICATIONS.filter((n) =>
      activeTab === 'inbox' ? !n.archived : n.archived
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      notifs = notifs.filter(
        (n) => n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query)
      );
    }

    return notifs;
  }, [activeTab, searchQuery]);

  const unreadCount = useMemo(
    () => MOCK_NOTIFICATIONS.filter((n) => !n.read && !n.archived).length,
    []
  );

  return (
    <ScreenShell activeSection='notifications' backgroundColor={c.bg}>
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, left: 8, right: 12, bottom: 8 }}
          >
            <ArrowLeft size={24} color={c.text} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: c.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Search size={16} color={c.muted} style={styles.searchIcon} />
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: c.inputBg,
                borderColor: c.inputBorder,
                color: c.inputText,
              },
            ]}
            placeholder='Search notifications...'
            placeholderTextColor={c.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('inbox')}
            style={[
              styles.tab,
              {
                borderBottomColor: activeTab === 'inbox' ? c.tabActive : 'transparent',
              },
            ]}
          >
            <Inbox size={16} color={activeTab === 'inbox' ? c.accent : c.muted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'inbox' ? c.accent : c.muted }]}>
              Inbox
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('archived')}
            style={[
              styles.tab,
              {
                borderBottomColor: activeTab === 'archived' ? c.tabActive : 'transparent',
              },
            ]}
          >
            <Archive size={16} color={activeTab === 'archived' ? c.accent : c.muted} />
            <Text
              style={[styles.tabLabel, { color: activeTab === 'archived' ? c.accent : c.muted }]}
            >
              Archived
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifications list */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {filteredNotifications.length === 0 ? (
              <View style={styles.empty}>
                <Bell size={48} color={c.muted} />
                <Text style={[styles.emptyText, { color: c.muted }]}>
                  {activeTab === 'inbox' ? 'No notifications' : 'No archived notifications'}
                </Text>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {filteredNotifications.map((notif) => {
                  const cfg = TYPE_CONFIG[notif.type];
                  const IconComp = cfg.icon;
                  return (
                    <View
                      key={notif.id}
                      style={[
                        styles.notificationItem,
                        {
                          backgroundColor: c.itemBg,
                          borderColor: c.itemBorder,
                        },
                        !notif.read && {
                          borderLeftColor: c.unreadDot,
                          borderLeftWidth: 3,
                        },
                      ]}
                    >
                      {/* Icon */}
                      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                        <IconComp size={18} color={cfg.color} />
                      </View>

                      {/* Content */}
                      <View style={styles.itemBody}>
                        <View style={styles.itemHeader}>
                          <Text
                            style={[
                              styles.itemTitle,
                              {
                                color: c.headerText,
                                fontWeight: !notif.read ? '700' : '500',
                              },
                            ]}
                          >
                            {notif.title}
                          </Text>
                          <Text style={[styles.itemTime, { color: c.muted }]}>
                            {timeAgo(notif.timestamp)}
                          </Text>
                        </View>
                        <Text style={[styles.itemDesc, { color: c.muted }]}>{notif.body}</Text>
                      </View>

                      {/* Unread indicator */}
                      {!notif.read && (
                        <View style={[styles.unreadIndicator, { backgroundColor: c.unreadDot }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#1ccba1',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#050510',
    fontSize: 12,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  notificationsList: {
    gap: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
  },
  itemTime: {
    fontSize: 11,
    flexShrink: 0,
  },
  itemDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

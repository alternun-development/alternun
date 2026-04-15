import React, { useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Bell,
  ArrowLeft,
  Archive,
  Inbox,
  CheckCheck,
  Trash2,
  type LucideProps,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ScreenShell from '../components/common/ScreenShell';
import SearchFilterBar, { type SearchFilterOption } from '../components/common/SearchFilterBar';
import { PageTabBar, type TabItem } from '../components/common/PageTabBar';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { TYPE_CONFIG } from '../components/dashboard/NotificationDropdown';

const BellIcon = Bell as React.FC<LucideProps>;
const ArchiveIcon = Archive as React.FC<LucideProps>;
const InboxIcon = Inbox as React.FC<LucideProps>;

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const FILTER_OPTIONS: SearchFilterOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'unread', label: 'No leídos' },
  { key: 'success', label: 'Éxito' },
  { key: 'error', label: 'Error' },
  { key: 'info', label: 'Info' },
  { key: 'warning', label: 'Alerta' },
];

type FilterTab = 'inbox' | 'archived';

export default function NotificationsScreen(): React.JSX.Element {
  const router = useRouter();
  const { themeMode } = useAppPreferences();
  const { items, markRead, markUnread, markAllRead, archive, unarchive, deleteNotif } =
    useNotifications();
  const isDark = themeMode === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
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
        buttonBg: 'rgba(255,255,255,0.08)',
        buttonText: '#1EE6B5',
        tabActive: '#1EE6B5',
        tabInactive: 'rgba(232,255,246,0.4)',
        divider: 'rgba(255,255,255,0.07)',
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
        buttonBg: 'rgba(13,148,136,0.12)',
        buttonText: '#0d9488',
        tabActive: '#0d9488',
        tabInactive: 'rgba(11,45,49,0.4)',
        divider: 'rgba(15,23,42,0.08)',
      };

  // Filter notifications based on active tab, search, and type filter
  const filteredNotifications = useMemo(() => {
    let notifs = items.filter((n) => (activeTab === 'inbox' ? !n.archived : n.archived));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      notifs = notifs.filter(
        (n) => n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query)
      );
    }

    if (activeFilter !== 'all' && activeFilter !== 'unread') {
      notifs = notifs.filter((n) => n.type === activeFilter);
    } else if (activeFilter === 'unread') {
      notifs = notifs.filter((n) => !n.read);
    }

    return notifs;
  }, [activeTab, searchQuery, activeFilter, items]);

  const inboxUnreadCount = items.filter((n) => !n.read && !n.archived).length;

  const tabs: TabItem[] = [
    { key: 'inbox', label: 'Inbox', icon: InboxIcon },
    { key: 'archived', label: 'Archived', icon: ArchiveIcon },
  ];

  return (
    <ScreenShell activeSection='notifications' backgroundColor={c.bg}>
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        {/* Header with back button and unread badge */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, left: 8, right: 12, bottom: 8 }}
          >
            <ArrowLeft size={24} color={c.text} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: c.text }]}>Notifications</Text>
            {inboxUnreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{inboxUnreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* SearchFilterBar */}
        <View style={styles.searchContainer}>
          <SearchFilterBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder='Buscar notificaciones...'
            filters={FILTER_OPTIONS}
            activeFilter={activeFilter}
            onChangeFilter={setActiveFilter}
          />
        </View>

        {/* PageTabBar */}
        <PageTabBar
          tabs={tabs}
          activeTab={activeTab}
          onChangeTab={(key) => setActiveTab(key as FilterTab)}
          isDark={isDark}
          accent={c.accent}
          muted={c.muted}
        />

        {/* Bulk actions strip (only in inbox tab with items) */}
        {activeTab === 'inbox' && filteredNotifications.length > 0 && inboxUnreadCount > 0 && (
          <View style={[styles.bulkActionsStrip, { borderBottomColor: c.divider }]}>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: c.buttonBg }]}
              onPress={markAllRead}
              activeOpacity={0.7}
            >
              <CheckCheck size={16} color={c.buttonText} />
              <Text style={[styles.bulkActionText, { color: c.buttonText }]}>Mark all read</Text>
            </TouchableOpacity>
          </View>
        )}

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
                <BellIcon size={48} color={c.muted} />
                <Text style={[styles.emptyText, { color: c.muted }]}>
                  {activeTab === 'inbox'
                    ? 'No notifications'
                    : activeFilter === 'all'
                    ? 'No archived notifications'
                    : 'No matching notifications'}
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

                        {/* Action buttons */}
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: c.buttonBg }]}
                            onPress={() => {
                              if (notif.read) {
                                markUnread(notif.id);
                              } else {
                                markRead(notif.id);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <CheckCheck size={14} color={c.buttonText} />
                            <Text style={[styles.actionBtnText, { color: c.buttonText }]}>
                              {notif.read ? 'Mark unread' : 'Mark read'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: c.buttonBg }]}
                            onPress={() => {
                              if (notif.archived) {
                                unarchive(notif.id);
                              } else {
                                archive(notif.id);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            {notif.archived ? (
                              <>
                                <InboxIcon size={14} color={c.buttonText} />
                                <Text style={[styles.actionBtnText, { color: c.buttonText }]}>
                                  Unarchive
                                </Text>
                              </>
                            ) : (
                              <>
                                <ArchiveIcon size={14} color={c.buttonText} />
                                <Text style={[styles.actionBtnText, { color: c.buttonText }]}>
                                  Archive
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: c.buttonBg }]}
                            onPress={() => deleteNotif(notif.id)}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={14} color={c.buttonText} />
                            <Text style={[styles.actionBtnText, { color: c.buttonText }]}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bulkActionsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  bulkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkActionText: {
    fontSize: 12,
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
    gap: 8,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
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

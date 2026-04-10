import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, } from 'react-native';
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Bell,
  X,
  CheckCheck,
} from 'lucide-react-native';

export type NotifType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  isDark: boolean;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
  onNavigateToCenter?: () => void;
}

function timeAgo(date: Date,): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000,);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60,)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600,)}h ago`;
  return `${Math.floor(diff / 86400,)}d ago`;
}

const TYPE_CONFIG: Record<NotifType, { icon: React.FC<any>; color: string; bg: string }> = {
  success: {
    icon: CheckCircle as React.FC<any>,
    color: '#1ccba1',
    bg: 'rgba(28,203,161,0.12)',
  },
  error: {
    icon: AlertCircle as React.FC<any>,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
  },
  info: {
    icon: Info as React.FC<any>,
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.12)',
  },
  warning: {
    icon: AlertTriangle as React.FC<any>,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
};

export default function NotificationDropdown({
  notifications,
  isDark,
  onMarkAllRead,
  onDismiss,
  onClose,
  onNavigateToCenter,
}: NotificationDropdownProps,) {
  const p = isDark
    ? {
      bg: '#0b0f1e',
      border: 'rgba(255,255,255,0.10)',
      header: '#e8e8ff',
      sub: 'rgba(232,232,255,0.55)',
      itemBg: 'rgba(255,255,255,0.04)',
      itemBorder: 'rgba(255,255,255,0.06)',
      unreadDot: '#1ccba1',
      markAll: '#1ccba1',
      emptyIcon: 'rgba(232,232,255,0.2)',
      emptyText: 'rgba(232,232,255,0.45)',
      divider: 'rgba(255,255,255,0.07)',
    }
    : {
      bg: '#ffffff',
      border: 'rgba(15,23,42,0.14)',
      header: '#0f172a',
      sub: '#64748b',
      itemBg: 'rgba(15,23,42,0.03)',
      itemBorder: 'rgba(15,23,42,0.08)',
      unreadDot: '#0d9488',
      markAll: '#0d9488',
      emptyIcon: 'rgba(15,23,42,0.18)',
      emptyText: '#94a3b8',
      divider: 'rgba(15,23,42,0.08)',
    };

  const unreadCount = notifications.filter((n,) => !n.read,).length;

  return (
    <View style={[styles.panel, { backgroundColor: p.bg, borderColor: p.border, },]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: p.divider, },]}>
        <View style={styles.headerLeft}>
          <Bell size={14} color={p.header} />
          <Text style={[styles.headerTitle, { color: p.header, },]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={onMarkAllRead}
              activeOpacity={0.75}
              style={styles.markAllBtn}
            >
              <CheckCheck size={12} color={p.markAll} />
              <Text style={[styles.markAllText, { color: p.markAll, },]}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
            <X size={16} color={p.sub} />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={28} color={p.emptyIcon} />
          <Text style={[styles.emptyText, { color: p.emptyText, },]}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {notifications.map((notif,) => {
            const cfg = TYPE_CONFIG[notif.type];
            const IconComp = cfg.icon;
            return (
              <View
                key={notif.id}
                style={[
                  styles.item,
                  { backgroundColor: p.itemBg, borderColor: p.itemBorder, },
                  !notif.read && styles.itemUnread,
                ]}
              >
                {/* Type icon */}
                <View style={[styles.iconWrap, { backgroundColor: cfg.bg, },]}>
                  <IconComp size={14} color={cfg.color} />
                </View>

                {/* Content */}
                <View style={styles.itemBody}>
                  <View style={styles.itemRow}>
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: p.header, },
                        !notif.read && styles.itemTitleBold,
                      ]}
                      numberOfLines={1}
                    >
                      {notif.title}
                    </Text>
                    <Text style={[styles.itemTime, { color: p.sub, },]}>
                      {timeAgo(notif.timestamp,)}
                    </Text>
                  </View>
                  <Text style={[styles.itemDesc, { color: p.sub, },]} numberOfLines={2}>
                    {notif.body}
                  </Text>
                </View>

                {/* Unread dot + dismiss */}
                <View style={styles.itemActions}>
                  {!notif.read && (
                    <View style={[styles.unreadDot, { backgroundColor: p.unreadDot, },]} />
                  )}
                  <TouchableOpacity
                    onPress={() => onDismiss(notif.id,)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8, }}
                  >
                    <X size={12} color={p.sub} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          },)}
        </ScrollView>
      )}

      {/* Footer with "View Notification Center" button */}
      {onNavigateToCenter && (
        <View style={[styles.footer, { borderTopColor: p.divider, },]}>
          <TouchableOpacity
            onPress={onNavigateToCenter}
            activeOpacity={0.7}
            style={styles.seeAllBtn}
          >
            <Text style={[styles.seeAllText, { color: p.markAll, },]}>
              {notifications.length === 0 ? 'View Notification Center' : 'See all notifications'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 300,
    maxHeight: 380,
    borderWidth: 1,
    borderRadius: 16,
    boxShadow: '0px 18px 34px rgba(5, 16, 13, 0.24)',
    zIndex: 200,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#1ccba1',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#050510',
    fontSize: 10,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 10,
    fontWeight: '600',
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    padding: 8,
    gap: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  itemUnread: {
    borderLeftWidth: 2,
    borderLeftColor: '#1ccba1',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  itemTitleBold: {
    fontWeight: '700',
  },
  itemTime: {
    fontSize: 10,
    flexShrink: 0,
  },
  itemDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  itemActions: {
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 36,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  seeAllBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
},);

import React, { createContext, useContext, useReducer, ReactNode, } from 'react';
import type { NotificationItem, } from '../dashboard/NotificationDropdown';

// TODO: Integrate with AsyncStorage or API for persistence
// const loadFromStorage = async () => { ... }
// const saveToStorage = async (items: NotificationItem[]) => { ... }

type NotificationsAction =
  | { type: 'MARK_READ'; id: string }
  | { type: 'MARK_UNREAD'; id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'ARCHIVE'; id: string }
  | { type: 'UNARCHIVE'; id: string }
  | { type: 'DELETE'; id: string };

interface NotificationsContextType {
  items: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  markAllRead: () => void;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  deleteNotif: (id: string) => void;
  dismiss: (id: string) => void; // alias for deleteNotif
}

const NotificationsContext = createContext<NotificationsContextType | null>(null,);

// Seed data
const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'success',
    title: 'Transaction confirmed',
    body: 'Your transaction of 100 AIRS has been successfully processed.',
    timestamp: new Date(Date.now() - 5 * 60000,),
    read: false,
    archived: false,
  },
  {
    id: '2',
    type: 'info',
    title: 'New feature available',
    body: 'Check out our new dashboard analytics for better insights.',
    timestamp: new Date(Date.now() - 2 * 3600000,),
    read: false,
    archived: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Low balance',
    body: 'Your AIRS balance is below 50. Consider adding more.',
    timestamp: new Date(Date.now() - 1 * 86400000,),
    read: true,
    archived: false,
  },
  {
    id: '4',
    type: 'success',
    title: 'Reward earned',
    body: 'You earned 50 AIRS from community contribution.',
    timestamp: new Date(Date.now() - 3 * 86400000,),
    read: true,
    archived: true,
  },
];

function notificationsReducer(
  state: NotificationItem[],
  action: NotificationsAction,
): NotificationItem[] {
  switch (action.type) {
    case 'MARK_READ':
      return state.map((n,) => (n.id === action.id ? { ...n, read: true, } : n),);

    case 'MARK_UNREAD':
      return state.map((n,) => (n.id === action.id ? { ...n, read: false, } : n),);

    case 'MARK_ALL_READ':
      return state.map((n,) => (!n.archived ? { ...n, read: true, } : n),);

    case 'ARCHIVE':
      return state.map((n,) => (n.id === action.id ? { ...n, archived: true, } : n),);

    case 'UNARCHIVE':
      return state.map((n,) => (n.id === action.id ? { ...n, archived: false, } : n),);

    case 'DELETE':
      return state.filter((n,) => n.id !== action.id,);

    default:
      return state;
  }
}

export function NotificationsProvider({ children, }: { children: ReactNode },) {
  const [items, dispatch,] = useReducer(notificationsReducer, SEED_NOTIFICATIONS,);

  const unreadCount = items.filter((n,) => !n.read && !n.archived,).length;

  const markRead = (id: string,) => {
    dispatch({ type: 'MARK_READ', id, },);
  };

  const markUnread = (id: string,) => {
    dispatch({ type: 'MARK_UNREAD', id, },);
  };

  const markAllRead = () => {
    dispatch({ type: 'MARK_ALL_READ', },);
  };

  const archive = (id: string,) => {
    dispatch({ type: 'ARCHIVE', id, },);
  };

  const unarchive = (id: string,) => {
    dispatch({ type: 'UNARCHIVE', id, },);
  };

  const deleteNotif = (id: string,) => {
    dispatch({ type: 'DELETE', id, },);
  };

  const value: NotificationsContextType = {
    items,
    unreadCount,
    markRead,
    markUnread,
    markAllRead,
    archive,
    unarchive,
    deleteNotif,
    dismiss: deleteNotif,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext,);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider',);
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationRecord } from '../types';
import { useAuth } from './AuthContext';
import { subscribeToCollection, createDocument, updateDocument } from '../services/dataService';

interface NotificationContextType {
  notifications: NotificationRecord[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendNotification: (notif: Omit<NotificationRecord, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    // الاشتراك الدوري الذكي عبر D1
    const unsubscribe = subscribeToCollection<NotificationRecord>('notifications', (list) => {
      const filtered = list.filter((n) => {
        if (!n.recipientId && !n.targetRole) return true;
        if (n.recipientId === currentUser.id) return true;
        if (n.targetRole === currentUser.role) return true;
        return false;
      });
      setNotifications(filtered);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDocument('notifications', id, { isRead: 1 } as any);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadList = notifications.filter((n) => !n.isRead);
      await Promise.all(
        unreadList.map((n) => updateDocument('notifications', n.id, { isRead: 1 } as any))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const sendNotification = async (notif: Omit<NotificationRecord, 'id' | 'createdAt' | 'isRead'>) => {
    try {
      await createDocument('notifications', {
        ...notif,
        isRead: 0,
      } as any);
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

import { useCallback, useEffect, useState } from "react";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.js";

export function useNotifications({ currentUser, refreshKey = 0 }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchNotifications(currentUser.id);
      setNotifications(payload.notifications ?? []);
      setUnreadCount(Number(payload.unreadCount ?? 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, refreshKey]);

  async function markRead(notificationId) {
    if (!currentUser?.id) return;
    const result = await markNotificationRead(notificationId, currentUser.id);
    setNotifications((current) =>
      current.map((item) =>
        Number(item.id) === Number(notificationId)
          ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount(Number(result.unreadCount ?? 0));
  }

  async function markAllRead() {
    if (!currentUser?.id) return;
    const result = await markAllNotificationsRead(currentUser.id);
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || new Date().toISOString(),
      })),
    );
    setUnreadCount(Number(result.unreadCount ?? 0));
  }

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markRead,
    markAllRead,
  };
}

import { shouldUseLocalFallback, request } from "./http.js";

const localNotifications = new Map();

function localKey(memberId) {
  return String(memberId);
}

function ensureLocal(memberId) {
  const key = localKey(memberId);
  if (!localNotifications.has(key)) localNotifications.set(key, []);
  return localNotifications.get(key);
}

export async function fetchNotifications(memberId) {
  try {
    return await request(`/api/notifications?memberId=${encodeURIComponent(memberId)}`);
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    const notifications = ensureLocal(memberId);
    return {
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length,
    };
  }
}

export async function markNotificationRead(notificationId, memberId) {
  try {
    return await request(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
      body: JSON.stringify({ memberId }),
    });
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    const notifications = ensureLocal(memberId);
    const target = notifications.find((item) => Number(item.id) === Number(notificationId));
    if (target) {
      target.isRead = true;
      target.readAt = new Date().toISOString();
    }
    return {
      id: notificationId,
      isRead: true,
      unreadCount: notifications.filter((item) => !item.isRead).length,
    };
  }
}

export async function markAllNotificationsRead(memberId) {
  try {
    return await request("/api/notifications/mark-all-read", {
      method: "POST",
      body: JSON.stringify({ memberId }),
    });
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    const notifications = ensureLocal(memberId);
    const now = new Date().toISOString();
    notifications.forEach((item) => {
      item.isRead = true;
      item.readAt = item.readAt || now;
    });
    return { updatedCount: notifications.length, unreadCount: 0 };
  }
}

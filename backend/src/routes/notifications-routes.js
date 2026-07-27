import {
  countUnreadNotifications,
  ensureNotificationSchema,
  listNotificationsForMember,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification-store.js";
import { parsePositiveId } from "../utils/shared.js";

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function requireActiveMember(db, memberId) {
  const id = parsePositiveId(memberId);
  const [rows] = await db.execute(
    `SELECT id, role FROM members WHERE id = ? AND is_active = 1 LIMIT 1`,
    [id],
  );
  if (!rows.length) {
    throw createHttpError("ກະລຸນາເຂົ້າລະບົບກ່ອນເບິ່ງແຈ້ງເຕືອນ", 401);
  }
  return rows[0];
}

export function registerNotificationsRoutes(app, pool) {
  app.get("/api/notifications", async (req, res, next) => {
    try {
      await ensureNotificationSchema(pool);
      const member = await requireActiveMember(pool, req.query.memberId);
      const notifications = await listNotificationsForMember(pool, member.id);
      const unreadCount = notifications.filter((item) => !item.isRead).length;
      res.json({ notifications, unreadCount });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notifications/unread-count", async (req, res, next) => {
    try {
      await ensureNotificationSchema(pool);
      const member = await requireActiveMember(pool, req.query.memberId);
      const unreadCount = await countUnreadNotifications(pool, member.id);
      res.json({ unreadCount });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res, next) => {
    try {
      await ensureNotificationSchema(pool);
      const notificationId = parsePositiveId(req.params.id);
      const member = await requireActiveMember(pool, req.body.memberId ?? req.query.memberId);
      const updated = await markNotificationRead(pool, member.id, notificationId);
      if (!updated) {
        throw createHttpError("ບໍ່ພົບແຈ້ງເຕືອນ", 404);
      }
      const unreadCount = await countUnreadNotifications(pool, member.id);
      res.json({ id: notificationId, isRead: true, unreadCount });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res, next) => {
    try {
      await ensureNotificationSchema(pool);
      const member = await requireActiveMember(pool, req.body.memberId ?? req.query.memberId);
      const updatedCount = await markAllNotificationsRead(pool, member.id);
      res.json({ updatedCount, unreadCount: 0 });
    } catch (error) {
      next(error);
    }
  });
}

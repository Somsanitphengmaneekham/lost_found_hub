let ensuredSchemaPromise = null;

export async function ensureNotificationSchema(db) {
  if (!ensuredSchemaPromise) {
    ensuredSchemaPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
          member_id     INT UNSIGNED NOT NULL,
          event_type    VARCHAR(64)  NOT NULL,
          title         VARCHAR(255) NOT NULL,
          body          TEXT         NOT NULL,
          meta          VARCHAR(255)     NULL,
          href          VARCHAR(128) NOT NULL DEFAULT '#notifications',
          action_label  VARCHAR(128)     NULL,
          tone          VARCHAR(32)  NOT NULL DEFAULT 'slate',
          priority      TINYINT UNSIGNED NOT NULL DEFAULT 5,
          entity_type   VARCHAR(32)      NULL,
          entity_id     INT UNSIGNED     NULL,
          is_read       TINYINT(1)   NOT NULL DEFAULT 0,
          read_at       DATETIME         NULL,
          created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_notifications_member_created (member_id, created_at),
          KEY idx_notifications_member_unread (member_id, is_read, created_at),
          KEY idx_notifications_entity (entity_type, entity_id),
          CONSTRAINT fk_notifications_member
            FOREIGN KEY (member_id) REFERENCES members(id)
            ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const [matchStatusCols] = await db.query(
        `
          SELECT COLUMN_NAME
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'matches'
            AND COLUMN_NAME = 'status'
        `,
      );

      if (!matchStatusCols.length) {
        await db.execute(`
          ALTER TABLE matches
            ADD COLUMN status ENUM('suggested','confirmed','rejected') NOT NULL DEFAULT 'suggested' AFTER match_score,
            ADD KEY idx_matches_status (status)
        `);
      }
    })().catch((error) => {
      ensuredSchemaPromise = null;
      throw error;
    });
  }

  return ensuredSchemaPromise;
}

function mapNotificationRow(row) {
  return {
    id: row.id,
    memberId: row.member_id,
    eventType: row.event_type,
    title: row.title,
    description: row.body,
    meta: row.meta ?? "",
    href: row.href || "#notifications",
    actionLabel: row.action_label || "ເບິ່ງແຈ້ງເຕືອນ",
    tone: row.tone || "slate",
    priority: Number(row.priority) || 5,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: Boolean(row.is_read),
    readAt: row.read_at,
    createdAt: row.created_at,
    audience: row.member_role === "teacher" ? "teacher" : "student",
  };
}

export async function createNotification(
  db,
  {
    memberId,
    eventType,
    title,
    body,
    meta = null,
    href = "#notifications",
    actionLabel = "ເບິ່ງແຈ້ງເຕືອນ",
    tone = "slate",
    priority = 5,
    entityType = null,
    entityId = null,
  },
) {
  await ensureNotificationSchema(db);

  const [result] = await db.execute(
    `
      INSERT INTO notifications (
        member_id,
        event_type,
        title,
        body,
        meta,
        href,
        action_label,
        tone,
        priority,
        entity_type,
        entity_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      memberId,
      eventType,
      title,
      body,
      meta,
      href,
      actionLabel,
      tone,
      priority,
      entityType,
      entityId,
    ],
  );

  return result.insertId;
}

export async function createNotificationsForMembers(db, memberIds, payload) {
  const uniqueIds = [...new Set((memberIds ?? []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (!uniqueIds.length) return [];

  const ids = [];
  for (const memberId of uniqueIds) {
    ids.push(await createNotification(db, { ...payload, memberId }));
  }
  return ids;
}

export async function listNotificationsForMember(db, memberId, { limit = 100 } = {}) {
  await ensureNotificationSchema(db);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

  const [rows] = await db.execute(
    `
      SELECT
        n.*,
        m.role AS member_role
      FROM notifications n
      INNER JOIN members m ON m.id = n.member_id
      WHERE n.member_id = ?
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ${safeLimit}
    `,
    [memberId],
  );

  return rows.map(mapNotificationRow);
}

export async function countUnreadNotifications(db, memberId) {
  await ensureNotificationSchema(db);
  const [rows] = await db.execute(
    `
      SELECT COUNT(*) AS unreadCount
      FROM notifications
      WHERE member_id = ?
        AND is_read = 0
    `,
    [memberId],
  );
  return Number(rows[0]?.unreadCount ?? 0);
}

export async function markNotificationRead(db, memberId, notificationId) {
  await ensureNotificationSchema(db);
  const [result] = await db.execute(
    `
      UPDATE notifications
      SET is_read = 1, read_at = COALESCE(read_at, NOW())
      WHERE id = ?
        AND member_id = ?
    `,
    [notificationId, memberId],
  );
  return result.affectedRows > 0;
}

export async function markAllNotificationsRead(db, memberId) {
  await ensureNotificationSchema(db);
  const [result] = await db.execute(
    `
      UPDATE notifications
      SET is_read = 1, read_at = COALESCE(read_at, NOW())
      WHERE member_id = ?
        AND is_read = 0
    `,
    [memberId],
  );
  return result.affectedRows;
}

export async function listActiveTeacherIds(db) {
  const [rows] = await db.execute(
    `
      SELECT id
      FROM members
      WHERE role = 'teacher'
        AND is_active = 1
    `,
  );
  return rows.map((row) => Number(row.id));
}

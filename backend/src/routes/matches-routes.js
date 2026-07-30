import { resolveLocationId } from "../services/lookups.js";
import { ensureNotificationSchema } from "../services/notification-store.js";
import {
  notifyClaimantOfReturn,
  notifyMatchConfirmed,
  notifyMatchRejected,
  notifyTeachersOfReturnNeeded,
} from "../services/post-notification-service.js";
import {
  ensureReturnRecordSecurityColumns,
  normalizeReturnEvidence,
} from "../services/return-record-security.js";
import { calculateMatchScore, rebuildAllMatches } from "../services/weightedScoreMatching.js";
import { parsePositiveId } from "../utils/shared.js";

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function dispatchEmailNotification(task, eventName) {
  void task.catch((error) => {
    console.error(`[email-notification] ${eventName} failed`, error?.message || error);
  });
}

async function requireTeacher(db, memberId) {
  const id = parsePositiveId(memberId);
  const [rows] = await db.execute(
    `SELECT id FROM members WHERE id = ? AND role = 'teacher' AND is_active = 1 LIMIT 1`,
    [id],
  );

  if (!rows.length) {
    throw createHttpError("returning items requires an active teacher account", 403);
  }

  return id;
}

async function requireTeacherOrLostOwner(db, memberId, lostOwnerId) {
  const id = parsePositiveId(memberId);
  const [rows] = await db.execute(
    `SELECT id, role FROM members WHERE id = ? AND is_active = 1 LIMIT 1`,
    [id],
  );
  if (!rows.length) throw createHttpError("ກະລຸນາເຂົ້າລະບົບກ່ອນ", 401);
  if (rows[0].role === "teacher" || Number(rows[0].id) === Number(lostOwnerId)) {
    return rows[0];
  }
  throw createHttpError("ສາມາດຢືນຢັນລາຍການໃກ້ຄຽງໄດ້ສະເພາະອາຈານ ຫຼື ເຈົ້າຂອງປະກາດຂອງສູນຫາຍ", 403);
}

export function registerMatchesRoutes(app, pool) {
  app.get("/api/matches", async (_req, res, next) => {
    try {
      await ensureNotificationSchema(pool);
      await rebuildAllMatches(pool);

      const [rows] = await pool.query(`
        SELECT
          m.id,
          m.lost_post_id AS lostPostId,
          m.found_post_id AS foundPostId,
          m.match_score AS matchScore,
          COALESCE(m.status, 'suggested') AS status,
          m.created_at AS createdAt,
          lp.title AS lostTitle,
          lp.description AS lostDescription,
          lp.color AS lostColor,
          lp.brand AS lostBrand,
          lp.unique_mark AS lostUniqueMark,
          lp.lost_at AS lostAt,
          lp.status AS lostStatus,
          lp.owner_id AS lostOwnerId,
          CONCAT(
            ll.name_th,
            IF(ll.floor IS NOT NULL AND ll.floor <> '', CONCAT(' ຊັ້ນ ', ll.floor), '')
          ) AS lostLocationName,
          lc.name_th AS lostCategoryName,
          fp.title AS foundTitle,
          fp.description AS foundDescription,
          fp.color AS foundColor,
          fp.brand AS foundBrand,
          fp.unique_mark AS foundUniqueMark,
          fp.found_at AS foundAt,
          fp.status AS foundStatus,
          fp.finder_id AS foundFinderId,
          CONCAT(
            fl.name_th,
            IF(fl.floor IS NOT NULL AND fl.floor <> '', CONCAT(' ຊັ້ນ ', fl.floor), '')
          ) AS foundLocationName,
          fc.name_th AS foundCategoryName,
          lp.category_id AS lostCategoryId,
          fp.category_id AS foundCategoryId,
          lp.lost_location_id AS lostLocationId,
          fp.found_location_id AS foundLocationId
        FROM matches m
        INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
        INNER JOIN found_posts fp ON fp.id = m.found_post_id
        INNER JOIN item_categories lc ON lc.id = lp.category_id
        INNER JOIN item_categories fc ON fc.id = fp.category_id
        LEFT JOIN locations ll ON ll.id = lp.lost_location_id
        LEFT JOIN locations fl ON fl.id = fp.found_location_id
        WHERE lp.deleted_at IS NULL
          AND fp.deleted_at IS NULL
          AND lp.status IN ('pending_approval', 'published', 'matched')
          AND fp.status IN ('approved', 'matched')
          AND COALESCE(m.status, 'suggested') <> 'rejected'
        ORDER BY m.match_score DESC, m.created_at DESC
      `);

      res.json(
        rows.map((row) => {
          const lost = {
            title: row.lostTitle,
            category_id: row.lostCategoryId,
            lost_location_id: row.lostLocationId,
            lost_at: row.lostAt,
            color: row.lostColor,
            brand: row.lostBrand,
            unique_mark: row.lostUniqueMark,
            description: row.lostDescription,
          };
          const found = {
            title: row.foundTitle,
            category_id: row.foundCategoryId,
            found_location_id: row.foundLocationId,
            found_at: row.foundAt,
            color: row.foundColor,
            brand: row.foundBrand,
            unique_mark: row.foundUniqueMark,
            description: row.foundDescription,
          };
          const scoreResult = calculateMatchScore(lost, found);

          return {
            id: row.id,
            lostPostId: row.lostPostId,
            foundPostId: row.foundPostId,
            matchScore: Number(row.matchScore),
            status: row.status || "suggested",
            createdAt: row.createdAt,
            reasons: scoreResult.reasons,
            lost: {
              id: row.lostPostId,
              ownerId: row.lostOwnerId,
              title: row.lostTitle,
              location: row.lostLocationName ?? "ຍັງບໍ່ລະບຸສະຖານທີ່",
              category: row.lostCategoryName,
              status: row.lostStatus,
            },
            found: {
              id: row.foundPostId,
              finderId: row.foundFinderId,
              title: row.foundTitle,
              location: row.foundLocationName ?? "ຍັງບໍ່ລະບຸສະຖານທີ່",
              category: row.foundCategoryName,
              status: row.foundStatus,
            },
          };
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/matches/:id", async (req, res, next) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await ensureNotificationSchema(connection);
      const id = parsePositiveId(req.params.id);
      const nextStatus = String(req.body.status ?? "").trim();
      if (!["confirmed", "rejected"].includes(nextStatus)) {
        throw createHttpError("ສະຖານະລາຍການໃກ້ຄຽງຕ້ອງເປັນ confirmed ຫຼື rejected", 400);
      }

      const [matchRows] = await connection.execute(
        `
          SELECT
            m.id,
            m.lost_post_id AS lostPostId,
            m.found_post_id AS foundPostId,
            m.match_score AS matchScore,
            COALESCE(m.status, 'suggested') AS status,
            lp.title AS lostTitle,
            lp.owner_id AS lostOwnerId,
            fp.title AS foundTitle,
            fp.finder_id AS foundFinderId,
            CONCAT(owner.first_name, ' ', owner.last_name) AS lostOwnerName,
            owner.email AS lostOwnerEmail,
            CONCAT(finder.first_name, ' ', finder.last_name) AS foundFinderName,
            finder.email AS foundFinderEmail
          FROM matches m
          INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
          INNER JOIN found_posts fp ON fp.id = m.found_post_id
          INNER JOIN members owner ON owner.id = lp.owner_id
          INNER JOIN members finder ON finder.id = fp.finder_id
          WHERE m.id = ?
            AND lp.deleted_at IS NULL
            AND fp.deleted_at IS NULL
          LIMIT 1
        `,
        [id],
      );
      if (!matchRows.length) throw createHttpError("ບໍ່ພົບລາຍການໃກ້ຄຽງ", 404);

      const match = matchRows[0];
      await requireTeacherOrLostOwner(
        connection,
        req.body.actorId ?? req.body.memberId ?? req.body.confirmedByMemberId,
        match.lostOwnerId,
      );

      if (match.status === nextStatus) {
        return res.json({
          id: match.id,
          lostPostId: match.lostPostId,
          foundPostId: match.foundPostId,
          matchScore: Number(match.matchScore),
          status: match.status,
        });
      }

      await connection.beginTransaction();
      transactionStarted = true;

      await connection.execute(`UPDATE matches SET status = ? WHERE id = ?`, [nextStatus, id]);

      if (nextStatus === "confirmed") {
        await connection.execute(
          `UPDATE lost_posts SET status = 'matched' WHERE id = ? AND deleted_at IS NULL AND status IN ('published', 'matched', 'pending_approval')`,
          [match.lostPostId],
        );
        await connection.execute(
          `UPDATE found_posts SET status = 'matched' WHERE id = ? AND deleted_at IS NULL AND status IN ('approved', 'matched')`,
          [match.foundPostId],
        );
        await connection.execute(
          `
            UPDATE matches
            SET status = 'rejected'
            WHERE id <> ?
              AND (lost_post_id = ? OR found_post_id = ?)
              AND COALESCE(status, 'suggested') = 'suggested'
          `,
          [id, match.lostPostId, match.foundPostId],
        );
      }

      await connection.commit();
      transactionStarted = false;

      const payload = {
        id: match.id,
        lostPostId: match.lostPostId,
        foundPostId: match.foundPostId,
        matchScore: Number(match.matchScore),
        status: nextStatus,
        lostTitle: match.lostTitle,
        foundTitle: match.foundTitle,
        lostOwnerId: match.lostOwnerId,
        lostOwnerName: match.lostOwnerName,
        lostOwnerEmail: match.lostOwnerEmail,
        foundFinderId: match.foundFinderId,
        foundFinderName: match.foundFinderName,
        foundFinderEmail: match.foundFinderEmail,
      };

      res.json(payload);

      if (nextStatus === "confirmed") {
        dispatchEmailNotification(notifyMatchConfirmed(pool, { match: payload }), `match-confirmed:${id}`);
        dispatchEmailNotification(
          notifyTeachersOfReturnNeeded(pool, {
            source: "ຢືນຢັນລາຍການໃກ້ຄຽງແລ້ວ",
            title: payload.foundTitle || payload.lostTitle,
            detail: `${payload.lostOwnerName || "ເຈົ້າຂອງ"} · ລໍຖ້າບັນທຶກຄືນຂອງ`,
            href: payload.foundPostId ? `#approval?found=${payload.foundPostId}` : "#approval",
            entityType: "match",
            entityId: payload.id,
          }),
          `return-needed-match:${id}`,
        );
      } else if (nextStatus === "rejected") {
        dispatchEmailNotification(notifyMatchRejected(pool, { match: payload }), `match-rejected:${id}`);
      }
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  app.post("/api/matches/:id/return", async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
      const id = parsePositiveId(req.params.id);
      const returnedBy = await requireTeacher(connection, req.body.returnedByMemberId);
      const receivedBy = parsePositiveId(req.body.receivedByMemberId);
      let evidence = null;
      const returnLocationId = req.body.returnLocationName
        ? await resolveLocationId(connection, req.body.returnLocationName)
        : null;

      const [matchRows] = await connection.execute(
        `
          SELECT
            m.lost_post_id,
            m.found_post_id,
            lp.owner_id AS owner_id,
            lp.status AS lost_status,
            lp.title AS lost_title,
            fp.status AS found_status,
            fp.title AS found_title,
            owner.student_code AS studentCode,
            owner.phone,
            owner.email AS ownerEmail,
            CONCAT(owner.first_name, ' ', owner.last_name) AS receiverName,
            d.name_th AS departmentName
          FROM matches m
          INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
          INNER JOIN found_posts fp ON fp.id = m.found_post_id
          INNER JOIN members owner ON owner.id = lp.owner_id
          LEFT JOIN departments d ON d.id = owner.department_id
          WHERE m.id = ?
          LIMIT 1
        `,
        [id],
      );
      if (!matchRows.length) throw createHttpError("ບໍ່ພົບລາຍການໃກ້ຄຽງ", 404);

      const match = matchRows[0];
      if (match.found_status === "returned" || ["closed", "resolved", "deleted"].includes(match.lost_status)) {
        throw createHttpError("this item has already been returned", 409);
      }
      if (Number(receivedBy) !== Number(match.owner_id)) {
        throw createHttpError("receivedByMemberId must be the lost post owner", 400);
      }

      evidence = normalizeReturnEvidence({
        receiverDepartment: match.departmentName,
        receiverName: match.receiverName,
        receiverPhone: match.phone,
        receiverStudentCode: match.studentCode,
        ...req.body,
      });

      await ensureReturnRecordSecurityColumns(connection);
      await connection.beginTransaction();

      const [claimResult] = await connection.execute(
        `
          INSERT INTO claim_requests (
            found_post_id,
            claimant_id,
            lost_post_id,
            claim_message,
            status,
            verified_by,
            verified_at
          ) VALUES (?, ?, ?, ?, 'returned', ?, NOW())
        `,
        [
          match.found_post_id,
          receivedBy,
          match.lost_post_id,
          req.body.claimMessage ?? "ຄືນຂອງຜ່ານລາຍການໃກ້ຄຽງ",
          returnedBy,
        ],
      );

      await connection.execute(
        `
          INSERT INTO return_records (
            claim_request_id,
            found_post_id,
            returned_by,
            received_by,
            return_location_id,
            proof_image_url,
            receiver_type,
            receiver_photo_url,
            receiver_name_snapshot,
            receiver_student_code_snapshot,
            receiver_department_snapshot,
            receiver_phone_snapshot,
            identity_verified,
            representative_name,
            representative_phone,
            representative_relation,
            authorization_note,
            authorization_image_url,
            note,
            returned_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          claimResult.insertId,
          match.found_post_id,
          returnedBy,
          receivedBy,
          returnLocationId,
          evidence.proofImageUrl,
          evidence.receiverType,
          evidence.receiverPhotoUrl,
          match.receiverName,
          match.studentCode,
          match.departmentName,
          match.phone,
          evidence.identityVerified,
          evidence.representativeName,
          evidence.representativePhone,
          evidence.representativeRelation,
          evidence.authorizationNote,
          evidence.authorizationImageUrl,
          req.body.note ?? "ຄືນຂອງທີ່ຫ້ອງຄຸ້ມຄອງ",
        ],
      );

      await connection.execute(`UPDATE found_posts SET status = 'returned' WHERE id = ?`, [
        match.found_post_id,
      ]);
      await connection.execute(`UPDATE lost_posts SET status = 'closed' WHERE id = ?`, [
        match.lost_post_id,
      ]);
      await connection.execute(
        `DELETE FROM matches WHERE found_post_id = ? OR lost_post_id = ?`,
        [match.found_post_id, match.lost_post_id],
      );

      await connection.commit();

      res.status(201).json({
        id: claimResult.insertId,
        claimRequestId: `CR-${id}`,
        foundPostId: match.found_post_id,
        returnedBy,
        receivedBy,
        returnLocation: req.body.returnLocationName ?? "ຫ້ອງຄຸ້ມຄອງ",
        receiverType: evidence.receiverType,
        receiverPhotoUrl: evidence.receiverPhotoUrl,
        receiverName: match.receiverName,
        receiverStudentCode: match.studentCode,
        receiverDepartment: match.departmentName,
        receiverPhone: match.phone,
        identityVerified: true,
        representativeName: evidence.representativeName,
        representativePhone: evidence.representativePhone,
        representativeRelation: evidence.representativeRelation,
        authorizationNote: evidence.authorizationNote,
        authorizationImageUrl: evidence.authorizationImageUrl,
        returnedAt: new Date().toISOString(),
      });

      dispatchEmailNotification(
        notifyClaimantOfReturn(pool, {
          claim: {
            id: claimResult.insertId,
            claimantId: receivedBy,
            claimantEmail: match.ownerEmail,
            claimantName: match.receiverName,
            foundPostId: match.found_post_id,
            foundTitle: match.found_title,
          },
          foundTitle: match.found_title || match.lost_title,
        }),
        `match-return:${id}`,
      );
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  app.get("/api/return-records", async (_req, res, next) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          rr.id,
          rr.claim_request_id AS claimRequestId,
          rr.found_post_id AS foundPostId,
          cr.lost_post_id AS lostPostId,
          returned.username AS returnedBy,
          COALESCE(received.username, rr.receiver_name_snapshot) AS receivedBy,
          CONCAT(
            l.name_th,
            IF(l.floor IS NOT NULL AND l.floor <> '', CONCAT(' ຊັ້ນ ', l.floor), '')
          ) AS returnLocation,
          rr.returned_at AS returnedAt
        FROM return_records rr
        LEFT JOIN claim_requests cr ON cr.id = rr.claim_request_id
        INNER JOIN members returned ON returned.id = rr.returned_by
        LEFT JOIN members received ON received.id = rr.received_by
        LEFT JOIN locations l ON l.id = rr.return_location_id
        ORDER BY rr.returned_at DESC
      `);

      res.json(
        rows.map((row) => ({
          ...row,
          claimRequestId: `CR-${row.claimRequestId}`,
        })),
      );
    } catch (error) {
      next(error);
    }
  });
}

import { resolveCategoryId, resolveLocationId } from "../services/lookups.js";
import {
  notifyAuthorOfSubmissionPending,
  notifyClaimantOfDecision,
  notifyClaimantOfReturn,
  notifyLostOwnerItemFound,
  notifyLostOwnersOfFoundMatches,
  notifyTeachersOfClaimRequest,
  notifyPostAuthorOfDecision,
  notifyTeachersOfPostSubmission,
  notifyTeachersOfReturnNeeded,
} from "../services/post-notification-service.js";
import {
  ensureReturnRecordSecurityColumns,
  normalizeReturnEvidence,
} from "../services/return-record-security.js";
import { calculateMatchScore, findCandidateMatches } from "../services/weightedScoreMatching.js";
import { parsePositiveId, requireFields } from "../utils/shared.js";

const MAX_POST_IMAGES = 3;
const MATCH_THRESHOLD = 70;
const MATCH_DATE_WINDOW_DAYS = 7;
const APPROVAL_RESET_FOUND_STATUSES = new Set(["awaiting_handover", "pending_approval", "rejected"]);
const ACTIVE_FOUND_MATCH_STATUSES = new Set(["approved", "matched"]);
const ACTIVE_LOST_MATCH_STATUSES = new Set(["pending_approval", "published", "matched"]);
const CLOSED_LOST_STATUSES = new Set(["closed", "resolved", "deleted"]);
const OWNER_EDITABLE_FOUND_STATUSES = new Set(["awaiting_handover", "pending_approval", "rejected"]);
const OWNER_EDITABLE_LOST_STATUSES = new Set(["pending_approval", "rejected"]);
const REMOTE_IMAGE_URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;
const LOCAL_UPLOAD_URL_PATTERN = /^\/api\/uploads\/images\/[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/;

const FOUND_SELECT = `
  SELECT
    fp.id,
    fp.finder_id AS finderId,
    fp.category_id AS categoryId,
    fp.found_location_id AS foundLocationId,
    c.name_th AS categoryName,
    CONCAT(
      l.name_th,
      IF(l.floor IS NOT NULL AND l.floor <> '', CONCAT(' ຊັ້ນ ', l.floor), '')
    ) AS locationName,
    fp.title,
    fp.description,
    fp.color,
    fp.brand,
    fp.unique_mark AS uniqueMark,
    fp.found_at AS foundAt,
    fp.status,
    fp.approved_by AS approvedById,
    approver.username AS approvedBy,
    fp.approved_at AS approvedAt,
    fp.reject_reason AS rejectReason,
    fp.created_at AS createdAt,
    fp.updated_at AS updatedAt,
    CONCAT(finder.first_name, ' ', finder.last_name) AS finderName,
    COALESCE(fp.description, finder.email) AS finderContact,
    COALESCE(finder.phone, finder.email) AS finderEmail,
    (
      SELECT ii.image_url
      FROM item_images ii
      WHERE ii.found_post_id = fp.id
      ORDER BY ii.sort_order ASC, ii.id ASC
      LIMIT 1
    ) AS imageUrl
  FROM found_posts fp
  INNER JOIN item_categories c ON c.id = fp.category_id
  LEFT JOIN locations l ON l.id = fp.found_location_id
  INNER JOIN members finder ON finder.id = fp.finder_id
  LEFT JOIN members approver ON approver.id = fp.approved_by
`;

const LOST_SELECT = `
  SELECT
    lp.id,
    lp.owner_id AS ownerId,
    lp.category_id AS categoryId,
    lp.lost_location_id AS lostLocationId,
    c.name_th AS categoryName,
    CONCAT(
      l.name_th,
      IF(l.floor IS NOT NULL AND l.floor <> '', CONCAT(' ຊັ້ນ ', l.floor), '')
    ) AS locationName,
    lp.title,
    lp.description,
    lp.color,
    lp.brand,
    lp.unique_mark AS uniqueMark,
    lp.lost_at AS lostAt,
    lp.contact_name AS contactName,
    lp.contact_channel AS contactChannel,
    lp.status,
    lp.reject_reason AS rejectReason,
    lp.created_at AS createdAt,
    lp.updated_at AS updatedAt,
    CONCAT(owner.first_name, ' ', owner.last_name) AS ownerName,
    COALESCE(lp.contact_channel, owner.email) AS ownerContact,
    (
      SELECT ii.image_url
      FROM item_images ii
      WHERE ii.lost_post_id = lp.id
      ORDER BY ii.sort_order ASC, ii.id ASC
      LIMIT 1
    ) AS imageUrl
  FROM lost_posts lp
  INNER JOIN item_categories c ON c.id = lp.category_id
  LEFT JOIN locations l ON l.id = lp.lost_location_id
  INNER JOIN members owner ON owner.id = lp.owner_id
`;

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

function normalizePostImageUrls(imageUrls, { required = true } = {}) {
  const urls = Array.isArray(imageUrls)
    ? imageUrls.map((url) => String(url ?? "").trim()).filter(Boolean)
    : [];

  if (required && urls.length < 1) {
    throw createHttpError("ກະລຸນາອັບໂຫຼດຮູບຢ່າງໜ້ອຍ 1 ຮູບ");
  }

  if (urls.length > MAX_POST_IMAGES) {
    throw createHttpError("ອັບໂຫຼດຮູບໄດ້ສູງສຸດ 3 ຮູບ");
  }

  for (const url of urls) {
    if (url.startsWith("data:image/")) {
      throw createHttpError("ກະລຸນາອັບໂຫຼດເປັນໄຟລ໌ຮູບ ບໍ່ເກັບ Base64 ໃນຖານຂໍ້ມູນ");
    }

    if (url.includes("..") || (!LOCAL_UPLOAD_URL_PATTERN.test(url) && !REMOTE_IMAGE_URL_PATTERN.test(url))) {
      throw createHttpError("ຮູບຕ້ອງມາຈາກການອັບໂຫຼດໃນລະບົບ ຫຼື URL ຮູບພາບທີ່ຖືກຕ້ອງ");
    }

    if (url.length > 2048) {
      throw createHttpError("ທີ່ຢູ່ຮູບຍາວເກີນໄປ (ສູງສຸດ 2048 ຕົວອັກສອນ)");
    }
  }

  return urls;
}

function booleanFlag(value) {
  return value === true || value === 1 || ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function requireRejectReason(body) {
  const reason = String(body.reason ?? "").trim();
  if (!reason) {
    throw createHttpError("ກະລຸນາລະບຸເຫດຜົນກ່ອນປະຕິເສດປະກາດ");
  }
  if (reason.length > 1000) {
    throw createHttpError("ເຫດຜົນການປະຕິເສດຍາວເກີນໄປ");
  }
  return reason;
}

async function requireTeacherApprover(db, memberId) {
  const id = parsePositiveId(memberId);
  const [rows] = await db.execute(
    `SELECT id FROM members WHERE id = ? AND role = 'teacher' AND is_active = 1 LIMIT 1`,
    [id],
  );

  if (!rows.length) {
    throw createHttpError("approval requires an active teacher account", 403);
  }

  return id;
}

async function requireStudentClaimant(db, memberId) {
  const id = parsePositiveId(memberId);
  const [rows] = await db.execute(
    `
      SELECT id, username, first_name, last_name, email
      FROM members
      WHERE id = ? AND role = 'student' AND is_active = 1
      LIMIT 1
    `,
    [id],
  );

  if (!rows.length) {
    throw createHttpError("ຕ້ອງເຂົ້າລະບົບເປັນນັກສຶກສາກ່ອນຂໍຮັບສິ່ງຂອງ", 403);
  }

  return rows[0];
}

async function claimRequestDetail(db, claimRequestId) {
  const [rows] = await db.execute(
    `
      SELECT
        cr.id,
        cr.found_post_id AS foundPostId,
        cr.claimant_id AS claimantId,
        cr.lost_post_id AS lostPostId,
        cr.claim_message AS claimMessage,
        cr.status,
        cr.created_at AS createdAt,
        fp.title AS foundTitle,
        CONCAT(
          l.name_th,
          IF(l.floor IS NOT NULL AND l.floor <> '', CONCAT(' ຊັ້ນ ', l.floor), '')
        ) AS locationName,
        CONCAT(claimant.first_name, ' ', claimant.last_name) AS claimantName,
        claimant.username AS claimantUsername,
        claimant.email AS claimantEmail
      FROM claim_requests cr
      INNER JOIN found_posts fp ON fp.id = cr.found_post_id
      LEFT JOIN locations l ON l.id = fp.found_location_id
      INNER JOIN members claimant ON claimant.id = cr.claimant_id
      WHERE cr.id = ?
      LIMIT 1
    `,
    [claimRequestId],
  );

  return rows[0] ?? null;
}

async function foundAccessRow(db, id) {
  const [rows] = await db.execute(
    `SELECT id, finder_id AS finderId, status FROM found_posts WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id],
  );
  if (!rows.length) throw createHttpError("found post was not found", 404);
  return rows[0];
}

async function lostAccessRow(db, id) {
  const [rows] = await db.execute(
    `SELECT id, owner_id AS ownerId, status FROM lost_posts WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id],
  );
  if (!rows.length) throw createHttpError("lost post was not found", 404);
  return rows[0];
}

async function activeActor(db, actorId) {
  const id = parsePositiveId(actorId);
  const [rows] = await db.execute(
    `SELECT id, role FROM members WHERE id = ? AND is_active = 1 LIMIT 1`,
    [id],
  );

  if (!rows.length) {
    throw createHttpError("active member account is required", 403);
  }

  return rows[0];
}

function assertFoundEditAllowed(post, actor) {
  if (!OWNER_EDITABLE_FOUND_STATUSES.has(post.status)) {
    throw createHttpError("approved found posts cannot be edited", 409);
  }

  if (actor.role !== "teacher" && Number(post.finderId) !== Number(actor.id)) {
    throw createHttpError("you can only edit your own found posts", 403);
  }
}

function assertLostEditAllowed(post, actor) {
  if (!OWNER_EDITABLE_LOST_STATUSES.has(post.status)) {
    throw createHttpError("approved lost posts cannot be edited", 409);
  }

  if (actor.role !== "teacher" && Number(post.ownerId) !== Number(actor.id)) {
    throw createHttpError("you can only edit your own lost posts", 403);
  }
}

function assertFoundDeleteAllowed(post, actor) {
  if (actor.role === "teacher") return;

  if (Number(post.finderId) !== Number(actor.id)) {
    throw createHttpError("you can only delete your own found posts", 403);
  }

  if (!OWNER_EDITABLE_FOUND_STATUSES.has(post.status)) {
    throw createHttpError("approved found posts cannot be deleted by the reporter", 409);
  }
}

function assertLostDeleteAllowed(post, actor) {
  if (actor.role === "teacher") return;

  if (Number(post.ownerId) !== Number(actor.id)) {
    throw createHttpError("you can only delete your own lost posts", 403);
  }

  if (!OWNER_EDITABLE_LOST_STATUSES.has(post.status)) {
    throw createHttpError("approved lost posts cannot be deleted by the reporter", 409);
  }
}

function foundStatusAfterServerEdit(currentStatus) {
  return APPROVAL_RESET_FOUND_STATUSES.has(currentStatus) ? "pending_approval" : currentStatus;
}

function lostStatusAfterServerEdit(currentStatus) {
  return CLOSED_LOST_STATUSES.has(currentStatus) ? currentStatus : "pending_approval";
}

async function replaceItemImages(db, { ownerType, postId, imageUrls }) {
  const isLostPost = ownerType === "lost_post";
  const ownerColumn = isLostPost ? "lost_post_id" : "found_post_id";

  await db.execute(`DELETE FROM item_images WHERE ${ownerColumn} = ?`, [postId]);

  for (const [index, imageUrl] of imageUrls.entries()) {
    await db.execute(
      `
        INSERT INTO item_images (
          owner_type,
          lost_post_id,
          found_post_id,
          image_url,
          alt_text,
          sort_order
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        ownerType,
        isLostPost ? postId : null,
        isLostPost ? null : postId,
        imageUrl,
        `post-image-${index + 1}`,
        index,
      ],
    );
  }
}

export function registerPostsRoutes(app, pool) {
  app.get("/api/found-posts", async (_req, res, next) => {
    try {
      const [rows] = await pool.query(`
        ${FOUND_SELECT}
        WHERE fp.deleted_at IS NULL
        ORDER BY fp.created_at DESC
      `);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/found-posts", async (req, res, next) => {
    try {
      requireFields(req.body, ["finderId", "title", "description", "categoryName"]);
      const imageUrls = normalizePostImageUrls(req.body.imageUrls);

      const categoryId = await resolveCategoryId(pool, req.body.categoryName);
      const foundLocationId = await resolveLocationId(pool, req.body.locationName);
      const status = "pending_approval";

      const [result] = await pool.execute(
        `
          INSERT INTO found_posts (
            finder_id,
            category_id,
            found_location_id,
            title,
            description,
            color,
            brand,
            unique_mark,
            found_at,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          req.body.finderId,
          categoryId,
          foundLocationId,
          req.body.title,
          req.body.description,
          req.body.color ?? null,
          req.body.brand ?? null,
          req.body.uniqueMark ?? null,
          req.body.foundAt ?? null,
          status,
        ],
      );

      await replaceItemImages(pool, {
        ownerType: "found_post",
        postId: result.insertId,
        imageUrls,
      });

      const [rows] = await pool.execute(`${FOUND_SELECT} WHERE fp.id = ? LIMIT 1`, [result.insertId]);
      const post = rows[0];
      res.status(201).json(post);
      dispatchEmailNotification(
        notifyTeachersOfPostSubmission(pool, { postType: "found", post }),
        `found-post-submitted:${post.id}`,
      );
      dispatchEmailNotification(
        notifyAuthorOfSubmissionPending(pool, { postType: "found", post }),
        `found-post-pending:${post.id}`,
      );
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/found-posts/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await foundAccessRow(pool, id);
      const actor = await activeActor(pool, req.body.actorId);
      assertFoundEditAllowed(currentPost, actor);

      const categoryId = req.body.categoryName
        ? await resolveCategoryId(pool, req.body.categoryName)
        : undefined;
      const foundLocationId =
        req.body.locationName !== undefined
          ? await resolveLocationId(pool, req.body.locationName)
          : undefined;
      const imageUrls =
        req.body.imageUrls !== undefined
          ? normalizePostImageUrls(req.body.imageUrls)
          : undefined;
      const nextStatus = foundStatusAfterServerEdit(currentPost.status);

      await pool.execute(
        `
          UPDATE found_posts
          SET
            category_id = COALESCE(?, category_id),
            found_location_id = COALESCE(?, found_location_id),
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            color = COALESCE(?, color),
            brand = COALESCE(?, brand),
            unique_mark = COALESCE(?, unique_mark),
            found_at = COALESCE(?, found_at),
            status = COALESCE(?, status),
            reject_reason = CASE WHEN ? = 'pending_approval' THEN NULL ELSE reject_reason END
          WHERE id = ? AND deleted_at IS NULL
        `,
        [
          categoryId ?? null,
          foundLocationId,
          req.body.title ?? null,
          req.body.description ?? null,
          req.body.color ?? null,
          req.body.brand ?? null,
          req.body.uniqueMark ?? null,
          req.body.foundAt ?? null,
          nextStatus,
          nextStatus,
          id,
        ],
      );

      if (imageUrls) {
        await replaceItemImages(pool, {
          ownerType: "found_post",
          postId: id,
          imageUrls,
        });
      }

      const [rows] = await pool.execute(`${FOUND_SELECT} WHERE fp.id = ? LIMIT 1`, [id]);
      if (!rows.length) return res.status(404).json({ error: "ບໍ່ພົບຂໍ້ມູນຂອງທີ່ພົບ" });
      return res.json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/found-posts/:id/move-to-approval", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await foundAccessRow(pool, id);
      await pool.execute(
        `UPDATE found_posts SET status = 'pending_approval', reject_reason = NULL WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      const [rows] = await pool.execute(`${FOUND_SELECT} WHERE fp.id = ? LIMIT 1`, [id]);
      const post = rows[0];
      res.json(post);
      if (currentPost.status !== "pending_approval") {
        dispatchEmailNotification(
          notifyTeachersOfPostSubmission(pool, { postType: "found", post }),
          `found-post-ready-for-approval:${post.id}`,
        );
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/found-posts/:id/claim", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await foundAccessRow(pool, id);
      const claimant = await requireStudentClaimant(pool, req.body.claimantMemberId ?? req.body.claimantId);

      if (!["approved", "matched"].includes(currentPost.status)) {
        throw createHttpError("ສາມາດຂໍຮັບໄດ້ສະເພາະລາຍການທີ່ປະກາດແລ້ວ", 409);
      }

      if (Number(currentPost.finderId) === Number(claimant.id)) {
        throw createHttpError("ຜູ້ແຈ້ງພົບບໍ່ສາມາດຂໍຮັບລາຍການຂອງຕົນເອງ", 409);
      }

      const [existingRows] = await pool.execute(
        `
          SELECT id
          FROM claim_requests
          WHERE found_post_id = ?
            AND claimant_id = ?
            AND status IN ('submitted', 'under_review', 'approved')
          LIMIT 1
        `,
        [id, claimant.id],
      );

      if (existingRows.length) {
        throw createHttpError("ທ່ານໄດ້ສົ່ງຄຳຂໍຮັບລາຍການນີ້ແລ້ວ", 409);
      }

      let lostPostId = req.body.lostPostId ? parsePositiveId(req.body.lostPostId) : null;

      if (lostPostId) {
        const [lostRows] = await pool.execute(
          `
            SELECT id
            FROM lost_posts
            WHERE id = ?
              AND owner_id = ?
              AND deleted_at IS NULL
              AND status NOT IN ('closed', 'resolved', 'deleted')
            LIMIT 1
          `,
          [lostPostId, claimant.id],
        );

        if (!lostRows.length) {
          throw createHttpError("ລາຍການຂອງສູນຫາຍທີ່ເລືອກບໍ່ຖືກຕ້ອງ", 400);
        }
      } else {
        const [matchedLostRows] = await pool.execute(
          `
            SELECT lp.id
            FROM matches m
            INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
            WHERE m.found_post_id = ?
              AND lp.owner_id = ?
              AND lp.deleted_at IS NULL
              AND lp.status NOT IN ('closed', 'resolved', 'deleted')
            ORDER BY m.match_score DESC, m.created_at DESC
            LIMIT 1
          `,
          [id, claimant.id],
        );
        lostPostId = matchedLostRows[0]?.id ?? null;
      }

      const claimMessage =
        String(req.body.claimMessage ?? "").trim() ||
        "ນັກສຶກສາກົດຂໍຮັບສິ່ງຂອງ ແລະ ຈະໄປຢືນຢັນຕົວຕົນທີ່ຫ້ອງຄຸ້ມຄອງ";

      if (claimMessage.length > 1000) {
        throw createHttpError("ຂໍ້ຄວາມຂໍຮັບຍາວເກີນໄປ", 400);
      }

      const [result] = await pool.execute(
        `
          INSERT INTO claim_requests (
            found_post_id,
            claimant_id,
            lost_post_id,
            claim_message,
            status
          ) VALUES (?, ?, ?, ?, 'submitted')
        `,
        [id, claimant.id, lostPostId, claimMessage],
      );

      const claim = await claimRequestDetail(pool, result.insertId);
      res.status(201).json(claim);

      dispatchEmailNotification(
        notifyTeachersOfClaimRequest(pool, { claim }),
        `claim-request-submitted:${claim.id}`,
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/found-posts/:id/approve", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await foundAccessRow(pool, id);
      const approvedBy = await requireTeacherApprover(pool, req.body.approvedByMemberId);

      await pool.execute(
        `
          UPDATE found_posts
          SET status = 'approved', approved_by = ?, approved_at = NOW()
          WHERE id = ? AND deleted_at IS NULL
        `,
        [approvedBy, id],
      );

      const matches = await rebuildMatchesForFound(pool, id);

      const [rows] = await pool.execute(`${FOUND_SELECT} WHERE fp.id = ? LIMIT 1`, [id]);
      const post = rows[0];
      res.json(post);
      if (currentPost.status !== "approved") {
        dispatchEmailNotification(
          notifyPostAuthorOfDecision(pool, { postType: "found", postId: id, decision: "approved" }),
          `found-post-approved:${id}`,
        );
        dispatchEmailNotification(
          notifyLostOwnersOfFoundMatches(pool, { matches }),
          `found-post-matches:${id}`,
        );
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/found-posts/:id/reject", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await foundAccessRow(pool, id);
      await requireTeacherApprover(pool, req.body.rejectedByMemberId);
      const rejectReason = requireRejectReason(req.body);
      await pool.execute(
        `UPDATE found_posts SET status = 'rejected', reject_reason = ? WHERE id = ? AND deleted_at IS NULL`,
        [rejectReason, id],
      );
      const [rows] = await pool.execute(`${FOUND_SELECT} WHERE fp.id = ? LIMIT 1`, [id]);
      const post = rows[0];
      res.json(post);
      if (currentPost.status !== "rejected") {
        dispatchEmailNotification(
          notifyPostAuthorOfDecision(pool, {
            postType: "found",
            postId: id,
            decision: "rejected",
            reason: rejectReason,
          }),
          `found-post-rejected:${id}`,
        );
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/found-posts/:id/return", async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
      const id = parsePositiveId(req.params.id);
      const returnedBy = await requireTeacherApprover(connection, req.body.returnedByMemberId);
      const receivedBy = req.body.receivedByMemberId ? parsePositiveId(req.body.receivedByMemberId) : null;
      const evidence = normalizeReturnEvidence(req.body);
      const currentPost = await foundAccessRow(connection, id);

      if (currentPost.status === "returned") {
        throw createHttpError("ລາຍການນີ້ບັນທຶກການຄືນຂອງໄປແລ້ວ", 409);
      }

      if (!["approved", "matched"].includes(currentPost.status)) {
        throw createHttpError(
          `ສາມາດບັນທຶກການຄືນໄດ້ສະເພາະລາຍການທີ່ອະນຸມັດແລ້ວ (ສະຖານະປັດຈຸບັນ: ${currentPost.status})`,
          409,
        );
      }

      let receiver = null;

      if (receivedBy) {
        const [receiverRows] = await connection.execute(
        `
          SELECT
            m.id,
            m.username,
            m.student_code AS studentCode,
            m.phone,
            CONCAT(m.first_name, ' ', m.last_name) AS receiverName,
            d.name_th AS departmentName
          FROM members m
          LEFT JOIN departments d ON d.id = m.department_id
          WHERE m.id = ?
            AND m.role = 'student'
            AND m.is_active = 1
          LIMIT 1
        `,
        [receivedBy],
      );
      if (!receiverRows.length) {
        throw createHttpError("ກະລຸນາເລືອກນັກສຶກສາຜູ້ຮັບຄືນທີ່ຍັງເປີດໃຊ້ງານ", 400);
      }

        receiver = receiverRows[0];
      }

      const [lostRows] = await connection.execute(
        `
          SELECT lp.id
          FROM matches m
          INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
          WHERE m.found_post_id = ?
            AND lp.owner_id = ?
            AND lp.deleted_at IS NULL
            AND lp.status NOT IN ('closed', 'resolved', 'deleted')
          ORDER BY m.match_score DESC, m.created_at DESC
          LIMIT 1
        `,
        [id, receivedBy],
      );
      const lostPostId = lostRows[0]?.id ?? null;
      const receiverSnapshot = {
        name: evidence.receiverName || receiver?.receiverName || null,
        studentCode: evidence.receiverStudentCode || receiver?.studentCode || null,
        department: evidence.receiverDepartment || receiver?.departmentName || null,
        phone: evidence.receiverPhone || receiver?.phone || null,
      };
      const note = String(req.body.note || "").trim() || "ຄືນສິ່ງຂອງທີ່ຫ້ອງຄຸ້ມຄອງ";

      await ensureReturnRecordSecurityColumns(connection);
      await connection.beginTransaction();

      const [existingClaimRows] = await connection.execute(
        `
          SELECT id
          FROM claim_requests
          WHERE found_post_id = ?
            AND claimant_id = ?
            AND status IN ('submitted', 'under_review', 'approved')
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [id, receivedBy],
      );
      let claimRequestId = existingClaimRows[0]?.id ?? null;

      if (claimRequestId) {
        await connection.execute(
          `
            UPDATE claim_requests
            SET
              lost_post_id = COALESCE(?, lost_post_id),
              claim_message = ?,
              status = 'returned',
              verified_by = ?,
              verified_at = NOW()
            WHERE id = ?
          `,
          [lostPostId, "ຢືນຢັນຮັບສິ່ງຂອງຄືນທີ່ຫ້ອງຄຸ້ມຄອງ", returnedBy, claimRequestId],
        );
      } else if (receivedBy) {
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
          [id, receivedBy, lostPostId, "ຢືນຢັນຮັບສິ່ງຂອງຄືນທີ່ຫ້ອງຄຸ້ມຄອງ", returnedBy],
        );
        claimRequestId = claimResult.insertId;
      }

      const [returnResult] = await connection.execute(
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
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          claimRequestId,
          id,
          returnedBy,
          receivedBy,
          evidence.proofImageUrl,
          evidence.receiverType,
          evidence.receiverPhotoUrl,
          receiverSnapshot.name,
          receiverSnapshot.studentCode,
          receiverSnapshot.department,
          receiverSnapshot.phone,
          evidence.identityVerified,
          evidence.representativeName,
          evidence.representativePhone,
          evidence.representativeRelation,
          evidence.authorizationNote,
          evidence.authorizationImageUrl,
          note,
        ],
      );

      await connection.execute(`UPDATE found_posts SET status = 'returned' WHERE id = ?`, [id]);
      if (lostPostId) {
        await connection.execute(`UPDATE lost_posts SET status = 'closed' WHERE id = ?`, [lostPostId]);
      }
      await connection.execute(
        `DELETE FROM matches WHERE found_post_id = ? OR lost_post_id = ?`,
        [id, lostPostId],
      );

      await connection.commit();

      const [postRows] = await connection.execute(`${FOUND_SELECT} WHERE fp.id = ? LIMIT 1`, [id]);
      res.status(201).json({
        post: postRows[0],
        returnRecord: {
          id: returnResult.insertId,
          claimRequestId,
          foundPostId: id,
          returnedBy,
          receivedBy,
          lostPostId,
          returnLocation: "ຫ້ອງຄຸ້ມຄອງ",
          receiverType: evidence.receiverType,
          receiverPhotoUrl: evidence.receiverPhotoUrl,
          receiverName: receiverSnapshot.name,
          receiverStudentCode: receiverSnapshot.studentCode,
          receiverDepartment: receiverSnapshot.department,
          receiverPhone: receiverSnapshot.phone,
          identityVerified: true,
          representativeName: evidence.representativeName,
          representativePhone: evidence.representativePhone,
          representativeRelation: evidence.representativeRelation,
          authorizationNote: evidence.authorizationNote,
          authorizationImageUrl: evidence.authorizationImageUrl,
          returnedAt: new Date().toISOString(),
        },
      });

      if (claimRequestId) {
        const claim = await claimRequestDetail(pool, claimRequestId);
        if (claim) {
          dispatchEmailNotification(
            notifyClaimantOfReturn(pool, { claim, foundTitle: postRows[0]?.title || claim.foundTitle }),
            `claim-request-returned:${claim.id}`,
          );
        }
      }
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  app.delete("/api/found-posts/:id", async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await foundAccessRow(connection, id);
      const actor = await activeActor(connection, req.query.actorId);
      assertFoundDeleteAllowed(currentPost, actor);

      await connection.beginTransaction();
      await connection.execute("DELETE FROM matches WHERE found_post_id = ?", [id]);
      await connection.execute(
        `UPDATE found_posts SET status = 'archived', deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      await connection.commit();
      res.json({ id, message: "ລຶບຂໍ້ມູນຂອງທີ່ພົບແລ້ວ" });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  app.get("/api/lost-posts", async (_req, res, next) => {
    try {
      const [rows] = await pool.query(`
        ${LOST_SELECT}
        WHERE lp.deleted_at IS NULL
        ORDER BY lp.created_at DESC
      `);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lost-posts", async (req, res, next) => {
    try {
      requireFields(req.body, ["ownerId", "title", "description", "categoryName"]);
      const imageUrls = normalizePostImageUrls(req.body.imageUrls, { required: !booleanFlag(req.body.noImage) });

      const categoryId = await resolveCategoryId(pool, req.body.categoryName);
      const lostLocationId = await resolveLocationId(pool, req.body.locationName);

      const [result] = await pool.execute(
        `
          INSERT INTO lost_posts (
            owner_id,
            category_id,
            lost_location_id,
            title,
            description,
            color,
            brand,
            unique_mark,
            lost_at,
            contact_name,
            contact_channel,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          req.body.ownerId,
          categoryId,
          lostLocationId,
          req.body.title,
          req.body.description,
          req.body.color ?? null,
          req.body.brand ?? null,
          req.body.uniqueMark ?? null,
          req.body.lostAt ?? null,
          req.body.contactName ?? null,
          req.body.contactChannel ?? null,
          "pending_approval",
        ],
      );

      await replaceItemImages(pool, {
        ownerType: "lost_post",
        postId: result.insertId,
        imageUrls,
      });

      const matches = await findCandidateMatches(pool, result.insertId);
      const [rows] = await pool.execute(`${LOST_SELECT} WHERE lp.id = ? LIMIT 1`, [result.insertId]);
      const post = rows[0];

      res.status(201).json({ post, matchCount: matches.length });
      dispatchEmailNotification(
        notifyTeachersOfPostSubmission(pool, { postType: "lost", post }),
        `lost-post-submitted:${post.id}`,
      );
      dispatchEmailNotification(
        notifyAuthorOfSubmissionPending(pool, { postType: "lost", post }),
        `lost-post-pending:${post.id}`,
      );
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/lost-posts/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await lostAccessRow(pool, id);
      const actor = await activeActor(pool, req.body.actorId);
      assertLostEditAllowed(currentPost, actor);

      const categoryId = req.body.categoryName
        ? await resolveCategoryId(pool, req.body.categoryName)
        : undefined;
      const lostLocationId =
        req.body.locationName !== undefined
          ? await resolveLocationId(pool, req.body.locationName)
          : undefined;
      const imageUrls =
        req.body.imageUrls !== undefined
          ? normalizePostImageUrls(req.body.imageUrls, { required: !booleanFlag(req.body.noImage) })
          : undefined;
      const nextStatus = lostStatusAfterServerEdit(currentPost.status);

      await pool.execute(
        `
          UPDATE lost_posts
          SET
            category_id = COALESCE(?, category_id),
            lost_location_id = COALESCE(?, lost_location_id),
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            color = COALESCE(?, color),
            brand = COALESCE(?, brand),
            unique_mark = COALESCE(?, unique_mark),
            lost_at = COALESCE(?, lost_at),
            contact_name = COALESCE(?, contact_name),
            contact_channel = COALESCE(?, contact_channel),
            status = COALESCE(?, status),
            reject_reason = CASE WHEN ? = 'pending_approval' THEN NULL ELSE reject_reason END
          WHERE id = ? AND deleted_at IS NULL
        `,
        [
          categoryId ?? null,
          lostLocationId,
          req.body.title ?? null,
          req.body.description ?? null,
          req.body.color ?? null,
          req.body.brand ?? null,
          req.body.uniqueMark ?? null,
          req.body.lostAt ?? null,
          req.body.contactName ?? null,
          req.body.contactChannel ?? null,
          nextStatus,
          nextStatus,
          id,
        ],
      );

      if (imageUrls) {
        await replaceItemImages(pool, {
          ownerType: "lost_post",
          postId: id,
          imageUrls,
        });
      }

      await findCandidateMatches(pool, id);

      const [rows] = await pool.execute(`${LOST_SELECT} WHERE lp.id = ? LIMIT 1`, [id]);
      if (!rows.length) return res.status(404).json({ error: "ບໍ່ພົບຂໍ້ມູນຂອງສູນຫາຍ" });
      return res.json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/lost-posts/:id/approve", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await lostAccessRow(pool, id);
      await requireTeacherApprover(pool, req.body.approvedByMemberId);

      await pool.execute(
        `
          UPDATE lost_posts
          SET status = 'published'
          WHERE id = ? AND deleted_at IS NULL
        `,
        [id],
      );

      const matches = await findCandidateMatches(pool, id);
      const [rows] = await pool.execute(`${LOST_SELECT} WHERE lp.id = ? LIMIT 1`, [id]);
      const post = rows[0];
      res.json({ post, matchCount: matches.length });
      if (currentPost.status !== "published") {
        dispatchEmailNotification(
          notifyPostAuthorOfDecision(pool, { postType: "lost", postId: id, decision: "approved" }),
          `lost-post-approved:${id}`,
        );
        dispatchEmailNotification(
          notifyLostOwnersOfFoundMatches(pool, { matches }),
          `lost-post-matches:${id}`,
        );
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lost-posts/:id/mark-found", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await lostAccessRow(pool, id);
      await requireTeacherApprover(pool, req.body.markedByMemberId);

      if (!["published", "matched"].includes(currentPost.status)) {
        throw createHttpError("ສາມາດປ່ຽນເປັນພົບຂອງແລ້ວໄດ້ສະເພາະປະກາດທີ່ເຜີຍແຜ່ແລ້ວ", 409);
      }

      await pool.execute(
        `
          UPDATE lost_posts
          SET status = 'matched', updated_at = NOW()
          WHERE id = ? AND deleted_at IS NULL
        `,
        [id],
      );

      const matches = await findCandidateMatches(pool, id);
      const [rows] = await pool.execute(`${LOST_SELECT} WHERE lp.id = ? LIMIT 1`, [id]);
      const post = rows[0];
      res.json({ post, matchCount: matches.length });
      if (currentPost.status !== "matched") {
        dispatchEmailNotification(
          notifyLostOwnerItemFound(pool, { lostPostId: id, matchCount: matches.length }),
          `lost-post-marked-found:${id}`,
        );
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lost-posts/:id/reject", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await lostAccessRow(pool, id);
      await requireTeacherApprover(pool, req.body.rejectedByMemberId);
      const rejectReason = requireRejectReason(req.body);
      await pool.execute(
        `UPDATE lost_posts SET status = 'rejected', reject_reason = ? WHERE id = ? AND deleted_at IS NULL`,
        [rejectReason, id],
      );
      await pool.execute(`DELETE FROM matches WHERE lost_post_id = ?`, [id]);
      const [rows] = await pool.execute(`${LOST_SELECT} WHERE lp.id = ? LIMIT 1`, [id]);
      const post = rows[0];
      res.json(post);
      if (currentPost.status !== "rejected") {
        dispatchEmailNotification(
          notifyPostAuthorOfDecision(pool, {
            postType: "lost",
            postId: id,
            decision: "rejected",
            reason: rejectReason,
          }),
          `lost-post-rejected:${id}`,
        );
      }
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/lost-posts/:id", async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
      const id = parsePositiveId(req.params.id);
      const currentPost = await lostAccessRow(connection, id);
      const actor = await activeActor(connection, req.query.actorId);
      assertLostDeleteAllowed(currentPost, actor);

      await connection.beginTransaction();
      await connection.execute("DELETE FROM matches WHERE lost_post_id = ?", [id]);
      await connection.execute(
        `UPDATE lost_posts SET status = 'deleted', deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      await connection.commit();
      res.json({ id, message: "ລຶບຂໍ້ມູນຂອງສູນຫາຍແລ້ວ" });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  app.post("/api/claim-requests/:id/approve", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const verifiedBy = await requireTeacherApprover(pool, req.body.verifiedByMemberId ?? req.body.approvedByMemberId);
      const claim = await claimRequestDetail(pool, id);
      if (!claim) throw createHttpError("ບໍ່ພົບຄຳຂໍຮັບສິ່ງຂອງ", 404);
      if (!["submitted", "under_review"].includes(claim.status)) {
        throw createHttpError("ສາມາດອະນຸມັດໄດ້ສະເພາະຄຳຂໍທີ່ລໍຖ້າກວດສອບ", 409);
      }

      await pool.execute(
        `
          UPDATE claim_requests
          SET status = 'approved',
              verified_by = ?,
              verified_at = NOW(),
              reject_reason = NULL
          WHERE id = ?
        `,
        [verifiedBy, id],
      );

      const updated = await claimRequestDetail(pool, id);
      res.json(updated);
      dispatchEmailNotification(
        notifyClaimantOfDecision(pool, { claim: updated, decision: "approved" }),
        `claim-request-approved:${id}`,
      );
      dispatchEmailNotification(
        notifyTeachersOfReturnNeeded(pool, {
          source: "ຄຳຂໍຮັບຖືກອະນຸມັດ",
          title: updated.foundTitle,
          detail: `${updated.claimantName || "ນັກສຶກສາ"} · ຢືນຢັນຕົວຕົນແລ້ວ ລໍຖ້າບັນທຶກຄືນຂອງ`,
          href: updated.foundPostId ? `#approval?found=${updated.foundPostId}&claim=${updated.id}` : "#approval",
          entityType: "claim_request",
          entityId: updated.id,
        }),
        `return-needed-claim:${id}`,
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/claim-requests/:id/reject", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const verifiedBy = await requireTeacherApprover(pool, req.body.verifiedByMemberId ?? req.body.rejectedByMemberId);
      const rejectReason = requireRejectReason(req.body);
      const claim = await claimRequestDetail(pool, id);
      if (!claim) throw createHttpError("ບໍ່ພົບຄຳຂໍຮັບສິ່ງຂອງ", 404);
      if (!["submitted", "under_review", "approved"].includes(claim.status)) {
        throw createHttpError("ສາມາດປະຕິເສດໄດ້ສະເພາະຄຳຂໍທີ່ຍັງເປີດຢູ່", 409);
      }

      await pool.execute(
        `
          UPDATE claim_requests
          SET status = 'rejected',
              verified_by = ?,
              verified_at = NOW(),
              reject_reason = ?
          WHERE id = ?
        `,
        [verifiedBy, rejectReason, id],
      );

      const updated = await claimRequestDetail(pool, id);
      res.json(updated);
      dispatchEmailNotification(
        notifyClaimantOfDecision(pool, { claim: updated, decision: "rejected", reason: rejectReason }),
        `claim-request-rejected:${id}`,
      );
    } catch (error) {
      next(error);
    }
  });
}

async function rebuildMatchesForFound(pool, foundPostId) {
  const [foundRows] = await pool.execute(
    `SELECT * FROM found_posts WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [foundPostId],
  );
  const found = foundRows[0];

  await pool.execute(
    `DELETE FROM matches WHERE found_post_id = ? AND COALESCE(status, 'suggested') = 'suggested'`,
    [foundPostId],
  );

  if (!found || !ACTIVE_FOUND_MATCH_STATUSES.has(found.status)) return [];

  const [lostRows] = await pool.execute(
    `
      SELECT *
      FROM lost_posts
      WHERE status IN ('pending_approval', 'published', 'matched')
        AND deleted_at IS NULL
        AND category_id = ?
        AND (
          ? IS NULL
          OR lost_at IS NULL
          OR lost_at BETWEEN DATE_SUB(?, INTERVAL ? DAY)
                         AND DATE_ADD(?, INTERVAL ? DAY)
        )
      ORDER BY
        (lost_location_id = ?) DESC,
        (LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM(COALESCE(?, '')))) DESC,
        lost_at DESC
    `,
    [
      found.category_id,
      found.found_at,
      found.found_at,
      MATCH_DATE_WINDOW_DAYS,
      found.found_at,
      MATCH_DATE_WINDOW_DAYS,
      found.found_location_id,
      found.color,
    ],
  );

  const saved = [];

  for (const lost of lostRows) {
    if (!ACTIVE_LOST_MATCH_STATUSES.has(lost.status)) continue;

    const result = calculateMatchScore(lost, found);
    if (result.score < MATCH_THRESHOLD) continue;

    const [existingRows] = await pool.execute(
      `
        SELECT id, COALESCE(status, 'suggested') AS status, match_score
        FROM matches
        WHERE lost_post_id = ?
          AND found_post_id = ?
        LIMIT 1
      `,
      [lost.id, found.id],
    );

    if (existingRows.length) {
      if (existingRows[0].status !== "rejected") {
        saved.push({
          id: existingRows[0].id,
          matchId: existingRows[0].id,
          lostPostId: lost.id,
          foundPostId: found.id,
          matchScore: Number(existingRows[0].match_score),
          score: Number(existingRows[0].match_score),
          status: existingRows[0].status,
        });
      }
      continue;
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO matches (lost_post_id, found_post_id, match_score, status) VALUES (?, ?, ?, 'suggested')`,
      [lost.id, found.id, result.score],
    );
    saved.push({
      id: insertResult.insertId,
      matchId: insertResult.insertId,
      lostPostId: lost.id,
      foundPostId: found.id,
      matchScore: result.score,
      score: result.score,
      status: "suggested",
    });
  }

  return saved;
}

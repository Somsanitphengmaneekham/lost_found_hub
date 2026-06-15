import { resolveLocationId } from "../services/lookups.js";
import { calculateMatchScore } from "../services/weightedScoreMatching.js";
import { parsePositiveId } from "../utils/shared.js";

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

export function registerMatchesRoutes(app, pool) {
  app.get("/api/matches", async (_req, res, next) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          m.id,
          m.lost_post_id AS lostPostId,
          m.found_post_id AS foundPostId,
          m.match_score AS matchScore,
          m.status,
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
        ORDER BY m.match_score DESC, m.created_at DESC
      `);

      res.json(
        rows.map((row) => {
          const lost = {
            category_id: row.lostCategoryId,
            lost_location_id: row.lostLocationId,
            lost_at: row.lostAt,
            color: row.lostColor,
            brand: row.lostBrand,
            unique_mark: row.lostUniqueMark,
            description: row.lostDescription,
          };
          const found = {
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
            status: row.status,
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

    try {
      const id = parsePositiveId(req.params.id);
      const status = req.body.status;

      if (!["suggested", "confirmed", "rejected"].includes(status)) {
        return res.status(400).json({ error: "ສະຖານະ match ບໍ່ຖືກຕ້ອງ" });
      }

      const [matchRows] = await connection.execute(
        `SELECT lost_post_id, found_post_id FROM matches WHERE id = ? LIMIT 1`,
        [id],
      );
      if (!matchRows.length) return res.status(404).json({ error: "ບໍ່ພົບ match" });

      const match = matchRows[0];
      await connection.beginTransaction();
      await connection.execute(`UPDATE matches SET status = ? WHERE id = ?`, [status, id]);

      if (status === "confirmed") {
        await connection.execute(`UPDATE found_posts SET status = 'matched' WHERE id = ?`, [
          match.found_post_id,
        ]);
        await connection.execute(`UPDATE lost_posts SET status = 'matched' WHERE id = ?`, [
          match.lost_post_id,
        ]);
      }

      await connection.commit();
      res.json({ id, status });
    } catch (error) {
      await connection.rollback();
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
      const returnLocationId = req.body.returnLocationName
        ? await resolveLocationId(connection, req.body.returnLocationName)
        : null;

      const [matchRows] = await connection.execute(
        `
          SELECT
            m.lost_post_id,
            m.found_post_id,
            m.status AS match_status,
            lp.owner_id AS owner_id,
            lp.status AS lost_status,
            fp.status AS found_status
          FROM matches m
          INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
          INNER JOIN found_posts fp ON fp.id = m.found_post_id
          WHERE m.id = ?
          LIMIT 1
        `,
        [id],
      );
      if (!matchRows.length) throw createHttpError("ບໍ່ພົບ match", 404);

      const match = matchRows[0];
      if (match.match_status !== "confirmed") {
        throw createHttpError("return can only be recorded after the match is confirmed", 409);
      }
      if (match.found_status === "returned" || ["closed", "resolved", "deleted"].includes(match.lost_status)) {
        throw createHttpError("this item has already been returned", 409);
      }
      if (Number(receivedBy) !== Number(match.owner_id)) {
        throw createHttpError("receivedByMemberId must be the lost post owner", 400);
      }

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
          req.body.claimMessage ?? "ຄືນຂອງຜ່ານລະບົບ match",
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
            note,
            returned_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          claimResult.insertId,
          match.found_post_id,
          returnedBy,
          receivedBy,
          returnLocationId,
          req.body.note ?? "ຄືນຂອງທີ່ຫ້ອງຄຸ້ມຄອງ",
        ],
      );

      await connection.execute(`UPDATE found_posts SET status = 'returned' WHERE id = ?`, [
        match.found_post_id,
      ]);
      await connection.execute(`UPDATE lost_posts SET status = 'closed' WHERE id = ?`, [
        match.lost_post_id,
      ]);

      await connection.commit();

      res.status(201).json({
        id: claimResult.insertId,
        claimRequestId: `CR-${id}`,
        foundPostId: match.found_post_id,
        returnedBy,
        receivedBy,
        returnLocation: req.body.returnLocationName ?? "ຫ້ອງຄຸ້ມຄອງ",
        returnedAt: new Date().toISOString(),
      });
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
          returned.username AS returnedBy,
          received.username AS receivedBy,
          CONCAT(
            l.name_th,
            IF(l.floor IS NOT NULL AND l.floor <> '', CONCAT(' ຊັ້ນ ', l.floor), '')
          ) AS returnLocation,
          rr.returned_at AS returnedAt
        FROM return_records rr
        INNER JOIN members returned ON returned.id = rr.returned_by
        INNER JOIN members received ON received.id = rr.received_by
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

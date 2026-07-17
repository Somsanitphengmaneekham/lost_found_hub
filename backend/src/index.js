import cors from "cors";
import express from "express";
import { pool } from "./config/db.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { registerBootstrapRoutes } from "./routes/bootstrap-routes.js";
import { registerMasterDataRoutes } from "./routes/master-data-routes.js";
import { registerMatchesRoutes } from "./routes/matches-routes.js";
import { registerPostsRoutes } from "./routes/posts-routes.js";
import { registerUploadRoutes } from "./routes/upload-routes.js";
import { mapMysqlError } from "./utils/shared.js";

const app = express();
const port = Number(process.env.API_PORT ?? process.env.CRUD_PORT ?? 3002);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN ?? "http://127.0.0.1:5173,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// Fix 4: In-memory rate limiter (no extra packages needed)
// Stores: Map<ip, { count, resetAt }>
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_AUTH = Number(process.env.RATE_LIMIT_AUTH ?? 20);   // login/register
const RATE_LIMIT_GENERAL = Number(process.env.RATE_LIMIT_GENERAL ?? 200); // other routes

// Auto-clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}, 5 * 60_000).unref();

function createRateLimiter(maxRequests) {
  return (req, res, next) => {
    const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: "ສົ່ງຄຳຂໍຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ " + retryAfter + " ວິນາທີແລ້ວລອງໃໝ່",
      });
    }

    return next();
  };
}

const authRateLimit = createRateLimiter(RATE_LIMIT_AUTH);
const generalRateLimit = createRateLimiter(RATE_LIMIT_GENERAL);

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error("CORS origin is not allowed");
      error.statusCode = 403;
      callback(error);
    },
  }),
);
app.use(express.json({ limit: process.env.API_JSON_LIMIT ?? "1mb" }));

// Apply rate limits: auth routes stricter than general routes
app.use("/api/auth/login", authRateLimit);
app.use("/api/auth/register", authRateLimit);
app.use("/api/auth/password-reset", authRateLimit);
app.use("/api", generalRateLimit);

registerUploadRoutes(app);
registerMasterDataRoutes(app, pool);
registerAuthRoutes(app, pool);
registerPostsRoutes(app, pool);
registerMatchesRoutes(app, pool);

registerBootstrapRoutes(app, pool, {
  queryCategories: async (db) => {
    const [rows] = await db.query(`
      SELECT id, name_th, description, is_active
      FROM item_categories
      ORDER BY name_th ASC
    `);
    return rows.map((row) => ({
      id: row.id,
      name: row.name_th,
      nameTh: row.name_th,
      description: row.description ?? "",
      isActive: Boolean(row.is_active),
    }));
  },
  queryLocations: async (db) => {
    const [rows] = await db.query(`
      SELECT id, name_th, building, floor, detail, is_active
      FROM locations
      ORDER BY name_th ASC
    `);
    return rows.map((row) => ({
      id: row.id,
      name: row.floor ? `${row.name_th} ຊັ້ນ ${row.floor}` : row.name_th,
      nameTh: row.name_th,
      building: row.building ?? "",
      floor: row.floor ?? "",
      detail: row.detail ?? "",
      isActive: Boolean(row.is_active),
    }));
  },
  queryDepartments: async (db) => {
    const [rows] = await db.query(`
      SELECT id, code, name_th, name_en, is_active
      FROM departments
      ORDER BY name_th ASC
    `);
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name_th,
      nameTh: row.name_th,
      nameEn: row.name_en ?? "",
      isActive: Boolean(row.is_active),
    }));
  },
  queryFoundPosts: async (db) => {
    const response = await fetchFoundPosts(db);
    return response;
  },
  queryLostPosts: async (db) => {
    const response = await fetchLostPosts(db);
    return response;
  },
  queryMatches: async (db) => {
    const response = await fetchMatches(db);
    return response;
  },
  queryReturnRecords: async (db) => {
    const [rows] = await db.query(`
      SELECT
        rr.id,
        rr.claim_request_id,
        rr.found_post_id,
        returned.username AS returned_by,
        received.username AS received_by,
        CONCAT(
          l.name_th,
          IF(l.floor IS NOT NULL AND l.floor <> '', CONCAT(' ຊັ້ນ ', l.floor), '')
        ) AS return_location,
        rr.returned_at
      FROM return_records rr
      INNER JOIN members returned ON returned.id = rr.returned_by
      INNER JOIN members received ON received.id = rr.received_by
      LEFT JOIN locations l ON l.id = rr.return_location_id
      ORDER BY rr.returned_at DESC
    `);
    return rows.map((row) => ({
      id: row.id,
      claimRequestId: `CR-${row.claim_request_id}`,
      foundPostId: row.found_post_id,
      returnedBy: row.returned_by,
      receivedBy: row.received_by,
      returnLocation: row.return_location ?? "ຫ້ອງຄຸ້ມຄອງ",
      returnedAt: row.returned_at,
    }));
  },
  queryDemoUsers: async (db) => {
    const [rows] = await db.query(`
      SELECT
        m.id,
        m.role,
        m.username,
        m.first_name,
        m.last_name,
        m.email,
        d.name_th AS department_name
      FROM members m
      LEFT JOIN departments d ON d.id = m.department_id
      WHERE m.is_active = 1
      ORDER BY m.id ASC
    `);
    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      username: row.username,
      fullName: `${row.first_name} ${row.last_name}`,
      email: row.email,
      department: row.department_name ?? "",
    }));
  },
  queryMembers: async (db) => {
    const [rows] = await db.query(`
      SELECT
        m.id,
        m.role,
        m.username,
        m.student_code,
        m.employee_code,
        m.first_name,
        m.last_name,
        m.email,
        m.phone,
        m.department_id,
        m.identity_status,
        m.card_image_url,
        m.avatar_url,
        m.is_active,
        d.name_th AS department_name
      FROM members m
      LEFT JOIN departments d ON d.id = m.department_id
      ORDER BY
        FIELD(m.role, 'teacher', 'student'),
        m.is_active DESC,
        m.id ASC
    `);

    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      username: row.username,
      studentCode: row.student_code ?? "",
      employeeCode: row.employee_code ?? "",
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone ?? "",
      department: row.department_name ?? "",
      departmentId: row.department_id,
      identityStatus: row.identity_status,
      cardImageUrl: row.card_image_url ?? "",
      avatarUrl: row.avatar_url ?? "",
      isActive: Boolean(row.is_active),
    }));
  },
});

async function fetchFoundPosts(db) {
  const [rows] = await db.query(`
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
      approver.username AS approvedBy,
      fp.approved_at AS approvedAt,
      fp.reject_reason AS rejectReason,
      CONCAT(finder.first_name, ' ', finder.last_name) AS finderName,
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
    WHERE fp.deleted_at IS NULL
    ORDER BY fp.created_at DESC
  `);
  return attachPostImages(db, rows, "found_post_id");
}

async function fetchLostPosts(db) {
  const [rows] = await db.query(`
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
      lp.contact_channel AS contactChannel,
      lp.status,
      CONCAT(owner.first_name, ' ', owner.last_name) AS ownerName,
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
    WHERE lp.deleted_at IS NULL
    ORDER BY lp.created_at DESC
  `);
  return attachPostImages(db, rows, "lost_post_id");
}

async function attachPostImages(db, rows, postIdColumn) {
  if (!rows.length) return rows;

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const [imageRows] = await db.query(
    `
      SELECT ${postIdColumn} AS postId, image_url AS imageUrl
      FROM item_images
      WHERE ${postIdColumn} IN (${placeholders})
      ORDER BY sort_order ASC, id ASC
    `,
    ids,
  );
  const imagesByPost = new Map();

  imageRows.forEach((row) => {
    const images = imagesByPost.get(row.postId) ?? [];
    images.push(row.imageUrl);
    imagesByPost.set(row.postId, images);
  });

  return rows.map((row) => ({
    ...row,
    imageUrls: imagesByPost.get(row.id) ?? (row.imageUrl ? [row.imageUrl] : []),
  }));
}

async function fetchMatches(db) {
  const { calculateMatchScore } = await import("./services/weightedScoreMatching.js");
  const [rows] = await db.query(`
    SELECT
      m.id,
      m.lost_post_id,
      m.found_post_id,
      m.match_score,
      m.created_at,
      lp.title AS lost_title,
      lp.description AS lost_description,
      lp.color AS lost_color,
      lp.brand AS lost_brand,
      lp.unique_mark AS lost_unique_mark,
      lp.lost_at,
      lp.status AS lost_status,
      lp.owner_id AS lost_owner_id,
      lp.category_id AS lost_category_id,
      lp.lost_location_id,
      CONCAT(
        ll.name_th,
        IF(ll.floor IS NOT NULL AND ll.floor <> '', CONCAT(' ຊັ້ນ ', ll.floor), '')
      ) AS lost_location_name,
      lc.name_th AS lost_category_name,
      fp.title AS found_title,
      fp.description AS found_description,
      fp.color AS found_color,
      fp.brand AS found_brand,
      fp.unique_mark AS found_unique_mark,
      fp.found_at,
      fp.status AS found_status,
      fp.finder_id AS found_finder_id,
      fp.category_id AS found_category_id,
      fp.found_location_id,
      CONCAT(
        fl.name_th,
        IF(fl.floor IS NOT NULL AND fl.floor <> '', CONCAT(' ຊັ້ນ ', fl.floor), '')
      ) AS found_location_name,
      fc.name_th AS found_category_name
    FROM matches m
    INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
    INNER JOIN found_posts fp ON fp.id = m.found_post_id
    INNER JOIN item_categories lc ON lc.id = lp.category_id
    INNER JOIN item_categories fc ON fc.id = fp.category_id
    LEFT JOIN locations ll ON ll.id = lp.lost_location_id
    LEFT JOIN locations fl ON fl.id = fp.found_location_id
    ORDER BY m.match_score DESC
  `);

  return rows.map((row) => {
    const lost = {
      category_id: row.lost_category_id,
      lost_location_id: row.lost_location_id,
      lost_at: row.lost_at,
      color: row.lost_color,
      brand: row.lost_brand,
      unique_mark: row.lost_unique_mark,
      description: row.lost_description,
    };
    const found = {
      category_id: row.found_category_id,
      found_location_id: row.found_location_id,
      found_at: row.found_at,
      color: row.found_color,
      brand: row.found_brand,
      unique_mark: row.found_unique_mark,
      description: row.found_description,
    };

    return {
      id: row.id,
      lostPostId: row.lost_post_id,
      foundPostId: row.found_post_id,
      matchScore: Number(row.match_score),
      status: "suggested",
      createdAt: row.created_at,
      reasons: calculateMatchScore(lost, found).reasons,
      lost: {
        id: row.lost_post_id,
        ownerId: row.lost_owner_id,
        title: row.lost_title,
        location: row.lost_location_name ?? "ຍັງບໍ່ລະບຸສະຖານທີ່",
        category: row.lost_category_name,
        status: row.lost_status,
      },
      found: {
        id: row.found_post_id,
        finderId: row.found_finder_id,
        title: row.found_title,
        location: row.found_location_name ?? "ຍັງບໍ່ລະບຸສະຖານທີ່",
        category: row.found_category_name,
        status: row.found_status,
      },
    };
  });
}

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, api: "lost-found-hub" });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const mapped = mapMysqlError(error);

  if (mapped.statusCode) {
    return res.status(mapped.statusCode).json({ error: mapped.message });
  }

  console.error(mapped);
  return res.status(500).json({
    error: "ເກີດຂໍ້ຜິດພາດໃນ API",
  });
});

app.listen(port, () => {
  console.log(`Lost & Found API running at http://localhost:${port}`);
});

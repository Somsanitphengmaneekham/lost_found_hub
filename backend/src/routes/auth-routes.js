import crypto from "node:crypto";
import { resolveDepartmentId } from "../services/lookups.js";
import { assertAllowedStoredImageUrl, mapMysqlError, normalizeText, requireFields } from "../utils/shared.js";

const PASSWORD_HASH_PREFIX = "scrypt$";
const MEMBER_IMAGE_MAX_LENGTH = 260_000;

function safeTextEqual(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ""));
  const rightBuffer = Buffer.from(String(right ?? ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${PASSWORD_HASH_PREFIX}${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  const stored = String(storedPassword ?? "");
  if (!stored.startsWith(PASSWORD_HASH_PREFIX)) return safeTextEqual(password, stored);

  const [, salt, expectedHash] = stored.split("$");
  if (!salt || !expectedHash) return false;

  const actualBuffer = crypto.scryptSync(String(password), salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function shouldUpgradePassword(storedPassword) {
  return !String(storedPassword ?? "").startsWith(PASSWORD_HASH_PREFIX);
}

// Fix 3: รับเฉพาะ HTTPS URL — ปฏิเสธ Base64 data URLs
function requireUploadedImage(value, message) {
  const url = String(value ?? "").trim();
  if (!url) {
    const error = new Error(message || "ກະລຸນາໃສ່ລິ້ງ URL ຮູບພາບ");
    error.statusCode = 400;
    throw error;
  }

  if (url.startsWith("data:image/")) {
    const error = new Error("ກະລຸນາໃຊ້ລິ້ງ URL ຮູບພາບ (https://...) ແທນການ upload ໄຟລ໌ Base64 ໂດຍກົງ");
    error.statusCode = 400;
    throw error;
  }

  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    const error = new Error("ລິ້ງ URL ຮູບພາບຕ້ອງເລີ່ມດ້ວຍ https:// ຫຼື http://");
    error.statusCode = 400;
    throw error;
  }

  if (url.length > 2048) {
    const error = new Error("ລິ້ງ URL ຍາວເກີນໄປ");
    error.statusCode = 400;
    throw error;
  }

  return url;
}

function mapMember(row) {
  return {
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
  };
}

const MEMBER_SELECT = `
  SELECT
    m.*,
    d.name_th AS department_name
  FROM members m
  LEFT JOIN departments d ON d.id = m.department_id
`;

async function queryMembers(pool) {
  const [rows] = await pool.query(`
    ${MEMBER_SELECT}
    ORDER BY
      FIELD(m.role, 'teacher', 'student'),
      m.is_active DESC,
      m.id ASC
  `);

  return rows.map(mapMember);
}

async function queryMemberById(pool, id) {
  const [rows] = await pool.execute(
    `
      ${MEMBER_SELECT}
      WHERE m.id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapMember(rows[0]) : null;
}

function assertIdentityStatus(status) {
  if (!["pending", "verified", "rejected"].includes(status)) {
    const error = new Error("ສະຖານະຢືນຢັນຕົວຕົນບໍ່ຖືກຕ້ອງ");
    error.statusCode = 400;
    throw error;
  }
}

export function registerAuthRoutes(app, pool) {
  app.get("/api/members", async (_req, res, next) => {
    try {
      res.json(await queryMembers(pool));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/demo-users", async (_req, res, next) => {
    try {
      const [rows] = await pool.query(`
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

      res.json(
        rows.map((row) => ({
          id: row.id,
          role: row.role,
          username: row.username,
          fullName: `${row.first_name} ${row.last_name}`,
          email: row.email,
          department: row.department_name ?? "",
        })),
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      requireFields(req.body, ["username", "password"]);

      const [rows] = await pool.execute(
        `
          SELECT
            m.*,
            d.name_th AS department_name
          FROM members m
          LEFT JOIN departments d ON d.id = m.department_id
          WHERE m.username = ?
            AND m.is_active = 1
          LIMIT 1
        `,
        [normalizeText(req.body.username)],
      );

      const member = rows[0];

      if (!member || !verifyPassword(req.body.password, member.password_hash)) {
        return res.status(401).json({ error: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });
      }

      if (shouldUpgradePassword(member.password_hash)) {
        await pool.execute(`UPDATE members SET password_hash = ? WHERE id = ?`, [
          hashPassword(req.body.password),
          member.id,
        ]);
      }

      return res.json(mapMember(member));
    } catch (error) {
      return next(error);
    }
  });

  if (process.env.ENABLE_DEMO_LOGIN === "true") {
    app.post("/api/auth/demo-login/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await pool.execute(
        `
          SELECT
            m.*,
            d.name_th AS department_name
          FROM members m
          LEFT JOIN departments d ON d.id = m.department_id
          WHERE m.id = ? AND m.is_active = 1
          LIMIT 1
        `,
        [id],
      );

      if (!rows.length) return res.status(404).json({ error: "ບໍ່ພົບຜູ້ໃຊ້" });
      return res.json(mapMember(rows[0]));
    } catch (error) {
      return next(error);
    }
    });
  }

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      requireFields(req.body, [
        "username",
        "password",
        "firstName",
        "lastName",
        "email",
        "phone",
        "department",
        "studentCode",
        "cardImageUrl",
      ]);

      const requestedRole = normalizeText(req.body.role) ?? "student";

      if (requestedRole !== "student") {
        return res.status(403).json({
          error: "ບັນຊີອາຈານ ແລະ ຝ່າຍຄຸ້ມຄອງຕ້ອງໃຫ້ເຈົ້າໜ້າທີ່ສ້າງໃຫ້ເທົ່ານັ້ນ",
        });
      }

      const username = normalizeText(req.body.username);
      const email = normalizeText(req.body.email);
      const cardImageUrl = normalizeText(req.body.cardImageUrl);
      const departmentId = await resolveDepartmentId(pool, req.body.department);
      const role = "student";
      const safeCardImageUrl = requireUploadedImage(
        cardImageUrl,
        "student card image must be JPG, PNG, or WEBP",
      );

      if (!cardImageUrl?.startsWith("https://") && !cardImageUrl?.startsWith("http://")) {
        return res.status(400).json({ error: "ກະລຸນາໃຊ້ລິ້ງ URL ຮູບບັດນັກສຶກສາ (https://...)" });
      }

      const [result] = await pool.execute(
        `
          INSERT INTO members (
            role,
            username,
            password_hash,
            student_code,
            employee_code,
            first_name,
            last_name,
            email,
            phone,
            department_id,
            identity_status,
            card_image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          role,
          username,
          hashPassword(req.body.password),
          normalizeText(req.body.studentCode),
          null,
          normalizeText(req.body.firstName),
          normalizeText(req.body.lastName),
          email,
          normalizeText(req.body.phone),
          departmentId,
          "pending",
          safeCardImageUrl,
        ],
      );

      await pool.execute(
        `
          INSERT INTO student_card_uploads (member_id, image_url, status)
          VALUES (?, ?, 'pending')
        `,
        [result.insertId, safeCardImageUrl],
      );

      const [rows] = await pool.execute(
        `
          SELECT
            m.*,
            d.name_th AS department_name
          FROM members m
          LEFT JOIN departments d ON d.id = m.department_id
          WHERE m.id = ?
          LIMIT 1
        `,
        [result.insertId],
      );

      res.status(201).json(mapMember(rows[0]));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.post("/api/members/teachers", async (req, res, next) => {
    try {
      requireFields(req.body, [
        "username",
        "password",
        "firstName",
        "lastName",
        "email",
        "phone",
        "department",
        "employeeCode",
      ]);

      const departmentId = await resolveDepartmentId(pool, req.body.department);
      const [result] = await pool.execute(
        `
          INSERT INTO members (
            role,
            username,
            password_hash,
            student_code,
            employee_code,
            first_name,
            last_name,
            email,
            phone,
            department_id,
            identity_status,
            is_active
          ) VALUES ('teacher', ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'verified', 1)
        `,
        [
          normalizeText(req.body.username),
          hashPassword(req.body.password),
          normalizeText(req.body.employeeCode),
          normalizeText(req.body.firstName),
          normalizeText(req.body.lastName),
          normalizeText(req.body.email),
          normalizeText(req.body.phone),
          departmentId,
        ],
      );

      res.status(201).json(await queryMemberById(pool, result.insertId));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.put("/api/members/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await queryMemberById(pool, id);

      if (!existing) return res.status(404).json({ error: "ບໍ່ພົບສະມາຊິກ" });

      requireFields(req.body, ["username", "firstName", "lastName", "email", "phone", "department"]);

      if (existing.role === "student") requireFields(req.body, ["studentCode"]);
      if (existing.role === "teacher") requireFields(req.body, ["employeeCode"]);

      const departmentId = await resolveDepartmentId(pool, req.body.department);
      const studentCode = existing.role === "student" ? normalizeText(req.body.studentCode) : null;
      const employeeCode = existing.role === "teacher" ? normalizeText(req.body.employeeCode) : null;
      const password = normalizeText(req.body.password);
      const passwordHash = password ? hashPassword(password) : null;

      await pool.execute(
        `
          UPDATE members
          SET
            username = ?,
            password_hash = COALESCE(?, password_hash),
            student_code = ?,
            employee_code = ?,
            first_name = ?,
            last_name = ?,
            email = ?,
            phone = ?,
            department_id = ?
          WHERE id = ?
        `,
        [
          normalizeText(req.body.username),
          passwordHash,
          studentCode,
          employeeCode,
          normalizeText(req.body.firstName),
          normalizeText(req.body.lastName),
          normalizeText(req.body.email),
          normalizeText(req.body.phone),
          departmentId,
          id,
        ],
      );

      res.json(await queryMemberById(pool, id));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.patch("/api/members/:id/active", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const isActive = Boolean(req.body.isActive);

      if (Number(req.body.actorId) === id && !isActive) {
        return res.status(400).json({ error: "ບໍ່ສາມາດປິດບັນຊີທີ່ກຳລັງໃຊ້ງານຢູ່" });
      }

      const [result] = await pool.execute(`UPDATE members SET is_active = ? WHERE id = ?`, [
        isActive ? 1 : 0,
        id,
      ]);

      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບສະມາຊິກ" });

      res.json(await queryMemberById(pool, id));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.patch("/api/members/:id/identity-status", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const identityStatus = normalizeText(req.body.identityStatus);
      const actorId = Number(req.body.actorId) || null;
      assertIdentityStatus(identityStatus);

      const uploadStatus =
        identityStatus === "verified" ? "approved" : identityStatus === "rejected" ? "rejected" : "pending";

      const [result] = await pool.execute(`UPDATE members SET identity_status = ? WHERE id = ?`, [
        identityStatus,
        id,
      ]);

      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບສະມາຊິກ" });

      await pool.execute(
        `
          UPDATE student_card_uploads
          SET
            status = ?,
            reviewed_by = ?,
            reviewed_at = CASE WHEN ? = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END
          WHERE member_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `,
        [uploadStatus, actorId, uploadStatus, id],
      );

      res.json(await queryMemberById(pool, id));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.put("/api/auth/profile/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const departmentId = req.body.department
        ? await resolveDepartmentId(pool, req.body.department)
        : undefined;
      const cardImageUrl = req.body.cardImageUrl !== undefined ? normalizeText(req.body.cardImageUrl) : undefined;
      const avatarUrl = req.body.avatarUrl !== undefined ? normalizeText(req.body.avatarUrl) : undefined;
      const safeProfileCardImageUrl =
        cardImageUrl !== undefined && cardImageUrl
          ? requireUploadedImage(cardImageUrl, "student card image must be JPG, PNG, or WEBP")
          : cardImageUrl;
      const safeAvatarUrl =
        avatarUrl !== undefined && avatarUrl
          ? requireUploadedImage(avatarUrl, "profile image must be JPG, PNG, or WEBP")
          : avatarUrl;

      if (cardImageUrl !== undefined && cardImageUrl && !cardImageUrl.startsWith("https://") && !cardImageUrl.startsWith("http://")) {
        return res.status(400).json({ error: "ກະລຸນາໃຊ້ລິ້ງ URL ຮູບບັດນັກສຶກສາ (https://...)" });
      }

      if (avatarUrl !== undefined && avatarUrl && !avatarUrl.startsWith("https://") && !avatarUrl.startsWith("http://")) {
        return res.status(400).json({ error: "ກະລຸນາໃຊ້ລິ້ງ URL ຮູບໂປຣໄຟລ໌ (https://...)" });
      }

      const [result] = await pool.execute(
        `
          UPDATE members
          SET
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            department_id = COALESCE(?, department_id),
            student_code = COALESCE(?, student_code),
            employee_code = COALESCE(?, employee_code),
            identity_status = COALESCE(?, identity_status),
            card_image_url = COALESCE(?, card_image_url),
            avatar_url = COALESCE(?, avatar_url)
          WHERE id = ?
        `,
        [
          normalizeText(req.body.firstName),
          normalizeText(req.body.lastName),
          normalizeText(req.body.email),
          normalizeText(req.body.phone),
          departmentId ?? null,
          req.body.studentCode !== undefined ? normalizeText(req.body.studentCode) : null,
          req.body.employeeCode !== undefined ? normalizeText(req.body.employeeCode) : null,
          req.body.identityStatus !== undefined ? normalizeText(req.body.identityStatus) : null,
          safeProfileCardImageUrl ?? null,
          safeAvatarUrl ?? null,
          id,
        ],
      );

      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບສະມາຊິກ" });

      if (safeProfileCardImageUrl) {
        await pool.execute(
          `
            INSERT INTO student_card_uploads (member_id, image_url, status)
            VALUES (?, ?, 'pending')
          `,
          [id, safeProfileCardImageUrl],
        );
      }

      const [rows] = await pool.execute(
        `
          SELECT
            m.*,
            d.name_th AS department_name
          FROM members m
          LEFT JOIN departments d ON d.id = m.department_id
          WHERE m.id = ?
          LIMIT 1
        `,
        [id],
      );

      res.json(mapMember(rows[0]));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });
}

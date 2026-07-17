import crypto from "node:crypto";
import { resolveDepartmentId } from "../services/lookups.js";
import { deliverPasswordResetOtp } from "../services/otp-delivery.js";
import { mapMysqlError, normalizeText, requireFields } from "../utils/shared.js";

const PASSWORD_HASH_PREFIX = "scrypt$";
const PASSWORD_RESET_OTP_TTL_MINUTES = Number(process.env.PASSWORD_RESET_OTP_MINUTES ?? 10);
const PASSWORD_RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES ?? 15);
const PASSWORD_RESET_MAX_ATTEMPTS = Number(process.env.PASSWORD_RESET_MAX_ATTEMPTS ?? 5);
const REMOTE_IMAGE_URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;
const LOCAL_UPLOAD_URL_PATTERN = /^\/api\/uploads\/images\/[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/;
let passwordResetTablePromise = null;

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

function requireUploadedImage(value, message) {
  const url = String(value ?? "").trim();
  if (!url) {
    const error = new Error(message || "ກະລຸນາອັບໂຫຼດຮູບພາບ");
    error.statusCode = 400;
    throw error;
  }

  if (url.startsWith("data:image/")) {
    const error = new Error("ກະລຸນາອັບໂຫຼດເປັນໄຟລ໌ຮູບພາບ ບໍ່ໃຫ້ສົ່ງ Base64 ໂດຍກົງ");
    error.statusCode = 400;
    throw error;
  }

  if (url.includes("..") || (!LOCAL_UPLOAD_URL_PATTERN.test(url) && !REMOTE_IMAGE_URL_PATTERN.test(url))) {
    const error = new Error("ຮູບຕ້ອງມາຈາກການອັບໂຫຼດໃນລະບົບ ຫຼື URL ຮູບພາບທີ່ຖືກຕ້ອງ");
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

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePasswordResetChannel(value) {
  const channel = normalizeText(value || "email");
  if (channel === "email") return channel;
  throw httpError("ລະບົບຮອງຮັບ OTP ຜ່ານອີເມວເທົ່ານັ້ນ");
}

function createNumericOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function digestResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function maskEmail(destination) {
  const value = String(destination ?? "");
  const [name, domain] = value.split("@");
  if (!domain) return value;
  const visibleName = name.length <= 2 ? `${name[0] ?? "*"}*` : `${name.slice(0, 2)}***`;
  return `${visibleName}@${domain}`;
}

function ensurePasswordResetTable(pool) {
  if (!passwordResetTablePromise) {
    passwordResetTablePromise = pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        member_id INT UNSIGNED NOT NULL,
        channel ENUM('email') NOT NULL,
        destination VARCHAR(190) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
        verified_at DATETIME NULL,
        reset_token_digest VARCHAR(64) NULL,
        reset_token_expires_at DATETIME NULL,
        consumed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_password_reset_member_id (member_id),
        KEY idx_password_reset_destination (destination),
        KEY idx_password_reset_expires_at (expires_at),
        KEY idx_password_reset_token_digest (reset_token_digest),
        CONSTRAINT fk_password_reset_member
          FOREIGN KEY (member_id) REFERENCES members(id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  return passwordResetTablePromise;
}

async function queryPasswordResetMember(pool, identifier) {
  const [rows] = await pool.execute(
    `
      SELECT id, username, email, is_active
      FROM members
      WHERE is_active = 1
        AND (username = ? OR email = ?)
      LIMIT 1
    `,
    [identifier, identifier],
  );

  return rows[0] ?? null;
}

async function getPasswordResetTarget(pool, body) {
  const identifier = normalizeText(body.identifier);
  if (!identifier) throw httpError("ກະລຸນາລະບຸຊື່ຜູ້ໃຊ້ ຫຼື ອີເມວ");

  const channel = normalizePasswordResetChannel(body.channel);
  const member = await queryPasswordResetMember(pool, identifier);
  if (!member) throw httpError("ບໍ່ພົບບັນຊີນີ້", 404);

  const destination = normalizeText(member.email);
  if (!destination) {
    throw httpError("ບັນຊີນີ້ຍັງບໍ່ມີອີເມວ");
  }

  return { member, channel, destination };
}

function assertUsableResetOtp(row) {
  if (!row) throw httpError("OTP ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw httpError("OTP ໝົດອາຍຸແລ້ວ ກະລຸນາຂໍ OTP ໃໝ່");
  }
  if (Number(row.attempt_count) >= PASSWORD_RESET_MAX_ATTEMPTS) {
    throw httpError("ກວດສອບ OTP ຫຼາຍເກີນໄປ ກະລຸນາຂໍ OTP ໃໝ່", 429);
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

  app.post("/api/auth/password-reset/request", async (req, res, next) => {
    try {
      await ensurePasswordResetTable(pool);

      const { member, channel, destination } = await getPasswordResetTarget(pool, req.body);
      const otp = createNumericOtp();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MINUTES * 60_000);

      await pool.execute(
        `
          UPDATE password_reset_otps
          SET consumed_at = COALESCE(consumed_at, CURRENT_TIMESTAMP)
          WHERE member_id = ?
            AND channel = ?
            AND consumed_at IS NULL
        `,
        [member.id, channel],
      );

      await pool.execute(
        `
          INSERT INTO password_reset_otps (
            member_id,
            channel,
            destination,
            otp_hash,
            expires_at
          ) VALUES (?, ?, ?, ?, ?)
        `,
        [member.id, channel, destination, hashPassword(otp), expiresAt],
      );

      const delivery = await deliverPasswordResetOtp({
        destination,
        otp,
        expiresInMinutes: PASSWORD_RESET_OTP_TTL_MINUTES,
      });

      const response = {
        ok: true,
        channel,
        destination: maskEmail(destination),
        deliveryMode: delivery.mode,
        expiresInMinutes: PASSWORD_RESET_OTP_TTL_MINUTES,
      };

      if (delivery.debugOtp) response.debugOtp = delivery.debugOtp;

      return res.status(201).json(response);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/password-reset/verify", async (req, res, next) => {
    try {
      await ensurePasswordResetTable(pool);

      const otp = normalizeText(req.body.otp);
      if (!otp) throw httpError("ກະລຸນາກອກ OTP");

      const { member, channel, destination } = await getPasswordResetTarget(pool, req.body);
      const [rows] = await pool.execute(
        `
          SELECT *
          FROM password_reset_otps
          WHERE member_id = ?
            AND channel = ?
            AND destination = ?
            AND consumed_at IS NULL
          ORDER BY id DESC
          LIMIT 1
        `,
        [member.id, channel, destination],
      );
      const resetRequest = rows[0];

      assertUsableResetOtp(resetRequest);

      if (!verifyPassword(otp, resetRequest.otp_hash)) {
        await pool.execute(
          `
            UPDATE password_reset_otps
            SET attempt_count = attempt_count + 1
            WHERE id = ?
          `,
          [resetRequest.id],
        );
        throw httpError("OTP ບໍ່ຖືກຕ້ອງ");
      }

      const resetToken = crypto.randomBytes(32).toString("base64url");
      const resetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000);

      await pool.execute(
        `
          UPDATE password_reset_otps
          SET
            verified_at = CURRENT_TIMESTAMP,
            reset_token_digest = ?,
            reset_token_expires_at = ?
          WHERE id = ?
        `,
        [digestResetToken(resetToken), resetTokenExpiresAt, resetRequest.id],
      );

      return res.json({
        ok: true,
        resetToken,
        expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MINUTES,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/password-reset/confirm", async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
      await ensurePasswordResetTable(pool);

      const resetToken = normalizeText(req.body.resetToken);
      const newPassword = String(req.body.newPassword ?? "");

      if (!resetToken) throw httpError("ກະລຸນາຢືນຢັນ OTP ກ່ອນ");
      if (newPassword.length < 6) throw httpError("ລະຫັດຜ່ານໃໝ່ຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ");

      const [rows] = await connection.execute(
        `
          SELECT id, member_id, reset_token_expires_at
          FROM password_reset_otps
          WHERE reset_token_digest = ?
            AND consumed_at IS NULL
          ORDER BY id DESC
          LIMIT 1
        `,
        [digestResetToken(resetToken)],
      );
      const resetRequest = rows[0];

      if (!resetRequest) throw httpError("ລິ້ງປ່ຽນລະຫັດບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ");
      if (new Date(resetRequest.reset_token_expires_at).getTime() < Date.now()) {
        throw httpError("ການຢືນຢັນໝົດອາຍຸແລ້ວ ກະລຸນາຂໍ OTP ໃໝ່");
      }

      await connection.beginTransaction();
      await connection.execute(
        `
          UPDATE members
          SET password_hash = ?
          WHERE id = ?
        `,
        [hashPassword(newPassword), resetRequest.member_id],
      );
      await connection.execute(
        `
          UPDATE password_reset_otps
          SET consumed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [resetRequest.id],
      );
      await connection.commit();

      return res.json({ ok: true });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Ignore rollback errors and return the original error.
      }
      return next(error);
    } finally {
      connection.release();
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
          "verified",
          safeCardImageUrl,
        ],
      );

      await pool.execute(
        `
          INSERT INTO student_card_uploads (member_id, image_url, status)
          VALUES (?, ?, 'approved')
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
      if (existing.role === "student") {
        return res.status(403).json({
          error: "ອາຈານບໍ່ສາມາດແກ້ໄຂຂໍ້ມູນນັກສຶກສາ ສາມາດປິດໃຊ້ງານ ຫຼື ລຶບບັນຊີເທົ່ານັ້ນ",
        });
      }

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

  app.delete("/api/members/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const actorId = Number(req.body.actorId) || null;
      const existing = await queryMemberById(pool, id);

      if (!existing) return res.status(404).json({ error: "ບໍ່ພົບສະມາຊິກ" });
      if (actorId === id) return res.status(400).json({ error: "ບໍ່ສາມາດລຶບບັນຊີທີ່ກຳລັງໃຊ້ງານຢູ່" });
      if (existing.role !== "student") {
        return res.status(403).json({ error: "ໜ້ານີ້ອະນຸຍາດໃຫ້ລຶບສະເພາະບັນຊີນັກສຶກສາ" });
      }

      await pool.execute(`DELETE FROM members WHERE id = ?`, [id]);
      res.status(204).end();
    } catch (error) {
      if (error?.code === "ER_ROW_IS_REFERENCED_2" || error?.code === "ER_ROW_IS_REFERENCED") {
        const relatedDataError = new Error(
          "ບັນຊີນີ້ມີປະຫວັດປະກາດ ຫຼື ທຸລະກຳແລ້ວ ກະລຸນາໃຊ້ປິດໃຊ້ງານແທນການລຶບ",
        );
        relatedDataError.statusCode = 409;
        return next(relatedDataError);
      }
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
            VALUES (?, ?, 'approved')
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

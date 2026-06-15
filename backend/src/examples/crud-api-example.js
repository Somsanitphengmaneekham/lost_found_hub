import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";
import { registerMasterDataRoutes } from "../routes/master-data-routes.js";

const app = express();
const port = Number(process.env.CRUD_PORT ?? 3002);

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "lost_found_hub",
  waitForConnections: true,
  connectionLimit: 10,
});

app.use(cors());
app.use(express.json());

registerMasterDataRoutes(app, pool);

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, api: "crud" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/found-posts", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        finder_id AS finderId,
        category_id AS categoryId,
        found_location_id AS foundLocationId,
        title,
        description,
        color,
        brand,
        unique_mark AS uniqueMark,
        found_at AS foundAt,
        status,
        approved_by AS approvedBy,
        approved_at AS approvedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM found_posts
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/found-posts/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const [rows] = await pool.query(
      `
        SELECT
          id,
          finder_id AS finderId,
          category_id AS categoryId,
          found_location_id AS foundLocationId,
          title,
          description,
          color,
          brand,
          unique_mark AS uniqueMark,
          found_at AS foundAt,
          status,
          approved_by AS approvedBy,
          approved_at AS approvedAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM found_posts
        WHERE id = ? AND deleted_at IS NULL
        LIMIT 1
      `,
      [id],
    );

    if (!rows.length) return res.status(404).json({ error: "ບໍ່ພົບຂໍ້ມູນຂອງທີ່ພົບ" });
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/found-posts", async (req, res, next) => {
  try {
    requireFields(req.body, ["finderId", "categoryId", "title", "description"]);

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
        req.body.categoryId,
        req.body.foundLocationId ?? null,
        req.body.title,
        req.body.description,
        req.body.color ?? null,
        req.body.brand ?? null,
        req.body.uniqueMark ?? null,
        req.body.foundAt ?? null,
        req.body.status ?? "pending_approval",
      ],
    );

    res.status(201).json({ id: result.insertId, message: "ສ້າງຂໍ້ມູນຂອງທີ່ພົບແລ້ວ" });
  } catch (error) {
    next(error);
  }
});

app.put("/api/found-posts/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const update = buildUpdate(req.body, {
      finderId: "finder_id",
      categoryId: "category_id",
      foundLocationId: "found_location_id",
      title: "title",
      description: "description",
      color: "color",
      brand: "brand",
      uniqueMark: "unique_mark",
      foundAt: "found_at",
      status: "status",
      approvedBy: "approved_by",
      approvedAt: "approved_at",
    });

    if (!update.fields.length) return res.status(400).json({ error: "ບໍ່ມີຂໍ້ມູນສຳລັບແກ້ໄຂ" });

    const [result] = await pool.execute(
      `UPDATE found_posts SET ${update.fields.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      [...update.values, id],
    );

    if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບຂໍ້ມູນຂອງທີ່ພົບ" });
    return res.json({ id, message: "ແກ້ໄຂຂໍ້ມູນຂອງທີ່ພົບແລ້ວ" });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/found-posts/:id", async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const id = parsePositiveId(req.params.id);
    await connection.beginTransaction();
    await connection.execute("DELETE FROM matches WHERE found_post_id = ?", [id]);
    const [result] = await connection.execute(
      "UPDATE found_posts SET status = 'archived', deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    await connection.commit();

    if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບຂໍ້ມູນຂອງທີ່ພົບ" });
    return res.json({ id, message: "ລຶບຂໍ້ມູນຂອງທີ່ພົບແລ້ວ" });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

app.get("/api/lost-posts", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        owner_id AS ownerId,
        category_id AS categoryId,
        lost_location_id AS lostLocationId,
        title,
        description,
        color,
        brand,
        unique_mark AS uniqueMark,
        lost_at AS lostAt,
        contact_name AS contactName,
        contact_channel AS contactChannel,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM lost_posts
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/lost-posts/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const [rows] = await pool.query(
      `
        SELECT
          id,
          owner_id AS ownerId,
          category_id AS categoryId,
          lost_location_id AS lostLocationId,
          title,
          description,
          color,
          brand,
          unique_mark AS uniqueMark,
          lost_at AS lostAt,
          contact_name AS contactName,
          contact_channel AS contactChannel,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM lost_posts
        WHERE id = ? AND deleted_at IS NULL
        LIMIT 1
      `,
      [id],
    );

    if (!rows.length) return res.status(404).json({ error: "ບໍ່ພົບຂໍ້ມູນຂອງສູນຫາຍ" });
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/lost-posts", async (req, res, next) => {
  try {
    requireFields(req.body, ["ownerId", "categoryId", "title", "description"]);

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
        req.body.categoryId,
        req.body.lostLocationId ?? null,
        req.body.title,
        req.body.description,
        req.body.color ?? null,
        req.body.brand ?? null,
        req.body.uniqueMark ?? null,
        req.body.lostAt ?? null,
        req.body.contactName ?? null,
        req.body.contactChannel ?? null,
        req.body.status ?? "pending_approval",
      ],
    );

    res.status(201).json({ id: result.insertId, message: "ສ້າງຂໍ້ມູນຂອງສູນຫາຍແລ້ວ" });
  } catch (error) {
    next(error);
  }
});

app.put("/api/lost-posts/:id", async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const update = buildUpdate(req.body, {
      ownerId: "owner_id",
      categoryId: "category_id",
      lostLocationId: "lost_location_id",
      title: "title",
      description: "description",
      color: "color",
      brand: "brand",
      uniqueMark: "unique_mark",
      lostAt: "lost_at",
      contactName: "contact_name",
      contactChannel: "contact_channel",
      status: "status",
    });

    if (!update.fields.length) return res.status(400).json({ error: "ບໍ່ມີຂໍ້ມູນສຳລັບແກ້ໄຂ" });

    const [result] = await pool.execute(
      `UPDATE lost_posts SET ${update.fields.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      [...update.values, id],
    );

    if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບຂໍ້ມູນຂອງສູນຫາຍ" });
    return res.json({ id, message: "ແກ້ໄຂຂໍ້ມູນຂອງສູນຫາຍແລ້ວ" });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/lost-posts/:id", async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const id = parsePositiveId(req.params.id);
    await connection.beginTransaction();
    await connection.execute("DELETE FROM matches WHERE lost_post_id = ?", [id]);
    const [result] = await connection.execute(
      "UPDATE lost_posts SET status = 'deleted', deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    await connection.commit();

    if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບຂໍ້ມູນຂອງສູນຫາຍ" });
    return res.json({ id, message: "ລຶບຂໍ້ມູນຂອງສູນຫາຍແລ້ວ" });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

app.use((error, _req, res, _next) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({
    error: "ເກີດຂໍ້ຜິດພາດໃນ CRUD API",
    detail: error.message,
  });
});

app.listen(port, () => {
  console.log(`CRUD API running at http://localhost:${port}`);
});

function parsePositiveId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("id ຕ້ອງເປັນຕົວເລກຫຼາຍກວ່າ 0");
    error.statusCode = 400;
    throw error;
  }

  return id;
}

function requireFields(body, fields) {
  const missingFields = fields.filter((field) => body[field] === undefined || body[field] === "");

  if (missingFields.length) {
    const error = new Error(`ກະລຸນາກອກຂໍ້ມູນ: ${missingFields.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

function buildUpdate(body, fieldMap) {
  const fields = [];
  const values = [];

  Object.entries(fieldMap).forEach(([bodyKey, columnName]) => {
    if (body[bodyKey] === undefined) return;
    fields.push(`${columnName} = ?`);
    values.push(body[bodyKey]);
  });

  return { fields, values };
}

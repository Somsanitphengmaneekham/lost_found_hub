export function registerMasterDataRoutes(app, pool) {
  app.get("/api/master-data", async (_req, res, next) => {
    try {
      const [categories, locations, departments] = await Promise.all([
        queryCategories(pool),
        queryLocations(pool),
        queryDepartments(pool),
      ]);

      res.json({ categories, locations, departments });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/item-categories", async (_req, res, next) => {
    try {
      res.json(await queryCategories(pool));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/item-categories", async (req, res, next) => {
    try {
      const nameTh = normalizeText(req.body.nameTh ?? req.body.name);
      if (!nameTh) return res.status(400).json({ error: "ກະລຸນາລະບຸຊື່ໝວດໝູ່" });

      const [result] = await pool.execute(
        `INSERT INTO item_categories (name_th, description, is_active) VALUES (?, ?, ?)`,
        [nameTh, req.body.description?.trim() || null, boolToDb(req.body.isActive ?? true)],
      );

      const row = await getCategoryById(pool, result.insertId);
      res.status(201).json(row);
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.put("/api/item-categories/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const update = buildCategoryUpdate(req.body);
      if (!update.fields.length) return res.status(400).json({ error: "ບໍ່ມີຂໍ້ມູນສຳລັບແກ້ໄຂ" });

      const [result] = await pool.execute(
        `UPDATE item_categories SET ${update.fields.join(", ")} WHERE id = ?`,
        [...update.values, id],
      );

      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບໝວດໝູ່" });
      res.json(await getCategoryById(pool, id));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.delete("/api/item-categories/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const usage = await categoryUsageCount(pool, id);

      if (usage > 0) {
        return res.status(409).json({
          error: "ບໍ່ສາມາດລຶບໄດ້ ໝວດໝູ່ນີ້ຖືກໃຊ້ງານໃນປະກາດແລ້ວ",
          usageCount: usage,
        });
      }

      const [result] = await pool.execute("DELETE FROM item_categories WHERE id = ?", [id]);
      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບໝວດໝູ່" });
      res.json({ id, message: "ລຶບໝວດໝູ່ແລ້ວ" });
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.get("/api/locations", async (_req, res, next) => {
    try {
      res.json(await queryLocations(pool));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/locations", async (req, res, next) => {
    try {
      const nameTh = normalizeText(req.body.nameTh ?? req.body.name);
      if (!nameTh) return res.status(400).json({ error: "ກະລຸນາລະບຸຊື່ສະຖານທີ່" });

      const building = req.body.building?.trim() || null;
      const floor = req.body.floor?.trim() || null;

      const [result] = await pool.execute(
        `
          INSERT INTO locations (name_th, building, floor, detail, is_active)
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          nameTh,
          building,
          floor,
          req.body.detail?.trim() || null,
          boolToDb(req.body.isActive ?? true),
        ],
      );

      res.status(201).json(await getLocationById(pool, result.insertId));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.put("/api/locations/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const update = buildLocationUpdate(req.body);
      if (!update.fields.length) return res.status(400).json({ error: "ບໍ່ມີຂໍ້ມູນສຳລັບແກ້ໄຂ" });

      const [result] = await pool.execute(
        `UPDATE locations SET ${update.fields.join(", ")} WHERE id = ?`,
        [...update.values, id],
      );

      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບສະຖານທີ່" });
      res.json(await getLocationById(pool, id));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.delete("/api/locations/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const usage = await locationUsageCount(pool, id);

      if (usage > 0) {
        return res.status(409).json({
          error: "ບໍ່ສາມາດລຶບໄດ້ ສະຖານທີ່ນີ້ຖືກໃຊ້ງານໃນປະກາດແລ້ວ",
          usageCount: usage,
        });
      }

      const [result] = await pool.execute("DELETE FROM locations WHERE id = ?", [id]);
      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບສະຖານທີ່" });
      res.json({ id, message: "ລຶບສະຖານທີ່ແລ້ວ" });
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.get("/api/departments", async (_req, res, next) => {
    try {
      res.json(await queryDepartments(pool));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/departments", async (req, res, next) => {
    try {
      const code = normalizeText(req.body.code)?.toUpperCase();
      const nameTh = normalizeText(req.body.nameTh ?? req.body.name);
      if (!code || !nameTh) return res.status(400).json({ error: "ກະລຸນາລະບຸລະຫັດ ແລະ ຊື່ພາກວິຊາ" });

      const [result] = await pool.execute(
        `INSERT INTO departments (code, name_th, name_en, is_active) VALUES (?, ?, ?, ?)`,
        [code, nameTh, req.body.nameEn?.trim() || null, boolToDb(req.body.isActive ?? true)],
      );

      res.status(201).json(await getDepartmentById(pool, result.insertId));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.put("/api/departments/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const update = buildDepartmentUpdate(req.body);
      if (!update.fields.length) return res.status(400).json({ error: "ບໍ່ມີຂໍ້ມູນສຳລັບແກ້ໄຂ" });

      const [result] = await pool.execute(
        `UPDATE departments SET ${update.fields.join(", ")} WHERE id = ?`,
        [...update.values, id],
      );

      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບພາກວິຊາ" });
      res.json(await getDepartmentById(pool, id));
    } catch (error) {
      next(mapMysqlError(error));
    }
  });

  app.delete("/api/departments/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      const usage = await departmentUsageCount(pool, id);

      if (usage > 0) {
        return res.status(409).json({
          error: "ບໍ່ສາມາດລຶບໄດ້ ພາກວິຊານີ້ຖືກໃຊ້ງານໂດຍສະມາຊິກແລ້ວ",
          usageCount: usage,
        });
      }

      const [result] = await pool.execute("DELETE FROM departments WHERE id = ?", [id]);
      if (!result.affectedRows) return res.status(404).json({ error: "ບໍ່ພົບພາກວິຊາ" });
      res.json({ id, message: "ລຶບພາກວິຊາແລ້ວ" });
    } catch (error) {
      next(mapMysqlError(error));
    }
  });
}

async function queryCategories(pool) {
  const [rows] = await pool.query(`
    SELECT id, name_th, description, is_active
    FROM item_categories
    ORDER BY name_th ASC
  `);

  return rows.map(mapCategoryRow);
}

async function queryLocations(pool) {
  const [rows] = await pool.query(`
    SELECT id, name_th, building, floor, detail, location_type, is_active
    FROM locations
    ORDER BY name_th ASC
  `);

  return rows.map(mapLocationRow);
}

async function queryDepartments(pool) {
  const [rows] = await pool.query(`
    SELECT id, code, name_th, name_en, is_active
    FROM departments
    ORDER BY name_th ASC
  `);

  return rows.map(mapDepartmentRow);
}

async function getCategoryById(pool, id) {
  const [rows] = await pool.query(
    `SELECT id, name_th, description, is_active FROM item_categories WHERE id = ? LIMIT 1`,
    [id],
  );

  if (!rows.length) {
    const error = new Error("ບໍ່ພົບໝວດໝູ່");
    error.statusCode = 404;
    throw error;
  }

  return mapCategoryRow(rows[0]);
}

async function getLocationById(pool, id) {
  const [rows] = await pool.query(
    `
      SELECT id, name_th, building, floor, detail, location_type, is_active
      FROM locations
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  if (!rows.length) {
    const error = new Error("ບໍ່ພົບສະຖານທີ່");
    error.statusCode = 404;
    throw error;
  }

  return mapLocationRow(rows[0]);
}

async function getDepartmentById(pool, id) {
  const [rows] = await pool.query(
    `SELECT id, code, name_th, name_en, is_active FROM departments WHERE id = ? LIMIT 1`,
    [id],
  );

  if (!rows.length) {
    const error = new Error("ບໍ່ພົບພາກວິຊາ");
    error.statusCode = 404;
    throw error;
  }

  return mapDepartmentRow(rows[0]);
}

async function categoryUsageCount(pool, id) {
  const [foundRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM found_posts WHERE category_id = ? AND deleted_at IS NULL`,
    [id],
  );
  const [lostRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM lost_posts WHERE category_id = ? AND deleted_at IS NULL`,
    [id],
  );

  return Number(foundRows[0].total) + Number(lostRows[0].total);
}

async function locationUsageCount(pool, id) {
  const [foundRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM found_posts WHERE found_location_id = ? AND deleted_at IS NULL`,
    [id],
  );
  const [lostRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM lost_posts WHERE lost_location_id = ? AND deleted_at IS NULL`,
    [id],
  );
  const [handoverRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM handover_records WHERE handover_location_id = ?`,
    [id],
  );
  const [returnRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM return_records WHERE return_location_id = ?`,
    [id],
  );

  return (
    Number(foundRows[0].total) +
    Number(lostRows[0].total) +
    Number(handoverRows[0].total) +
    Number(returnRows[0].total)
  );
}

async function departmentUsageCount(pool, id) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM members WHERE department_id = ?`, [id]);
  return Number(rows[0].total);
}

function mapCategoryRow(row) {
  return {
    id: row.id,
    name: row.name_th,
    nameTh: row.name_th,
    description: row.description ?? "",
    isActive: Boolean(row.is_active),
  };
}

function mapLocationRow(row) {
  return {
    id: row.id,
    name: formatLocationName(row),
    nameTh: row.name_th,
    building: row.building ?? "",
    floor: row.floor ?? "",
    detail: row.detail ?? "",
    isActive: Boolean(row.is_active),
  };
}

function mapDepartmentRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name_th,
    nameTh: row.name_th,
    nameEn: row.name_en ?? "",
    isActive: Boolean(row.is_active),
  };
}

function formatLocationName(row) {
  const parts = [row.name_th];
  if (row.floor) parts.push(`ຊັ້ນ ${row.floor}`);
  return parts.join(" ");
}

function buildCategoryUpdate(body) {
  const fields = [];
  const values = [];

  if (body.nameTh !== undefined || body.name !== undefined) {
    fields.push("name_th = ?");
    values.push(normalizeText(body.nameTh ?? body.name));
  }

  if (body.description !== undefined) {
    fields.push("description = ?");
    values.push(body.description?.trim() || null);
  }

  if (body.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(boolToDb(body.isActive));
  }

  return { fields, values };
}

function buildLocationUpdate(body) {
  const fields = [];
  const values = [];

  if (body.nameTh !== undefined || body.name !== undefined) {
    fields.push("name_th = ?");
    values.push(normalizeText(body.nameTh ?? body.name));
  }

  if (body.building !== undefined) {
    fields.push("building = ?");
    values.push(body.building?.trim() || null);
  }

  if (body.floor !== undefined) {
    fields.push("floor = ?");
    values.push(body.floor?.trim() || null);
  }

  if (body.detail !== undefined) {
    fields.push("detail = ?");
    values.push(body.detail?.trim() || null);
  }


  if (body.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(boolToDb(body.isActive));
  }

  return { fields, values };
}

function buildDepartmentUpdate(body) {
  const fields = [];
  const values = [];

  if (body.code !== undefined) {
    fields.push("code = ?");
    values.push(normalizeText(body.code)?.toUpperCase());
  }

  if (body.nameTh !== undefined || body.name !== undefined) {
    fields.push("name_th = ?");
    values.push(normalizeText(body.nameTh ?? body.name));
  }

  if (body.nameEn !== undefined) {
    fields.push("name_en = ?");
    values.push(body.nameEn?.trim() || null);
  }

  if (body.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(boolToDb(body.isActive));
  }

  return { fields, values };
}

function parsePositiveId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("id ຕ້ອງເປັນຕົວເລກຫຼາຍກວ່າ 0");
    error.statusCode = 400;
    throw error;
  }

  return id;
}

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function boolToDb(value) {
  return value ? 1 : 0;
}

function mapMysqlError(error) {
  if (error?.code === "ER_DUP_ENTRY") {
    const mapped = new Error("ຂໍ້ມູນຊ້ຳກັບລາຍການທີ່ມີຢູ່ແລ້ວ");
    mapped.statusCode = 409;
    return mapped;
  }

  if (error?.statusCode) return error;
  return error;
}

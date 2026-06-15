import { normalizeText } from "../utils/shared.js";

export async function resolveCategoryId(pool, categoryName) {
  const name = normalizeText(categoryName);
  if (!name) {
    const error = new Error("ບໍ່ພົບໝວດໝູ່ທີ່ເລືອກ");
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await pool.execute(
    `SELECT id FROM item_categories WHERE name_th = ? AND is_active = 1 LIMIT 1`,
    [name],
  );

  if (!rows.length) {
    const error = new Error(`ບໍ່ພົບໝວດໝູ່ "${name}" ໃນຖານຂໍ້ມູນ`);
    error.statusCode = 400;
    throw error;
  }

  return rows[0].id;
}

export async function resolveLocationId(pool, locationName) {
  const name = normalizeText(locationName);
  if (!name) return null;

  const [rows] = await pool.execute(
    `
      SELECT id
      FROM locations
      WHERE is_active = 1
        AND (
          name_th = ?
          OR CONCAT(name_th, IF(floor IS NOT NULL AND floor <> '', CONCAT(' ຊັ້ນ ', floor), '')) = ?
        )
      LIMIT 1
    `,
    [name, name],
  );

  if (!rows.length) {
    const [result] = await pool.execute(
      `
        INSERT INTO locations (name_th, building, floor, detail, location_type, is_active)
        VALUES (?, NULL, NULL, NULL, 'both', 1)
      `,
      [name],
    );

    return result.insertId;
  }

  return rows[0].id;
}

export async function resolveDepartmentId(pool, departmentName) {
  const name = normalizeText(departmentName);
  if (!name) return null;

  const [rows] = await pool.execute(
    `SELECT id FROM departments WHERE name_th = ? AND is_active = 1 LIMIT 1`,
    [name],
  );

  if (!rows.length) {
    const error = new Error(`ບໍ່ພົບພາກວິຊາ "${name}" ໃນຖານຂໍ້ມູນ`);
    error.statusCode = 400;
    throw error;
  }

  return rows[0].id;
}

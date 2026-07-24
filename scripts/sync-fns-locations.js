import "dotenv/config";
import mysql from "mysql2/promise";
import { fnsLocationMasterSeed } from "../frontend/src/locationMasterData.js";

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "lost_found_hub",
  waitForConnections: true,
  connectionLimit: 2,
});

const MANAGED_BUILDINGS = [
  "ຕຶກ CS",
  "ຕຶກ MA",
  "ຕຶກ BI",
  "ຕຶກ FNS",
  "SLB - ພາກເຄມີ",
  "SLB - ພາກຟີຊິກ",
  "SLB - ພາກຊີວະສາດ",
  "ຕຶກ BI ຕຶກທົດລອງ",
  "ອາຄານຫ້ອງທົດລອງວິທະຍາສາດທຳມະຊາດ",
  "ຫ້ອງທົດລອງ ຟີຊິກສາດ",
];

function getRoomCode(name) {
  const code = name.split(" - ")[0]?.trim().toUpperCase();
  if (/^(CS|MA|BI|CH|PH|FNS)\d+$/.test(code) || code === "FNS-SEC") {
    return code;
  }
  return "";
}

async function hasColumn(connection, table, column) {
  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS column_count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [table, column],
  );
  return Number(rows[0]?.column_count ?? 0) > 0;
}

async function findExistingLocation(connection, row) {
  const code = getRoomCode(row.name);

  if (!code) {
    const [rows] = await connection.execute(
      "SELECT id FROM locations WHERE name_th = ? ORDER BY id LIMIT 1",
      [row.name],
    );
    return rows[0]?.id ?? null;
  }

  const [rows] = await connection.execute(
    `
      SELECT id
      FROM locations
      WHERE name_th = ?
         OR UPPER(name_th) LIKE ?
      ORDER BY (name_th = ?) DESC, id
      LIMIT 1
    `,
    [row.name, `${code} - %`, row.name],
  );

  return rows[0]?.id ?? null;
}

async function syncLocations() {
  const connection = await pool.getConnection();
  const syncedIds = [];
  let inserted = 0;
  let updated = 0;
  let deactivated = 0;

  try {
    await connection.beginTransaction();

    const hasLocationType = await hasColumn(connection, "locations", "location_type");

    for (const row of fnsLocationMasterSeed) {
      const existingId = await findExistingLocation(connection, row);
      const values = [
        row.name,
        row.building || null,
        row.floor ?? "",
        row.detail || null,
        1,
      ];

      if (existingId) {
        const locationTypeSet = hasLocationType ? ", location_type = ?" : "";
        const params = hasLocationType
          ? [...values, row.locationType ?? "both", existingId]
          : [...values, existingId];

        await connection.execute(
          `
            UPDATE locations
            SET name_th = ?, building = ?, floor = ?, detail = ?, is_active = ?${locationTypeSet}
            WHERE id = ?
          `,
          params,
        );
        syncedIds.push(existingId);
        updated += 1;
      } else if (hasLocationType) {
        const [result] = await connection.execute(
          `
            INSERT INTO locations (name_th, building, floor, detail, location_type, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [...values.slice(0, 4), row.locationType ?? "both", 1],
        );
        syncedIds.push(result.insertId);
        inserted += 1;
      } else {
        const [result] = await connection.execute(
          `
            INSERT INTO locations (name_th, building, floor, detail, is_active)
            VALUES (?, ?, ?, ?, ?)
          `,
          values,
        );
        syncedIds.push(result.insertId);
        inserted += 1;
      }
    }

    if (syncedIds.length) {
      const idPlaceholders = syncedIds.map(() => "?").join(", ");
      const buildingPlaceholders = MANAGED_BUILDINGS.map(() => "?").join(", ");
      const [result] = await connection.execute(
        `
          UPDATE locations
          SET is_active = 0
          WHERE id NOT IN (${idPlaceholders})
            AND (
              building IN (${buildingPlaceholders})
              OR UPPER(name_th) REGEXP '^(CS|MA|BI|CH|PH|FNS)[0-9]+ - '
              OR UPPER(name_th) LIKE 'FNS-SEC - %'
              OR name_th IN (
                'CH - ຫ້ອງທົດລອງພາກເຄມີ',
                'CH100 - ຫ້ອງພັກຄູ',
                'ຫ້ອງທົດລອງ ຟີຊິກສາດ'
              )
            )
        `,
        [...syncedIds, ...MANAGED_BUILDINGS],
      );
      deactivated = result.affectedRows;
    }

    await connection.commit();
    console.log(
      `Synced ${fnsLocationMasterSeed.length} FNS locations: ${inserted} inserted, ${updated} updated, ${deactivated} deactivated.`,
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

syncLocations().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

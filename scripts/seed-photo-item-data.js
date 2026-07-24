import "dotenv/config";
import mysql from "mysql2/promise";
import { rebuildAllMatches } from "../backend/src/services/weightedScoreMatching.js";

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "lost_found_hub",
  waitForConnections: true,
  connectionLimit: 10,
});

const images = {
  ring: "/api/uploads/images/photo-items/nicholasdeloittemedia-engagement-ring-2093824.jpg",
  earbuds: "/api/uploads/images/photo-items/iqbalstock-earbuds-7520738.jpg",
  watch: "/api/uploads/images/photo-items/mikewildadventure-hours-5005721.jpg",
  phone: "/api/uploads/images/photo-items/new-cell-phone-colorful-background.jpg",
  wallet: "/api/uploads/images/photo-items/blickpixel-wallet-494169.jpg",
  glasses: "/api/uploads/images/photo-items/arminep-glass-7695510.jpg",
};

function marks(values) {
  return values.map(() => "?").join(", ");
}

async function one(connection, sql, values = []) {
  const [rows] = await connection.execute(sql, values);
  return rows[0] ?? null;
}

async function lookupId(connection, table, whereSql, values, label) {
  const row = await one(connection, `SELECT id FROM ${table} WHERE ${whereSql} LIMIT 1`, values);
  if (!row) throw new Error(`Missing required lookup: ${label}`);
  return row.id;
}

async function upsertMember(connection, member) {
  const [result] = await connection.execute(
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
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id),
        role = VALUES(role),
        student_code = VALUES(student_code),
        employee_code = VALUES(employee_code),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        phone = VALUES(phone),
        department_id = VALUES(department_id),
        identity_status = VALUES(identity_status),
        is_active = 1,
        updated_at = NOW()
    `,
    [
      member.role,
      member.username,
      member.password,
      member.studentCode,
      member.employeeCode,
      member.firstName,
      member.lastName,
      member.email,
      member.phone,
      member.departmentId,
      member.identityStatus,
    ],
  );

  return result.insertId;
}

async function cleanupPhotoRows(connection, { lostStudentId, finderStudentId }) {
  const [lostRows] = await connection.query(
    `
      SELECT DISTINCT lp.id
      FROM lost_posts lp
      LEFT JOIN item_images ii ON ii.lost_post_id = lp.id
      WHERE lp.owner_id = ?
        OR ii.image_url LIKE '/api/uploads/images/photo-items/%'
    `,
    [lostStudentId],
  );
  const [foundRows] = await connection.query(
    `
      SELECT DISTINCT fp.id
      FROM found_posts fp
      LEFT JOIN item_images ii ON ii.found_post_id = fp.id
      WHERE fp.finder_id = ?
        OR ii.image_url LIKE '/api/uploads/images/photo-items/%'
    `,
    [finderStudentId],
  );
  const lostIds = lostRows.map((row) => row.id);
  const foundIds = foundRows.map((row) => row.id);

  let claimIds = [];
  if (lostIds.length || foundIds.length) {
    const filters = [];
    const values = [];

    if (lostIds.length) {
      filters.push(`lost_post_id IN (${marks(lostIds)})`);
      values.push(...lostIds);
    }

    if (foundIds.length) {
      filters.push(`found_post_id IN (${marks(foundIds)})`);
      values.push(...foundIds);
    }

    const [claimRows] = await connection.query(
      `SELECT id FROM claim_requests WHERE ${filters.join(" OR ")}`,
      values,
    );
    claimIds = claimRows.map((row) => row.id);
  }

  if (claimIds.length || foundIds.length) {
    const filters = [];
    const values = [];

    if (claimIds.length) {
      filters.push(`claim_request_id IN (${marks(claimIds)})`);
      values.push(...claimIds);
    }

    if (foundIds.length) {
      filters.push(`found_post_id IN (${marks(foundIds)})`);
      values.push(...foundIds);
    }

    await connection.query(`DELETE FROM return_records WHERE ${filters.join(" OR ")}`, values);
  }

  if (foundIds.length) {
    await connection.query(`DELETE FROM handover_records WHERE found_post_id IN (${marks(foundIds)})`, foundIds);
  }

  if (lostIds.length || foundIds.length) {
    const filters = [];
    const values = [];

    if (lostIds.length) {
      filters.push(`lost_post_id IN (${marks(lostIds)})`);
      values.push(...lostIds);
    }

    if (foundIds.length) {
      filters.push(`found_post_id IN (${marks(foundIds)})`);
      values.push(...foundIds);
    }

    await connection.query(`DELETE FROM matches WHERE ${filters.join(" OR ")}`, values);
    await connection.query(`DELETE FROM item_images WHERE ${filters.join(" OR ")}`, values);
  }

  if (claimIds.length) {
    await connection.query(`DELETE FROM claim_requests WHERE id IN (${marks(claimIds)})`, claimIds);
  }

  if (foundIds.length) {
    await connection.query(`DELETE FROM found_posts WHERE id IN (${marks(foundIds)})`, foundIds);
  }

  if (lostIds.length) {
    await connection.query(`DELETE FROM lost_posts WHERE id IN (${marks(lostIds)})`, lostIds);
  }
}

async function insertImage(connection, image) {
  await connection.execute(
    `
      INSERT INTO item_images (
        owner_type,
        lost_post_id,
        found_post_id,
        image_url,
        alt_text,
        sort_order,
        created_at
      ) VALUES (?, ?, ?, ?, ?, 1, NOW())
    `,
    [
      image.ownerType,
      image.lostPostId ?? null,
      image.foundPostId ?? null,
      image.imageUrl,
      image.altText,
    ],
  );
}

async function insertLostPost(connection, post) {
  const [result] = await connection.execute(
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
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      post.ownerId,
      post.categoryId,
      post.locationId,
      post.title,
      post.description,
      post.color ?? null,
      post.brand ?? null,
      post.uniqueMark ?? null,
      post.lostAt,
      post.contactName,
      post.contactChannel,
      post.status,
      post.createdAt,
      post.updatedAt ?? post.createdAt,
    ],
  );

  await insertImage(connection, {
    ownerType: "lost_post",
    lostPostId: result.insertId,
    imageUrl: post.imageUrl,
    altText: post.title,
  });

  return result.insertId;
}

async function insertFoundPost(connection, post) {
  const [result] = await connection.execute(
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
        status,
        approved_by,
        approved_at,
        reject_reason,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      post.finderId,
      post.categoryId,
      post.locationId,
      post.title,
      post.description,
      post.color ?? null,
      post.brand ?? null,
      post.uniqueMark ?? null,
      post.foundAt,
      post.status,
      post.approvedBy ?? null,
      post.approvedAt ?? null,
      post.rejectReason ?? null,
      post.createdAt,
      post.updatedAt ?? post.createdAt,
    ],
  );

  await insertImage(connection, {
    ownerType: "found_post",
    foundPostId: result.insertId,
    imageUrl: post.imageUrl,
    altText: post.title,
  });

  return result.insertId;
}

async function insertHandover(connection, row) {
  await connection.execute(
    `
      INSERT INTO handover_records (
        found_post_id,
        received_by,
        handover_location_id,
        handed_over_at,
        proof_image_url,
        note,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `,
    [row.foundPostId, row.receivedBy, row.locationId, row.handedOverAt, row.proofImageUrl, row.note],
  );
}

async function main() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const departmentId = await lookupId(connection, "departments", "code = 'CS'", [], "CS department");
    const jewelryId = await lookupId(connection, "item_categories", "name_th LIKE ?", ["%ປະດັບ%"], "jewelry category");
    const electronicsId = await lookupId(connection, "item_categories", "name_th LIKE ?", ["%ອີເລັກ%"], "electronics category");
    const personalId = await lookupId(connection, "item_categories", "name_th LIKE ?", ["%ສ່ວນຕົວ%"], "personal category");

    const protectionRoomId = await lookupId(connection, "locations", "name_th = ?", ["ຫ້ອງຄຸ້ມຄອງ"], "protection room");
    const bi112Id = await lookupId(connection, "locations", "name_th LIKE 'BI112%'", [], "BI112");
    const ch101Id = await lookupId(connection, "locations", "name_th LIKE 'CH101%'", [], "CH101");
    const cs001Id = await lookupId(connection, "locations", "name_th LIKE 'CS001%'", [], "CS001");
    const ma101Id = await lookupId(connection, "locations", "name_th LIKE 'MA101%'", [], "MA101");
    const ma103Id = await lookupId(connection, "locations", "name_th LIKE 'MA103%'", [], "MA103");
    const ph102Id = await lookupId(connection, "locations", "name_th LIKE 'PH102%'", [], "PH102");

    const teacherId = await upsertMember(connection, {
      role: "teacher",
      username: "photo_teacher",
      password: "photo123",
      studentCode: null,
      employeeCode: "PHOTO-T001",
      firstName: "ອາຈານ",
      lastName: "ຄຸ້ມຄອງ",
      email: "photo.teacher@fns.local",
      phone: "020-1111-0001",
      departmentId,
      identityStatus: "verified",
    });

    const lostStudentId = await upsertMember(connection, {
      role: "student",
      username: "photo_student_lost",
      password: "photo123",
      studentCode: "PHOTO-S001",
      employeeCode: null,
      firstName: "ນັກສຶກສາ",
      lastName: "ແຈ້ງຂອງສູນຫາຍ",
      email: "photo.student.lost@fns.local",
      phone: "020-1111-0002",
      departmentId,
      identityStatus: "verified",
    });

    const finderStudentId = await upsertMember(connection, {
      role: "student",
      username: "photo_student_found",
      password: "photo123",
      studentCode: "PHOTO-S002",
      employeeCode: null,
      firstName: "ນັກສຶກສາ",
      lastName: "ແຈ້ງພົບຂອງ",
      email: "photo.student.found@fns.local",
      phone: "020-1111-0003",
      departmentId,
      identityStatus: "verified",
    });

    await cleanupPhotoRows(connection, { lostStudentId, finderStudentId });

    const baseLost = {
      ownerId: lostStudentId,
      contactName: "ນັກສຶກສາ ແຈ້ງຂອງສູນຫາຍ",
      contactChannel: "photo.student.lost@fns.local",
    };

    const ringFoundId = await insertFoundPost(connection, {
      finderId: finderStudentId,
      categoryId: jewelryId,
      locationId: ch101Id,
      title: "ພົບແຫວນສີເງິນ",
      description: "ພົບແຫວນສີເງິນຢູ່ໃກ້ຫ້ອງພາກວິຊາເຄມີ ໄດ້ນຳມາຝາກທີ່ຫ້ອງຄຸ້ມຄອງແລ້ວ",
      color: "ເງິນ",
      uniqueMark: "ມີຫົວແກ້ວຢູ່ກາງວົງ",
      foundAt: "2026-07-10 09:20:00",
      status: "approved",
      approvedBy: teacherId,
      approvedAt: "2026-07-10 10:00:00",
      createdAt: "2026-07-10 09:40:00",
      imageUrl: images.ring,
    });

    await insertLostPost(connection, {
      ...baseLost,
      categoryId: electronicsId,
      locationId: bi112Id,
      title: "ຫູຟັງສາຍສີຂາວກຳລັງປະກາດຫາ",
      description: "ລືມຫູຟັງສາຍສີຂາວໄວ້ຫຼັງເລີກຮຽນ ມີສາຍຍາວ ແລະ ມີປຸ່ມຄວບຄຸມຢູ່ກາງສາຍ",
      color: "ຂາວ",
      brand: null,
      uniqueMark: "ສາຍຍາວ ມີປຸ່ມຄວບຄຸມ",
      lostAt: "2026-06-01 14:30:00",
      status: "published",
      createdAt: "2026-06-01 15:00:00",
      imageUrl: images.earbuds,
    });

    const watchFoundId = await insertFoundPost(connection, {
      finderId: finderStudentId,
      categoryId: personalId,
      locationId: ph102Id,
      title: "ພົບນາລິກາສີດຳລໍຖ້າກວດສອບ",
      description: "ພົບນາລິກາສີດຳສາຍສີຂຽວຢູ່ຫ້ອງ PH102 ລໍຖ້າອາຈານກວດກ່ອນອະນຸມັດ",
      color: "ດຳ",
      uniqueMark: "ສາຍສີຂຽວ ໜ້າປັດໃຫຍ່",
      foundAt: "2026-07-12 08:45:00",
      status: "pending_approval",
      createdAt: "2026-07-12 09:00:00",
      imageUrl: images.watch,
    });

    const phoneLostId = await insertLostPost(connection, {
      ...baseLost,
      categoryId: electronicsId,
      locationId: cs001Id,
      title: "ໂທລະສັບສີເທົາສູນຫາຍ",
      description: "ໂທລະສັບສີເທົາຫາຍຢູ່ຫ້ອງ CS001 ຫຼັງຈາກຮຽນຕອນເຊົ້າ",
      color: "ເທົາ",
      brand: "Samsung",
      uniqueMark: "ຝາຫຼັງສີເທົາ ກ້ອງຫຼັງ 3 ຕົວ",
      lostAt: "2026-07-13 10:00:00",
      status: "published",
      createdAt: "2026-07-13 10:20:00",
      imageUrl: images.phone,
    });

    const phoneFoundId = await insertFoundPost(connection, {
      finderId: finderStudentId,
      categoryId: electronicsId,
      locationId: cs001Id,
      title: "ພົບໂທລະສັບສີເທົາ",
      description: "ນຳມາສົ່ງແລ້ວ",
      color: null,
      brand: null,
      uniqueMark: null,
      foundAt: "2026-07-13 10:30:00",
      status: "approved",
      approvedBy: teacherId,
      approvedAt: "2026-07-13 11:00:00",
      createdAt: "2026-07-13 10:45:00",
      imageUrl: images.phone,
    });

    const walletLostId = await insertLostPost(connection, {
      ...baseLost,
      categoryId: personalId,
      locationId: ma101Id,
      title: "ກະເປົາເງິນສີນ້ຳຕານໄດ້ຮັບຄືນແລ້ວ",
      description: "ກະເປົາເງິນສີນ້ຳຕານຫາຍຢູ່ໃກ້ຫ້ອງສະໝຸດ ແລະ ໄດ້ຮັບຄືນແລ້ວ",
      color: "ນ້ຳຕານ",
      uniqueMark: "ກະເປົາເປີດໄດ້ ມີຊ່ອງໃສ່ບັດຫຼາຍຊ່ອງ",
      lostAt: "2026-07-09 13:00:00",
      status: "closed",
      createdAt: "2026-07-09 13:30:00",
      imageUrl: images.wallet,
    });

    const walletFoundId = await insertFoundPost(connection, {
      finderId: finderStudentId,
      categoryId: personalId,
      locationId: ma101Id,
      title: "ກະເປົາເງິນສີນ້ຳຕານສົ່ງຄືນແລ້ວ",
      description: "ພົບກະເປົາເງິນຢູ່ຫ້ອງສະໝຸດ ອາຈານກວດຂໍ້ມູນ ແລະ ສົ່ງຄືນເຈົ້າຂອງແລ້ວ",
      color: "ນ້ຳຕານ",
      uniqueMark: "ມີຊ່ອງໃສ່ບັດຫຼາຍຊ່ອງ",
      foundAt: "2026-07-09 13:20:00",
      status: "returned",
      approvedBy: teacherId,
      approvedAt: "2026-07-09 14:00:00",
      createdAt: "2026-07-09 13:40:00",
      imageUrl: images.wallet,
    });

    await insertFoundPost(connection, {
      finderId: finderStudentId,
      categoryId: personalId,
      locationId: ma103Id,
      title: "ແວ່ນຕາສີດຳຖືກປະຕິເສດ",
      description: "ຕົວຢ່າງລາຍການພົບຂອງທີ່ຖືກປະຕິເສດ ເພາະລາຍລະອຽດຍັງບໍ່ພຽງພໍ",
      color: "ດຳ",
      uniqueMark: "ກອບກົມສີດຳ",
      foundAt: "2026-07-08 16:00:00",
      status: "rejected",
      rejectReason: "ລາຍລະອຽດບໍ່ພຽງພໍ ຕ້ອງລະບຸຈຸດທີ່ພົບໃຫ້ຊັດເຈນ",
      createdAt: "2026-07-08 16:20:00",
      imageUrl: images.glasses,
    });

    for (const foundPostId of [ringFoundId, watchFoundId, phoneFoundId, walletFoundId]) {
      await insertHandover(connection, {
        foundPostId,
        receivedBy: teacherId,
        locationId: protectionRoomId,
        handedOverAt: "2026-07-13 12:00:00",
        proofImageUrl: images.wallet,
        note: "ບັນທຶກຕົວຢ່າງ: ນັກສຶກສານຳຂອງທີ່ພົບມາຝາກໄວ້ທີ່ຫ້ອງຄຸ້ມຄອງ",
      });
    }

    const [claimResult] = await connection.execute(
      `
        INSERT INTO claim_requests (
          found_post_id,
          claimant_id,
          lost_post_id,
          claim_message,
          status,
          verified_by,
          verified_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'returned', ?, ?, ?, ?)
      `,
      [
        walletFoundId,
        lostStudentId,
        walletLostId,
        "ຂ້ອຍເປັນເຈົ້າຂອງກະເປົາເງິນ ສາມາດລະບຸລາຍລະອຽດຂ້າງໃນໄດ້",
        teacherId,
        "2026-07-09 14:20:00",
        "2026-07-09 14:10:00",
        "2026-07-09 14:20:00",
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
          note,
          returned_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        claimResult.insertId,
        walletFoundId,
        teacherId,
        lostStudentId,
        protectionRoomId,
        images.wallet,
        "ອາຈານກວດຢືນຢັນເຈົ້າຂອງ ແລະ ສົ່ງຄືນສຳເລັດ",
        "2026-07-09 14:30:00",
      ],
    );

    await connection.commit();

    const rebuiltMatches = await rebuildAllMatches(pool);
    console.log(
      JSON.stringify(
        {
          insertedPhotoLostPosts: 3,
          insertedPhotoFoundPosts: 5,
          copiedImageFolder: "uploads/images/photo-items",
          rebuiltMatches: rebuiltMatches.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

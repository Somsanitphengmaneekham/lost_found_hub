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
  phone: "/api/uploads/images/2026-06/1782369333091-62cddc39-51ff-4c7f-9c0a-c4f162d01122.jpg",
  tablet: "/api/uploads/images/2026-06/1782371592787-6cf4cc17-91d5-4fbe-af44-25269e4cf19d.webp",
  mouse: "/api/uploads/images/2026-06/1782373883026-3569e418-3fe9-4301-b2b6-ecd0a0445383.jpg",
  keys: "/api/uploads/images/2026-06/1782629265549-76eaffca-59bb-44da-8db3-c87e5bcf8643.jpg",
  lockKeys: "/api/uploads/images/2026-06/1782715512377-b88a5032-f73f-4556-b6f2-10d40530d877.webp",
};

function listMarks(values) {
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

async function cleanupSampleRows(connection, { lostStudentId, finderStudentId }) {
  const [lostRows] = await connection.query(`SELECT id FROM lost_posts WHERE owner_id = ?`, [lostStudentId]);
  const [foundRows] = await connection.query(`SELECT id FROM found_posts WHERE finder_id = ?`, [finderStudentId]);
  const lostIds = lostRows.map((row) => row.id);
  const foundIds = foundRows.map((row) => row.id);

  let claimIds = [];
  if (lostIds.length || foundIds.length) {
    const filters = [];
    const values = [];

    if (lostIds.length) {
      filters.push(`lost_post_id IN (${listMarks(lostIds)})`);
      values.push(...lostIds);
    }

    if (foundIds.length) {
      filters.push(`found_post_id IN (${listMarks(foundIds)})`);
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
      filters.push(`claim_request_id IN (${listMarks(claimIds)})`);
      values.push(...claimIds);
    }

    if (foundIds.length) {
      filters.push(`found_post_id IN (${listMarks(foundIds)})`);
      values.push(...foundIds);
    }

    await connection.query(`DELETE FROM return_records WHERE ${filters.join(" OR ")}`, values);
  }

  if (foundIds.length) {
    await connection.query(`DELETE FROM handover_records WHERE found_post_id IN (${listMarks(foundIds)})`, foundIds);
  }

  if (lostIds.length || foundIds.length) {
    const filters = [];
    const values = [];

    if (lostIds.length) {
      filters.push(`lost_post_id IN (${listMarks(lostIds)})`);
      values.push(...lostIds);
    }

    if (foundIds.length) {
      filters.push(`found_post_id IN (${listMarks(foundIds)})`);
      values.push(...foundIds);
    }

    await connection.query(`DELETE FROM matches WHERE ${filters.join(" OR ")}`, values);
    await connection.query(`DELETE FROM item_images WHERE ${filters.join(" OR ")}`, values);
  }

  if (claimIds.length) {
    await connection.query(`DELETE FROM claim_requests WHERE id IN (${listMarks(claimIds)})`, claimIds);
  }

  if (foundIds.length) {
    await connection.query(`DELETE FROM found_posts WHERE id IN (${listMarks(foundIds)})`, foundIds);
  }

  if (lostIds.length) {
    await connection.query(`DELETE FROM lost_posts WHERE id IN (${listMarks(lostIds)})`, lostIds);
  }
}

async function insertImage(connection, { ownerType, lostPostId = null, foundPostId = null, imageUrl, altText }) {
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
    [ownerType, lostPostId, foundPostId, imageUrl, altText],
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
    const electronicsId = await lookupId(connection, "item_categories", "name_th LIKE ?", ["%ອີເລັກ%"], "electronics");
    const personalId = await lookupId(connection, "item_categories", "name_th LIKE ?", ["%ສ່ວນຕົວ%"], "personal items");
    const otherId = await lookupId(connection, "item_categories", "name_th LIKE ?", ["%ອື່ນ%"], "other items");

    const protectionRoomId = await lookupId(connection, "locations", "name_th = ?", ["ຫ້ອງຄຸ້ມຄອງ"], "protection room");
    const cs001Id = await lookupId(connection, "locations", "name_th LIKE 'CS001%'", [], "CS001");
    const bi112Id = await lookupId(connection, "locations", "name_th LIKE 'BI112%'", [], "BI112");
    const ma103Id = await lookupId(connection, "locations", "name_th LIKE 'MA103%'", [], "MA103");

    const teacherId = await upsertMember(connection, {
      role: "teacher",
      username: "seed_teacher",
      password: "seed123",
      studentCode: null,
      employeeCode: "SEED-T001",
      firstName: "ອາຈານ",
      lastName: "ທົດລອງ",
      email: "seed.teacher@fns.local",
      phone: "020-0000-0001",
      departmentId,
      identityStatus: "verified",
    });
    const lostStudentId = await upsertMember(connection, {
      role: "student",
      username: "seed_student_lost",
      password: "seed123",
      studentCode: "SEED-S001",
      employeeCode: null,
      firstName: "ນັກສຶກສາ",
      lastName: "ສູນຫາຍ",
      email: "seed.student.lost@fns.local",
      phone: "020-0000-0002",
      departmentId,
      identityStatus: "verified",
    });
    const finderStudentId = await upsertMember(connection, {
      role: "student",
      username: "seed_student_found",
      password: "seed123",
      studentCode: "SEED-S002",
      employeeCode: null,
      firstName: "ນັກສຶກສາ",
      lastName: "ພົບຂອງ",
      email: "seed.student.found@fns.local",
      phone: "020-0000-0003",
      departmentId,
      identityStatus: "verified",
    });

    await cleanupSampleRows(connection, { lostStudentId, finderStudentId });

    const baseLost = {
      ownerId: lostStudentId,
      contactName: "ນັກສຶກສາ ສູນຫາຍ",
      contactChannel: "seed.student.lost@fns.local",
    };

    const lostIds = {};
    lostIds.pendingPhone = await insertLostPost(connection, {
      ...baseLost,
      categoryId: electronicsId,
      locationId: cs001Id,
      title: "ໂທລະສັບ iPhone 13 ລໍຖ້າອະນຸມັດ",
      description: "ນັກສຶກສາແຈ້ງວ່າລືມໂທລະສັບໄວ້ຫຼັງເລີກຮຽນ ອາຈານຍັງບໍ່ທັນອະນຸມັດ",
      color: "ດຳ",
      brand: "Apple",
      uniqueMark: "ເຄສສີດຳ ມີຮອຍແຕກນ້ອຍຢູ່ດ້ານຫຼັງ",
      lostAt: "2026-07-18 09:10:00",
      status: "pending_approval",
      createdAt: "2026-07-18 09:30:00",
      imageUrl: images.phone,
    });
    lostIds.mouse75 = await insertLostPost(connection, {
      ...baseLost,
      categoryId: electronicsId,
      locationId: ma103Id,
      title: "ເມົ້າສາຍ USB ສີດຳ",
      description: "ລືມເມົ້າສາຍ USB ຫຼັງເລີກຮຽນ ສາຍຖືກມັດໄວ້",
      color: "ດຳ",
      brand: "PowerX",
      uniqueMark: "ສາຍ USB ຖືກມັດໄວ້",
      lostAt: "2026-07-22 11:00:00",
      status: "published",
      createdAt: "2026-07-22 11:15:00",
      imageUrl: images.mouse,
    });
    lostIds.key80 = await insertLostPost(connection, {
      ...baseLost,
      categoryId: otherId,
      locationId: ma103Id,
      title: "ກະແຈຫ້ອງ MA103 ກຳລັງປະກາດຫາ",
      description: "ກະແຈຫ້ອງມີພວງກະແຈສີແດງ ແລະ ມີກະແຈ 2 ດອກ",
      color: "ເງິນ",
      uniqueMark: "ພວງກະແຈສີແດງ",
      lostAt: "2026-07-15 13:00:00",
      status: "published",
      createdAt: "2026-07-15 13:30:00",
      imageUrl: images.keys,
    });
    lostIds.tablet85 = await insertLostPost(connection, {
      ...baseLost,
      categoryId: electronicsId,
      locationId: ma103Id,
      title: "ແທັບເລັດ ສູນຫາຍໃນ MA103",
      description: "ລືມໄວ້ຫຼັງຈາກຮຽນຄາບບ່າຍ",
      color: "ຟ້າ",
      brand: "Samsung",
      uniqueMark: "ບໍ່ມີເຄສ",
      lostAt: "2026-07-18 12:00:00",
      status: "published",
      createdAt: "2026-07-18 12:10:00",
      imageUrl: images.tablet,
    });
    lostIds.rejectedTablet = await insertLostPost(connection, {
      ...baseLost,
      categoryId: electronicsId,
      locationId: bi112Id,
      title: "ແທັບເລັດ ຂໍ້ມູນບໍ່ຊັດ",
      description: "ຂໍ້ມູນຍັງບໍ່ພຽງພໍ ຈຶ່ງຖືກປະຕິເສດ",
      color: null,
      brand: null,
      uniqueMark: null,
      lostAt: "2026-07-14 15:00:00",
      status: "rejected",
      createdAt: "2026-07-14 15:20:00",
      imageUrl: images.tablet,
    });
    lostIds.returnedKeys = await insertLostPost(connection, {
      ...baseLost,
      categoryId: otherId,
      locationId: bi112Id,
      title: "ກະແຈລັອກ ໄດ້ຮັບຄືນແລ້ວ",
      description: "ລາຍການນີ້ໃຊ້ສຳລັບຕົວຢ່າງຂອງທີ່ສົ່ງຄືນເຈົ້າຂອງສຳເລັດ",
      color: "ເງິນ",
      uniqueMark: "ກະແຈລັອກສີທອງ ມີກະແຈຕິດຢູ່",
      lostAt: "2026-07-12 08:40:00",
      status: "closed",
      createdAt: "2026-07-12 09:00:00",
      imageUrl: images.lockKeys,
    });

    const baseFound = {
      finderId: finderStudentId,
    };

    const foundIds = {};
    foundIds.pendingTablet = await insertFoundPost(connection, {
      ...baseFound,
      categoryId: electronicsId,
      locationId: bi112Id,
      title: "iPad Air ພົບໃນ BI112",
      description: "ພົບຢູ່ເທິງໂຕະ ລໍຖ້າອາຈານກວດກ່ອນປະກາດ",
      color: "ຟ້າ",
      brand: "Apple",
      uniqueMark: "ຕົວເຄື່ອງສີຟ້າ",
      foundAt: "2026-07-18 11:00:00",
      status: "pending_approval",
      createdAt: "2026-07-18 11:15:00",
      imageUrl: images.tablet,
    });
    foundIds.phone100 = await insertFoundPost(connection, {
      ...baseFound,
      categoryId: electronicsId,
      locationId: cs001Id,
      title: "iPhone ສີດຳ ພົບໃນ CS001",
      description: "ພົບ iPhone ສີດຳ ມີເຄສດຳ ແລະ ມີຮອຍຂອບເຄື່ອງ",
      color: "ດຳ",
      brand: "Apple",
      uniqueMark: "ເຄສດຳ ມີຮອຍແຕກນ້ອຍ",
      foundAt: "2026-07-18 09:40:00",
      status: "approved",
      approvedBy: teacherId,
      approvedAt: "2026-07-18 10:00:00",
      createdAt: "2026-07-18 09:50:00",
      imageUrl: images.phone,
    });
    foundIds.mouse75 = await insertFoundPost(connection, {
      ...baseFound,
      categoryId: electronicsId,
      locationId: bi112Id,
      title: "ເມົ້າສີດຳ ພົບໃນ BI112",
      description: "ພົບເມົ້າສາຍ USB ສີດຳ ຢູ່ໃກ້ໂຕະ",
      color: "ດຳ",
      brand: "PowerX",
      uniqueMark: "ສາຍ USB ຖືກມັດໄວ້",
      foundAt: "2026-07-22 11:30:00",
      status: "approved",
      approvedBy: teacherId,
      approvedAt: "2026-07-22 12:00:00",
      createdAt: "2026-07-22 11:45:00",
      imageUrl: images.mouse,
    });
    foundIds.key80 = await insertFoundPost(connection, {
      ...baseFound,
      categoryId: otherId,
      locationId: ma103Id,
      title: "ກະແຈຫ້ອງ MA103 ພົບແລ້ວ",
      description: "ພົບກະແຈມີພວງກະແຈສີແດງ ແລະ ກະແຈ 2 ດອກ",
      color: "ເງິນ",
      uniqueMark: "ພວງກະແຈສີແດງ",
      foundAt: "2026-07-20 13:20:00",
      status: "approved",
      approvedBy: teacherId,
      approvedAt: "2026-07-20 13:45:00",
      createdAt: "2026-07-20 13:35:00",
      imageUrl: images.keys,
    });
    foundIds.tablet85 = await insertFoundPost(connection, {
      ...baseFound,
      categoryId: electronicsId,
      locationId: ma103Id,
      title: "ແທັບເລັດ ພົບໃນ MA103",
      description: "ພົບເຄື່ອງໜຶ່ງເທິງຊັ້ນວາງຂອງ",
      color: "ເທົາ",
      brand: "Lenovo",
      uniqueMark: "ມີກະເປົາຜ້າສີດຳ",
      foundAt: "2026-07-18 12:20:00",
      status: "approved",
      approvedBy: teacherId,
      approvedAt: "2026-07-18 12:45:00",
      createdAt: "2026-07-18 12:35:00",
      imageUrl: images.tablet,
    });
    foundIds.returnedKeys = await insertFoundPost(connection, {
      ...baseFound,
      categoryId: otherId,
      locationId: bi112Id,
      title: "ກະແຈລັອກ ສົ່ງຄືນແລ້ວ",
      description: "ອາຈານກວດຂໍ້ມູນ ແລະ ສົ່ງຄືນເຈົ້າຂອງແລ້ວ",
      color: "ເງິນ",
      uniqueMark: "ກະແຈລັອກສີທອງ ມີກະແຈຕິດຢູ່",
      foundAt: "2026-07-12 09:10:00",
      status: "returned",
      approvedBy: teacherId,
      approvedAt: "2026-07-12 09:30:00",
      createdAt: "2026-07-12 09:20:00",
      imageUrl: images.lockKeys,
    });
    foundIds.rejectedMouse = await insertFoundPost(connection, {
      ...baseFound,
      categoryId: electronicsId,
      locationId: cs001Id,
      title: "ເມົ້າ ຮູບບໍ່ຊັດ",
      description: "ຕົວຢ່າງລາຍການພົບຂອງທີ່ຖືກປະຕິເສດ ເພາະຂໍ້ມູນບໍ່ພຽງພໍ",
      color: "ດຳ",
      foundAt: "2026-07-11 14:10:00",
      status: "rejected",
      rejectReason: "ລາຍລະອຽດບໍ່ພຽງພໍ",
      createdAt: "2026-07-11 14:20:00",
      imageUrl: images.mouse,
    });

    for (const foundPostId of [
      foundIds.pendingTablet,
      foundIds.phone100,
      foundIds.mouse75,
      foundIds.key80,
      foundIds.tablet85,
      foundIds.returnedKeys,
    ]) {
      await insertHandover(connection, {
        foundPostId,
        receivedBy: teacherId,
        locationId: protectionRoomId,
        handedOverAt: "2026-07-18 12:00:00",
        proofImageUrl: images.lockKeys,
        note: "ຕົວຢ່າງບັນທຶກການນຳສິ່ງຂອງມາສົ່ງທີ່ຫ້ອງຄຸ້ມຄອງ",
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
        foundIds.returnedKeys,
        lostStudentId,
        lostIds.returnedKeys,
        "ຂ້ອຍເປັນເຈົ້າຂອງກະແຈລັອກ ມີກະແຈຕິດຢູ່",
        teacherId,
        "2026-07-12 10:00:00",
        "2026-07-12 09:45:00",
        "2026-07-12 10:00:00",
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
        foundIds.returnedKeys,
        teacherId,
        lostStudentId,
        protectionRoomId,
        images.lockKeys,
        "ອາຈານກວດຂໍ້ມູນ ແລະ ນັກສຶກສາຮັບຂອງຄືນສຳເລັດ",
        "2026-07-12 10:15:00",
      ],
    );

    await connection.commit();

    const rebuiltMatches = await rebuildAllMatches(pool);
    console.log(
      JSON.stringify(
        {
          seedUsers: ["seed_teacher", "seed_student_lost", "seed_student_found"],
          insertedLostPosts: Object.keys(lostIds).length,
          insertedFoundPosts: Object.keys(foundIds).length,
          rebuiltMatches: rebuiltMatches.length,
          expectedMatchExamples: ["100", "85", "80", "75"],
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

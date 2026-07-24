import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { rebuildAllMatches } from "../backend/src/services/weightedScoreMatching.js";

const SOURCE_DIR = "C:/Users/somsa/Downloads/landf/landf";
const UPLOAD_SUBDIR = "landf-items";
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "images", UPLOAD_SUBDIR);
const UPLOAD_URL_PREFIX = `/api/uploads/images/${UPLOAD_SUBDIR}`;

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "lost_found_hub",
  waitForConnections: true,
  connectionLimit: 10,
});

const imageFiles = [
  {
    key: "hardDrive",
    source: "ຮາດດິສພົກພາ.png",
    target: "landf-hard-drive.png",
  },
  {
    key: "shoes",
    source: "ເກີບອະນິດາສ Duramo SL.png",
    target: "landf-adidas-duramo.png",
  },
  {
    key: "hoodie",
    source: "ເສື້ອກັນຫນາວສີຂາວ.jpg",
    target: "landf-white-hoodie.jpg",
  },
  {
    key: "womenRing",
    source: "ແຫວນຜູ້ຍິງjpg.jpg",
    target: "landf-women-ring.jpg",
  },
  {
    key: "silverRing",
    source: "ແຫວນເງິນ.jpg",
    target: "landf-silver-ring.jpg",
  },
  {
    key: "silverBlackRing",
    source: "ແຫວນເງິນ.webp",
    target: "landf-silver-black-ring.webp",
  },
  {
    key: "appleWatch",
    source: "applewatch.jpg",
    target: "landf-apple-watch.jpg",
  },
  {
    key: "casioWatch",
    source: "casiof91w.jpg",
    target: "landf-casio-f91w.jpg",
  },
  {
    key: "sdCard",
    source: "sdcard.jpg",
    target: "landf-sd-card.jpg",
  },
  {
    key: "portableSsd",
    source: "ssdພົກພາ.jpg",
    target: "landf-portable-ssd.jpg",
  },
  {
    key: "usbDrive",
    source: "usb.jpg",
    target: "landf-usb-drive.jpg",
  },
  {
    key: "usbHub",
    source: "usbhub.jpg",
    target: "landf-usb-hub.jpg",
  },
  {
    key: "carKey",
    source: "ກະແຈລົດໃຫຍ່ວີໂກ້.png",
    target: "landf-car-key.png",
  },
  {
    key: "crossNecklace",
    source: "ສາຍຄໍຂອງຜູ້ຊາຍ.jpg",
    target: "landf-cross-necklace.jpg",
  },
  {
    key: "tagNecklace",
    source: "ສາຍຄໍຜູ້ຊາຍ.png",
    target: "landf-tag-necklace.png",
  },
  {
    key: "xiaomiCharger",
    source: "ສາຍສາກສຽວມີ່.jpg",
    target: "landf-xiaomi-charger.jpg",
  },
  {
    key: "laptopCharger",
    source: "ສາຍສາກໂນ໊ດບຸກ.jpg",
    target: "landf-laptop-charger.jpg",
  },
  {
    key: "womenBracelet2",
    source: "ສາຍແຂນຜູ້ຍິງ2.jpg",
    target: "landf-women-bracelet-2.jpg",
  },
  {
    key: "fashionBracelet",
    source: "ສາຍແຂນແຟຊັ້ນ.jpg",
    target: "landf-fashion-bracelet.jpg",
  },
  {
    key: "notebook",
    source: "ປື້ມ.jpg",
    target: "landf-notebook.jpg",
  },
  {
    key: "womenBracelet",
    source: "ສາຍແຂນຜູ້ຍິງ.jpg",
    target: "landf-women-bracelet.jpg",
  },
  {
    key: "blackBracelet",
    source: "ສາຍແຂນແຟຊັ້ນ.png",
    target: "landf-black-bracelet.png",
  },
];

const imageUrlByKey = Object.fromEntries(
  imageFiles.map((file) => [file.key, `${UPLOAD_URL_PREFIX}/${file.target}`]),
);

const items = [
  {
    type: "found",
    imageKey: "hardDrive",
    category: "electronics",
    location: "BI112",
    title: "ພົບຮາດດິສພົກພາສີດຳ",
    description: "ພົບຮາດດິສພົກພາສີດຳຢູ່ໃກ້ຫ້ອງ BI112 ຫຼັງຈາກການຮຽນຄອມພິວເຕີ.",
    color: "ດຳ",
    brand: "Aukey",
    uniqueMark: "ມີສາຍ USB-C ຕິດມານຳ",
    occurredAt: "2026-07-03 09:15:00",
    status: "approved",
  },
  {
    type: "lost",
    imageKey: "shoes",
    category: "other",
    location: "MA104",
    title: "ເກີບອະດິດາສ Duramo SL ສູນຫາຍ",
    description: "ເກີບກິລາສີເທົາສູນຫາຍຢູ່ໃກ້ຫ້ອງ MA104.",
    color: "ເທົາ",
    brand: "Adidas",
    uniqueMark: "ຮອງເທົ້າມີແຖບສີເທົາເຂັ້ມ 3 ເສັ້ນ",
    occurredAt: "2026-07-02 16:20:00",
    status: "published",
  },
  {
    type: "found",
    imageKey: "hoodie",
    category: "other",
    location: "MA105",
    title: "ພົບເສື້ອກັນໜາວສີຂາວ",
    description: "ພົບເສື້ອກັນໜາວສີຂາວຢູ່ບ່ອນນັ່ງໃກ້ຫ້ອງ MA105.",
    color: "ຂາວ",
    brand: "Nike",
    uniqueMark: "ມີໂລໂກ້ຢູ່ກາງເສື້ອ",
    occurredAt: "2026-07-19 13:40:00",
    status: "pending_approval",
  },
  {
    type: "found",
    imageKey: "womenRing",
    category: "jewelry",
    location: "CH101",
    title: "ພົບແຫວນຜູ້ຍິງສີເງິນ",
    description: "ພົບແຫວນສີເງິນຢູ່ໃກ້ຫ້ອງ CH101 ແລະໄດ້ນຳມາຝາກຫ້ອງຄຸ້ມຄອງແລ້ວ.",
    color: "ເງິນ",
    brand: "",
    uniqueMark: "ມີຫົວແກ້ວຢູ່ກາງວົງ",
    occurredAt: "2026-06-23 09:20:00",
    status: "approved",
  },
  {
    type: "lost",
    imageKey: "silverRing",
    category: "jewelry",
    location: "CH101",
    title: "ແຫວນເງິນສູນຫາຍ",
    description: "ແຫວນສີເງິນສູນຫາຍຫຼັງຈາກຮຽນຢູ່ຫ້ອງ CH101.",
    color: "ເງິນ",
    brand: "",
    uniqueMark: "ວົງແຫວນສີເງິນ ຂະໜາດນ້ອຍ",
    occurredAt: "2026-06-22 11:10:00",
    status: "published",
  },
  {
    type: "found",
    imageKey: "silverBlackRing",
    category: "jewelry",
    location: "CH102",
    title: "ແຫວນສີເງິນຂອບດຳສົ່ງຄືນແລ້ວ",
    description: "ພົບແຫວນສີເງິນຂອບດຳ ອາຈານກວດຢືນຢັນແລະສົ່ງຄືນເຈົ້າຂອງແລ້ວ.",
    color: "ເງິນ/ດຳ",
    brand: "",
    uniqueMark: "ມີລາຍສີດຳຮອບວົງ",
    occurredAt: "2026-06-30 10:00:00",
    status: "returned",
  },
  {
    type: "found",
    imageKey: "appleWatch",
    category: "jewelry",
    location: "PH102",
    title: "ພົບໂມງ Apple Watch ສາຍສີດຳ",
    description: "ພົບໂມງ Apple Watch ຢູ່ຫ້ອງ PH102.",
    color: "ດຳ",
    brand: "Apple",
    uniqueMark: "ສາຍຜ້າສີດຳມີລາຍຟ້າ",
    occurredAt: "2026-07-15 08:25:00",
    status: "approved",
  },
  {
    type: "lost",
    imageKey: "casioWatch",
    category: "jewelry",
    location: "PH104",
    title: "ໂມງ Casio F-91W ສີດຳສູນຫາຍ",
    description: "ໂມງ Casio ສີດຳສູນຫາຍລະຫວ່າງຍ້າຍຫ້ອງຮຽນຟີຊິກ.",
    color: "ດຳ",
    brand: "Casio",
    uniqueMark: "ໜ້າປັດດິຈິຕອນ Casio F-91W",
    occurredAt: "2026-07-16 12:10:00",
    status: "published",
  },
  {
    type: "found",
    imageKey: "sdCard",
    category: "electronics",
    location: "CS006",
    title: "ພົບ SD Card Kingston 32GB",
    description: "ພົບ SD Card Kingston 32GB ຢູ່ໃກ້ຫ້ອງ Robot.",
    color: "ດຳ/ຂາວ",
    brand: "Kingston",
    uniqueMark: "ຂຽນ 32GB ຢູ່ດ້ານໜ້າ",
    occurredAt: "2026-06-24 15:30:00",
    status: "approved",
  },
  {
    type: "lost",
    imageKey: "portableSsd",
    category: "electronics",
    location: "CS005",
    title: "SSD ພົກພາ Samsung ສູນຫາຍ",
    description: "SSD ພົກພາ Samsung ສີເທົາສູນຫາຍຫຼັງຈາກໃຊ້ໃນຫ້ອງ CS005.",
    color: "ເທົາ",
    brand: "Samsung",
    uniqueMark: "ຕົວເຄື່ອງສີເທົາ ມີພອດ USB-C ດ້ານຂ້າງ",
    occurredAt: "2026-06-02 10:50:00",
    status: "pending_approval",
  },
  {
    type: "lost",
    imageKey: "usbDrive",
    category: "electronics",
    location: "CS007",
    title: "USB SanDisk ສີດຳສູນຫາຍ",
    description: "USB SanDisk ສີດຳສູນຫາຍຢູ່ໃນຕຶກ CS.",
    color: "ດຳ",
    brand: "SanDisk",
    uniqueMark: "USB 3.0 ຂອບສີຟ້າ",
    occurredAt: "2026-06-19 09:10:00",
    status: "published",
  },
  {
    type: "found",
    imageKey: "usbHub",
    category: "electronics",
    location: "CS003",
    title: "ພົບ USB Hub ສີດຳ",
    description: "ພົບ USB Hub ສີດຳຢູ່ໃນຫ້ອງ CS003.",
    color: "ດຳ",
    brand: "",
    uniqueMark: "ມີຊ່ອງ USB 4 ຊ່ອງ",
    occurredAt: "2026-06-18 14:05:00",
    status: "approved",
  },
  {
    type: "found",
    imageKey: "carKey",
    category: "personal",
    location: "MA103",
    title: "ພົບກະແຈລົດວີໂກ້",
    description: "ພົບກະແຈລົດວີໂກ້ຢູ່ໃກ້ຫ້ອງ MA103.",
    color: "ດຳ",
    brand: "Toyota",
    uniqueMark: "ມີປຸ່ມ HOLD ສີແດງ",
    occurredAt: "2026-07-06 17:15:00",
    status: "approved",
  },
  {
    type: "found",
    imageKey: "crossNecklace",
    category: "jewelry",
    location: "CH102",
    title: "ພົບສາຍຄໍຜູ້ຊາຍຈີ້ໄມ້ກາງແຂນ",
    description: "ພົບສາຍຄໍສີເງິນມີຈີ້ໄມ້ກາງແຂນຢູ່ໃກ້ຫ້ອງ CH102.",
    color: "ເງິນ",
    brand: "",
    uniqueMark: "ຈີ້ໄມ້ກາງແຂນສີເງິນ",
    occurredAt: "2026-06-27 10:30:00",
    status: "approved",
  },
  {
    type: "lost",
    imageKey: "tagNecklace",
    category: "jewelry",
    location: "CH103",
    title: "ສາຍຄໍຜູ້ຊາຍສີເງິນສູນຫາຍ",
    description: "ສາຍຄໍຜູ້ຊາຍສີເງິນສູນຫາຍຢູ່ໃກ້ຫ້ອງ CH103.",
    color: "ເງິນ",
    brand: "",
    uniqueMark: "ມີຈີ້ແຜ່ນເຫຼັກສີເງິນ",
    occurredAt: "2026-06-28 09:45:00",
    status: "published",
  },
  {
    type: "found",
    imageKey: "xiaomiCharger",
    category: "electronics",
    location: "CS001",
    title: "ສາຍສາກ Xiaomi ລໍຖ້າແກ້ຂໍ້ມູນ",
    description: "ພົບສາຍສາກ Xiaomi ແຕ່ຂໍ້ມູນຍັງບໍ່ຊັດເຈນ ຈຶ່ງຖືກປະຕິເສດໃຫ້ແກ້ໄຂ.",
    color: "ຂາວ",
    brand: "Xiaomi",
    uniqueMark: "ຫົວສາກ 120W",
    occurredAt: "2026-07-04 12:00:00",
    status: "rejected",
    rejectReason: "ກະລຸນາລະບຸຈຸດທີ່ພົບໃຫ້ຊັດເຈນກວ່ານີ້",
  },
  {
    type: "found",
    imageKey: "laptopCharger",
    category: "electronics",
    location: "BI109",
    title: "ພົບສາຍສາກໂນ໊ດບຸກສີດຳ",
    description: "ພົບສາຍສາກໂນ໊ດບຸກສີດຳຢູ່ຫ້ອງ BI109.",
    color: "ດຳ",
    brand: "",
    uniqueMark: "ມີກ່ອງ adapter ສີດຳແລະສາຍຍາວ",
    occurredAt: "2026-06-10 11:25:00",
    status: "approved",
  },
  {
    type: "lost",
    imageKey: "womenBracelet2",
    category: "jewelry",
    location: "MA106",
    title: "ສາຍແຂນຜູ້ຍິງສີເງິນຖືກປະຕິເສດ",
    description: "ຕົວຢ່າງລາຍການທີ່ຂໍ້ມູນບໍ່ພໍ ບໍ່ໄດ້ລະບຸເວລາສູນຫາຍ.",
    color: "ເງິນ",
    brand: "",
    uniqueMark: "ສາຍແຂນມີກ້ອນແກ້ວນ້ອຍ",
    occurredAt: "2026-07-01 10:00:00",
    status: "rejected",
    rejectReason: "ຂໍ້ມູນເວລາ ແລະ ຈຸດທີ່ສູນຫາຍຍັງບໍ່ຊັດເຈນ",
  },
  {
    type: "found",
    imageKey: "fashionBracelet",
    category: "jewelry",
    location: "MA105",
    title: "ພົບສາຍແຂນແຟຊັ້ນສີເງິນ",
    description: "ພົບສາຍແຂນແຟຊັ້ນສີເງິນຢູ່ໃກ້ຫ້ອງ MA105.",
    color: "ເງິນ",
    brand: "",
    uniqueMark: "ມີລາຍແກ້ວນ້ອຍຕະຫຼອດສາຍ",
    occurredAt: "2026-07-13 15:15:00",
    status: "pending_approval",
  },
  {
    type: "lost",
    imageKey: "notebook",
    category: "other",
    location: "MA101",
    title: "ປື້ມບັນທຶກສີສົ້ມສູນຫາຍ",
    description: "ປື້ມບັນທຶກສີສົ້ມສູນຫາຍຢູ່ຫ້ອງສະໝຸດ MA101.",
    color: "ສົ້ມ",
    brand: "",
    uniqueMark: "ໜ້າປົກສີສົ້ມ ມີສັນກຽວດ້ານຊ້າຍ",
    occurredAt: "2026-07-17 09:00:00",
    status: "pending_approval",
  },
  {
    type: "lost",
    imageKey: "womenBracelet",
    category: "jewelry",
    location: "MA107",
    title: "ສາຍແຂນຜູ້ຍິງສີເງິນສູນຫາຍ",
    description: "ສາຍແຂນຜູ້ຍິງສີເງິນສູນຫາຍຢູ່ແຖວ MA107.",
    color: "ເງິນ",
    brand: "",
    uniqueMark: "ມີປ້າຍ 925 ຢູ່ໃກ້ຕົວລັອກ",
    occurredAt: "2026-07-04 14:20:00",
    status: "published",
  },
  {
    type: "found",
    imageKey: "blackBracelet",
    category: "jewelry",
    location: "MA106",
    title: "ພົບສາຍແຂນສີດຳ",
    description: "ພົບສາຍແຂນສີດຳຢູ່ໃກ້ຫ້ອງ MA106.",
    color: "ດຳ",
    brand: "",
    uniqueMark: "ສາຍແຂນສີດຳ ຕົວລັອກສີເງິນ",
    occurredAt: "2026-07-05 16:00:00",
    status: "approved",
  },
];

function marks(values) {
  return values.map(() => "?").join(", ");
}

function compactName(member) {
  return [member.first_name, member.last_name].filter(Boolean).join(" ").trim() || member.username;
}

function buildContact(member) {
  return member.email || member.phone || member.username;
}

function pickByIncludes(rows, field, needles, label) {
  const loweredNeedles = needles.map((needle) => needle.toLowerCase());
  const found = rows.find((row) => {
    const value = String(row[field] ?? "").toLowerCase();
    return loweredNeedles.some((needle) => value.includes(needle));
  });
  if (!found) throw new Error(`Missing lookup: ${label}`);
  return found.id;
}

function pickLocation(locations, code) {
  return pickByIncludes(locations, "name_th", [code], code);
}

async function deleteWhereIn(connection, table, column, values) {
  if (!values.length) return;
  await connection.query(`DELETE FROM ${table} WHERE ${column} IN (${marks(values)})`, values);
}

async function cleanupSeedRows(connection) {
  const [lostRows] = await connection.query(
    `
      SELECT DISTINCT lost_post_id AS id
      FROM item_images
      WHERE lost_post_id IS NOT NULL
        AND image_url LIKE ?
    `,
    [`${UPLOAD_URL_PREFIX}/%`],
  );
  const [foundRows] = await connection.query(
    `
      SELECT DISTINCT found_post_id AS id
      FROM item_images
      WHERE found_post_id IS NOT NULL
        AND image_url LIKE ?
    `,
    [`${UPLOAD_URL_PREFIX}/%`],
  );

  const lostIds = lostRows.map((row) => row.id);
  const foundIds = foundRows.map((row) => row.id);

  if (!lostIds.length && !foundIds.length) {
    await connection.query(`DELETE FROM item_images WHERE image_url LIKE ?`, [`${UPLOAD_URL_PREFIX}/%`]);
    return { lostIds, foundIds };
  }

  const claimFilters = [];
  const claimValues = [];
  if (foundIds.length) {
    claimFilters.push(`found_post_id IN (${marks(foundIds)})`);
    claimValues.push(...foundIds);
  }
  if (lostIds.length) {
    claimFilters.push(`lost_post_id IN (${marks(lostIds)})`);
    claimValues.push(...lostIds);
  }

  let claimIds = [];
  if (claimFilters.length) {
    const [claimRows] = await connection.query(
      `SELECT id FROM claim_requests WHERE ${claimFilters.join(" OR ")}`,
      claimValues,
    );
    claimIds = claimRows.map((row) => row.id);
  }

  const returnFilters = [];
  const returnValues = [];
  if (claimIds.length) {
    returnFilters.push(`claim_request_id IN (${marks(claimIds)})`);
    returnValues.push(...claimIds);
  }
  if (foundIds.length) {
    returnFilters.push(`found_post_id IN (${marks(foundIds)})`);
    returnValues.push(...foundIds);
  }
  if (returnFilters.length) {
    await connection.query(`DELETE FROM return_records WHERE ${returnFilters.join(" OR ")}`, returnValues);
  }

  await deleteWhereIn(connection, "handover_records", "found_post_id", foundIds);

  const matchFilters = [];
  const matchValues = [];
  if (lostIds.length) {
    matchFilters.push(`lost_post_id IN (${marks(lostIds)})`);
    matchValues.push(...lostIds);
  }
  if (foundIds.length) {
    matchFilters.push(`found_post_id IN (${marks(foundIds)})`);
    matchValues.push(...foundIds);
  }
  if (matchFilters.length) {
    await connection.query(`DELETE FROM matches WHERE ${matchFilters.join(" OR ")}`, matchValues);
  }

  await connection.query(`DELETE FROM item_images WHERE image_url LIKE ?`, [`${UPLOAD_URL_PREFIX}/%`]);
  await deleteWhereIn(connection, "claim_requests", "id", claimIds);
  await deleteWhereIn(connection, "found_posts", "id", foundIds);
  await deleteWhereIn(connection, "lost_posts", "id", lostIds);

  return { lostIds, foundIds };
}

async function copyImages() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  for (const file of imageFiles) {
    await fs.copyFile(path.join(SOURCE_DIR, file.source), path.join(UPLOAD_DIR, file.target));
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

async function insertFoundPost(connection, post) {
  const isApproved = ["approved", "matched", "returned"].includes(post.status);
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
      post.memberId,
      post.categoryId,
      post.locationId,
      post.title,
      post.description,
      post.color || null,
      post.brand || null,
      post.uniqueMark || null,
      post.occurredAt,
      post.status,
      isApproved ? post.teacherId : null,
      isApproved ? post.approvedAt : null,
      post.rejectReason ?? null,
      post.createdAt,
      post.createdAt,
    ],
  );

  await insertImage(connection, {
    ownerType: "found_post",
    foundPostId: result.insertId,
    imageUrl: post.imageUrl,
    altText: post.title,
  });

  if (isApproved) {
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
      [
        result.insertId,
        post.teacherId,
        post.protectionRoomId,
        post.approvedAt,
        post.imageUrl,
        "ນັກສຶກສາໄດ້ນຳສິ່ງຂອງມາຝາກໄວ້ທີ່ຫ້ອງຄຸ້ມຄອງແລ້ວ",
      ],
    );
  }

  return result.insertId;
}

async function insertLostPost(connection, post, member) {
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
        reject_reason,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      post.memberId,
      post.categoryId,
      post.locationId,
      post.title,
      post.description,
      post.color || null,
      post.brand || null,
      post.uniqueMark || null,
      post.occurredAt,
      compactName(member),
      buildContact(member),
      post.status,
      post.rejectReason ?? null,
      post.createdAt,
      post.createdAt,
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

async function insertReturnRecord(connection, row) {
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
      ) VALUES (?, ?, NULL, ?, 'returned', ?, ?, ?, ?)
    `,
    [
      row.foundPostId,
      row.claimantId,
      "ຂ້ອຍໄດ້ມາຢືນຢັນລາຍລະອຽດກັບອາຈານທີ່ຫ້ອງຄຸ້ມຄອງແລ້ວ",
      row.teacherId,
      row.returnedAt,
      row.returnedAt,
      row.returnedAt,
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
      row.foundPostId,
      row.teacherId,
      row.claimantId,
      row.protectionRoomId,
      row.proofImageUrl,
      "ອາຈານກວດຢືນຢັນເຈົ້າຂອງ ແລະ ສົ່ງຄືນສຳເລັດ",
      row.returnedAt,
    ],
  );
}

async function main() {
  await copyImages();

  const connection = await pool.getConnection();
  const inserted = {
    found: [],
    lost: [],
    returnedFoundIds: [],
  };

  try {
    await connection.beginTransaction();

    await cleanupSeedRows(connection);

    const [studentsRows] = await connection.query(
      `
        SELECT id, username, first_name, last_name, email, phone
        FROM members
        WHERE role = 'student'
          AND is_active = 1
        ORDER BY
          CASE
            WHEN username LIKE 'seed_%' THEN 1
            WHEN username LIKE 'photo_%' THEN 1
            ELSE 0
          END,
          id
      `,
    );

    const students = studentsRows.filter(
      (student) => !String(student.username).startsWith("seed_") && !String(student.username).startsWith("photo_"),
    );
    const postMembers = students.length ? students : studentsRows;
    if (!postMembers.length) throw new Error("No active student users found.");

    const [teacherRows] = await connection.query(
      `
        SELECT id, username
        FROM members
        WHERE role = 'teacher'
          AND is_active = 1
        ORDER BY CASE WHEN username = 'teacher01' THEN 0 ELSE 1 END, id
        LIMIT 1
      `,
    );
    if (!teacherRows.length) throw new Error("No active teacher user found.");
    const teacherId = teacherRows[0].id;

    const [categories] = await connection.query(
      `SELECT id, name_th FROM item_categories WHERE is_active = 1 ORDER BY id`,
    );
    const categoryIds = {
      jewelry: pickByIncludes(categories, "name_th", ["ປະດັບ"], "jewelry category"),
      electronics: pickByIncludes(categories, "name_th", ["ອີເລັກ"], "electronics category"),
      personal: pickByIncludes(categories, "name_th", ["ສ່ວນຕົວ"], "personal category"),
      other: pickByIncludes(categories, "name_th", ["ອື່ນ"], "other category"),
    };

    const [locations] = await connection.query(
      `SELECT id, name_th FROM locations WHERE is_active = 1 ORDER BY id`,
    );
    const locationIds = {
      protectionRoom: pickByIncludes(locations, "name_th", ["ຫ້ອງຄຸ້ມຄອງ"], "protection room"),
      BI112: pickLocation(locations, "BI112"),
      BI109: pickLocation(locations, "BI109"),
      CH101: pickLocation(locations, "CH101"),
      CH102: pickLocation(locations, "CH102"),
      CH103: pickLocation(locations, "CH103"),
      PH102: pickLocation(locations, "PH102"),
      PH104: pickLocation(locations, "PH104"),
      CS001: pickLocation(locations, "CS001"),
      CS003: pickLocation(locations, "CS003"),
      CS005: pickLocation(locations, "CS005"),
      CS006: pickLocation(locations, "CS006"),
      CS007: pickLocation(locations, "CS007"),
      MA101: pickLocation(locations, "MA101"),
      MA103: pickLocation(locations, "MA103"),
      MA104: pickLocation(locations, "MA104"),
      MA105: pickLocation(locations, "MA105"),
      MA106: pickLocation(locations, "MA106"),
      MA107: pickLocation(locations, "MA107"),
    };

    let memberCursor = 0;
    const distribution = new Map(postMembers.map((member) => [member.id, { member, found: 0, lost: 0 }]));

    for (const item of items) {
      const member = postMembers[memberCursor % postMembers.length];
      memberCursor += 1;

      const createdAt = new Date(new Date(item.occurredAt).getTime() + 15 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      const post = {
        ...item,
        memberId: member.id,
        teacherId,
        protectionRoomId: locationIds.protectionRoom,
        categoryId: categoryIds[item.category],
        locationId: locationIds[item.location],
        imageUrl: imageUrlByKey[item.imageKey],
        createdAt,
        approvedAt: createdAt,
      };

      if (item.type === "found") {
        const id = await insertFoundPost(connection, post);
        inserted.found.push(id);
        distribution.get(member.id).found += 1;
        if (item.status === "returned") inserted.returnedFoundIds.push({ id, imageUrl: post.imageUrl });
      } else {
        const id = await insertLostPost(connection, post, member);
        inserted.lost.push(id);
        distribution.get(member.id).lost += 1;
      }
    }

    for (const returned of inserted.returnedFoundIds) {
      const claimant = postMembers[memberCursor % postMembers.length];
      memberCursor += 1;
      await insertReturnRecord(connection, {
        foundPostId: returned.id,
        claimantId: claimant.id,
        teacherId,
        protectionRoomId: locationIds.protectionRoom,
        proofImageUrl: returned.imageUrl,
        returnedAt: "2026-06-30 11:30:00",
      });
    }

    await connection.commit();

    const rebuiltMatches = await rebuildAllMatches(pool);

    const [landfMatches] = await pool.query(
      `
        SELECT
          m.id,
          m.match_score AS score,
          lp.title AS lost_title,
          fp.title AS found_title
        FROM matches m
        INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
        INNER JOIN found_posts fp ON fp.id = m.found_post_id
        WHERE m.lost_post_id IN (${marks(inserted.lost)})
           OR m.found_post_id IN (${marks(inserted.found)})
        ORDER BY m.match_score DESC, m.id DESC
      `,
      [...inserted.lost, ...inserted.found],
    );

    console.log(
      JSON.stringify(
        {
          copiedImages: imageFiles.length,
          copiedTo: path.relative(process.cwd(), UPLOAD_DIR),
          insertedFoundPosts: inserted.found.length,
          insertedLostPosts: inserted.lost.length,
          rebuiltMatchCount: rebuiltMatches.length,
          landfMatchScores: landfMatches.map((row) => ({
            score: Number(row.score),
            lost: row.lost_title,
            found: row.found_title,
          })),
          userDistribution: Array.from(distribution.values()).map(({ member, found, lost }) => ({
            userId: member.id,
            username: member.username,
            found,
            lost,
          })),
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

const REMOTE_IMAGE_URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;
const LOCAL_UPLOAD_URL_PATTERN = /^\/api\/uploads\/images\/[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/;

let ensuredColumnsPromise = null;

function createReturnError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function booleanFlag(value) {
  return value === true || value === 1 || ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanLimitedText(value, maxLength) {
  const text = cleanText(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeEvidenceImageUrl(value, label) {
  const imageUrl = cleanText(value);

  if (!imageUrl) {
    throw createReturnError(`${label} is required`);
  }

  if (imageUrl.startsWith("data:image/")) {
    throw createReturnError("Please upload image files instead of Base64 image data");
  }

  if (imageUrl.length > 2048) {
    throw createReturnError("Image URL is too long");
  }

  if (!LOCAL_UPLOAD_URL_PATTERN.test(imageUrl) && !REMOTE_IMAGE_URL_PATTERN.test(imageUrl)) {
    throw createReturnError("Image URL must come from the upload endpoint or use http/https");
  }

  return imageUrl;
}

export function normalizeReturnEvidence(body = {}) {
  const receiverType = cleanText(body.receiverType) === "representative" ? "representative" : "owner";
  const receiverName = cleanLimitedText(body.receiverName, 160);
  const receiverStudentCode = cleanLimitedText(body.receiverStudentCode, 50);
  const receiverDepartment = cleanLimitedText(body.receiverDepartment, 160);
  const receiverPhone = cleanLimitedText(body.receiverPhone, 50);
  const receiverPhotoUrl = normalizeEvidenceImageUrl(
    body.receiverPhotoUrl ?? body.proofImageUrl,
    "Receiver photo",
  );
  const identityVerified = booleanFlag(body.identityVerified);

  if (!receiverName) {
    throw createReturnError("Receiver name is required");
  }

  if (!receiverStudentCode && !receiverPhone) {
    throw createReturnError("Receiver student code or phone is required");
  }

  if (!identityVerified) {
    throw createReturnError("Identity verification must be confirmed before returning the item");
  }

  const evidence = {
    receiverType,
    receiverPhotoUrl,
    proofImageUrl: receiverPhotoUrl,
    receiverDepartment: receiverDepartment || null,
    receiverName,
    receiverPhone: receiverPhone || null,
    receiverStudentCode: receiverStudentCode || null,
    identityVerified: 1,
    representativeName: null,
    representativePhone: null,
    representativeRelation: null,
    authorizationNote: cleanText(body.authorizationNote) || null,
    authorizationImageUrl: null,
  };

  if (receiverType === "representative") {
    evidence.representativeName = cleanText(body.representativeName);
    evidence.representativePhone = cleanText(body.representativePhone);
    evidence.representativeRelation = cleanText(body.representativeRelation);
    evidence.authorizationImageUrl = normalizeEvidenceImageUrl(
      body.authorizationImageUrl,
      "Authorization proof image",
    );

    if (!evidence.representativeName || !evidence.representativePhone || !evidence.representativeRelation) {
      throw createReturnError("Representative name, phone and relation are required");
    }
  }

  return evidence;
}

const RETURN_RECORD_SECURITY_COLUMNS = [
  ["receiver_type", "ENUM('owner','representative') NOT NULL DEFAULT 'owner'"],
  ["receiver_photo_url", "LONGTEXT NULL"],
  ["receiver_name_snapshot", "VARCHAR(160) NULL"],
  ["receiver_student_code_snapshot", "VARCHAR(50) NULL"],
  ["receiver_department_snapshot", "VARCHAR(160) NULL"],
  ["receiver_phone_snapshot", "VARCHAR(50) NULL"],
  ["identity_verified", "TINYINT(1) NOT NULL DEFAULT 0"],
  ["representative_name", "VARCHAR(160) NULL"],
  ["representative_phone", "VARCHAR(50) NULL"],
  ["representative_relation", "VARCHAR(80) NULL"],
  ["authorization_note", "TEXT NULL"],
  ["authorization_image_url", "LONGTEXT NULL"],
];

const RETURN_RECORD_RELAXED_COLUMNS = [
  ["claim_request_id", "INT UNSIGNED NULL"],
  ["received_by", "INT UNSIGNED NULL"],
];

async function addMissingColumns(db) {
  const [rows] = await db.execute(
    `
      SELECT COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'return_records'
    `,
  );
  const existingColumns = new Set(rows.map((row) => row.columnName));

  for (const [columnName, definition] of RETURN_RECORD_SECURITY_COLUMNS) {
    if (existingColumns.has(columnName)) continue;

    try {
      await db.execute(`ALTER TABLE return_records ADD COLUMN ${columnName} ${definition}`);
    } catch (error) {
      if (!String(error?.message ?? "").includes("Duplicate column")) {
        throw error;
      }
    }
  }
}

async function relaxRequiredColumns(db) {
  const [rows] = await db.execute(
    `
      SELECT COLUMN_NAME AS columnName, IS_NULLABLE AS isNullable
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'return_records'
        AND COLUMN_NAME IN ('claim_request_id', 'received_by')
    `,
  );
  const nullableByColumn = new Map(rows.map((row) => [row.columnName, row.isNullable]));

  for (const [columnName, definition] of RETURN_RECORD_RELAXED_COLUMNS) {
    if (nullableByColumn.get(columnName) !== "NO") continue;
    await db.execute(`ALTER TABLE return_records MODIFY COLUMN ${columnName} ${definition}`);
  }
}

export async function ensureReturnRecordSecurityColumns(db) {
  if (!ensuredColumnsPromise) {
    ensuredColumnsPromise = (async () => {
      await addMissingColumns(db);
      await relaxRequiredColumns(db);
    })().catch((error) => {
      ensuredColumnsPromise = null;
      throw error;
    });
  }

  return ensuredColumnsPromise;
}

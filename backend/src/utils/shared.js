export function parsePositiveId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("id ຕ້ອງເປັນຕົວເລກຫຼາຍກວ່າ 0");
    error.statusCode = 400;
    throw error;
  }

  return id;
}

export function requireFields(body, fields) {
  const missingFields = fields.filter((field) => body[field] === undefined || body[field] === "");

  if (missingFields.length) {
    const error = new Error(`ກະລຸນາກອກຂໍ້ມູນ: ${missingFields.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

const ALLOWED_IMAGE_MIME_PATTERN = /^data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i;
const REMOTE_IMAGE_URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;

export function isAllowedDataImageUrl(value) {
  return ALLOWED_IMAGE_MIME_PATTERN.test(String(value ?? "").trim());
}

export function assertAllowedStoredImageUrl(
  value,
  message = "image url is invalid",
  { allowRemote = true, maxDataUrlLength = 380_000 } = {},
) {
  const url = normalizeText(value);
  if (!url) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  if (url.startsWith("data:image/")) {
    if (!isAllowedDataImageUrl(url) || url.length > maxDataUrlLength) {
      const error = new Error(message);
      error.statusCode = 400;
      throw error;
    }

    return url;
  }

  if (allowRemote && REMOTE_IMAGE_URL_PATTERN.test(url) && url.length <= 2048) {
    return url;
  }

  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

export function buildUpdate(body, fieldMap) {
  const fields = [];
  const values = [];

  Object.entries(fieldMap).forEach(([bodyKey, columnName]) => {
    if (body[bodyKey] === undefined) return;
    fields.push(`${columnName} = ?`);
    values.push(body[bodyKey]);
  });

  return { fields, values };
}

export function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function boolToDb(value) {
  return value ? 1 : 0;
}

export function mapMysqlError(error) {
  if (error?.code === "ECONNREFUSED") {
    const mapped = new Error("ເຊື່ອມຕໍ່ MySQL ບໍ່ສຳເລັດ ກະລຸນາເປີດ MySQL ໃນ XAMPP ຫຼື ໃຊ້ໂໝດທົດລອງຂອງໜ້າເວັບ");
    mapped.statusCode = 503;
    return mapped;
  }

  if (error?.code === "ER_DUP_ENTRY") {
    const mapped = new Error("ຂໍ້ມູນຊ້ຳກັບລາຍການທີ່ມີຢູ່ແລ້ວ");
    mapped.statusCode = 409;
    return mapped;
  }

  if (error?.statusCode) return error;
  return error;
}

export function formatLocationLabel(row) {
  if (!row) return "";
  const parts = [row.name_th];
  if (row.floor) parts.push(`ຊັ້ນ ${row.floor}`);
  return parts.join(" ");
}

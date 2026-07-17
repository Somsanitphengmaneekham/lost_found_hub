import { imageForCategory } from "../data.js";

function formatThaiDate(value) {
  if (!value) return "ມື້ນີ້";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ມື້ນີ້";
  return new Intl.DateTimeFormat("lo-LA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatThaiTime(value) {
  if (!value) return "ບໍ່ລະບຸເວລາ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ບໍ່ລະບຸເວລາ";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function uploadImages(row, prefix) {
  const imageUrls = Array.isArray(row.imageUrls)
    ? row.imageUrls
    : row.imageUrl
      ? [row.imageUrl]
      : [];

  return imageUrls.map((imageUrl, index) => ({
    id: `${prefix}-${row.id}-image-${index + 1}`,
    name: "uploaded-image",
    src: imageUrl,
  }));
}

export function mapFoundFromApi(row) {
  const images = uploadImages(row, "found");

  return {
    id: row.id,
    finderId: row.finderId,
    title: row.title,
    category: row.categoryName,
    categoryId: row.categoryId,
    location: row.locationName || "ຍັງບໍ່ລະບຸສະຖານທີ່",
    locationId: row.foundLocationId,
    date: formatThaiDate(row.foundAt),
    time: formatThaiTime(row.foundAt),
    foundAt: row.foundAt ? new Date(row.foundAt).toISOString() : "",
    description: row.description,
    color: row.color ?? "",
    brand: row.brand ?? "",
    uniqueMark: row.uniqueMark ?? "",
    finder: row.finderName ?? "",
    contact: row.finderEmail ?? "ຫ້ອງຄຸ້ມຄອງ",
    status: row.status,
    approvedBy: row.approvedBy ?? "",
    approvedAt: row.approvedAt ? new Date(row.approvedAt).toISOString() : "",
    rejectReason: row.rejectReason ?? "",
    image: images[0]?.src || imageForCategory(row.categoryName),
    images,
  };
}

export function mapLostFromApi(row) {
  const images = uploadImages(row, "lost");

  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    category: row.categoryName,
    categoryId: row.categoryId,
    location: row.locationName || "ຍັງບໍ່ລະບຸສະຖານທີ່",
    locationId: row.lostLocationId,
    date: formatThaiDate(row.lostAt),
    time: formatThaiTime(row.lostAt),
    lostAt: row.lostAt ? new Date(row.lostAt).toISOString() : "",
    owner: row.ownerName ?? "",
    contact: row.contactChannel ?? "",
    description: row.description,
    color: row.color ?? "",
    brand: row.brand ?? "",
    uniqueMark: row.uniqueMark ?? "",
    status: row.status,
    image: images[0]?.src || imageForCategory(row.categoryName),
    images,
  };
}

export function mapMatchFromApi(row) {
  return {
    id: row.id,
    lostPostId: row.lostPostId,
    foundPostId: row.foundPostId,
    matchScore: row.matchScore,
    status: row.status,
    createdAt: row.createdAt,
    reasons: row.reasons ?? [],
    lost: row.lost,
    found: row.found
      ? {
          ...row.found,
          finderId: row.found.finderId,
        }
      : row.found,
  };
}

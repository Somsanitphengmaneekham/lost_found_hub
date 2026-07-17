export function normalizeText(value) {
  return String(value ?? "").trim().toLocaleLowerCase("lo-LA");
}

export const OWNER_EDITABLE_FOUND_STATUSES = new Set(["awaiting_handover", "pending_approval", "rejected"]);
export const OWNER_EDITABLE_LOST_STATUSES = new Set(["pending_approval", "rejected"]);

export function foundPostBelongsToUser(item, user) {
  if (!item || !user) return false;
  return Number(item.finderId) === Number(user.id) || item.finder === user.fullName;
}

export function lostPostBelongsToUser(item, user) {
  if (!item || !user) return false;
  return Number(item.ownerId) === Number(user.id) || item.owner === user.fullName;
}

export function canEditFoundPost(item, user) {
  if (!item || !user || !OWNER_EDITABLE_FOUND_STATUSES.has(item.status)) return false;
  return user.role === "teacher" || foundPostBelongsToUser(item, user);
}

export function canEditLostPost(item, user) {
  if (!item || !user || !OWNER_EDITABLE_LOST_STATUSES.has(item.status)) return false;
  return user.role === "teacher" || lostPostBelongsToUser(item, user);
}

export function canDeleteFoundPost(item, user) {
  if (!item || !user) return false;
  if (user.role === "teacher") return true;
  return OWNER_EDITABLE_FOUND_STATUSES.has(item.status) && foundPostBelongsToUser(item, user);
}

export function canDeleteLostPost(item, user) {
  if (!item || !user) return false;
  if (user.role === "teacher") return true;
  return OWNER_EDITABLE_LOST_STATUSES.has(item.status) && lostPostBelongsToUser(item, user);
}

export function approvalSortValue(status) {
  if (status === "pending_approval") return 1;
  if (status === "awaiting_handover") return 2;
  if (status === "approved" || status === "published") return 3;
  if (status === "rejected") return 4;
  return 5;
}

export function joinDetail(color, brand) {
  const parts = [color, brand].filter(Boolean);
  return parts.length ? parts.join(" · ") : "ບໍ່ລະບຸ";
}

export function formatLaoDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("lo-LA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function roleLabel(role) {
  if (role === "teacher") return "ອາຈານ";
  return "ນັກສຶກສາ";
}

export function lostStatusLabel(status) {
  const labels = {
    draft: "ຮ່າງ",
    pending_approval: "ລໍຖ້າອາຈານອະນຸມັດ",
    published: "ປະກາດແລ້ວ",
    matched: "ກຳລັງກວດສອບ match",
    rejected: "ປະຕິເສດ",
    resolved: "ໄດ້ຮັບຂອງຄືນແລ້ວ",
    closed: "ໄດ້ຮັບຂອງຄືນແລ້ວ",
    deleted: "ລຶບແລ້ວ",
  };
  return labels[status] ?? status;
}

export function initials(name) {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

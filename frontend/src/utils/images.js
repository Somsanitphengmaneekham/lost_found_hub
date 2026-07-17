const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const REMOTE_IMAGE_PATTERN = /^https?:\/\/[^\s<>"']+$/i;
const LOCAL_UPLOAD_IMAGE_PATTERN = /^\/api\/uploads\/images\/[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_TYPE_ERROR = "ກະລຸນາໃຊ້ຮູບ JPG, PNG ຫຼື WEBP ເທົ່ານັ້ນ";

export function isAllowedImageFile(file) {
  return ALLOWED_IMAGE_TYPES.has(file?.type);
}

export function isAllowedImageUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return false;
  return REMOTE_IMAGE_PATTERN.test(url) || (!url.includes("..") && LOCAL_UPLOAD_IMAGE_PATTERN.test(url));
}

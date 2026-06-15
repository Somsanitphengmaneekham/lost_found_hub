const DEFAULT_MAX_BYTES = 260_000;
const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_QUALITY = 0.78;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DATA_IMAGE_PATTERN = /^data:image\/(?:jpeg|jpg|png|webp);base64,/i;
const REMOTE_IMAGE_PATTERN = /^https?:\/\/[^\s<>"']+$/i;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_TYPE_ERROR = "ກະລຸນາໃຊ້ຮູບ JPG, PNG ຫຼື WEBP ເທົ່ານັ້ນ";

export function isAllowedImageFile(file) {
  return ALLOWED_IMAGE_TYPES.has(file?.type);
}

export function isAllowedImageDataUrl(value) {
  return ALLOWED_DATA_IMAGE_PATTERN.test(String(value ?? "").trim());
}

export function isAllowedImageUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return false;
  if (url.startsWith("data:image/")) return isAllowedImageDataUrl(url);
  return REMOTE_IMAGE_PATTERN.test(url);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("ອ່ານໄຟລ໌ຮູບບໍ່ສຳເລັດ"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("ໂຫຼດຮູບເພື່ອຫຍໍ້ຂະໜາດບໍ່ສຳເລັດ"));
    image.src = dataUrl;
  });
}

function dataUrlByteLength(dataUrl) {
  return Math.ceil((dataUrl.length * 3) / 4);
}

export async function compressImageFile(
  file,
  {
    maxBytes = DEFAULT_MAX_BYTES,
    maxWidth = DEFAULT_MAX_WIDTH,
    quality = DEFAULT_QUALITY,
  } = {},
) {
  if (!isAllowedImageFile(file)) {
    throw new Error(IMAGE_TYPE_ERROR);
  }

  const originalDataUrl = await readAsDataUrl(file);

  if (file.type === "image/svg+xml") {
    if (dataUrlByteLength(originalDataUrl) > maxBytes) {
      throw new Error("ຮູບ SVG ໃຫຍ່ເກີນໄປ ກະລຸນາໃຊ້ JPG, PNG ຫຼື WEBP");
    }
    return originalDataUrl;
  }

  if (dataUrlByteLength(originalDataUrl) <= maxBytes) {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, maxWidth / Math.max(image.naturalWidth, image.naturalHeight));
  let canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("ບີບອັດຮູບບໍ່ສຳເລັດ");

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let nextQuality = quality;
  let output = canvas.toDataURL("image/jpeg", nextQuality);

  while (dataUrlByteLength(output) > maxBytes && nextQuality > 0.42) {
    nextQuality -= 0.08;
    output = canvas.toDataURL("image/jpeg", nextQuality);
  }

  while (dataUrlByteLength(output) > maxBytes && Math.max(canvas.width, canvas.height) > 480) {
    const nextCanvas = document.createElement("canvas");
    nextCanvas.width = Math.max(1, Math.round(canvas.width * 0.82));
    nextCanvas.height = Math.max(1, Math.round(canvas.height * 0.82));

    const nextContext = nextCanvas.getContext("2d");
    if (!nextContext) break;

    nextContext.drawImage(image, 0, 0, nextCanvas.width, nextCanvas.height);
    canvas = nextCanvas;
    output = canvas.toDataURL("image/jpeg", 0.58);
  }

  return output;
}

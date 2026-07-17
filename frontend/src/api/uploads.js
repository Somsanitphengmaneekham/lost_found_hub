import { API_BASE } from "./http.js";

export async function uploadImageFiles(files) {
  const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  const formData = new FormData();

  safeFiles.forEach((file) => {
    formData.append("images", file, file.name);
  });

  let response;
  try {
    response = await fetch(`${API_BASE}/api/uploads/images`, {
      method: "POST",
      body: formData,
    });
  } catch {
    const error = new Error("ອັບໂຫຼດຮູບບໍ່ສຳເລັດ ກະລຸນາກວດວ່າ API ເປີດຢູ່");
    error.status = 0;
    throw error;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `Upload error (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return Array.isArray(payload?.files) ? payload.files : [];
}

export async function uploadSingleImageFile(file) {
  if (!file) return "";

  const files = await uploadImageFiles([file]);
  const uploaded = files[0];

  if (!uploaded?.url) {
    throw new Error("ອັບໂຫຼດຮູບບໍ່ສຳເລັດ");
  }

  return uploaded.url;
}

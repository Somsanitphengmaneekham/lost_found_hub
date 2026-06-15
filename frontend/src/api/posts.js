import { API_BASE, shouldUseLocalFallback, request } from "./http.js";
import {
  localApproveFoundPost,
  localApproveLostPost,
  localCreateFoundPost,
  localCreateLostPost,
  localDeleteFoundPost,
  localDeleteLostPost,
  localMoveFoundToApproval,
  localRejectFoundPost,
  localRejectLostPost,
  localUpdateFoundPost,
  localUpdateLostPost,
} from "./localStore.js";

function isLocalImageFile(image) {
  if (!image?.file) return false;
  if (typeof File !== "undefined") return image.file instanceof File;
  return typeof image.file.name === "string" && typeof image.file.size === "number";
}

async function uploadImageFiles(files) {
  const formData = new FormData();
  files.forEach((file) => {
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

export async function uploadPostImages(images) {
  const safeImages = Array.isArray(images) ? images : [];
  const localFiles = safeImages.filter(isLocalImageFile).map((image) => image.file);

  if (!localFiles.length) {
    return safeImages.map((image) => image.src).filter(Boolean);
  }

  const uploadedFiles = await uploadImageFiles(localFiles);
  let uploadedIndex = 0;

  return safeImages
    .map((image) => {
      if (!isLocalImageFile(image)) return image.src;
      const uploaded = uploadedFiles[uploadedIndex];
      uploadedIndex += 1;
      return uploaded?.url;
    })
    .filter(Boolean);
}

export async function createFoundPost(body) {
  try {
    return await request("/api/found-posts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localCreateFoundPost(body);
    throw error;
  }
}

export async function updateFoundPost(id, body) {
  try {
    return await request(`/api/found-posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateFoundPost(id, body);
    throw error;
  }
}

export async function moveFoundToApproval(id) {
  try {
    return await request(`/api/found-posts/${id}/move-to-approval`, { method: "POST" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localMoveFoundToApproval(id);
    throw error;
  }
}

export async function approveFoundPost(id, approvedByMemberId) {
  try {
    return await request(`/api/found-posts/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approvedByMemberId }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localApproveFoundPost(id, approvedByMemberId);
    throw error;
  }
}

export async function rejectFoundPost(id) {
  try {
    return await request(`/api/found-posts/${id}/reject`, { method: "POST" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localRejectFoundPost(id);
    throw error;
  }
}

export async function deleteFoundPost(id, actorId) {
  const actorQuery = actorId ? `?actorId=${encodeURIComponent(actorId)}` : "";

  try {
    return await request(`/api/found-posts/${id}${actorQuery}`, { method: "DELETE" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localDeleteFoundPost(id, actorId);
    throw error;
  }
}

export async function createLostPost(body) {
  try {
    return await request("/api/lost-posts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localCreateLostPost(body);
    throw error;
  }
}

export async function approveLostPost(id, approvedByMemberId) {
  try {
    return await request(`/api/lost-posts/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approvedByMemberId }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localApproveLostPost(id, approvedByMemberId);
    throw error;
  }
}

export async function rejectLostPost(id) {
  try {
    return await request(`/api/lost-posts/${id}/reject`, { method: "POST" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localRejectLostPost(id);
    throw error;
  }
}

export async function updateLostPost(id, body) {
  try {
    return await request(`/api/lost-posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateLostPost(id, body);
    throw error;
  }
}

export async function deleteLostPost(id, actorId) {
  const actorQuery = actorId ? `?actorId=${encodeURIComponent(actorId)}` : "";

  try {
    return await request(`/api/lost-posts/${id}${actorQuery}`, { method: "DELETE" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localDeleteLostPost(id, actorId);
    throw error;
  }
}

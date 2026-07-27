import { shouldUseLocalFallback, request } from "./http.js";
import { uploadImageFiles } from "./uploads.js";
import {
  localApproveFoundPost,
  localApproveLostPost,
  localCreateFoundPost,
  localCreateLostPost,
  localClaimFoundPost,
  localDeleteFoundPost,
  localDeleteLostPost,
  localMarkLostPostFound,
  localMoveFoundToApproval,
  localRejectFoundPost,
  localReturnFoundPost,
  localRejectLostPost,
  localUpdateFoundPost,
  localUpdateLostPost,
} from "./localStore.js";

function isLocalImageFile(image) {
  if (!image?.file) return false;
  if (typeof File !== "undefined") return image.file instanceof File;
  return typeof image.file.name === "string" && typeof image.file.size === "number";
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

export async function rejectFoundPost(id, rejectedByMemberId, reason = "") {
  try {
    return await request(`/api/found-posts/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ rejectedByMemberId, reason }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localRejectFoundPost(id, reason);
    throw error;
  }
}

export async function returnFoundPost(id, body) {
  try {
    return await request(`/api/found-posts/${id}/return`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localReturnFoundPost(id, body);
    throw error;
  }
}

export async function claimFoundPost(id, body) {
  try {
    return await request(`/api/found-posts/${id}/claim`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localClaimFoundPost(id, body);
    throw error;
  }
}

export async function approveClaimRequest(id, verifiedByMemberId) {
  return request(`/api/claim-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ verifiedByMemberId }),
  });
}

export async function rejectClaimRequest(id, verifiedByMemberId, reason = "") {
  return request(`/api/claim-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ verifiedByMemberId, reason }),
  });
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

export async function markLostPostFound(id, markedByMemberId) {
  try {
    return await request(`/api/lost-posts/${id}/mark-found`, {
      method: "POST",
      body: JSON.stringify({ markedByMemberId }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localMarkLostPostFound(id, markedByMemberId);
    throw error;
  }
}

export async function rejectLostPost(id, rejectedByMemberId, reason = "") {
  try {
    return await request(`/api/lost-posts/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ rejectedByMemberId, reason }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localRejectLostPost(id, reason);
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

import { shouldUseLocalFallback, request } from "./http.js";
import {
  localCreateTeacherMember,
  localDeleteMember,
  localDemoLogin,
  localFetchMembers,
  localLogin,
  localRegister,
  localUpdateMember,
  localUpdateMemberActiveStatus,
  localUpdateProfile,
} from "./localStore.js";

export function fetchDemoUsers() {
  return request("/api/auth/demo-users");
}

export async function fetchMembers() {
  try {
    return await request("/api/members");
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localFetchMembers();
    throw error;
  }
}

export async function loginUser(username, password) {
  try {
    return await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localLogin(username, password);
    throw error;
  }
}

export async function demoLoginUser(id) {
  try {
    return await request(`/api/auth/demo-login/${id}`, { method: "POST" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localDemoLogin(id);
    throw error;
  }
}

export async function registerUser(body) {
  try {
    return await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localRegister(body);
    throw error;
  }
}

export function requestPasswordResetOtp(body) {
  return request("/api/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function verifyPasswordResetOtp(body) {
  return request("/api/auth/password-reset/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function confirmPasswordReset(body) {
  return request("/api/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateProfile(id, body) {
  try {
    return await request(`/api/auth/profile/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateProfile(id, body);
    throw error;
  }
}

export async function createTeacherMember(body) {
  try {
    return await request("/api/members/teachers", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localCreateTeacherMember(body);
    throw error;
  }
}

export async function updateMember(id, body) {
  try {
    return await request(`/api/members/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateMember(id, body);
    throw error;
  }
}

export async function updateMemberActiveStatus(id, isActive, actorId) {
  try {
    return await request(`/api/members/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive, actorId }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateMemberActiveStatus(id, isActive, actorId);
    throw error;
  }
}

export async function deleteMember(id, actorId) {
  try {
    return await request(`/api/members/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ actorId }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localDeleteMember(id, actorId);
    throw error;
  }
}

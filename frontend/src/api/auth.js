import { shouldUseLocalFallback, request } from "./http.js";
import {
  localCreateTeacherMember,
  localDemoLogin,
  localFetchMembers,
  localLogin,
  localRegister,
  localUpdateMember,
  localUpdateMemberActiveStatus,
  localUpdateMemberIdentityStatus,
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

export async function updateMemberIdentityStatus(id, identityStatus, actorId) {
  try {
    return await request(`/api/members/${id}/identity-status`, {
      method: "PATCH",
      body: JSON.stringify({ identityStatus, actorId }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateMemberIdentityStatus(id, identityStatus, actorId);
    throw error;
  }
}

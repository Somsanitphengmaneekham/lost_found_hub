import { shouldUseLocalFallback, request } from "./http.js";
import { localReturnMatchedItem, localUpdateMatchStatus } from "./localStore.js";

export async function updateMatchStatus(id, status, actorId) {
  try {
    return await request(`/api/matches/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, actorId }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateMatchStatus(id, status);
    throw error;
  }
}

export async function returnMatchedItem(id, body) {
  try {
    return await request(`/api/matches/${id}/return`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localReturnMatchedItem(id, body);
    throw error;
  }
}

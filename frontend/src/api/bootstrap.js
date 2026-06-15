import { shouldUseLocalFallback, request } from "./http.js";
import { localFetchBootstrap } from "./localStore.js";

export async function fetchBootstrap() {
  try {
    return await request("/api/bootstrap");
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localFetchBootstrap();
    throw error;
  }
}

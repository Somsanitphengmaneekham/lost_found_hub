import { shouldUseLocalFallback, request } from "./http.js";
import {
  localCreateCategory,
  localCreateDepartment,
  localCreateLocation,
  localDeleteCategory,
  localDeleteDepartment,
  localDeleteLocation,
  localFetchBootstrap,
  localUpdateCategory,
  localUpdateDepartment,
  localUpdateLocation,
} from "./localStore.js";

export async function fetchMasterData() {
  try {
    return await request("/api/master-data");
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      const data = localFetchBootstrap();
      return {
        categories: data.categories,
        locations: data.locations,
        departments: data.departments,
      };
    }
    throw error;
  }
}

export async function createCategory(body) {
  try {
    return await request("/api/item-categories", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        description: body.description,
        isActive: body.isActive,
      }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localCreateCategory(body);
    throw error;
  }
}

export async function updateCategory(id, body) {
  try {
    return await request(`/api/item-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: body.name,
        description: body.description,
        isActive: body.isActive,
      }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateCategory(id, body);
    throw error;
  }
}

export async function deleteCategory(id) {
  try {
    return await request(`/api/item-categories/${id}`, { method: "DELETE" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localDeleteCategory(id);
    throw error;
  }
}

export async function createLocation(body) {
  try {
    return await request("/api/locations", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        building: body.building,
        floor: body.floor,
        locationType: body.locationType,
        detail: body.detail,
        isActive: body.isActive,
      }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localCreateLocation(body);
    throw error;
  }
}

export async function updateLocation(id, body) {
  try {
    return await request(`/api/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: body.name,
        building: body.building,
        floor: body.floor,
        locationType: body.locationType,
        detail: body.detail,
        isActive: body.isActive,
      }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateLocation(id, body);
    throw error;
  }
}

export async function deleteLocation(id) {
  try {
    return await request(`/api/locations/${id}`, { method: "DELETE" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localDeleteLocation(id);
    throw error;
  }
}

export async function createDepartment(body) {
  try {
    return await request("/api/departments", {
      method: "POST",
      body: JSON.stringify({
        code: body.code,
        name: body.name,
        nameEn: body.nameEn,
        isActive: body.isActive,
      }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localCreateDepartment(body);
    throw error;
  }
}

export async function updateDepartment(id, body) {
  try {
    return await request(`/api/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        code: body.code,
        name: body.name,
        nameEn: body.nameEn,
        isActive: body.isActive,
      }),
    });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localUpdateDepartment(id, body);
    throw error;
  }
}

export async function deleteDepartment(id) {
  try {
    return await request(`/api/departments/${id}`, { method: "DELETE" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) return localDeleteDepartment(id);
    throw error;
  }
}

export function mapCategoryFromApi(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    isActive: Boolean(row.isActive),
  };
}

export function mapLocationFromApi(row) {
  return {
    id: row.id,
    name: row.name,
    nameTh: row.nameTh ?? row.name,
    building: row.building ?? "",
    floor: row.floor ?? "",
    locationType: row.locationType ?? "both",
    detail: row.detail ?? "",
    isActive: Boolean(row.isActive),
  };
}

export function mapDepartmentFromApi(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameEn: row.nameEn ?? "",
    isActive: Boolean(row.isActive),
  };
}

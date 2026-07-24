import { useCallback, useState } from "react";
import { fetchBootstrap } from "../api/bootstrap.js";
import {
  mapCategoryFromApi,
  mapDepartmentFromApi,
  mapLocationFromApi,
} from "../api/masterData.js";
import { mapFoundFromApi, mapLostFromApi, mapMatchFromApi } from "../api/mappers.js";
import { categoryMasterSeed } from "../data.js";
import { fnsDepartmentMasterSeed, fnsLocationMasterSeed } from "../campusMasterData.js";

export function useAppData() {
  const [itemCategories, setItemCategories] = useState(categoryMasterSeed);
  const [campusLocations, setCampusLocations] = useState(fnsLocationMasterSeed);
  const [departmentList, setDepartmentList] = useState(fnsDepartmentMasterSeed);
  const [memberList, setMemberList] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostReports, setLostReports] = useState([]);
  const [matchRows, setMatchRows] = useState([]);
  const [returnRecords, setReturnRecords] = useState([]);
  const [claimRequests, setClaimRequests] = useState([]);
  const [appLoading, setAppLoading] = useState(true);
  const [appError, setAppError] = useState("");
  const [masterDataLoading, setMasterDataLoading] = useState(true);
  const [masterDataError, setMasterDataError] = useState("");

  const loadAppData = useCallback(async () => {
    setAppLoading(true);
    setMasterDataLoading(true);
    setAppError("");
    setMasterDataError("");

    try {
      const data = await fetchBootstrap();
      setItemCategories(data.categories.map(mapCategoryFromApi));
      setCampusLocations(data.locations.map(mapLocationFromApi));
      setDepartmentList(data.departments.map(mapDepartmentFromApi));
      setFoundItems(data.foundPosts.map(mapFoundFromApi));
      setLostReports(data.lostPosts.map(mapLostFromApi));
      setMatchRows(data.matches.map(mapMatchFromApi));
      setReturnRecords(data.returnRecords ?? []);
      setClaimRequests(data.claimRequests ?? []);
      setMemberList(
        (data.members ?? data.demoUsers ?? []).map((member) => ({
          ...member,
          isActive: member.isActive ?? true,
          identityStatus: member.identityStatus ?? "verified",
        })),
      );
    } catch (error) {
      const message = error.message || "ບໍ່ສາມາດໂຫຼດຂໍ້ມູນຈາກ API ໄດ້";
      setAppError(message);
      setMasterDataError(message);
    } finally {
      setAppLoading(false);
      setMasterDataLoading(false);
    }
  }, []);

  return {
    itemCategories,
    setItemCategories,
    campusLocations,
    setCampusLocations,
    departmentList,
    setDepartmentList,
    memberList,
    setMemberList,
    foundItems,
    setFoundItems,
    lostReports,
    setLostReports,
    matchRows,
    setMatchRows,
    returnRecords,
    setReturnRecords,
    claimRequests,
    setClaimRequests,
    appLoading,
    appError,
    masterDataLoading,
    masterDataError,
    setMasterDataError,
    loadAppData,
  };
}

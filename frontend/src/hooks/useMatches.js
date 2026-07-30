import { useState } from "react";
import { returnMatchedItem, updateMatchStatus } from "../api/matches.js";

export function useMatches({ matchRows, lostReports, currentUser, loadAppData, setToast }) {
  const [matchSaving, setMatchSaving] = useState(false);

  async function confirmMatch(id) {
    setMatchSaving(true);
    try {
      await updateMatchStatus(id, "confirmed", currentUser.id);
      await loadAppData();
      setToast("ຢືນຢັນລາຍການໃກ້ຄຽງແລ້ວ ສະຖານະຂອງສູນຫາຍ ແລະ ຂອງທີ່ພົບຖືກປ່ຽນເປັນພົບຂອງແລ້ວ");
    } catch (error) {
      setToast(error.message || "ຢືນຢັນລາຍການໃກ້ຄຽງບໍ່ສຳເລັດ");
    } finally {
      setMatchSaving(false);
    }
  }

  async function rejectMatch(id) {
    setMatchSaving(true);
    try {
      await updateMatchStatus(id, "rejected", currentUser.id);
      await loadAppData();
      setToast("ປະຕິເສດລາຍການໃກ້ຄຽງແລ້ວ ລາຍການນີ້ຈະບໍ່ຖືກສະແດງເປັນລາຍການແນະນຳ");
    } catch (error) {
      setToast(error.message || "ປະຕິເສດລາຍການໃກ້ຄຽງບໍ່ສຳເລັດ");
    } finally {
      setMatchSaving(false);
    }
  }

  async function markReturned(matchId) {
    const match = matchRows.find((item) => item.id === matchId);
    if (!match) return;

    setMatchSaving(true);
    try {
      const lostOwnerId =
        match.lost?.ownerId ?? lostReports.find((report) => report.id === match.lostPostId)?.ownerId;

      await returnMatchedItem(matchId, {
        returnedByMemberId: currentUser.id,
        receivedByMemberId: lostOwnerId ?? currentUser.id,
        returnLocationName: "ຫ້ອງຄຸ້ມຄອງ",
      });
      await loadAppData();
      setToast("ບັນທຶກຄືນຂອງແລ້ວ ຂໍ້ມູນຖືກບັນທຶກໃນ return_records");
    } catch (error) {
      setToast(error.message || "ບັນທຶກຄືນຂອງບໍ່ສຳເລັດ");
    } finally {
      setMatchSaving(false);
    }
  }

  return { matchSaving, confirmMatch, rejectMatch, markReturned };
}

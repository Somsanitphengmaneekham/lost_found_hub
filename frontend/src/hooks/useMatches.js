import { useState } from "react";
import { returnMatchedItem, updateMatchStatus } from "../api/matches.js";

export function useMatches({ matchRows, lostReports, currentUser, loadAppData, setToast }) {
  const [matchSaving, setMatchSaving] = useState(false);

  async function confirmMatch(id) {
    setMatchSaving(true);
    try {
      await updateMatchStatus(id, "confirmed", currentUser.id);
      await loadAppData();
      setToast("ຢືນຢັນ match ແລ້ວ ສະຖານະຂອງສູນຫາຍ ແລະ ຂອງທີ່ພົບຖືກປ່ຽນເປັນຈັບຄູ່ແລ້ວ");
    } catch (error) {
      setToast(error.message || "ຢືນຢັນ match ບໍ່ສຳເລັດ");
    } finally {
      setMatchSaving(false);
    }
  }

  async function rejectMatch(id) {
    setMatchSaving(true);
    try {
      await updateMatchStatus(id, "rejected", currentUser.id);
      await loadAppData();
      setToast("ປະຕິເສດ match ແລ້ວ ລາຍການນີ້ຈະບໍ່ຖືກນັບເປັນລາຍການທີ່ກົງກັນ");
    } catch (error) {
      setToast(error.message || "ປະຕິເສດ match ບໍ່ສຳເລັດ");
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

import { useState } from "react";
import {
  approveLostPost,
  createLostPost,
  deleteLostPost,
  markLostPostFound,
  rejectLostPost,
  updateLostPost,
  uploadPostImages,
} from "../api/posts.js";
import { canDeleteLostPost, canEditLostPost } from "../utils/ui.js";

const MAX_REPORT_IMAGES = 3;

export const lostInitial = {
  title: "",
  category: "ອີເລັກໂທຣນິກ",
  location: "",
  date: "",
  time: "",
  description: "",
  color: "",
  brand: "",
  uniqueMark: "",
  images: [],
  noImage: false,
};

function reportImageValidationMessage(images, noImage) {
  const imageCount = Array.isArray(images) ? images.length : 0;
  if (noImage && imageCount === 0) return "";
  if (imageCount < 1) return "ກະລຸນາອັບໂຫຼດຮູບຢ່າງໜ້ອຍ 1 ຮູບ";
  if (imageCount > MAX_REPORT_IMAGES) return "ອັບໂຫຼດຮູບໄດ້ສູງສຸດ 3 ຮູບ";
  return "";
}

function validOption(value, options) {
  return options.includes(value) ? value : options[0] ?? value;
}

function toDateTime(date, time) {
  if (!date) return "";
  return `${date}T${timeInputValue(time) || "00:00"}:00`;
}

function dateInputValue(value) {
  if (!value) return "";
  return value.slice(0, 10);
}

function timeInputValue(value) {
  if (!value) return "";
  const match = String(value).match(/(?:T|\s)?(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  return String(value).slice(0, 5);
}

function lostStatusAfterEdit(currentStatus) {
  if (currentStatus === "closed" || currentStatus === "resolved" || currentStatus === "deleted") {
    return currentStatus;
  }
  return "pending_approval";
}

function contactChannelFromUser(user) {
  return user?.phone || user?.email || user?.username || "";
}

export function useLostPosts({
  currentUser,
  lostReports,
  loadAppData,
  categoryFormOptions,
  navigateToPage,
  setToast,
}) {
  const [lostForm, setLostForm] = useState(lostInitial);
  const [editingLostId, setEditingLostId] = useState(null);
  const [lostSaving, setLostSaving] = useState(false);

  function updateLost(field, value) {
    if (field === "noImage") {
      setLostForm((current) => ({
        ...current,
        noImage: Boolean(value),
        images: value ? [] : current.images,
      }));
      return;
    }

    if (field === "images") {
      const images = Array.isArray(value) ? value : [];
      setLostForm((current) => ({
        ...current,
        images,
        noImage: images.length > 0 ? false : current.noImage,
      }));
      return;
    }

    const nextValue = field === "time" ? timeInputValue(value) : value;
    setLostForm((current) => ({ ...current, [field]: nextValue }));
  }

  async function submitLost(event) {
    event.preventDefault();
    const imageError = reportImageValidationMessage(lostForm.images, lostForm.noImage);
    if (imageError) {
      setToast(imageError);
      return;
    }

    setLostSaving(true);

    try {
      const imageUrls = lostForm.noImage ? [] : await uploadPostImages(lostForm.images);
      const payload = {
        ownerId: currentUser.id,
        title: lostForm.title || "ຂອງສູນຫາຍໃໝ່",
        categoryName: validOption(lostForm.category, categoryFormOptions),
        locationName: lostForm.location,
        description: lostForm.description || "ລໍຖ້າຂໍ້ມູນເພີ່ມເຕີມຈາກຜູ້ແຈ້ງ",
        color: lostForm.color,
        brand: lostForm.brand,
        uniqueMark: lostForm.uniqueMark,
        lostAt: toDateTime(lostForm.date, lostForm.time) || null,
        contactName: currentUser.fullName,
        contactChannel: contactChannelFromUser(currentUser),
        status: "pending_approval",
        imageUrls,
        noImage: Boolean(lostForm.noImage),
      };

      if (editingLostId) {
        const existing = lostReports.find((item) => item.id === editingLostId);
        if (!canEditLostPost(existing, currentUser)) {
          setToast("ລາຍການນີ້ອາຈານອະນຸມັດແລ້ວ ບໍ່ສາມາດແກ້ໄຂໄດ້");
          return;
        }

        await updateLostPost(editingLostId, {
          ...payload,
          actorId: currentUser.id,
          status: lostStatusAfterEdit(existing?.status),
        });
        setToast("ບັນທຶກການແກ້ໄຂຂໍ້ມູນຂອງສູນຫາຍໃນຖານຂໍ້ມູນແລ້ວ");
      } else {
        const result = await createLostPost(payload);
        const matchCount = Number(result?.matchCount ?? 0);
        setToast(
          matchCount > 0
            ? `ສົ່ງປະກາດແລ້ວ ລະບົບພົບລາຍການທີ່ອາດກົງກັນ ${matchCount} ລາຍການ`
            : "ສົ່ງປະກາດແລ້ວ ຍັງບໍ່ພົບລາຍການທີ່ຄ້າຍກັນເກີນ 70%",
        );
      }

      await loadAppData();
      setEditingLostId(null);
      setLostForm(lostInitial);
      navigateToPage?.("matching");
    } catch (error) {
      setToast(error.message || "ບັນທຶກຂໍ້ມູນຂອງສູນຫາຍບໍ່ສຳເລັດ");
    } finally {
      setLostSaving(false);
    }
  }

  function startEditLost(id, navigateToPage) {
    const report = lostReports.find((lostItem) => lostItem.id === id);
    if (!report) return;
    if (!canEditLostPost(report, currentUser)) {
      setToast("ລາຍການນີ້ອາຈານອະນຸມັດແລ້ວ ບໍ່ສາມາດແກ້ໄຂໄດ້");
      return;
    }

    setLostForm({
      title: report.title,
      category: report.category,
      location: report.location,
      date: dateInputValue(report.lostAt),
      time: timeInputValue(report.lostAt),
      description: report.description,
      color: report.color,
      brand: report.brand,
      uniqueMark: report.uniqueMark,
      images: report.images ?? [],
      noImage: !(report.images ?? []).length,
    });
    setEditingLostId(id);
    setToast("ກຳລັງແກ້ໄຂຂໍ້ມູນຂອງສູນຫາຍໃນຟອມ");
    navigateToPage("lost-form");
  }

  function cancelEditLost() {
    const wasEditing = Boolean(editingLostId);
    setEditingLostId(null);
    setLostForm(lostInitial);
    setToast(wasEditing ? "ຍົກເລີກການແກ້ໄຂຂໍ້ມູນຂອງສູນຫາຍແລ້ວ" : "ລ້າງຟອມແຈ້ງຂອງສູນຫາຍແລ້ວ");
  }

  async function deleteLost(id) {
    const report = lostReports.find((lostItem) => lostItem.id === id);
    if (!canDeleteLostPost(report, currentUser)) {
      setToast("ລາຍການນີ້ອາຈານອະນຸມັດແລ້ວ ບໍ່ສາມາດລຶບໄດ້");
      return;
    }

    setLostSaving(true);
    try {
      await deleteLostPost(id, currentUser.id);
      if (editingLostId === id) {
        setEditingLostId(null);
        setLostForm(lostInitial);
      }
      await loadAppData();
      setToast("ລຶບຂໍ້ມູນຂອງສູນຫາຍຈາກຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ລຶບຂໍ້ມູນບໍ່ສຳເລັດ");
    } finally {
      setLostSaving(false);
    }
  }

  async function approveLostItem(id, setSelectedItemId) {
    setLostSaving(true);
    try {
      const result = await approveLostPost(id, currentUser.id);
      await loadAppData();
      if (setSelectedItemId) setSelectedItemId(`lost-${id}`);
      setToast(
        result.matchCount
          ? `ອະນຸມັດປະກາດຂອງສູນຫາຍແລ້ວ ພົບລາຍການທີ່ອາດກົງກັນ ${result.matchCount} ລາຍການ`
          : "ອະນຸມັດປະກາດຂອງສູນຫາຍແລ້ວ",
      );
    } catch (error) {
      setToast(error.message || "ອະນຸມັດປະກາດຂອງສູນຫາຍບໍ່ສຳເລັດ");
    } finally {
      setLostSaving(false);
    }
  }

  async function rejectLostItem(id, reason) {
    const rejectReason = String(reason ?? "").trim();
    if (!rejectReason) {
      setToast("ກະລຸນາລະບຸເຫດຜົນກ່ອນປະຕິເສດປະກາດ");
      return;
    }

    setLostSaving(true);
    try {
      await rejectLostPost(id, currentUser.id, rejectReason);
      await loadAppData();
      setToast("ປະຕິເສດປະກາດຂອງສູນຫາຍພ້ອມເຫດຜົນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ປະຕິເສດປະກາດຂອງສູນຫາຍບໍ່ສຳເລັດ");
    } finally {
      setLostSaving(false);
    }
  }

  async function markLostItemFound(id) {
    setLostSaving(true);
    try {
      const result = await markLostPostFound(id, currentUser.id);
      await loadAppData();
      setToast(
        result.matchCount
          ? `ປ່ຽນເປັນພົບຂອງແລ້ວ · ເຊື່ອງຈາກໜ້າຫຼັກ ແລະ ມີລາຍການໃກ້ຄຽງ ${result.matchCount} ລາຍການ`
          : "ປ່ຽນເປັນພົບຂອງແລ້ວ · ເຊື່ອງຈາກໜ້າຫຼັກແລ້ວ",
      );
    } catch (error) {
      setToast(error.message || "ປ່ຽນສະຖານະຂອງສູນຫາຍບໍ່ສຳເລັດ");
    } finally {
      setLostSaving(false);
    }
  }

  return {
    lostForm,
    editingLostId,
    lostSaving,
    updateLost,
    submitLost,
    startEditLost,
    cancelEditLost,
    deleteLost,
    approveLostItem,
    rejectLostItem,
    markLostItemFound,
  };
}

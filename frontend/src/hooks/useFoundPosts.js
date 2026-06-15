import { useState } from "react";
import {
  approveFoundPost,
  createFoundPost,
  deleteFoundPost,
  moveFoundToApproval,
  rejectFoundPost,
  updateFoundPost,
  uploadPostImages,
} from "../api/posts.js";
import { canDeleteFoundPost, canEditFoundPost } from "../utils/ui.js";

const MAX_REPORT_IMAGES = 3;

export const foundInitial = {
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
};

function reportImageValidationMessage(images) {
  const imageCount = Array.isArray(images) ? images.length : 0;
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

function foundStatusAfterEdit(currentStatus) {
  if (currentStatus === "awaiting_handover" || currentStatus === "pending_approval") {
    return "pending_approval";
  }
  return currentStatus;
}

export function useFoundPosts({ currentUser, foundItems, loadAppData, categoryFormOptions, setToast }) {
  const [foundForm, setFoundForm] = useState(foundInitial);
  const [editingFoundId, setEditingFoundId] = useState(null);
  const [appSaving, setAppSaving] = useState(false);

  function updateFound(field, value) {
    const nextValue = field === "time" ? timeInputValue(value) : value;
    setFoundForm((current) => ({ ...current, [field]: nextValue }));
  }

  async function submitFound(event) {
    event.preventDefault();
    const imageError = reportImageValidationMessage(foundForm.images);
    if (imageError) {
      setToast(imageError);
      return;
    }

    setAppSaving(true);

    try {
      const imageUrls = await uploadPostImages(foundForm.images);
      const payload = {
        finderId: currentUser.id,
        title: foundForm.title || "ຂອງທີ່ພົບໃໝ່",
        categoryName: validOption(foundForm.category, categoryFormOptions),
        locationName: foundForm.location,
        description: foundForm.description || "ລໍຖ້າກອກລາຍລະອຽດເພີ່ມເຕີມ",
        color: foundForm.color,
        brand: foundForm.brand,
        uniqueMark: foundForm.uniqueMark,
        foundAt: toDateTime(foundForm.date, foundForm.time) || null,
        imageUrls,
      };

      if (editingFoundId) {
        const existing = foundItems.find((item) => item.id === editingFoundId);
        if (!canEditFoundPost(existing, currentUser)) {
          setToast("ລາຍການນີ້ອາຈານອະນຸມັດແລ້ວ ບໍ່ສາມາດແກ້ໄຂໄດ້");
          return;
        }

        await updateFoundPost(editingFoundId, {
          ...payload,
          actorId: currentUser.id,
          status: foundStatusAfterEdit(existing?.status),
        });
        setToast("ບັນທຶກການແກ້ໄຂຂໍ້ມູນຂອງທີ່ພົບໃນຖານຂໍ້ມູນແລ້ວ");
      } else {
        await createFoundPost({ ...payload, status: "pending_approval" });
        setToast("ບັນທຶກແລ້ວ ລາຍການຖືກສົ່ງເຂົ້າຄິວລໍຖ້າອາຈານກວດສອບ ແລະ ອະນຸມັດ");
      }

      await loadAppData();
      setEditingFoundId(null);
      setFoundForm(foundInitial);
    } catch (error) {
      setToast(error.message || "ບັນທຶກຂໍ້ມູນຂອງທີ່ພົບບໍ່ສຳເລັດ");
    } finally {
      setAppSaving(false);
    }
  }

  function startEditFound(id, navigateToPage) {
    const item = foundItems.find((foundItem) => foundItem.id === id);
    if (!item) return;
    if (!canEditFoundPost(item, currentUser)) {
      setToast("ລາຍການນີ້ອາຈານອະນຸມັດແລ້ວ ບໍ່ສາມາດແກ້ໄຂໄດ້");
      return;
    }

    setFoundForm({
      title: item.title,
      category: item.category,
      location: item.location,
      date: dateInputValue(item.foundAt),
      time: timeInputValue(item.foundAt),
      description: item.description,
      color: item.color,
      brand: item.brand,
      uniqueMark: item.uniqueMark,
      images: item.images ?? [],
    });
    setEditingFoundId(id);
    setToast("ກຳລັງແກ້ໄຂຂໍ້ມູນຂອງທີ່ພົບໃນຟອມ");
    navigateToPage("found-form");
  }

  function cancelEditFound() {
    setEditingFoundId(null);
    setFoundForm(foundInitial);
    setToast("ຍົກເລີກການແກ້ໄຂຂໍ້ມູນຂອງທີ່ພົບແລ້ວ");
  }

  async function deleteFound(id) {
    const item = foundItems.find((foundItem) => foundItem.id === id);
    if (!canDeleteFoundPost(item, currentUser)) {
      setToast("ລາຍການນີ້ອາຈານອະນຸມັດແລ້ວ ບໍ່ສາມາດລຶບໄດ້");
      return;
    }

    setAppSaving(true);
    try {
      await deleteFoundPost(id, currentUser.id);
      if (editingFoundId === id) {
        setEditingFoundId(null);
        setFoundForm(foundInitial);
      }
      await loadAppData();
      setToast("ລຶບຂໍ້ມູນຂອງທີ່ພົບຈາກຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ລຶບຂໍ້ມູນບໍ່ສຳເລັດ");
    } finally {
      setAppSaving(false);
    }
  }

  async function moveToApproval(id) {
    setAppSaving(true);
    try {
      await moveFoundToApproval(id);
      await loadAppData();
      setToast("ຢືນຢັນຮັບຂອງແລ້ວ ລາຍການພ້ອມໃຫ້ອາຈານກວດສອບ");
    } catch (error) {
      setToast(error.message || "ອັບເດດສະຖານະບໍ່ສຳເລັດ");
    } finally {
      setAppSaving(false);
    }
  }

  async function approveFoundItem(id, setSelectedItemId) {
    setAppSaving(true);
    try {
      await approveFoundPost(id, currentUser.id);
      await loadAppData();
      if (setSelectedItemId) setSelectedItemId(`found-${id}`);
      setToast("ອະນຸມັດແລ້ວ ລະບົບສ້າງລາຍການ match ຈາກຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ອະນຸມັດບໍ່ສຳເລັດ");
    } finally {
      setAppSaving(false);
    }
  }

  async function rejectFoundItem(id) {
    setAppSaving(true);
    try {
      await rejectFoundPost(id);
      await loadAppData();
      setToast("ປະຕິເສດລາຍການແລ້ວ ເກັບໄວ້ກວດສອບຍ້ອນຫຼັງ");
    } catch (error) {
      setToast(error.message || "ປະຕິເສດລາຍການບໍ່ສຳເລັດ");
    } finally {
      setAppSaving(false);
    }
  }

  return {
    foundForm,
    editingFoundId,
    appSaving,
    updateFound,
    submitFound,
    startEditFound,
    cancelEditFound,
    deleteFound,
    moveToApproval,
    approveFoundItem,
    rejectFoundItem,
  };
}

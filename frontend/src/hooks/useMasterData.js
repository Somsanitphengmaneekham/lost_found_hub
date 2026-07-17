import { useState } from "react";
import {
  createCategory,
  createDepartment,
  createLocation,
  deleteCategory,
  deleteDepartment,
  deleteLocation,
  updateCategory,
  updateDepartment,
  updateLocation,
} from "../api/masterData.js";
import {
  createTeacherMember,
  deleteMember,
  updateMember,
  updateMemberActiveStatus,
} from "../api/auth.js";

export function useMasterData({
  currentUser,
  itemCategories,
  campusLocations,
  departmentList,
  memberList,
  setFoundItems,
  setLostReports,
  setMemberList,
  setCurrentUser,
  loadAppData,
  setToast,
}) {
  const [masterDataSaving, setMasterDataSaving] = useState(false);
  const [masterDataError] = useState("");

  function renameCategoryInPosts(oldName, newName) {
    if (!oldName || oldName === newName) return;
    setFoundItems((items) =>
      items.map((item) => (item.category === oldName ? { ...item, category: newName } : item)),
    );
    setLostReports((items) =>
      items.map((item) => (item.category === oldName ? { ...item, category: newName } : item)),
    );
  }

  function renameLocationInPosts(oldName, newName) {
    if (!oldName || oldName === newName) return;
    setFoundItems((items) =>
      items.map((item) => (item.location === oldName ? { ...item, location: newName } : item)),
    );
    setLostReports((items) =>
      items.map((item) => (item.location === oldName ? { ...item, location: newName } : item)),
    );
  }

  function renameDepartmentInMembers(oldName, newName) {
    if (!oldName || oldName === newName) return;
    setMemberList((items) =>
      items.map((member) => (member.department === oldName ? { ...member, department: newName } : member)),
    );
    if (currentUser?.department === oldName) {
      setCurrentUser((user) => (user ? { ...user, department: newName } : user));
    }
  }

  async function saveCategory(entry) {
    const name = entry.name.trim();
    if (!name) {
      setToast("ກະລຸນາລະບຸຊື່ໝວດໝູ່");
      return false;
    }

    const payload = { name, description: entry.description.trim(), isActive: entry.isActive ?? true };
    setMasterDataSaving(true);

    try {
      const current = entry.id ? itemCategories.find((item) => item.id === entry.id) : null;
      if (entry.id) {
        await updateCategory(entry.id, payload);
        renameCategoryInPosts(current?.name, name);
        setToast("ບັນທຶກໝວດໝູ່ສິ່ງຂອງໃນຖານຂໍ້ມູນແລ້ວ");
      } else {
        await createCategory(payload);
        setToast("ເພີ່ມໝວດໝູ່ສິ່ງຂອງໃນຖານຂໍ້ມູນແລ້ວ");
      }
      await loadAppData();
      return true;
    } catch (error) {
      setToast(error.message || "ບັນທຶກໝວດໝູ່ບໍ່ສຳເລັດ");
      return false;
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function removeCategory(id) {
    setMasterDataSaving(true);
    try {
      await deleteCategory(id);
      await loadAppData();
      setToast("ລຶບໝວດໝູ່ສິ່ງຂອງຈາກຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ລຶບໝວດໝູ່ບໍ່ສຳເລັດ");
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function toggleCategoryActive(id) {
    const target = itemCategories.find((item) => item.id === id);
    if (!target) return;
    setMasterDataSaving(true);
    try {
      await updateCategory(id, { name: target.name, description: target.description, isActive: !target.isActive });
      await loadAppData();
      setToast("ອັບເດດສະຖານະໝວດໝູ່ໃນຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ອັບເດດສະຖານະໝວດໝູ່ບໍ່ສຳເລັດ");
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function saveLocation(entry) {
    const name = entry.name.trim();
    if (!name) {
      setToast("ກະລຸນາລະບຸຊື່ສະຖານທີ່");
      return false;
    }

    const payload = {
      name,
      building: entry.building.trim(),
      floor: entry.floor.trim(),
      locationType: entry.locationType,
      detail: entry.detail.trim(),
      isActive: entry.isActive ?? true,
    };
    setMasterDataSaving(true);

    try {
      const current = entry.id ? campusLocations.find((item) => item.id === entry.id) : null;
      if (entry.id) {
        const updated = await updateLocation(entry.id, payload);
        renameLocationInPosts(current?.name, updated.name);
        setToast("ບັນທຶກສະຖານທີ່ໃນຖານຂໍ້ມູນແລ້ວ");
      } else {
        await createLocation(payload);
        setToast("ເພີ່ມສະຖານທີ່ໃນຖານຂໍ້ມູນແລ້ວ");
      }
      await loadAppData();
      return true;
    } catch (error) {
      setToast(error.message || "ບັນທຶກສະຖານທີ່ບໍ່ສຳເລັດ");
      return false;
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function removeLocation(id) {
    setMasterDataSaving(true);
    try {
      await deleteLocation(id);
      await loadAppData();
      setToast("ລຶບສະຖານທີ່ຈາກຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ລຶບສະຖານທີ່ບໍ່ສຳເລັດ");
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function toggleLocationActive(id) {
    const target = campusLocations.find((item) => item.id === id);
    if (!target) return;
    setMasterDataSaving(true);
    try {
      await updateLocation(id, {
        name: target.nameTh || target.name,
        building: target.building,
        floor: target.floor,
        locationType: target.locationType,
        detail: target.detail,
        isActive: !target.isActive,
      });
      await loadAppData();
      setToast("ອັບເດດສະຖານະສະຖານທີ່ໃນຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ອັບເດດສະຖານະສະຖານທີ່ບໍ່ສຳເລັດ");
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function saveDepartment(entry) {
    const code = entry.code.trim().toUpperCase();
    const name = entry.name.trim();
    if (!code || !name) {
      setToast("ກະລຸນາລະບຸລະຫັດ ແລະ ຊື່ພາກວິຊາ");
      return false;
    }

    const payload = { code, name, nameEn: entry.nameEn.trim(), isActive: entry.isActive ?? true };
    setMasterDataSaving(true);

    try {
      const current = entry.id ? departmentList.find((item) => item.id === entry.id) : null;
      if (entry.id) {
        await updateDepartment(entry.id, payload);
        renameDepartmentInMembers(current?.name, name);
        setToast("ບັນທຶກພາກວິຊາໃນຖານຂໍ້ມູນແລ້ວ");
      } else {
        await createDepartment(payload);
        setToast("ເພີ່ມພາກວິຊາໃນຖານຂໍ້ມູນແລ້ວ");
      }
      await loadAppData();
      return true;
    } catch (error) {
      setToast(error.message || "ບັນທຶກພາກວິຊາບໍ່ສຳເລັດ");
      return false;
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function removeDepartment(id) {
    setMasterDataSaving(true);
    try {
      await deleteDepartment(id);
      await loadAppData();
      setToast("ລຶບພາກວິຊາຈາກຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ລຶບພາກວິຊາບໍ່ສຳເລັດ");
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function toggleDepartmentActive(id) {
    const target = departmentList.find((item) => item.id === id);
    if (!target) return;
    setMasterDataSaving(true);
    try {
      await updateDepartment(id, { code: target.code, name: target.name, nameEn: target.nameEn, isActive: !target.isActive });
      await loadAppData();
      setToast("ອັບເດດສະຖານະພາກວິຊາໃນຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ອັບເດດສະຖານະພາກວິຊາບໍ່ສຳເລັດ");
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function saveMember(entry) {
    const existing = entry.id ? memberList.find((member) => member.id === entry.id) : null;
    const role = existing?.role ?? "teacher";
    const username = entry.username.trim();
    const firstName = entry.firstName.trim();
    const lastName = entry.lastName.trim();
    const email = entry.email.trim();
    const phone = entry.phone.trim();
    const department = entry.department;
    const studentCode = entry.studentCode.trim();
    const employeeCode = entry.employeeCode.trim();
    const requiredValues = [
      ["Username", username],
      ["ຊື່", firstName],
      ["ນາມສະກຸນ", lastName],
      ["Email", email],
      ["ເບີໂທ", phone],
      ["ພາກວິຊາ", department],
      [role === "student" ? "ລະຫັດນັກສຶກສາ" : "ລະຫັດອາຈານ", role === "student" ? studentCode : employeeCode],
    ];

    if (!entry.id) requiredValues.push(["Password", entry.password]);

    const missingFields = requiredValues.filter(([, value]) => !value).map(([label]) => label);
    if (missingFields.length) {
      setToast(`ກະລຸນາກອກຂໍ້ມູນຜູ້ໃຊ້ໃຫ້ຄົບ: ${missingFields.join(", ")}`);
      return false;
    }

    const payload = { username, password: entry.password, firstName, lastName, email, phone, department, studentCode, employeeCode };
    setMasterDataSaving(true);

    try {
      const savedMember = entry.id
        ? await updateMember(entry.id, payload)
        : await createTeacherMember(payload);

      if (Number(savedMember.id) === Number(currentUser.id)) {
        setCurrentUser(savedMember);
      }

      await loadAppData();
      setToast(entry.id ? `ບັນທຶກຂໍ້ມູນຜູ້ໃຊ້ ${savedMember.username} ແລ້ວ` : `ສ້າງບັນຊີອາຈານ ${savedMember.username} ແລ້ວ`);
      return true;
    } catch (error) {
      setToast(error.message || "ບັນທຶກຜູ້ໃຊ້ບໍ່ສຳເລັດ");
      return false;
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function toggleMemberActive(member) {
    if (Number(member.id) === Number(currentUser.id)) {
      setToast("ບໍ່ສາມາດປິດບັນຊີທີ່ກຳລັງໃຊ້ງານຢູ່");
      return;
    }
    setMasterDataSaving(true);
    try {
      await updateMemberActiveStatus(member.id, !member.isActive, currentUser.id);
      await loadAppData();
      setToast(member.isActive ? "ປິດໃຊ້ງານບັນຊີຜູ້ໃຊ້ແລ້ວ" : "ເປີດໃຊ້ງານບັນຊີຜູ້ໃຊ້ແລ້ວ");
    } catch (error) {
      setToast(error.message || "ອັບເດດສະຖານະຜູ້ໃຊ້ບໍ່ສຳເລັດ");
    } finally {
      setMasterDataSaving(false);
    }
  }

  async function removeMember(member) {
    setMasterDataSaving(true);
    try {
      await deleteMember(member.id, currentUser.id);
      await loadAppData();
      setToast(`ລຶບບັນຊີນັກສຶກສາ ${member.username} ແລ້ວ`);
    } catch (error) {
      setToast(error.message || "ລຶບບັນຊີນັກສຶກສາບໍ່ສຳເລັດ");
    } finally {
      setMasterDataSaving(false);
    }
  }

  return {
    masterDataSaving,
    masterDataError,
    saveCategory,
    removeCategory,
    toggleCategoryActive,
    saveLocation,
    removeLocation,
    toggleLocationActive,
    saveDepartment,
    removeDepartment,
    toggleDepartmentActive,
    saveMember,
    removeMember,
    toggleMemberActive,
  };
}

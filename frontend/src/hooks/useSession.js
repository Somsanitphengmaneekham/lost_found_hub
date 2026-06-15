import { useState } from "react";
import {
  loginUser,
  registerUser,
  updateProfile,
} from "../api/auth.js";
import { fnsDepartmentMasterSeed } from "../campusMasterData.js";
import { roleLabel } from "../utils/ui.js";

// Fix 1: Session Persistence — เก็บ user ใน localStorage
const SESSION_KEY = "lostfound-session-v1";

function restoreSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // ตรวจสอบ structure ขั้นต่ำก่อน restore
    if (!parsed || !parsed.id || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(user) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // ไม่ throw — ถ้า localStorage เต็มก็แค่ไม่ persist
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export const registerInitial = {
  username: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: fnsDepartmentMasterSeed[0].name,
  studentCode: "",
  cardUploaded: false,
};

function contactChannelFromUser(user) {
  return user?.phone || user?.email || user?.username || "";
}

export function useSession({ setMemberList, loadAppData, setToast, setLoginError, departmentOptions }) {
  // Fix 1: restore session จาก localStorage เมื่อ mount
  const [currentUser, setCurrentUser] = useState(() => restoreSession());

  function updateCurrentUser(user) {
    setCurrentUser(user);
    if (user) {
      saveSession(user);
    } else {
      clearSession();
    }
  }

  async function login(username, password) {
    try {
      const user = await loginUser(username, password);
      updateCurrentUser(user);
      setLoginError("");
      await loadAppData();
      setToast(`ເຂົ້າລະບົບແລ້ວ: ${roleLabel(user.role)} ${user.fullName}`);
    } catch (error) {
      setLoginError(error.message || "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ");
    }
  }

  function logout() {
    updateCurrentUser(null);
    setToast("");
  }

  async function register(form) {
    const username = form.username.trim();
    const email = form.email.trim();
    const requiredValues = [
      ["ຊື່ຜູ້ໃຊ້", username],
      ["ຊື່", form.firstName.trim()],
      ["ນາມສະກຸນ", form.lastName.trim()],
      ["ອີເມວ", email],
      ["ເບີໂທ", form.phone.trim()],
      ["ພາກວິຊາ", form.department],
      ["ລະຫັດນັກສຶກສາ", form.studentCode.trim()],
      ["ລະຫັດຜ່ານ", form.password],
      ["ຢືນຢັນລະຫັດຜ່ານ", form.confirmPassword],
      ["ຮູບບັດນັກສຶກສາ", form.cardImageUrl],
    ];
    const missingFields = requiredValues.filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length) {
      setLoginError(`ກະລຸນາກອກຂໍ້ມູນໃຫ້ຄົບ: ${missingFields.join(", ")}`);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setLoginError("ລະຫັດຜ່ານ ແລະ ການຢືນຢັນລະຫັດຜ່ານບໍ່ກົງກັນ");
      return;
    }

    try {
      const member = await registerUser({
        role: "student",
        username,
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        phone: form.phone.trim(),
        department: form.department,
        studentCode: form.studentCode.trim(),
        cardFileName: form.cardFileName,
        cardImageUrl: form.cardImageUrl,
      });

      updateCurrentUser(member);
      setLoginError("");
      await loadAppData();
      setToast(`ສະໝັກສະມາຊິກແລ້ວ: ${roleLabel(member.role)} ${member.fullName}`);
    } catch (error) {
      setLoginError(error.message || "ສະໝັກສະມາຊິກບໍ່ສຳເລັດ");
    }
  }

  async function saveProfile(updatedProfile) {
    try {
      const updatedUser = await updateProfile(currentUser.id, updatedProfile);
      updateCurrentUser(updatedUser);
      setMemberList((current) =>
        current.map((member) => (Number(member.id) === Number(updatedUser.id) ? updatedUser : member)),
      );
      setToast("ບັນທຶກຂໍ້ມູນໂປຣໄຟລ໌ໃນຖານຂໍ້ມູນແລ້ວ");
    } catch (error) {
      setToast(error.message || "ບັນທຶກໂປຣໄຟລ໌ບໍ່ສຳເລັດ");
    }
  }

  async function uploadProfileAvatar(avatarUrl) {
    if (!avatarUrl) {
      setToast("ກະລຸນາເລືອກຮູບໂປຣໄຟລ໌");
      return;
    }

    try {
      const updatedUser = await updateProfile(currentUser.id, { avatarUrl });
      updateCurrentUser(updatedUser);
      setMemberList((current) =>
        current.map((member) => (Number(member.id) === Number(updatedUser.id) ? updatedUser : member)),
      );
      setToast("ອັບໂຫຼດຮູບໂປຣໄຟລ໌ແລ້ວ");
    } catch (error) {
      setToast(error.message || "ອັບໂຫຼດຮູບໂປຣໄຟລ໌ບໍ່ສຳເລັດ");
    }
  }

  async function uploadStudentCard(cardImageUrl) {
    if (!cardImageUrl) {
      setToast("ກະລຸນາເລືອກຮູບບັດນັກສຶກສາ");
      return;
    }

    try {
      const updatedUser = await updateProfile(currentUser.id, {
        cardImageUrl,
        identityStatus: "pending",
      });
      updateCurrentUser(updatedUser);
      setMemberList((current) =>
        current.map((member) => (Number(member.id) === Number(updatedUser.id) ? updatedUser : member)),
      );
      setToast("ອັບໂຫຼດຮູບບັດແລ້ວ ລໍຖ້າອາຈານຢືນຢັນຕົວຕົນ");
    } catch (error) {
      setToast(error.message || "ອັບໂຫຼດຮູບບັດບໍ່ສຳເລັດ");
    }
  }

  return {
    currentUser,
    setCurrentUser: updateCurrentUser,
    login,
    logout,
    register,
    saveProfile,
    uploadProfileAvatar,
    uploadStudentCard,
  };
}

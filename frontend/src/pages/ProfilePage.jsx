import { useEffect, useRef, useState } from "react";
import { ImagePlus, Save } from "lucide-react";
import { uploadSingleImageFile } from "../api/uploads.js";
import { FormGrid, TextInput } from "../components/common/FormControls.jsx";
import { IMAGE_ACCEPT, isAllowedImageFile, isAllowedImageUrl } from "../utils/images.js";
import { initials, roleLabel } from "../utils/ui.js";

function isPreviewableImage(value) {
  return isAllowedImageUrl(value);
}

export function ProfilePage({ currentUser, departmentOptions, onSave, onUploadAvatar, onUploadCard }) {
  const [uploadError, setUploadError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const avatarPreviewUrlRef = useRef("");
  const cardPreviewUrlRef = useRef("");
  const [avatarPreview, setAvatarPreview] = useState(() =>
    isPreviewableImage(currentUser.avatarUrl)
      ? { name: "ຮູບໂປຣໄຟລ໌ປັດຈຸບັນ", src: currentUser.avatarUrl }
      : null,
  );
  const [cardPreview, setCardPreview] = useState(() =>
    isPreviewableImage(currentUser.cardImageUrl)
      ? { name: "ຮູບບັດປັດຈຸບັນ", src: currentUser.cardImageUrl }
      : null,
  );
  const [profileForm, setProfileForm] = useState({
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    email: currentUser.email,
    phone: currentUser.phone,
    department: currentUser.department,
    studentCode: currentUser.studentCode,
    employeeCode: currentUser.employeeCode,
  });

  function updateProfile(field, value) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function submitProfile(event) {
    event.preventDefault();
    onSave(profileForm);
  }

  useEffect(() => {
    return () => {
      if (avatarPreviewUrlRef.current) URL.revokeObjectURL(avatarPreviewUrlRef.current);
      if (cardPreviewUrlRef.current) URL.revokeObjectURL(cardPreviewUrlRef.current);
    };
  }, []);

  function setLocalPreview(file, setPreview, previewUrlRef) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setPreview({ name: file.name, src: previewUrl });
  }

  function clearLocalPreview(previewUrlRef) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }

  async function handleAvatarImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedImageFile(file)) {
      setAvatarPreview(null);
      setAvatarError("ກະລຸນາອັບໂຫຼດໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setAvatarPreview(null);
      setAvatarError("ຮູບໂປຣໄຟລ໌ຕ້ອງບໍ່ເກີນ 8 MB");
      event.target.value = "";
      return;
    }

    setAvatarError("");
    setLocalPreview(file, setAvatarPreview, avatarPreviewUrlRef);

    try {
      const imageUrl = await uploadSingleImageFile(file);
      clearLocalPreview(avatarPreviewUrlRef);
      setAvatarPreview({ name: file.name, src: imageUrl });
      await onUploadAvatar(imageUrl);
    } catch (error) {
      setAvatarPreview(null);
      setAvatarError(error.message || "ອ່ານໄຟລ໌ຮູບໂປຣໄຟລ໌ບໍ່ສຳເລັດ");
      event.target.value = "";
    }
  }

  async function handleCardImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedImageFile(file)) {
      setCardPreview(null);
      setUploadError("ກະລຸນາອັບໂຫຼດໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setCardPreview(null);
      setUploadError("ຮູບບັດນັກສຶກສາຕ້ອງບໍ່ເກີນ 8 MB");
      event.target.value = "";
      return;
    }

    setUploadError("");
    setLocalPreview(file, setCardPreview, cardPreviewUrlRef);

    try {
      const imageUrl = await uploadSingleImageFile(file);
      clearLocalPreview(cardPreviewUrlRef);
      setCardPreview({ name: file.name, src: imageUrl });
      await onUploadCard(imageUrl);
    } catch (error) {
      setCardPreview(null);
      setUploadError(error.message || "ອ່ານໄຟລ໌ຮູບບັດບໍ່ສຳເລັດ");
      event.target.value = "";
    }
  }

  return (
    <section className="profile-section panel" id="profile" aria-labelledby="profile-title">
      <div className="panel-heading">
        <div>
          <h2 id="profile-title">ຈັດການໂປຣໄຟລ໌</h2>
          <p>ຂໍ້ມູນສ່ວນນີ້ກົງກັບ `members` ແລະ ການອັບໂຫຼດບັດກົງກັບ `student_card_uploads`</p>
        </div>
      </div>
      <div className="profile-layout">
        <aside className="profile-card">
          <div className={`profile-avatar ${avatarPreview ? "has-image" : ""}`}>
            {avatarPreview ? <img alt="ຮູບໂປຣໄຟລ໌" src={avatarPreview.src} /> : initials(currentUser.fullName)}
          </div>
          <label className="outline-button profile-upload profile-avatar-upload">
            <ImagePlus size={17} />
            <input
              accept={IMAGE_ACCEPT}
              className="sr-only"
              onChange={handleAvatarImageChange}
              type="file"
            />
            ແກ້ໄຂຮູບໂປຣໄຟລ໌
          </label>
          {avatarPreview && (
            <div className="profile-avatar-preview-note">
              <strong>ຮູບປັດຈຸບັນ</strong>
              <span>{avatarPreview.name}</span>
            </div>
          )}
          {avatarError && <div className="login-error profile-upload-error">{avatarError}</div>}
          <h3>{currentUser.fullName}</h3>
          <p>{roleLabel(currentUser.role)} · {currentUser.username}</p>
          <dl>
            <div>
              <dt>ພາກວິຊາ</dt>
              <dd>{currentUser.department}</dd>
            </div>
            <div>
              <dt>{currentUser.role === "student" ? "ລະຫັດນັກສຶກສາ" : "ລະຫັດພະນັກງານ"}</dt>
              <dd>{currentUser.role === "student" ? currentUser.studentCode || "-" : currentUser.employeeCode || "-"}</dd>
            </div>
            <div>
              <dt>ຮູບບັດ</dt>
              <dd>{currentUser.cardImageUrl ? "ອັບໂຫຼດແລ້ວ" : "ຍັງບໍ່ໄດ້ອັບໂຫຼດ"}</dd>
            </div>
          </dl>
          {currentUser.role === "student" && (
            <>
              <label className="outline-button profile-upload">
                <ImagePlus size={17} />
                <input
                  accept={IMAGE_ACCEPT}
                  className="sr-only"
                  onChange={handleCardImageChange}
                  type="file"
                />
                ອັບໂຫຼດຮູບບັດນັກສຶກສາ
              </label>
              {cardPreview && (
                <div className="image-preview-slot profile-preview-slot">
                  <div className="image-preview-frame">
                    <img alt="ຕົວຢ່າງຮູບບັດນັກສຶກສາ" src={cardPreview.src} />
                  </div>
                  <div className="image-preview-meta">
                    <strong>ຮູບທີ່ເລືອກແລ້ວ</strong>
                    <span>{cardPreview.name}</span>
                  </div>
                </div>
              )}
              {uploadError && <div className="login-error profile-upload-error">{uploadError}</div>}
            </>
          )}
        </aside>
        <form className="profile-form" onSubmit={submitProfile}>
          <FormGrid>
            <TextInput
              label="ຊື່"
              onChange={(value) => updateProfile("firstName", value)}
              required
              value={profileForm.firstName}
            />
            <TextInput
              label="ນາມສະກຸນ"
              onChange={(value) => updateProfile("lastName", value)}
              required
              value={profileForm.lastName}
            />
            <TextInput
              label="ອີເມວ"
              onChange={(value) => updateProfile("email", value)}
              required
              type="email"
              value={profileForm.email}
            />
            <TextInput
              label="ເບີໂທ"
              onChange={(value) => updateProfile("phone", value)}
              value={profileForm.phone}
            />
            <label className="field">
              <span>ພາກວິຊາ</span>
              <select value={profileForm.department ?? ""} onChange={(event) => updateProfile("department", event.target.value)}>
                {departmentOptions.map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
            </label>
            <TextInput
              label={currentUser.role === "student" ? "ລະຫັດນັກສຶກສາ" : "ລະຫັດພະນັກງານ"}
              onChange={(value) =>
                updateProfile(currentUser.role === "student" ? "studentCode" : "employeeCode", value)
              }
              value={currentUser.role === "student" ? profileForm.studentCode : profileForm.employeeCode}
            />
          </FormGrid>
          <button className="button button-primary profile-save" type="submit">
            <Save size={18} />
            ບັນທຶກໂປຣໄຟລ໌
          </button>
        </form>
      </div>
    </section>
  );
}

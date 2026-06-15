import { useEffect, useRef, useState } from "react";
import { CircleHelp, ImagePlus, LogIn, RotateCcw, ShieldCheck, UserPlus } from "lucide-react";
import { FormGrid, TextInput } from "../components/common/FormControls.jsx";
import { IMAGE_ACCEPT, compressImageFile, isAllowedImageFile } from "../utils/images.js";

const registerInitial = {
  username: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  studentCode: "",
  cardFileName: "",
  cardImageUrl: "",
};

function authModeFromHash() {
  return window.location.hash === "#register" ? "register" : "login";
}

export function LoginPage({
  appError,
  appLoading,
  departmentOptions,
  error,
  onLogin,
  onRegister,
  onRetry,
}) {
  const [authMode, setAuthMode] = useState(authModeFromHash);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [registerForm, setRegisterForm] = useState(registerInitial);
  const [cardPreview, setCardPreview] = useState(null);
  const cardFileNameRef = useRef("");
  const cardImageUrlRef = useRef("");

  useEffect(() => {
    function syncAuthMode() {
      setAuthMode(authModeFromHash());
    }

    syncAuthMode();
    window.addEventListener("hashchange", syncAuthMode);

    return () => window.removeEventListener("hashchange", syncAuthMode);
  }, []);

  useEffect(() => {
    if (!departmentOptions.length) return;

    setRegisterForm((current) => {
      if (departmentOptions.includes(current.department)) return current;
      return { ...current, department: departmentOptions[0] };
    });
  }, [departmentOptions]);

  function submitLogin(event) {
    event.preventDefault();
    onLogin(username, password);
  }

  function updateRegister(field, value) {
    setRegisterForm((current) => ({ ...current, [field]: value }));
    setLocalError("");
  }

  function clearCardImage() {
    cardFileNameRef.current = "";
    cardImageUrlRef.current = "";
    setCardPreview(null);
  }

  function submitRegister(event) {
    event.preventDefault();
    onRegister({
      ...registerForm,
      cardFileName: cardFileNameRef.current,
      cardImageUrl: cardImageUrlRef.current,
    });
  }

  async function handleCardImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      clearCardImage();
      return;
    }

    if (!isAllowedImageFile(file)) {
      clearCardImage();
      event.target.setCustomValidity("ກະລຸນາອັບໂຫຼດໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      event.target.reportValidity();
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      clearCardImage();
      event.target.setCustomValidity("ຮູບບັດນັກສຶກສາຕ້ອງບໍ່ເກີນ 8 MB");
      event.target.reportValidity();
      event.target.value = "";
      return;
    }

    event.target.setCustomValidity("");

    try {
      const imageUrl = await compressImageFile(file, {
        maxBytes: 180_000,
        maxWidth: 1000,
        quality: 0.76,
      });
      cardFileNameRef.current = file.name;
      cardImageUrlRef.current = imageUrl;
      setCardPreview({
        name: file.name,
        src: imageUrl,
      });
    } catch (error) {
      clearCardImage();
      event.target.setCustomValidity(error.message || "ອ່ານໄຟລ໌ຮູບບັດບໍ່ສຳເລັດ");
      event.target.reportValidity();
      event.target.value = "";
    }
  }

  return (
    <section className="login-shell">
      {appError && (
        <div className="master-data-alert login-api-alert" role="alert">
          <CircleHelp size={18} />
          <div>
            <strong>ເຊື່ອມຕໍ່ API ບໍ່ສຳເລັດ</strong>
            <p>{appError}</p>
            <p className="master-data-hint">ຣັນ npm run server ແລະ import database/lost_found_hub_xampp_mysql.sql</p>
          </div>
          <button className="outline-button" disabled={appLoading} onClick={onRetry} type="button">
            <RotateCcw size={16} />
            ລອງໃໝ່
          </button>
        </div>
      )}
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-mark">
            <ShieldCheck size={30} />
          </span>
          <div>
            <h1 id="login-title">Lost and Found</h1>
            <p>ຍີນດີຕ້ອນຮັບເຂົ້າສູ່ ເວັບໄຊປະກາດສີ່ງຂອງສູນຫາຍ ແລະ ພົບເຫັນ</p>
          </div>
        </div>
        <div className="auth-panel">
          <div className="auth-tabs" role="tablist" aria-label="ເລືອກເຂົ້າລະບົບ ຫຼື ສະໝັກສະມາຊິກ">
            <button
              className={authMode === "login" ? "selected" : ""}
              onClick={() => {
                setAuthMode("login");
                if (window.location.hash !== "#login") window.location.hash = "#login";
              }}
              type="button"
            >
              <LogIn size={17} />
              ເຂົ້າສູ່ລະບົບ
            </button>
            <button
              className={authMode === "register" ? "selected" : ""}
              onClick={() => {
                setAuthMode("register");
                if (window.location.hash !== "#register") window.location.hash = "#register";
              }}
              type="button"
            >
              <UserPlus size={17} />
              ສະໝັກສະມາຊິກ
            </button>
          </div>

          {authMode === "login" ? (
            <form className="login-form" key="login-form" onSubmit={submitLogin}>
              <label className="field">
                <span>ຊື່ຜູ້ໃຊ້</span>
                <input
                  autoComplete="username"
                  onChange={(event) => setUsername(event.target.value)}
                  value={username}
                />
              </label>
              <label className="field">
                <span>ລະຫັດຜ່ານ</span>
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </label>
              {error && <div className="login-error">{error}</div>}
              <button className="button button-primary" type="submit">
                <LogIn size={18} />
                ເຂົ້າສູ່ລະບົບ
              </button>
            </form>
          ) : (
            <form className="register-form" key="register-form" onSubmit={submitRegister}>
              <FormGrid>
                <TextInput
                  label="ຊື່ຜູ້ໃຊ້"
                  onChange={(value) => updateRegister("username", value)}
                  placeholder="ເຊັ່ນ student02"
                  required
                  value={registerForm.username}
                />
                <TextInput
                  label="ຊື່"
                  onChange={(value) => updateRegister("firstName", value)}
                  required
                  value={registerForm.firstName}
                />
                <TextInput
                  label="ນາມສະກຸນ"
                  onChange={(value) => updateRegister("lastName", value)}
                  required
                  value={registerForm.lastName}
                />
                <TextInput
                  label="ອີເມວ"
                  onChange={(value) => updateRegister("email", value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={registerForm.email}
                />
                <TextInput
                  label="ເບີໂທ"
                  onChange={(value) => updateRegister("phone", value)}
                  required
                  value={registerForm.phone}
                />
                <label className="field">
                  <span>
                    ພາກວິຊາ
                    <b>*</b>
                  </span>
                  <select
                    required
                    value={registerForm.department ?? ""}
                    onChange={(event) => updateRegister("department", event.target.value)}
                  >
                    {departmentOptions.map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </label>
                <TextInput
                  label="ລະຫັດນັກສຶກສາ"
                  onChange={(value) => updateRegister("studentCode", value)}
                  required
                  value={registerForm.studentCode}
                />
                <TextInput
                  label="ລະຫັດຜ່ານ"
                  onChange={(value) => updateRegister("password", value)}
                  required
                  type="password"
                  value={registerForm.password}
                />
                <TextInput
                  label="ຢືນຢັນລະຫັດຜ່ານ"
                  onChange={(value) => updateRegister("confirmPassword", value)}
                  required
                  type="password"
                  value={registerForm.confirmPassword}
                />
              </FormGrid>
              <label className="upload-row register-card-upload">
                <ImagePlus size={19} />
                <input
                  accept={IMAGE_ACCEPT}
                  className="sr-only"
                  onChange={handleCardImageChange}
                  required
                  type="file"
                />
                <span>
                  ອັບໂຫຼດຮູບບັດນັກສຶກສາ *
                  <small>ຮອງຮັບ JPG, PNG, WEBP ຂະໜາດບໍ່ເກີນ 8 MB</small>
                </span>
              </label>
              {cardPreview && (
                <div className="image-preview-slot">
                  <div className="image-preview-frame">
                    <img alt="ຕົວຢ່າງຮູບບັດນັກສຶກສາ" src={cardPreview.src} />
                  </div>
                  <div className="image-preview-meta">
                    <strong>ຮູບທີ່ເລືອກແລ້ວ</strong>
                    <span>{cardPreview.name}</span>
                  </div>
                </div>
              )}
              {(localError || error) && <div className="login-error">{localError || error}</div>}
              <button className="button button-primary" type="submit">
                <UserPlus size={18} />
                ສະໝັກສະມາຊິກ
              </button>
            </form>
          )}
        </div>
      </section>
    </section>
  );
}

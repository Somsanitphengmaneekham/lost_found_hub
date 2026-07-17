import { useEffect, useRef, useState } from "react";
import { CircleHelp, ImagePlus, KeyRound, LogIn, RotateCcw, ShieldCheck, UserPlus } from "lucide-react";
import { confirmPasswordReset, requestPasswordResetOtp, verifyPasswordResetOtp } from "../api/auth.js";
import { FormGrid, TextInput } from "../components/common/FormControls.jsx";
import { IMAGE_ACCEPT, isAllowedImageFile } from "../utils/images.js";

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

const resetInitial = {
  identifier: "",
  otp: "",
  resetToken: "",
  newPassword: "",
  confirmPassword: "",
};

function authModeFromHash() {
  if (window.location.hash === "#register") return "register";
  if (window.location.hash === "#forgot" || window.location.hash === "#forgot-password") return "forgot";
  return "login";
}

function hashForAuthMode(mode) {
  if (mode === "register") return "#register";
  if (mode === "forgot") return "#forgot-password";
  return "#login";
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
  const [resetForm, setResetForm] = useState(resetInitial);
  const [resetStep, setResetStep] = useState("request");
  const [resetStatus, setResetStatus] = useState("");
  const [resetDebugOtp, setResetDebugOtp] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [cardPreview, setCardPreview] = useState(null);
  const cardFileRef = useRef(null);
  const cardFileNameRef = useRef("");
  const cardPreviewUrlRef = useRef("");

  useEffect(() => {
    function syncAuthMode() {
      setAuthMode(authModeFromHash());
    }

    syncAuthMode();
    window.addEventListener("hashchange", syncAuthMode);

    return () => window.removeEventListener("hashchange", syncAuthMode);
  }, []);

  useEffect(() => {
    return () => {
      if (cardPreviewUrlRef.current) URL.revokeObjectURL(cardPreviewUrlRef.current);
    };
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

  function changeAuthMode(mode) {
    setAuthMode(mode);
    setLocalError("");
    const nextHash = hashForAuthMode(mode);
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
  }

  function updateReset(field, value) {
    setResetForm((current) => ({ ...current, [field]: value }));
    setLocalError("");
  }

  function resetForgotFlow() {
    setResetStep("request");
    setResetStatus("");
    setResetDebugOtp("");
    setResetForm((current) => ({
      ...resetInitial,
      identifier: current.identifier,
    }));
  }

  async function submitResetRequest(event) {
    event.preventDefault();
    setResetLoading(true);
    setLocalError("");
    setResetStatus("");
    setResetDebugOtp("");

    try {
      const response = await requestPasswordResetOtp({
        identifier: resetForm.identifier,
      });

      setResetStatus(`ສົ່ງ OTP ໄປທີ່ ${response.destination} ແລ້ວ ລະຫັດຈະໝົດອາຍຸໃນ ${response.expiresInMinutes} ນາທີ`);
      if (response.debugOtp) setResetDebugOtp(response.debugOtp);
      setResetStep("verify");
    } catch (requestError) {
      setLocalError(requestError.message);
    } finally {
      setResetLoading(false);
    }
  }

  async function submitResetVerify(event) {
    event.preventDefault();
    setResetLoading(true);
    setLocalError("");

    try {
      const response = await verifyPasswordResetOtp({
        identifier: resetForm.identifier,
        otp: resetForm.otp,
      });

      setResetForm((current) => ({ ...current, resetToken: response.resetToken }));
      setResetStatus(`OTP ຖືກຕ້ອງ ກະລຸນາຕັ້ງລະຫັດຜ່ານໃໝ່ພາຍໃນ ${response.expiresInMinutes} ນາທີ`);
      setResetStep("reset");
    } catch (verifyError) {
      setLocalError(verifyError.message);
    } finally {
      setResetLoading(false);
    }
  }

  async function submitResetConfirm(event) {
    event.preventDefault();
    setResetLoading(true);
    setLocalError("");

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetLoading(false);
      setLocalError("ລະຫັດຜ່ານຢືນຢັນບໍ່ກົງກັນ");
      return;
    }

    try {
      await confirmPasswordReset({
        resetToken: resetForm.resetToken,
        newPassword: resetForm.newPassword,
      });

      setPassword("");
      setResetForm(resetInitial);
      setResetStep("request");
      setResetDebugOtp("");
      setResetStatus("ປ່ຽນລະຫັດຜ່ານສຳເລັດ ກະລຸນາເຂົ້າສູ່ລະບົບດ້ວຍລະຫັດໃໝ່");
      changeAuthMode("login");
    } catch (confirmError) {
      setLocalError(confirmError.message);
    } finally {
      setResetLoading(false);
    }
  }

  function updateRegister(field, value) {
    setRegisterForm((current) => ({ ...current, [field]: value }));
    setLocalError("");
  }

  function clearCardImage() {
    if (cardPreviewUrlRef.current) {
      URL.revokeObjectURL(cardPreviewUrlRef.current);
      cardPreviewUrlRef.current = "";
    }
    cardFileRef.current = null;
    cardFileNameRef.current = "";
    setCardPreview(null);
  }

  function submitRegister(event) {
    event.preventDefault();
    onRegister({
      ...registerForm,
      cardFileName: cardFileNameRef.current,
      cardImageFile: cardFileRef.current,
    });
  }

  function handleCardImageChange(event) {
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

    if (cardPreviewUrlRef.current) URL.revokeObjectURL(cardPreviewUrlRef.current);

    const previewUrl = URL.createObjectURL(file);
    cardPreviewUrlRef.current = previewUrl;
    cardFileRef.current = file;
    cardFileNameRef.current = file.name;
    setCardPreview({
      name: file.name,
      src: previewUrl,
    });
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
              onClick={() => changeAuthMode("login")}
              type="button"
            >
              <LogIn size={17} />
              ເຂົ້າສູ່ລະບົບ
            </button>
            <button
              className={authMode === "register" ? "selected" : ""}
              onClick={() => changeAuthMode("register")}
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
              <button className="forgot-link" onClick={() => changeAuthMode("forgot")} type="button">
                ລືມລະຫັດຜ່ານ?
              </button>
              {resetStatus && <div className="forgot-status success">{resetStatus}</div>}
              {error && <div className="login-error">{error}</div>}
              <button className="button button-primary" type="submit">
                <LogIn size={18} />
                ເຂົ້າສູ່ລະບົບ
              </button>
            </form>
          ) : authMode === "register" ? (
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
          ) : (
            <div className="forgot-panel" key="forgot-form">
              <div className="forgot-heading">
                <span className="forgot-icon">
                  <KeyRound size={18} />
                </span>
                <div>
                  <h2>ລືມລະຫັດຜ່ານ</h2>
                  <p>ຮັບ OTP ຜ່ານອີເມວທີ່ຢູ່ໃນບັນຊີຂອງທ່ານ</p>
                </div>
              </div>

              {resetStep === "request" && (
                <form className="forgot-form" onSubmit={submitResetRequest}>
                  <label className="field">
                    <span>ຊື່ຜູ້ໃຊ້ / ອີເມວ</span>
                    <input
                      autoComplete="username"
                      onChange={(event) => updateReset("identifier", event.target.value)}
                      required
                      value={resetForm.identifier}
                    />
                  </label>
                  {localError && <div className="login-error">{localError}</div>}
                  <button className="button button-primary" disabled={resetLoading} type="submit">
                    <KeyRound size={18} />
                    {resetLoading ? "ກຳລັງສົ່ງ OTP..." : "ສົ່ງ OTP"}
                  </button>
                </form>
              )}

              {resetStep === "verify" && (
                <form className="forgot-form" onSubmit={submitResetVerify}>
                  {resetStatus && <div className="forgot-status">{resetStatus}</div>}
                  {resetDebugOtp && (
                    <div className="forgot-dev-otp">
                      OTP ສຳລັບທົດສອບ: <strong>{resetDebugOtp}</strong>
                    </div>
                  )}
                  <label className="field">
                    <span>OTP</span>
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => updateReset("otp", event.target.value)}
                      required
                      value={resetForm.otp}
                    />
                  </label>
                  {localError && <div className="login-error">{localError}</div>}
                  <div className="forgot-actions">
                    <button className="outline-button" onClick={resetForgotFlow} type="button">
                      ຂໍ OTP ໃໝ່
                    </button>
                    <button className="button button-primary" disabled={resetLoading} type="submit">
                      {resetLoading ? "ກຳລັງກວດສອບ..." : "ຢືນຢັນ OTP"}
                    </button>
                  </div>
                </form>
              )}

              {resetStep === "reset" && (
                <form className="forgot-form" onSubmit={submitResetConfirm}>
                  {resetStatus && <div className="forgot-status success">{resetStatus}</div>}
                  <label className="field">
                    <span>ລະຫັດຜ່ານໃໝ່</span>
                    <input
                      autoComplete="new-password"
                      minLength={6}
                      onChange={(event) => updateReset("newPassword", event.target.value)}
                      required
                      type="password"
                      value={resetForm.newPassword}
                    />
                  </label>
                  <label className="field">
                    <span>ຢືນຢັນລະຫັດຜ່ານໃໝ່</span>
                    <input
                      autoComplete="new-password"
                      minLength={6}
                      onChange={(event) => updateReset("confirmPassword", event.target.value)}
                      required
                      type="password"
                      value={resetForm.confirmPassword}
                    />
                  </label>
                  {localError && <div className="login-error">{localError}</div>}
                  <button className="button button-primary" disabled={resetLoading} type="submit">
                    <KeyRound size={18} />
                    {resetLoading ? "ກຳລັງບັນທຶກ..." : "ປ່ຽນລະຫັດຜ່ານ"}
                  </button>
                </form>
              )}

              <button
                className="forgot-link align-left"
                onClick={() => {
                  resetForgotFlow();
                  changeAuthMode("login");
                }}
                type="button"
              >
                ກັບໄປໜ້າເຂົ້າສູ່ລະບົບ
              </button>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

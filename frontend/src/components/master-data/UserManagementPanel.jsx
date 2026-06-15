import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Eye,
  Pencil,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  UserCog,
  UserPlus,
} from "lucide-react";
import { FormGrid, TextInput } from "../common/FormControls.jsx";
import { identityStatusLabel, normalizeText, roleLabel } from "../../utils/ui.js";

const emptyTeacherForm = {
  role: "teacher",
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  studentCode: "",
  employeeCode: "",
};

function statusTone(status) {
  if (status === "verified") return "green";
  if (status === "rejected") return "red";
  return "amber";
}

function memberFullName(member) {
  return member.fullName || [member.firstName, member.lastName].filter(Boolean).join(" ");
}

export function UserManagementPanel({
  currentUserId,
  departmentOptions,
  loading,
  members,
  onSaveMember,
  onToggleActive,
  onUpdateIdentityStatus,
  saving,
}) {
  const [editingId, setEditingId] = useState(null);
  const [memberForm, setMemberForm] = useState(emptyTeacherForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewMember, setPreviewMember] = useState(null);

  const filteredMembers = useMemo(() => {
    const query = normalizeText(searchTerm);
    if (!query) return members;

    return members.filter((member) =>
      normalizeText(
        [
          member.username,
          memberFullName(member),
          member.email,
          member.phone,
          member.department,
          member.studentCode,
          member.employeeCode,
          roleLabel(member.role),
        ].join(" "),
      ).includes(query),
    );
  }, [members, searchTerm]);

  function resetForm() {
    setEditingId(null);
    setMemberForm({
      ...emptyTeacherForm,
      department: departmentOptions[0] ?? "",
    });
  }

  function startEdit(member) {
    setEditingId(member.id);
    setMemberForm({
      role: member.role,
      username: member.username ?? "",
      password: "",
      firstName: member.firstName ?? "",
      lastName: member.lastName ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
      department: member.department || departmentOptions[0] || "",
      studentCode: member.studentCode ?? "",
      employeeCode: member.employeeCode ?? "",
    });
  }

  async function submitMember(event) {
    event.preventDefault();
    const saved = await onSaveMember({ id: editingId, ...memberForm });
    if (saved) resetForm();
  }

  const isEditing = Boolean(editingId);
  const editingRole = memberForm.role;

  return (
    <div className={`master-data-layout user-management-layout ${loading ? "is-loading" : ""}`}>
      <form className="master-data-form user-management-form" onSubmit={submitMember}>
        <h3>
          {isEditing ? (
            <>
              <Pencil size={18} />
              ແກ້ໄຂຜູ້ໃຊ້
            </>
          ) : (
            <>
              <UserPlus size={18} />
              ເພີ່ມບັນຊີອາຈານ
            </>
          )}
        </h3>

        <div className="user-management-note">
          <ShieldCheck size={18} />
          <p>
            ນັກສຶກສາສະໝັກຜ່ານໜ້າ Register ສ່ວນອາຈານ/ຫ້ອງຄຸ້ມຄອງໃຫ້ສ້າງຈາກໜ້ານີ້ເທົ່ານັ້ນ.
          </p>
        </div>

        <FormGrid>
          <label className="field">
            <span>ປະເພດຜູ້ໃຊ້</span>
            <input readOnly value={roleLabel(editingRole)} />
          </label>
          <TextInput
            label="Username"
            onChange={(value) => setMemberForm((current) => ({ ...current, username: value }))}
            required
            value={memberForm.username}
          />
          {!isEditing && (
            <TextInput
              label="Password"
              onChange={(value) => setMemberForm((current) => ({ ...current, password: value }))}
              required
              type="password"
              value={memberForm.password}
            />
          )}
          <TextInput
            label="ຊື່"
            onChange={(value) => setMemberForm((current) => ({ ...current, firstName: value }))}
            required
            value={memberForm.firstName}
          />
          <TextInput
            label="ນາມສະກຸນ"
            onChange={(value) => setMemberForm((current) => ({ ...current, lastName: value }))}
            required
            value={memberForm.lastName}
          />
          <TextInput
            label="Email"
            onChange={(value) => setMemberForm((current) => ({ ...current, email: value }))}
            required
            type="email"
            value={memberForm.email}
          />
          <TextInput
            label="ເບີໂທ"
            onChange={(value) => setMemberForm((current) => ({ ...current, phone: value }))}
            required
            value={memberForm.phone}
          />
          <label className="field">
            <span>ພາກວິຊາ</span>
            <select
              onChange={(event) => setMemberForm((current) => ({ ...current, department: event.target.value }))}
              required
              value={memberForm.department}
            >
              <option value="">ເລືອກພາກວິຊາ</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
          {editingRole === "student" ? (
            <TextInput
              label="ລະຫັດນັກສຶກສາ"
              onChange={(value) => setMemberForm((current) => ({ ...current, studentCode: value }))}
              required
              value={memberForm.studentCode}
            />
          ) : (
            <TextInput
              label="ລະຫັດພະນັກງານ/ອາຈານ"
              onChange={(value) => setMemberForm((current) => ({ ...current, employeeCode: value }))}
              required
              value={memberForm.employeeCode}
            />
          )}
        </FormGrid>

        <div className="master-data-form-actions">
          {isEditing && (
            <button className="outline-button" onClick={resetForm} type="button">
              <RotateCcw size={16} />
              ຍົກເລີກແກ້ໄຂ
            </button>
          )}
          <button className="button button-primary" disabled={loading || saving} type="submit">
            <Save size={17} />
            {saving ? "ກຳລັງບັນທຶກ..." : isEditing ? "ບັນທຶກຜູ້ໃຊ້" : "ສ້າງບັນຊີອາຈານ"}
          </button>
        </div>
      </form>

      <div className="master-data-list user-management-list">
        <div className="user-management-toolbar">
          <label className="user-search-box">
            <Search size={17} />
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ຄົ້ນຫາຜູ້ໃຊ້, username, email, ລະຫັດ..."
              value={searchTerm}
            />
          </label>
          <span className="master-data-count">
            <UserCog size={17} />
            {filteredMembers.length} ຄົນ
          </span>
        </div>

        {filteredMembers.length === 0 && (
          <div className="empty-state compact">
            <strong>ບໍ່ພົບຜູ້ໃຊ້</strong>
            <p>ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ເພີ່ມບັນຊີອາຈານຈາກຟອມດ້ານຊ້າຍ.</p>
          </div>
        )}

        {filteredMembers.map((member) => {
          const isSelf = Number(member.id) === Number(currentUserId);
          return (
            <article className={`master-data-row member-row ${member.isActive ? "" : "inactive"}`} key={member.id}>
              <div className="member-card-preview">
                {member.cardImageUrl ? (
                  <button
                    aria-label={`ເບິ່ງຮູບບັດຂອງ ${memberFullName(member)}`}
                    onClick={() => setPreviewMember(member)}
                    type="button"
                  >
                    <img alt="" src={member.cardImageUrl} />
                    <Eye size={16} />
                  </button>
                ) : (
                  <span>
                    <UserCog size={24} />
                  </span>
                )}
              </div>
              <div className="master-data-row-main member-row-main">
                <div className="member-chip-row">
                  <span className={`status-chip ${member.role === "teacher" ? "blue" : "slate"}`}>
                    {roleLabel(member.role)}
                  </span>
                  <span className={`status-chip ${member.isActive ? "green" : "red"}`}>
                    {member.isActive ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                  </span>
                  <span className={`status-chip ${statusTone(member.identityStatus)}`}>
                    {identityStatusLabel(member.identityStatus)}
                  </span>
                </div>
                <h4>{memberFullName(member) || member.username}</h4>
                <p>
                  @{member.username} · {member.department || "ບໍ່ລະບຸພາກວິຊາ"}
                </p>
                <small>
                  {member.email} · {member.phone || "ບໍ່ລະບຸເບີໂທ"} ·{" "}
                  {member.role === "student"
                    ? member.studentCode || "ບໍ່ລະບຸລະຫັດນັກສຶກສາ"
                    : member.employeeCode || "ບໍ່ລະບຸລະຫັດອາຈານ"}
                </small>
              </div>
              <div className="master-data-row-actions member-actions">
                <button className="outline-button" onClick={() => startEdit(member)} type="button">
                  <Pencil size={16} />
                  ແກ້ໄຂ
                </button>
                <button
                  className="outline-button"
                  disabled={isSelf}
                  onClick={() => onToggleActive(member)}
                  title={isSelf ? "ບໍ່ສາມາດປິດບັນຊີທີ່ກຳລັງໃຊ້ຢູ່" : undefined}
                  type="button"
                >
                  {member.isActive ? <Ban size={16} /> : <BadgeCheck size={16} />}
                  {member.isActive ? "ປິດໃຊ້ງານ" : "ເປີດໃຊ້ງານ"}
                </button>
                {member.role === "student" && (
                  <>
                    <button
                      className="outline-button"
                      onClick={() => onUpdateIdentityStatus(member, "verified")}
                      type="button"
                    >
                      <BadgeCheck size={16} />
                      ຢືນຢັນ
                    </button>
                    <button
                      className="reject-button"
                      onClick={() => onUpdateIdentityStatus(member, "rejected")}
                      type="button"
                    >
                      <Ban size={16} />
                      ປະຕິເສດບັດ
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {previewMember && (
        <div className="member-card-modal" role="dialog" aria-modal="true">
          <div className="member-card-modal-card">
            <button className="member-card-modal-close" onClick={() => setPreviewMember(null)} type="button">
              ×
            </button>
            <h3>ຮູບບັດນັກສຶກສາ</h3>
            <p>{memberFullName(previewMember)}</p>
            <img alt={`ບັດນັກສຶກສາຂອງ ${memberFullName(previewMember)}`} src={previewMember.cardImageUrl} />
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { CircleHelp, Database, Landmark, MapPin, PackageCheck, Pencil, RotateCcw, Save, Trash2, UserCog } from "lucide-react";
import { UserManagementPanel } from "../components/master-data/UserManagementPanel.jsx";
import { FormGrid, TextInput } from "../components/common/FormControls.jsx";
import { joinDetail } from "../utils/ui.js";

const MASTER_TABS = [
  { id: "categories", label: "ໝວດໝູ່ສິ່ງຂອງ", table: "item_categories", icon: PackageCheck },
  { id: "locations", label: "ສະຖານທີ່", table: "locations", icon: MapPin },
  { id: "departments", label: "ພາກວິຊາ", table: "departments", icon: Landmark },
  { id: "members", label: "ຜູ້ໃຊ້", table: "members", icon: UserCog },
];



export function MasterDataPage({
  campusLocations,
  currentUserId,
  departmentList,
  error,
  itemCategories,
  loading,
  members = [],
  onDeleteMember,
  onReload,
  onRemoveCategory,
  onRemoveDepartment,
  onRemoveLocation,
  onSaveCategory,
  onSaveDepartment,
  onSaveLocation,
  onSaveMember,
  onToggleCategoryActive,
  onToggleDepartmentActive,
  onToggleLocationActive,
  onToggleMemberActive,
  saving,
}) {
  const [activeTab, setActiveTab] = useState("categories");
  const [editingId, setEditingId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", isActive: true });
  const [locationForm, setLocationForm] = useState({
    name: "",
    building: "",
    floor: "",
    detail: "",
    isActive: true,
  });
  const [departmentForm, setDepartmentForm] = useState({
    code: "",
    name: "",
    nameEn: "",
    isActive: true,
  });

  const activeTabMeta = MASTER_TABS.find((tab) => tab.id === activeTab) ?? MASTER_TABS[0];

  function resetForms() {
    setEditingId(null);
    setCategoryForm({ name: "", description: "", isActive: true });
    setLocationForm({
      name: "",
      building: "",
      floor: "",
      detail: "",
      isActive: true,
    });
    setDepartmentForm({ code: "", name: "", nameEn: "", isActive: true });
  }

  function switchTab(tabId) {
    setActiveTab(tabId);
    resetForms();
  }

  function startEditCategory(item) {
    setEditingId(item.id);
    setCategoryForm({
      name: item.name,
      description: item.description || "",
      isActive: item.isActive,
    });
  }

  function startEditLocation(item) {
    setEditingId(item.id);
    setLocationForm({
      name: item.nameTh || item.name,
      building: item.building || "",
      floor: item.floor || "",
      detail: item.detail || "",
      isActive: item.isActive,
    });
  }

  function startEditDepartment(item) {
    setEditingId(item.id);
    setDepartmentForm({
      code: item.code,
      name: item.name,
      nameEn: item.nameEn || "",
      isActive: item.isActive,
    });
  }

  async function submitCategory(event) {
    event.preventDefault();
    const saved = await onSaveCategory({ id: editingId, ...categoryForm });
    if (saved) resetForms();
  }

  async function submitLocation(event) {
    event.preventDefault();
    const saved = await onSaveLocation({ id: editingId, ...locationForm });
    if (saved) resetForms();
  }

  async function submitDepartment(event) {
    event.preventDefault();
    const saved = await onSaveDepartment({ id: editingId, ...departmentForm });
    if (saved) resetForms();
  }

  return (
    <section className="panel master-data-section" id="master-data" aria-labelledby="master-data-title">
      <div className="panel-heading">
        <div>
          <h2 id="master-data-title">ຈັດການຂໍ້ມູນພື້ນຖານ</h2>
          <p>
            ອາຈານສາມາດເພີ່ມ ແກ້ໄຂ ປິດໃຊ້ງານ ຫຼື ລຶບຂໍ້ມູນອ້າງອີງໃນ{" "}
            <code>{activeTabMeta.table}</code> ທີ່ໃຊ້ໃນຟອມ ແລະ ລາຍງານ
          </p>
        </div>
        <span className="master-data-count">
          <Database size={17} />
          {itemCategories.length + campusLocations.length + departmentList.length + members.length} ລາຍການ
        </span>
      </div>

      {error && (
        <div className="master-data-alert" role="alert">
          <CircleHelp size={18} />
          <div>
            <strong>ເຊື່ອມຕໍ່ API ບໍ່ສຳເລັດ</strong>
            <p>{error}</p>
            <p className="master-data-hint">
              ຣັນ npm run server:crud ແລະ import database/lost_found_hub_xampp_mysql.sql ໃນ XAMPP
            </p>
          </div>
          <button className="outline-button" onClick={onReload} type="button">
            <RotateCcw size={16} />
            ລອງໃໝ່
          </button>
        </div>
      )}

      <div className="master-data-tabs" role="tablist" aria-label="ເລືອກປະເພດຂໍ້ມູນພື້ນຖານ">
        {MASTER_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={activeTab === tab.id ? "selected" : ""}
              disabled={loading || saving}
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              role="tab"
              type="button"
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "members" ? (
        <UserManagementPanel
          currentUserId={currentUserId}
          departmentOptions={departmentList.filter((item) => item.isActive).map((item) => item.name)}
          loading={loading}
          members={members}
          onDeleteMember={onDeleteMember}
          onSaveMember={onSaveMember}
          onToggleActive={onToggleMemberActive}
          saving={saving}
        />
      ) : (
      <div className={`master-data-layout ${loading ? "is-loading" : ""}`}>
        <form
          className="master-data-form"
          onSubmit={
            activeTab === "categories"
              ? submitCategory
              : activeTab === "locations"
                ? submitLocation
                : submitDepartment
          }
        >
          <h3>{editingId ? "ແກ້ໄຂລາຍການ" : "ເພີ່ມລາຍການໃໝ່"}</h3>

          {activeTab === "categories" && (
            <FormGrid>
              <TextInput
                label="ຊື່ໝວດໝູ່"
                onChange={(value) => setCategoryForm((current) => ({ ...current, name: value }))}
                required
                value={categoryForm.name}
              />
              <TextInput
                label="ຄຳອະທິບາຍ"
                onChange={(value) => setCategoryForm((current) => ({ ...current, description: value }))}
                value={categoryForm.description}
              />
              <label className="check-row master-active-check">
                <input
                  checked={categoryForm.isActive}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  type="checkbox"
                />
                ເປີດໃຊ້ງານໃນຟອມ
              </label>
            </FormGrid>
          )}

          {activeTab === "locations" && (
            <FormGrid>
              <TextInput
                label="ຊື່ສະຖານທີ່ (ສະແດງໃນຟອມ)"
                onChange={(value) => setLocationForm((current) => ({ ...current, name: value }))}
                required
                value={locationForm.name}
              />
              <TextInput
                label="ອາຄານ"
                onChange={(value) => setLocationForm((current) => ({ ...current, building: value }))}
                value={locationForm.building}
              />
              <TextInput
                label="ຊັ້ນ"
                onChange={(value) => setLocationForm((current) => ({ ...current, floor: value }))}
                value={locationForm.floor}
              />

              <TextInput
                label="ລາຍລະອຽດເພີ່ມເຕີມ"
                onChange={(value) => setLocationForm((current) => ({ ...current, detail: value }))}
                value={locationForm.detail}
              />
              <label className="check-row master-active-check">
                <input
                  checked={locationForm.isActive}
                  onChange={(event) =>
                    setLocationForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  type="checkbox"
                />
                ເປີດໃຊ້ງານໃນຟອມ
              </label>
            </FormGrid>
          )}

          {activeTab === "departments" && (
            <FormGrid>
              <TextInput
                label="ລະຫັດພາກວິຊາ"
                onChange={(value) => setDepartmentForm((current) => ({ ...current, code: value }))}
                placeholder="ເຊັ່ນ SCI"
                required
                value={departmentForm.code}
              />
              <TextInput
                label="ຊື່ພາກວິຊາ (ລາວ)"
                onChange={(value) => setDepartmentForm((current) => ({ ...current, name: value }))}
                required
                value={departmentForm.name}
              />
              <TextInput
                label="ຊື່ພາກວິຊາ (English)"
                onChange={(value) => setDepartmentForm((current) => ({ ...current, nameEn: value }))}
                value={departmentForm.nameEn}
              />
              <label className="check-row master-active-check">
                <input
                  checked={departmentForm.isActive}
                  onChange={(event) =>
                    setDepartmentForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  type="checkbox"
                />
                ເປີດໃຊ້ງານໃນຟອມສະໝັກສະມາຊິກ
              </label>
            </FormGrid>
          )}

          <div className="master-data-form-actions">
            {editingId && (
              <button className="outline-button" onClick={resetForms} type="button">
                <RotateCcw size={16} />
                ຍົກເລີກແກ້ໄຂ
              </button>
            )}
            <button className="button button-primary" disabled={loading || saving} type="submit">
              <Save size={17} />
              {saving ? "ກຳລັງບັນທຶກ..." : editingId ? "ບັນທຶກການແກ້ໄຂ" : "ເພີ່ມຂໍ້ມູນ"}
            </button>
          </div>
        </form>

        <div className="master-data-list">
          {activeTab === "categories" &&
            itemCategories.map((item) => (
              <article className={`master-data-row ${item.isActive ? "" : "inactive"}`} key={item.id}>
                <div className="master-data-row-main">
                  <span className={`status-chip ${item.isActive ? "green" : "slate"}`}>
                    {item.isActive ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                  </span>
                  <h4>{item.name}</h4>
                  <p>{item.description || "ບໍ່ມີຄຳອະທິບາຍ"}</p>
                </div>
                <div className="master-data-row-actions">
                  <button className="outline-button" onClick={() => startEditCategory(item)} type="button">
                    <Pencil size={16} />
                    ແກ້ໄຂ
                  </button>
                  <button className="outline-button" onClick={() => onToggleCategoryActive(item.id)} type="button">
                    {item.isActive ? "ປິດໃຊ້ງານ" : "ເປີດໃຊ້ງານ"}
                  </button>
                  <button className="reject-button" onClick={() => onRemoveCategory(item.id)} type="button">
                    <Trash2 size={16} />
                    ລຶບ
                  </button>
                </div>
              </article>
            ))}

          {activeTab === "locations" &&
            campusLocations.map((item) => (
              <article className={`master-data-row ${item.isActive ? "" : "inactive"}`} key={item.id}>
                <div className="master-data-row-main">
                  <span className={`status-chip ${item.isActive ? "green" : "slate"}`}>
                    {item.isActive ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                  </span>
                  <h4>{item.name}</h4>
                  <p>
                    {joinDetail(item.building, item.floor ? `ຊັ້ນ ${item.floor}` : "")}
                    {item.detail ? ` · ${item.detail}` : ""}
                  </p>

                </div>
                <div className="master-data-row-actions">
                  <button className="outline-button" onClick={() => startEditLocation(item)} type="button">
                    <Pencil size={16} />
                    ແກ້ໄຂ
                  </button>
                  <button className="outline-button" onClick={() => onToggleLocationActive(item.id)} type="button">
                    {item.isActive ? "ປິດໃຊ້ງານ" : "ເປີດໃຊ້ງານ"}
                  </button>
                  <button className="reject-button" onClick={() => onRemoveLocation(item.id)} type="button">
                    <Trash2 size={16} />
                    ລຶບ
                  </button>
                </div>
              </article>
            ))}

          {activeTab === "departments" &&
            departmentList.map((item) => (
              <article className={`master-data-row ${item.isActive ? "" : "inactive"}`} key={item.id}>
                <div className="master-data-row-main">
                  <span className={`status-chip ${item.isActive ? "green" : "slate"}`}>
                    {item.isActive ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                  </span>
                  <h4>
                    {item.code} · {item.name}
                  </h4>
                  <p>{item.nameEn || "ບໍ່ມີຊື່ພາສາອັງກິດ"}</p>
                </div>
                <div className="master-data-row-actions">
                  <button className="outline-button" onClick={() => startEditDepartment(item)} type="button">
                    <Pencil size={16} />
                    ແກ້ໄຂ
                  </button>
                  <button className="outline-button" onClick={() => onToggleDepartmentActive(item.id)} type="button">
                    {item.isActive ? "ປິດໃຊ້ງານ" : "ເປີດໃຊ້ງານ"}
                  </button>
                  <button className="reject-button" onClick={() => onRemoveDepartment(item.id)} type="button">
                    <Trash2 size={16} />
                    ລຶບ
                  </button>
                </div>
              </article>
            ))}
        </div>
      </div>
      )}
    </section>
  );
}

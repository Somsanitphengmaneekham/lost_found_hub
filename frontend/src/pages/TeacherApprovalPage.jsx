import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  MapPin,
  PackageCheck,
  Search,
  X,
} from "lucide-react";
import { statusMeta } from "../data.js";
import { approvalSortValue, joinDetail, lostStatusLabel, normalizeText } from "../utils/ui.js";
import { EmptyState } from "../components/common/FormControls.jsx";
import { ImageUploadField } from "../components/common/ImageUploadField.jsx";
import { StudentSearchCombobox } from "../components/common/StudentSearchCombobox.jsx";

const APPROVAL_STATUSES = new Set(["awaiting_handover", "pending_approval"]);
const APPROVAL_PAGE_SIZE = 6;
const APPROVAL_SORT_OPTIONS = [
  { value: "latest", label: "ຫຼ້າສຸດກ່ອນ" },
  { value: "oldest", label: "ເກົ່າສຸດກ່ອນ" },
  { value: "title", label: "ຊື່ A-Z" },
  { value: "status", label: "ສະຖານະສຳຄັນກ່ອນ" },
];
const APPROVAL_FILTER_OPTIONS = [
  { value: "all", label: "ທັງໝົດ" },
  { value: "needs_review", label: "ຕ້ອງກວດ" },
  { value: "approved", label: "ອະນຸມັດແລ້ວ" },
  { value: "returned", label: "ສົ່ງຄືນແລ້ວ" },
  { value: "rejected", label: "ປະຕິເສດ" },
];

function isCompletedItem(item) {
  if (item.kind === "lost") return ["published", "matched"].includes(item.status);
  return ["approved", "matched"].includes(item.status);
}

function isReturnedItem(item) {
  if (item.kind === "lost") return ["closed", "resolved"].includes(item.status);
  return item.status === "returned";
}

function matchesStatusFilter(item, filter) {
  if (filter === "all") return true;
  if (filter === "needs_review") return APPROVAL_STATUSES.has(item.status);
  if (filter === "approved") return isCompletedItem(item);
  if (filter === "returned") return isReturnedItem(item);
  return item.status === filter;
}

function statusLabel(item) {
  if (item.kind === "lost") return lostStatusLabel(item.status);
  return statusMeta[item.status]?.label ?? item.status;
}

function statusTone(item) {
  if (item.status === "pending_approval") return "blue";
  if (item.status === "awaiting_handover") return "amber";
  if (item.status === "rejected") return "red";
  if (item.kind === "lost") {
    if (item.status === "published") return "green";
    if (item.status === "matched") return "purple";
    if (item.status === "closed" || item.status === "resolved") return "slate";
  }
  return statusMeta[item.status]?.tone ?? "slate";
}

function kindLabel(item) {
  return item.kind === "lost" ? "ຂອງສູນຫາຍ" : "ຂອງທີ່ພົບ";
}

function personLabel(item) {
  return item.kind === "lost" ? "ຜູ້ແຈ້ງ" : "ຜູ້ພົບ";
}

function activeClaimRequestsForItem(claimRequests, item) {
  if (item.kind !== "found") return [];

  return (claimRequests ?? []).filter(
    (claim) =>
      Number(claim.foundPostId) === Number(item.id) &&
      ["submitted", "under_review", "approved"].includes(claim.status),
  );
}

function itemDateValue(item) {
  const time = new Date(item.createdAt || item.updatedAt || item.eventAt || item.foundAt || item.lostAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareApprovalItems(a, b, sortMode) {
  if (sortMode === "oldest") return itemDateValue(a) - itemDateValue(b);
  if (sortMode === "title") return String(a.title || "").localeCompare(String(b.title || ""), "lo-LA");
  if (sortMode === "status") {
    return approvalSortValue(a.status) - approvalSortValue(b.status) || itemDateValue(b) - itemDateValue(a);
  }

  return itemDateValue(b) - itemDateValue(a) || approvalSortValue(a.status) - approvalSortValue(b.status);
}

function createReturnDraft() {
  return {
    authorizationImages: [],
    authorizationNote: "",
    identityVerified: false,
    note: "",
    receivedByMemberId: "",
    receiverDepartment: "",
    receiverName: "",
    receiverPhotoImages: [],
    receiverPhone: "",
    receiverStudentCode: "",
    receiverType: "owner",
    representativeName: "",
    representativePhone: "",
    representativeRelation: "",
  };
}

export function TeacherApprovalPage({
  categoryOptions,
  claimRequests = [],
  items,
  onApprove,
  onMarkLostFound,
  onMoveToApproval,
  onReject,
  onReturn,
  saving,
  stats,
  students,
}) {
  const [approvalSearch, setApprovalSearch] = useState("");
  const [approvalCategory, setApprovalCategory] = useState("ທັງໝົດ");
  const [approvalStatus, setApprovalStatus] = useState("all");
  const [approvalSort, setApprovalSort] = useState("latest");
  const [returnDialog, setReturnDialog] = useState(null);
  const [returnDraft, setReturnDraft] = useState(createReturnDraft);
  const [returnError, setReturnError] = useState("");
  const [returningItemId, setReturningItemId] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [page, setPage] = useState(1);
  const query = normalizeText(approvalSearch);

  function openRejectDialog(item) {
    setRejectDialog(item);
    setRejectReason(item.rejectReason ?? "");
    setRejectError("");
  }

  function closeRejectDialog() {
    setRejectDialog(null);
    setRejectReason("");
    setRejectError("");
  }

  async function handleRejectSubmit(event) {
    event.preventDefault();
    const reason = rejectReason.trim();

    if (!reason) {
      setRejectError("ກະລຸນາຂຽນເຫດຜົນກ່ອນປະຕິເສດ");
      return;
    }

    await onReject(rejectDialog, reason);
    closeRejectDialog();
  }

  function studentReturnDraft(student, fallback = {}) {
    if (!student) return fallback;

    return {
      ...fallback,
      receivedByMemberId: String(student.id),
      receiverDepartment: student.department || student.departmentName || fallback.receiverDepartment || "",
      receiverName:
        student.fullName ||
        student.name ||
        `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
        student.username ||
        fallback.receiverName ||
        "",
      receiverPhone: student.phone || fallback.receiverPhone || "",
      receiverStudentCode: student.studentCode || student.student_code || student.username || fallback.receiverStudentCode || "",
    };
  }

  function selectedReturnStudent() {
    const studentId = Number(returnDraft.receivedByMemberId);
    return students.find((student) => Number(student.id) === studentId) ?? null;
  }

  function openReturnDialog(item) {
    const claim = activeClaimRequestsForItem(claimRequests, item)[0];
    const suggestedStudent = students.find((student) => Number(student.id) === Number(claim?.claimantId));

    setReturnDialog(item);
    setReturnDraft(studentReturnDraft(suggestedStudent, createReturnDraft()));
    setReturnError("");
  }

  function closeReturnDialog() {
    setReturnDialog(null);
    setReturnDraft(createReturnDraft());
    setReturnError("");
  }

  function updateReturnDraft(field, value) {
    setReturnDraft((current) => ({ ...current, [field]: value }));
    setReturnError("");
  }

  function updateReturnStudent(studentId) {
    const student = students.find((item) => Number(item.id) === Number(studentId));
    setReturnDraft((current) =>
      student ? studentReturnDraft(student, current) : { ...current, receivedByMemberId: "" },
    );
    setReturnError("");
  }

  async function handleReturnSubmit(event) {
    event.preventDefault();
    if (!returnDialog) return;

    if (!returnDraft.receiverName.trim()) {
      setReturnError("ກະລຸນາກອກຊື່ຜູ້ມາຮັບສິ່ງຂອງ");
      return;
    }
    if (!returnDraft.receiverStudentCode.trim() && !returnDraft.receiverPhone.trim()) {
      setReturnError("ກະລຸນາກອກລະຫັດນັກສຶກສາ ຫຼື ເບີໂທຜູ້ມາຮັບ");
      return;
    }

    const receivedByMemberId = returnDraft.receivedByMemberId || null;
    if (!returnDraft.identityVerified) {
      setReturnError("ກະລຸນາຢືນຢັນວ່າກວດບັດນັກສຶກສາ ຫຼື ຂໍ້ມູນແລ້ວ");
      return;
    }
    if (!returnDraft.receiverPhotoImages.length) {
      setReturnError("ກະລຸນາອັບໂຫຼດຮູບຜູ້ຮັບພ້ອມສິ່ງຂອງ");
      return;
    }
    if (
      returnDraft.receiverType === "representative" &&
      (!returnDraft.representativeName.trim() ||
        !returnDraft.representativePhone.trim() ||
        !returnDraft.representativeRelation.trim() ||
        !returnDraft.authorizationImages.length)
    ) {
      setReturnError("ກະລຸນາກອກຂໍ້ມູນຜູ້ຮັບແທນ ແລະ ແນບຫຼັກຖານອະນຸຍາດໃຫ້ຄົບ");
      return;
    }

    setReturningItemId(returnDialog.id);
    try {
      await onReturn(returnDialog.id, {
        ...returnDraft,
        receivedByMemberId,
      });
      closeReturnDialog();
    } finally {
      setReturningItemId(null);
    }
  }

  const baseFilteredItems = items
    .filter((item) => {
      const inSearch =
        !query ||
        normalizeText(
          `${item.title} ${item.location} ${item.description} ${item.personName} ${item.finder} ${item.owner} ${item.color}`,
        ).includes(query);
      const inCategory = approvalCategory === "ທັງໝົດ" || item.category === approvalCategory;
      return inSearch && inCategory;
    });
  const statusCounts = APPROVAL_FILTER_OPTIONS.reduce(
    (counts, option) => ({
      ...counts,
      [option.value]: baseFilteredItems.filter((item) => matchesStatusFilter(item, option.value)).length,
    }),
    {},
  );
  const filteredItems = baseFilteredItems
    .filter((item) => matchesStatusFilter(item, approvalStatus))
    .sort((a, b) => compareApprovalItems(a, b, approvalSort));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / APPROVAL_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * APPROVAL_PAGE_SIZE;
  const visibleItems = filteredItems.slice(pageStart, pageStart + APPROVAL_PAGE_SIZE);
  const showPagination = totalPages > 1;
  const firstVisibleNumber = filteredItems.length ? pageStart + 1 : 0;
  const lastVisibleNumber = pageStart + visibleItems.length;

  useEffect(() => {
    setPage(1);
  }, [approvalSearch, approvalCategory, approvalStatus, approvalSort, items.length]);

  function goToPage(nextPage) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
    window.setTimeout(() => {
      document.getElementById("approval-list-start")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const currentReturnStudent = selectedReturnStudent();

  return (
    <section className="teacher-approval-page" id="approval" aria-labelledby="approval-title">
      <div className="teacher-approval-head">
        <div>
          <h2 id="approval-title">ອະນຸມັດ ແລະ ຕິດຕາມສະຖານະ</h2>
          <p>ກວດສອບປະກາດກ່ອນເຜີຍແຜ່ ແລະ ບັນທຶກການສົ່ງຄືນສິ່ງຂອງໃຫ້ເຈົ້າຂອງ</p>
        </div>
        <span className="approval-count-pill">
          <ClipboardCheck size={17} />
          ລໍຖ້າການອະນຸມັດ: {stats.waiting} ລາຍການ
        </span>
      </div>

      <div className="approval-toolbar">
        <label className="approval-search">
          <Search size={18} />
          <input
            aria-label="ຄົ້ນຫາລາຍການລໍຖ້າອະນຸມັດ"
            onChange={(event) => setApprovalSearch(event.target.value)}
            placeholder="ຄົ້ນຫາຈາກຊື່ສິ່ງຂອງ, ຜູ້ແຈ້ງ ຫຼື ສະຖານທີ່..."
            type="search"
            value={approvalSearch}
          />
        </label>
        <label className="approval-select">
          <span className="sr-only">ໝວດໝູ່</span>
          <select onChange={(event) => setApprovalCategory(event.target.value)} value={approvalCategory}>
            {categoryOptions.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="approval-select">
          <span className="sr-only">ສະຖານະ</span>
          <select onChange={(event) => setApprovalStatus(event.target.value)} value={approvalStatus}>
            <option value="all">ລາຍການທັງໝົດ</option>
            <option value="needs_review">ລໍຖ້າກວດສອບທັງໝົດ</option>
            <option value="pending_approval">ລໍຖ້າອະນຸມັດ</option>
            <option value="awaiting_handover">ລໍຖ້າຮັບສິ່ງຂອງ</option>
            <option value="approved">ອະນຸມັດແລ້ວ</option>
            <option value="returned">ສົ່ງຄືນເຈົ້າຂອງແລ້ວ</option>
            <option value="rejected">ປະຕິເສດ</option>
          </select>
        </label>
        <label className="approval-select">
          <span className="sr-only">ຈັດລຽງ</span>
          <select onChange={(event) => setApprovalSort(event.target.value)} value={approvalSort}>
            {APPROVAL_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="approval-queue-panel" id="approval-list-start">
        <div className="approval-queue-tabs" aria-label="Approval status shortcuts">
          {APPROVAL_FILTER_OPTIONS.map((option) => (
            <button
              className={approvalStatus === option.value ? "active" : ""}
              key={option.value}
              onClick={() => setApprovalStatus(option.value)}
              type="button"
            >
              <span>{option.label}</span>
              <strong>{(statusCounts[option.value] ?? 0).toLocaleString("lo-LA")}</strong>
            </button>
          ))}
        </div>
        <div className="approval-list-head">
          <div>
            <strong>ລາຍການຕາມໂຕກອງ</strong>
            <span>
              ສະແດງ {firstVisibleNumber.toLocaleString("lo-LA")}-{lastVisibleNumber.toLocaleString("lo-LA")} ຈາກ{" "}
              {filteredItems.length.toLocaleString("lo-LA")} ລາຍການ
            </span>
          </div>
          <span>ໜ້າ {currentPage.toLocaleString("lo-LA")} / {totalPages.toLocaleString("lo-LA")}</span>
        </div>
      </div>

      <div className="teacher-approval-layout">
        <div className="teacher-approval-list">
          {visibleItems.length ? (
            visibleItems.map((item) => (
              <article className="teacher-approval-card" key={item.approvalKey ?? `${item.kind}-${item.id}`}>
                <img className="teacher-approval-image" src={item.image} alt={item.title} />
                <div className="teacher-approval-body">
                  <div className="teacher-card-meta">
                    <span className={`status-chip ${statusTone(item)}`}>{statusLabel(item)}</span>
                    <span className="status-chip slate">{kindLabel(item)}</span>
                    <small>{item.date} · {item.time}</small>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="teacher-location">
                    <MapPin size={15} />
                    {item.location}
                  </p>
                  <p className="teacher-description">"{item.description}"</p>
                  <dl className="teacher-detail-list">
                    <div>
                      <dt>{personLabel(item)}</dt>
                      <dd>{item.personName || item.finder || item.owner || "-"}</dd>
                    </div>
                    <div>
                      <dt>ສີ/ຍີ່ຫໍ້</dt>
                      <dd>{joinDetail(item.color, item.brand)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="teacher-approval-actions">
                  {item.kind === "found" && item.status === "awaiting_handover" && (
                    <button className="approve-button" onClick={() => onMoveToApproval(item.id)} type="button">
                      <PackageCheck size={17} />
                      ຮັບສິ່ງຂອງແລ້ວ
                    </button>
                  )}
                  {item.status === "pending_approval" && (
                    <button className="approve-button" onClick={() => onApprove(item)} type="button">
                      <Check size={17} />
                      ອະນຸມັດປະກາດ
                    </button>
                  )}
                  {APPROVAL_STATUSES.has(item.status) && (
                    <button className="reject-button" disabled={saving} onClick={() => openRejectDialog(item)} type="button">
                      <X size={17} />
                      ປະຕິເສດ
                    </button>
                  )}
                  {item.kind === "found" && isCompletedItem(item) && (
                    <div className="return-status-controls">
                      {activeClaimRequestsForItem(claimRequests, item).length > 0 && (
                        <div className="return-claim-suggestions">
                          <span>ນັກສຶກສາທີ່ຂໍຮັບ</span>
                          <div>
                            {activeClaimRequestsForItem(claimRequests, item).map((claim) => (
                              <button
                                key={claim.id}
                                onClick={() => openReturnDialog(item)}
                                type="button"
                              >
                                {claim.claimantName || claim.claimantUsername || "ນັກສຶກສາ"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        className="return-button"
                        disabled={saving || returningItemId === item.id}
                        onClick={() => openReturnDialog(item)}
                        type="button"
                      >
                        <PackageCheck size={17} />
                        {returningItemId === item.id ? "ກຳລັງບັນທຶກ..." : "ສົ່ງຄືນເຈົ້າຂອງແລ້ວ"}
                      </button>
                    </div>
                  )}
                  {item.kind === "lost" && item.status === "published" && (
                    <button
                      className="approve-button mark-found-button"
                      disabled={saving}
                      onClick={() => onMarkLostFound(item.id)}
                      type="button"
                    >
                      <BadgeCheck size={17} />
                      ແຈ້ງເຈົ້າຂອງວ່າພົບແລ້ວ
                    </button>
                  )}
                  {item.kind === "lost" && item.status === "matched" && (
                    <span className="approval-result purple">ແຈ້ງເຈົ້າຂອງແລ້ວ</span>
                  )}
                  {isReturnedItem(item) && (
                    <span className="approval-result returned">ສົ່ງຄືນເຈົ້າຂອງແລ້ວ</span>
                  )}
                  {item.status === "rejected" && <span className="approval-result red">ປະຕິເສດແລ້ວ</span>}
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="ບໍ່ພົບລາຍການຕາມໂຕກອງ" description="ລອງປ່ຽນຄຳຄົ້ນຫາ ໝວດໝູ່ ຫຼື ສະຖານະທີ່ຕ້ອງການກວດສອບ" />
          )}
          {showPagination && (
            <div className="pagination-controls approval-pagination" aria-label="Approval pagination">
              <button
                aria-label="Previous approval page"
                className="pagination-button"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                type="button"
              >
                <ChevronLeft size={18} />
                ກ່ອນໜ້າ
              </button>
              <span className="pagination-status">
                ໜ້າ {currentPage.toLocaleString("lo-LA")} / {totalPages.toLocaleString("lo-LA")}
              </span>
              <button
                aria-label="Next approval page"
                className="pagination-button primary"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                type="button"
              >
                ຖັດໄປ
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <aside className="teacher-approval-side">
          <article className="approval-summary-card">
            <h3>ສະຫຼຸບວຽກມື້ນີ້</h3>
            <div>
              <span>ລໍຖ້າອະນຸມັດ</span>
              <strong>{stats.waiting}</strong>
            </div>
            <div>
              <span>ອະນຸມັດແລ້ວ</span>
              <strong>{stats.approved}</strong>
            </div>
            <div>
              <span>ສົ່ງຄືນແລ້ວ</span>
              <strong>{stats.returned}</strong>
            </div>
            <div>
              <span>ປະຕິເສດ</span>
              <strong>{stats.rejected}</strong>
            </div>
          </article>

          <article className="approval-tip-card">
            <h3>ຄຳແນະນຳສຳລັບອາຈານ</h3>
            <p>
              <CircleHelp size={16} />
              ກວດສອບຮູບຖ່າຍ, ລາຍລະອຽດ, ສະຖານທີ່ ແລະ ຂໍ້ມູນຜູ້ແຈ້ງກ່ອນອະນຸມັດປະກາດ.
            </p>
            <p>
              <CircleHelp size={16} />
              ສຳລັບຂອງທີ່ພົບ ໃຫ້ອະນຸມັດເມື່ອກວດສອບກັບສິ່ງຂອງຈິງທີ່ຫ້ອງຄຸ້ມຄອງແລ້ວ.
            </p>
            <p>
              <CircleHelp size={16} />
              ເມື່ອຄືນຂອງ ຕ້ອງເລືອກນັກສຶກສາຜູ້ຮັບຄືນໃຫ້ຖືກຕ້ອງກ່ອນບັນທຶກ.
            </p>
          </article>
        </aside>
      </div>

      {returnDialog && (
        <div className="return-evidence-modal" role="dialog" aria-modal="true" aria-labelledby="return-evidence-title">
          <form className="return-evidence-card" onSubmit={handleReturnSubmit}>
            <button className="return-evidence-close" onClick={closeReturnDialog} type="button" aria-label="ປິດ">
              <X size={18} />
            </button>
            <span className="return-evidence-eyebrow">ບັນທຶກການສົ່ງຄືນ</span>
            <h3 id="return-evidence-title">{returnDialog.title}</h3>
            <p>
              ກ່ອນກົດສົ່ງຄືນ ອາຈານຕ້ອງກວດບັດ/ຂໍ້ມູນ ແລະ ບັນທຶກຮູບຜູ້ຮັບພ້ອມສິ່ງຂອງເປັນຫຼັກຖານ.
            </p>

            <div className="return-evidence-owner return-evidence-owner-legacy">
              <span>ນັກສຶກສາຜູ້ຮັບຄືນ</span>
              <strong>
                {currentReturnStudent?.fullName ||
                  currentReturnStudent?.name ||
                  currentReturnStudent?.username ||
                  "-"}
              </strong>
              <small>{currentReturnStudent?.studentCode || currentReturnStudent?.student_code || ""}</small>
            </div>

            <div className="return-evidence-owner">
              <span>ຂໍ້ມູນຜູ້ມາຮັບສິ່ງຂອງ</span>
              <strong>{currentReturnStudent ? "ດຶງຂໍ້ມູນຈາກບັນຊີນັກສຶກສາແລ້ວ" : "ກອກຂໍ້ມູນດ້ວຍຕົນເອງໄດ້"}</strong>
              <small>ຄົ້ນຫານັກສຶກສາເພື່ອເຕີມຂໍ້ມູນໄວຂຶ້ນ ຫຼື ກອກຂໍ້ມູນຜູ້ມາຮັບເອງ.</small>
            </div>

            <div className="return-student-picker">
              {activeClaimRequestsForItem(claimRequests, returnDialog).length > 0 && (
                <div className="return-claim-suggestions">
                  <span>ລາຍຊື່ທີ່ຂໍຮັບຂອງ</span>
                  <div>
                    {activeClaimRequestsForItem(claimRequests, returnDialog).map((claim) => (
                      <button
                        key={claim.id}
                        onClick={() => updateReturnStudent(claim.claimantId)}
                        type="button"
                      >
                        {claim.claimantName || claim.claimantUsername || "ນັກສຶກສາ"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <StudentSearchCombobox
                itemTitle={returnDialog.title}
                onChange={updateReturnStudent}
                students={students}
                value={returnDraft.receivedByMemberId}
              />
            </div>

            <div className="return-evidence-grid">
              <label className="return-evidence-field">
                <span>ຊື່ຜູ້ມາຮັບ *</span>
                <input
                  onChange={(event) => updateReturnDraft("receiverName", event.target.value)}
                  type="text"
                  value={returnDraft.receiverName}
                />
              </label>
              <label className="return-evidence-field">
                <span>ລະຫັດນັກສຶກສາ</span>
                <input
                  onChange={(event) => updateReturnDraft("receiverStudentCode", event.target.value)}
                  type="text"
                  value={returnDraft.receiverStudentCode}
                />
              </label>
              <label className="return-evidence-field">
                <span>ພາກວິຊາ / ຫ້ອງຮຽນ</span>
                <input
                  onChange={(event) => updateReturnDraft("receiverDepartment", event.target.value)}
                  type="text"
                  value={returnDraft.receiverDepartment}
                />
              </label>
              <label className="return-evidence-field">
                <span>ເບີໂທ</span>
                <input
                  onChange={(event) => updateReturnDraft("receiverPhone", event.target.value)}
                  type="tel"
                  value={returnDraft.receiverPhone}
                />
              </label>
            </div>

            <fieldset className="return-type-grid">
              <legend>ປະເພດຜູ້ມາຮັບ</legend>
              <label className={`return-type-option ${returnDraft.receiverType === "owner" ? "active" : ""}`}>
                <input
                  checked={returnDraft.receiverType === "owner"}
                  name="receiverType"
                  onChange={() => updateReturnDraft("receiverType", "owner")}
                  type="radio"
                  value="owner"
                />
                <span>ເຈົ້າຂອງມາຮັບເອງ</span>
              </label>
              <label className={`return-type-option ${returnDraft.receiverType === "representative" ? "active" : ""}`}>
                <input
                  checked={returnDraft.receiverType === "representative"}
                  name="receiverType"
                  onChange={() => updateReturnDraft("receiverType", "representative")}
                  type="radio"
                  value="representative"
                />
                <span>ຜູ້ຮັບແທນ</span>
              </label>
            </fieldset>

            {returnDraft.receiverType === "representative" && (
              <div className="return-evidence-grid">
                <label className="return-evidence-field">
                  <span>ຊື່ຜູ້ຮັບແທນ *</span>
                  <input
                    onChange={(event) => updateReturnDraft("representativeName", event.target.value)}
                    type="text"
                    value={returnDraft.representativeName}
                  />
                </label>
                <label className="return-evidence-field">
                  <span>ເບີໂທຜູ້ຮັບແທນ *</span>
                  <input
                    onChange={(event) => updateReturnDraft("representativePhone", event.target.value)}
                    type="tel"
                    value={returnDraft.representativePhone}
                  />
                </label>
                <label className="return-evidence-field">
                  <span>ຄວາມສຳພັນກັບເຈົ້າຂອງ *</span>
                  <input
                    onChange={(event) => updateReturnDraft("representativeRelation", event.target.value)}
                    type="text"
                    value={returnDraft.representativeRelation}
                  />
                </label>
                <label className="return-evidence-field">
                  <span>ໝາຍເຫດການອະນຸຍາດ</span>
                  <input
                    onChange={(event) => updateReturnDraft("authorizationNote", event.target.value)}
                    type="text"
                    value={returnDraft.authorizationNote}
                  />
                </label>
              </div>
            )}

            <ImageUploadField
              helpText="ຖ່າຍຮູບຜູ້ຮັບກັບສິ່ງຂອງ 1 ຮູບ, ຮອງຮັບ JPG, PNG, WEBP"
              images={returnDraft.receiverPhotoImages}
              label="ຮູບຜູ້ຮັບພ້ອມສິ່ງຂອງ"
              maxImages={1}
              onChange={(images) => updateReturnDraft("receiverPhotoImages", images)}
            />

            {returnDraft.receiverType === "representative" && (
              <ImageUploadField
                helpText="ແນບຫຼັກຖານທີ່ເຈົ້າຂອງອະນຸຍາດໃຫ້ຮັບແທນ 1 ຮູບ"
                images={returnDraft.authorizationImages}
                label="ຫຼັກຖານອະນຸຍາດຜູ້ຮັບແທນ"
                maxImages={1}
                onChange={(images) => updateReturnDraft("authorizationImages", images)}
              />
            )}

            <label className="return-evidence-checkbox">
              <input
                checked={returnDraft.identityVerified}
                onChange={(event) => updateReturnDraft("identityVerified", event.target.checked)}
                type="checkbox"
              />
              <span>ກວດສອບບັດນັກສຶກສາ/ຂໍ້ມູນຜູ້ຮັບແລ້ວ</span>
            </label>

            <label className="return-evidence-field">
              <span>ໝາຍເຫດເພີ່ມເຕີມ</span>
              <textarea
                maxLength={1000}
                onChange={(event) => updateReturnDraft("note", event.target.value)}
                placeholder="ເຊັ່ນ ຮັບຂອງທີ່ຫ້ອງຄຸ້ມຄອງ ແລະ ກວດຂອງແລ້ວ..."
                value={returnDraft.note}
              />
            </label>

            {returnError && <p className="return-evidence-error">{returnError}</p>}

            <div className="return-evidence-actions">
              <button className="outline-button" onClick={closeReturnDialog} type="button">
                ຍົກເລີກ
              </button>
              <button className="return-button" disabled={saving || returningItemId === returnDialog.id} type="submit">
                <PackageCheck size={17} />
                {returningItemId === returnDialog.id ? "ກຳລັງບັນທຶກ..." : "ຢືນຢັນສົ່ງຄືນແລ້ວ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {rejectDialog && (
        <div className="reject-reason-modal" role="dialog" aria-modal="true" aria-labelledby="reject-reason-title">
          <form className="reject-reason-card" onSubmit={handleRejectSubmit}>
            <button className="reject-reason-close" onClick={closeRejectDialog} type="button" aria-label="ປິດ">
              <X size={18} />
            </button>
            <span className="reject-reason-eyebrow">ປະຕິເສດປະກາດ</span>
            <h3 id="reject-reason-title">{rejectDialog.title}</h3>
            <p>ຂຽນເຫດຜົນໃຫ້ນັກສຶກສາເຫັນວ່າຕ້ອງແກ້ໄຂຂໍ້ມູນສ່ວນໃດ ຫຼື ເຫດໃດຈຶ່ງບໍ່ອະນຸມັດ.</p>
            <label className="reject-reason-field">
              <span>ເຫດຜົນການປະຕິເສດ *</span>
              <textarea
                autoFocus
                maxLength={1000}
                onChange={(event) => {
                  setRejectReason(event.target.value);
                  setRejectError("");
                }}
                placeholder="ເຊັ່ນ ຮູບບໍ່ຊັດ, ຂາດສະຖານທີ່, ລາຍລະອຽດບໍ່ພຽງພໍ..."
                value={rejectReason}
              />
            </label>
            {rejectError && <p className="reject-reason-error">{rejectError}</p>}
            <div className="reject-reason-actions">
              <button className="outline-button" onClick={closeRejectDialog} type="button">
                ຍົກເລີກ
              </button>
              <button className="reject-button" disabled={saving} type="submit">
                <X size={17} />
                ຢືນຢັນປະຕິເສດ
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

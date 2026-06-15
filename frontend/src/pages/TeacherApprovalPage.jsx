import { useState } from "react";
import { Check, CircleHelp, ClipboardCheck, MapPin, PackageCheck, Search, X } from "lucide-react";
import { statusMeta } from "../data.js";
import { approvalSortValue, joinDetail, lostStatusLabel, normalizeText } from "../utils/ui.js";
import { EmptyState } from "../components/common/FormControls.jsx";

const APPROVAL_STATUSES = new Set(["awaiting_handover", "pending_approval"]);
const COMPLETED_FOUND_STATUSES = new Set(["approved", "matched", "returned"]);
const COMPLETED_LOST_STATUSES = new Set(["published", "matched", "closed", "resolved"]);

function isCompletedItem(item) {
  if (item.kind === "lost") return COMPLETED_LOST_STATUSES.has(item.status);
  return COMPLETED_FOUND_STATUSES.has(item.status);
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

export function TeacherApprovalPage({ categoryOptions, items, onApprove, onMoveToApproval, onReject, stats }) {
  const [approvalSearch, setApprovalSearch] = useState("");
  const [approvalCategory, setApprovalCategory] = useState("ທັງໝົດ");
  const [approvalStatus, setApprovalStatus] = useState("needs_review");
  const query = normalizeText(approvalSearch);
  const visibleItems = items
    .filter((item) => {
      const inSearch =
        !query ||
        normalizeText(
          `${item.title} ${item.location} ${item.description} ${item.personName} ${item.finder} ${item.owner} ${item.color}`,
        ).includes(query);
      const inCategory = approvalCategory === "ທັງໝົດ" || item.category === approvalCategory;
      const inStatus =
        approvalStatus === "needs_review"
          ? APPROVAL_STATUSES.has(item.status)
          : approvalStatus === "approved"
            ? isCompletedItem(item)
            : item.status === approvalStatus;

      return inSearch && inCategory && inStatus;
    })
    .sort((a, b) => approvalSortValue(a.status) - approvalSortValue(b.status));

  return (
    <section className="teacher-approval-page" id="approval" aria-labelledby="approval-title">
      <div className="teacher-approval-head">
        <div>
          <h2 id="approval-title">ລາຍການທີ່ລໍຖ້າການອະນຸມັດ</h2>
          <p>ກວດສອບປະກາດຂອງສູນຫາຍ ແລະ ຂອງທີ່ພົບ ກ່ອນເຜີຍແຜ່ເທິງໜ້າເວັບຂອງຄະນະ</p>
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
            <option value="needs_review">ລໍຖ້າກວດສອບທັງໝົດ</option>
            <option value="pending_approval">ລໍຖ້າອະນຸມັດ</option>
            <option value="awaiting_handover">ລໍຖ້າຮັບສິ່ງຂອງ</option>
            <option value="approved">ອະນຸມັດແລ້ວ</option>
            <option value="rejected">ປະຕິເສດ</option>
          </select>
        </label>
      </div>

      <div className="teacher-approval-layout">
        <div className="teacher-approval-list">
          {visibleItems.length ? (
            visibleItems.map((item, index) => (
              <article className={`teacher-approval-card ${index < 2 ? "wide" : ""}`} key={item.approvalKey ?? `${item.kind}-${item.id}`}>
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
                    <button className="reject-button" onClick={() => onReject(item)} type="button">
                      <X size={17} />
                      ປະຕິເສດ
                    </button>
                  )}
                  {isCompletedItem(item) && <span className="approval-result green">ອະນຸມັດແລ້ວ</span>}
                  {item.status === "rejected" && <span className="approval-result red">ປະຕິເສດແລ້ວ</span>}
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="ບໍ່ພົບລາຍການຕາມໂຕກອງ" description="ລອງປ່ຽນຄຳຄົ້ນຫາ ໝວດໝູ່ ຫຼື ສະຖານະທີ່ຕ້ອງການກວດສອບ" />
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
          </article>
        </aside>
      </div>
    </section>
  );
}

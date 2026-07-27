import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, LockKeyhole, MapPin, Pencil, Search, Trash2 } from "lucide-react";
import { statusMeta } from "../data.js";
import {
  canDeleteFoundPost,
  canDeleteLostPost,
  canEditFoundPost,
  canEditLostPost,
  formatLaoDateTime,
  foundPostBelongsToUser,
  joinDetail,
  lostPostBelongsToUser,
  lostStatusLabel,
  normalizeText,
} from "../utils/ui.js";
import { EmptyState } from "../components/common/FormControls.jsx";

const KIND_OPTIONS = [
  { value: "all", label: "ລາຍການທັງໝົດ" },
  { value: "lost", label: "ແຈ້ງຂອງສູນຫາຍ" },
  { value: "found", label: "ແຈ້ງພົບຂອງ" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "ສະຖານະທັງໝົດ" },
  { value: "pending_approval", label: "ລໍຖ້າອາຈານອະນຸມັດ" },
  { value: "awaiting_handover", label: "ລໍຖ້າຫ້ອງຄຸ້ມຄອງກວດ" },
  { value: "published", label: "ປະກາດແລ້ວ" },
  { value: "approved", label: "ປະກາດແລ້ວ" },
  { value: "matched", label: "ມີລາຍການອາດກົງກັນ" },
  { value: "returned", label: "ສົ່ງຄືນແລ້ວ" },
  { value: "closed", label: "ປິດລາຍການແລ້ວ" },
  { value: "resolved", label: "ໄດ້ຮັບຂອງຄືນແລ້ວ" },
  { value: "rejected", label: "ຖືກປະຕິເສດ" },
];
const MY_ITEMS_PAGE_SIZE = 8;
const SORT_OPTIONS = [
  { value: "latest", label: "ຫຼ້າສຸດກ່ອນ" },
  { value: "oldest", label: "ເກົ່າສຸດກ່ອນ" },
  { value: "title", label: "ຊື່ A-Z" },
];

function statusLabel(item) {
  if (item.kind === "lost") return lostStatusLabel(item.status);
  return statusMeta[item.status]?.label ?? item.status;
}

function statusTone(item) {
  if (item.status === "pending_approval") return "blue";
  if (item.status === "awaiting_handover") return "amber";
  if (item.status === "rejected") return "red";
  if (["published", "approved"].includes(item.status)) return "green";
  if (item.status === "matched") return "purple";
  return "slate";
}

function itemDate(item) {
  return item.kind === "lost" ? item.lostAt : item.foundAt;
}

function sortDateValue(item) {
  const time = new Date(item.createdAt || item.updatedAt || itemDate(item) || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareMyItems(a, b, sortMode) {
  if (sortMode === "oldest") return sortDateValue(a) - sortDateValue(b);
  if (sortMode === "title") return String(a.title || "").localeCompare(String(b.title || ""), "lo-LA");
  return sortDateValue(b) - sortDateValue(a);
}

function isWaiting(item) {
  return ["pending_approval", "awaiting_handover"].includes(item.status);
}

function isPublished(item) {
  if (item.kind === "lost") return ["published", "matched"].includes(item.status);
  return ["approved", "matched"].includes(item.status);
}

function isReturned(item) {
  if (item.kind === "lost") return ["closed", "resolved"].includes(item.status);
  return item.status === "returned";
}

function buildMyItems({ currentUser, foundItems, lostReports }) {
  const myLost = lostReports
    .filter((item) => lostPostBelongsToUser(item, currentUser))
    .map((item) => ({ ...item, kind: "lost" }));
  const myFound = foundItems
    .filter((item) => foundPostBelongsToUser(item, currentUser))
    .map((item) => ({ ...item, kind: "found" }));

  return [...myLost, ...myFound].sort((a, b) => sortDateValue(b) - sortDateValue(a));
}

export function MyItemsPage({
  categoryOptions,
  currentUser,
  foundItems,
  lostReports,
  onDeleteFound,
  onDeleteLost,
  onEditFound,
  onEditLost,
}) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(categoryOptions[0] ?? "ທັງໝົດ");
  const [sortMode, setSortMode] = useState("latest");
  const [page, setPage] = useState(1);

  const myItems = useMemo(
    () => buildMyItems({ currentUser, foundItems, lostReports }),
    [currentUser, foundItems, lostReports],
  );
  const query = normalizeText(search);

  const filteredItems = myItems.filter((item) => {
    const inKind = kindFilter === "all" || item.kind === kindFilter;
    const inStatus = statusFilter === "all" || item.status === statusFilter;
    const inCategory = categoryFilter === "ທັງໝົດ" || item.category === categoryFilter;
    const inSearch =
      !query ||
      normalizeText(
        `${item.title} ${item.category} ${item.location} ${item.description} ${item.color} ${item.brand} ${item.uniqueMark}`,
      ).includes(query);

    return inKind && inStatus && inCategory && inSearch;
  });
  const sortedItems = [...filteredItems].sort((a, b) => compareMyItems(a, b, sortMode));
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / MY_ITEMS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * MY_ITEMS_PAGE_SIZE;
  const visibleItems = sortedItems.slice(pageStart, pageStart + MY_ITEMS_PAGE_SIZE);
  const showPagination = totalPages > 1;

  const counts = {
    total: myItems.length,
    waiting: myItems.filter(isWaiting).length,
    published: myItems.filter(isPublished).length,
    returned: myItems.filter(isReturned).length,
    rejected: myItems.filter((item) => item.status === "rejected").length,
  };

  useEffect(() => {
    setPage(1);
  }, [search, kindFilter, statusFilter, categoryFilter, sortMode, myItems.length]);

  function goToPage(nextPage) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
    window.setTimeout(() => {
      document.getElementById("my-items-list-start")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <section className="my-items-page" id="my-items" aria-labelledby="my-items-title">
      <div className="my-items-head">
        <div>
          <span>ສຳລັບນັກສຶກສາ</span>
          <h2 id="my-items-title">ລາຍການຂອງຂ້ອຍ</h2>
          <p>ຕິດຕາມສິ່ງທີ່ເຈົ້າໄດ້ໂພສ, ກວດສະຖານະ ແລະ ແກ້ໄຂກ່ອນອາຈານອະນຸມັດ</p>
        </div>
        <span className="my-items-count-pill">
          <Clock3 size={17} />
          {counts.total} ລາຍການ
        </span>
      </div>

      <div className="my-items-summary-grid">
        <SummaryCard label="ລໍຖ້າກວດສອບ" value={counts.waiting} tone="blue" />
        <SummaryCard label="ປະກາດແລ້ວ" value={counts.published} tone="green" />
        <SummaryCard label="ສົ່ງຄືນ/ປິດແລ້ວ" value={counts.returned} tone="slate" />
        <SummaryCard label="ຖືກປະຕິເສດ" value={counts.rejected} tone="red" />
      </div>

      <div className="my-items-toolbar">
        <label className="approval-search">
          <Search size={18} />
          <input
            aria-label="ຄົ້ນຫາລາຍການຂອງຂ້ອຍ"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ຄົ້ນຫາຊື່ສິ່ງຂອງ, ສະຖານທີ່ ຫຼື ລາຍລະອຽດ..."
            type="search"
            value={search}
          />
        </label>
        <label className="approval-select">
          <span className="sr-only">ປະເພດລາຍການ</span>
          <select onChange={(event) => setKindFilter(event.target.value)} value={kindFilter}>
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="approval-select">
          <span className="sr-only">ໝວດໝູ່</span>
          <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            {categoryOptions.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="approval-select">
          <span className="sr-only">ສະຖານະ</span>
          <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="approval-select">
          <span className="sr-only">ຈັດລຽງ</span>
          <select onChange={(event) => setSortMode(event.target.value)} value={sortMode}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="my-items-list" id="my-items-list-start">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <MyItemCard
              currentUser={currentUser}
              item={item}
              key={`${item.kind}-${item.id}`}
              onDeleteFound={onDeleteFound}
              onDeleteLost={onDeleteLost}
              onEditFound={onEditFound}
              onEditLost={onEditLost}
            />
          ))
        ) : (
          <EmptyState
            title="ບໍ່ພົບລາຍການ"
            description="ລອງປ່ຽນຄຳຄົ້ນຫາ, ປະເພດລາຍການ ຫຼື ສະຖານະທີ່ກຳລັງກວດສອບ"
          />
        )}
      </div>
      {showPagination && (
        <div className="pagination-controls my-items-pagination" aria-label="My items pagination">
          <button
            aria-label="Previous my items page"
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
            aria-label="Next my items page"
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
    </section>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <article className={`my-items-summary ${tone}`}>
      <strong>{Number(value).toLocaleString("lo-LA")}</strong>
      <span>{label}</span>
    </article>
  );
}

function MyItemCard({ currentUser, item, onDeleteFound, onDeleteLost, onEditFound, onEditLost }) {
  const isLost = item.kind === "lost";
  const canEdit = isLost ? canEditLostPost(item, currentUser) : canEditFoundPost(item, currentUser);
  const canDelete = isLost ? canDeleteLostPost(item, currentUser) : canDeleteFoundPost(item, currentUser);
  const dateLabel = formatLaoDateTime(itemDate(item) || item.createdAt);

  return (
    <article className="my-item-card">
      <img className="my-item-image" src={item.image} alt={item.title} />
      <div className="my-item-body">
        <div className="my-item-meta">
          <span className={`dashboard-kind ${isLost ? "lost" : "found"}`}>
            {isLost ? "ແຈ້ງຂອງສູນຫາຍ" : "ແຈ້ງພົບຂອງ"}
          </span>
          <span className={`status-chip ${statusTone(item)}`}>{statusLabel(item)}</span>
          <small>{dateLabel}</small>
        </div>
        <h3>{item.title}</h3>
        <p className="my-item-location">
          <MapPin size={15} />
          {item.location || "ບໍ່ລະບຸສະຖານທີ່"}
        </p>
        <p className="my-item-description">"{item.description || "ບໍ່ມີລາຍລະອຽດ"}"</p>
        <dl className="my-item-detail-grid">
          <div>
            <dt>ໝວດໝູ່</dt>
            <dd>{item.category || "-"}</dd>
          </div>
          <div>
            <dt>ສີ/ຍີ່ຫໍ້</dt>
            <dd>{joinDetail(item.color, item.brand)}</dd>
          </div>
          <div>
            <dt>ຈຸດສັງເກດ</dt>
            <dd>{item.uniqueMark || "-"}</dd>
          </div>
          <div>
            <dt>ເວລາບັນທຶກ</dt>
            <dd>{formatLaoDateTime(item.createdAt)}</dd>
          </div>
        </dl>
        {item.status === "rejected" && item.rejectReason && (
          <p className="my-item-reject">ເຫດຜົນທີ່ຖືກປະຕິເສດ: {item.rejectReason}</p>
        )}
      </div>
      <div className="my-item-actions">
        {canEdit && (
          <button className="outline-button" onClick={() => (isLost ? onEditLost(item.id) : onEditFound(item.id))} type="button">
            <Pencil size={16} />
            ແກ້ໄຂ
          </button>
        )}
        {canDelete && (
          <button className="reject-button" onClick={() => (isLost ? onDeleteLost(item.id) : onDeleteFound(item.id))} type="button">
            <Trash2 size={16} />
            ລຶບ
          </button>
        )}
        {!canEdit && !canDelete && (
          <span className="my-item-lock">
            <LockKeyhole size={16} />
            ກວດແລ້ວ ຈຶ່ງແກ້ໄຂບໍ່ໄດ້
          </span>
        )}
      </div>
    </article>
  );
}

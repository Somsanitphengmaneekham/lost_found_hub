import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Info, Link2, ListFilter, Percent, Search } from "lucide-react";
import { formatLaoDateTime, normalizeText } from "../utils/ui.js";
import { EmptyState } from "../components/common/FormControls.jsx";

const MATCH_THRESHOLD = 70;
const MATCH_PAGE_SIZE = 8;
const PUBLIC_LOST_STATUSES = new Set(["published", "matched"]);
const PUBLIC_FOUND_STATUSES = new Set(["approved", "matched"]);
const MATCH_SORT_OPTIONS = [
  { value: "latest", label: "ຫຼ້າສຸດກ່ອນ" },
  { value: "score", label: "ຄະແນນສູງກ່ອນ" },
  { value: "oldest", label: "ເກົ່າສຸດກ່ອນ" },
];

function belongsToCurrentUser(match, currentUser) {
  if (currentUser?.role === "teacher") return true;

  const userId = Number(currentUser?.id);
  return (
    Number(match.lost?.ownerId) === userId ||
    Number(match.found?.finderId) === userId
  );
}

function isPublicMatch(match) {
  return (
    PUBLIC_LOST_STATUSES.has(match.lost?.status) &&
    PUBLIC_FOUND_STATUSES.has(match.found?.status)
  );
}

function matchesFocusedItem(match, focusedItem) {
  if (!focusedItem) return true;

  const focusedId = Number(focusedItem.id);
  if (focusedItem.kind === "lost") return Number(match.lostPostId) === focusedId;
  if (focusedItem.kind === "found") return Number(match.foundPostId) === focusedId;

  return Number(match.lostPostId) === focusedId || Number(match.foundPostId) === focusedId;
}

function canViewMatch(match, currentUser, focusedItem) {
  if (currentUser?.role === "teacher") return true;
  if (belongsToCurrentUser(match, currentUser)) return true;

  return Boolean(focusedItem) && matchesFocusedItem(match, focusedItem) && isPublicMatch(match);
}

function nextDetailTarget(match, focusedItem) {
  if (focusedItem?.kind === "found") {
    return {
      id: match.lostPostId,
      label: "ເບິ່ງລາຍລະອຽດຂອງສູນຫາຍ",
      type: "lost",
    };
  }

  return {
    id: match.foundPostId,
    label: "ເບິ່ງລາຍລະອຽດຂອງທີ່ພົບ",
    type: "found",
  };
}

function matchDateValue(match) {
  const time = new Date(match.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareMatches(a, b, sortMode) {
  if (sortMode === "score") {
    return Number(b.matchScore || 0) - Number(a.matchScore || 0) || matchDateValue(b) - matchDateValue(a);
  }

  if (sortMode === "oldest") return matchDateValue(a) - matchDateValue(b);
  return matchDateValue(b) - matchDateValue(a) || Number(b.matchScore || 0) - Number(a.matchScore || 0);
}

export function MatchingPage({ currentUser, focusedItem, matches, onClearFocus, onViewFound, onViewLost }) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const [page, setPage] = useState(1);
  const query = normalizeText(search);
  const recommendationMatches = matches.filter((match) => match.status !== "rejected");
  const roleScopedMatches = recommendationMatches.filter((match) => canViewMatch(match, currentUser, focusedItem));
  const focusedMatches = roleScopedMatches.filter((match) => matchesFocusedItem(match, focusedItem));
  const filteredMatches = focusedMatches.filter((match) => {
    if (!query) return true;

    return normalizeText(
      `${match.lost?.title ?? ""} ${match.found?.title ?? ""} ${match.lost?.location ?? ""} ${match.found?.location ?? ""} ${match.lost?.category ?? ""} ${match.found?.category ?? ""} ${match.matchScore ?? ""}`,
    ).includes(query);
  });
  const sortedMatches = [...filteredMatches].sort((a, b) => compareMatches(a, b, sortMode));
  const totalPages = Math.max(1, Math.ceil(sortedMatches.length / MATCH_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * MATCH_PAGE_SIZE;
  const visibleMatches = sortedMatches.slice(pageStart, pageStart + MATCH_PAGE_SIZE);
  const showPagination = totalPages > 1;
  const emptyTitle = focusedItem
    ? "ລາຍການນີ້ຍັງບໍ່ມີລາຍການໃກ້ຄຽງ"
    : "ຍັງບໍ່ມີລາຍການທີ່ຄ້າຍຄືກັນ";
  const emptyDescription = focusedItem
    ? "ຖ້າມີປະກາດອື່ນທີ່ຄ້າຍກັນ 70% ຂຶ້ນໄປ ລະບົບຈະນຳມາສະແດງທີ່ນີ້"
    : "ເມື່ອມີຄົນໂພສ ລະບົບຈະປຽບທຽບ ແລະ ສະເໜີລາຍການທີ່ຄ້າຍຄືກັນ 70% ຂຶ້ນໄປໃຫ້ອັດຕະໂນມັດ";

  function viewMatchDetail(match) {
    const target = nextDetailTarget(match, focusedItem);
    if (target.type === "lost") {
      onViewLost?.(target.id);
      return;
    }

    onViewFound?.(target.id);
  }

  useEffect(() => {
    setPage(1);
  }, [search, sortMode, focusedItem?.id, focusedItem?.kind, roleScopedMatches.length]);

  function goToPage(nextPage) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
    window.setTimeout(() => {
      document.getElementById("matching-list-start")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <section className="panel matching-panel" id="matching" aria-labelledby="matches-title">
      <div className="panel-heading">
        <div>
          <h2 id="matches-title">ລາຍການທີ່ໃກ້ຄຽງ</h2>
          <p>ລະບົບປຽບທຽບປະເພດ, ສະຖານທີ່, ວັນທີ ແລະ ລາຍລະອຽດ ເພື່ອແນະນຳລາຍການທີ່ອາດໃກ້ຄຽງກັນ {MATCH_THRESHOLD}% ຂຶ້ນໄປ</p>
        </div>
        <div className="match-summary">
          <Percent size={18} />
          <strong>{MATCH_THRESHOLD}%</strong>
          <span>ເກນແນະນຳ</span>
        </div>
      </div>

      {focusedItem && (
        <div className="match-focus-banner" role="status">
          <div>
            <strong>ສະແດງລາຍການໃກ້ຄຽງສະເພາະລາຍການນີ້</strong>
            <span>{focusedItem.title || "ລາຍການທີ່ເລືອກ"}</span>
          </div>
          <button className="outline-button" onClick={onClearFocus} type="button">
            <ListFilter size={16} />
            ເບິ່ງລາຍການໃກ້ຄຽງທັງໝົດ
          </button>
        </div>
      )}

      <div className="match-information" role="note">
        <Info size={18} />
        <p>ເປັນພຽງຜົນຄຳນວນເພື່ອຊ່ວຍຄົ້ນຫາ ບໍ່ແມ່ນການຢືນຢັນວ່າເປັນສິ່ງຂອງອັນດຽວກັນ</p>
      </div>

      <div className="matching-toolbar">
        <label className="approval-search">
          <Search size={18} />
          <input
            aria-label="ຄົ້ນຫາລາຍການໃກ້ຄຽງ"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ຄົ້ນຫາຊື່ສິ່ງຂອງ, ສະຖານທີ່ ຫຼື ຄະແນນ..."
            type="search"
            value={search}
          />
        </label>
        <label className="approval-select">
          <span className="sr-only">ຈັດລຽງ</span>
          <select onChange={(event) => setSortMode(event.target.value)} value={sortMode}>
            {MATCH_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="matching-list" id="matching-list-start">
        {visibleMatches.length ? (
          visibleMatches.map((match) => {
            const target = nextDetailTarget(match, focusedItem);

            return (
              <article className="match-card" key={match.id}>
                <div className="score-block">
                  <strong>{match.matchScore}</strong>
                  <span>%</span>
                </div>

                <div className="match-body">
                  <div className="match-title-row">
                    <span className="status-chip blue">ລາຍການແນະນຳ</span>
                    <small>{formatLaoDateTime(match.createdAt)}</small>
                  </div>

                  <div className="match-pair">
                    <div>
                      <b>ຂອງສູນຫາຍ</b>
                      <h3>{match.lost?.title || "—"}</h3>
                      <p>{match.lost?.location || ""}</p>
                    </div>
                    <Link2 size={22} />
                    <div>
                      <b>ຂອງທີ່ພົບ</b>
                      <h3>{match.found?.title || "—"}</h3>
                      <p>{match.found?.location || ""}</p>
                    </div>
                  </div>

                  <div className="score-meter" aria-label={`ຄະແນນຄວາມໃກ້ຄຽງ ${match.matchScore}%`}>
                    <span style={{ width: `${Math.min(match.matchScore, 100)}%` }} />
                  </div>

                  {match.reasons?.length > 0 && (
                    <div className="reason-list">
                      {match.reasons.map((reason) => (
                        <span key={reason.label}>
                          {reason.label} <b>+{reason.points}</b>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="match-card-actions">
                    <button className="outline-button" onClick={() => viewMatchDetail(match)} type="button">
                      {target.label}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
      {showPagination && (
        <div className="pagination-controls matching-pagination" aria-label="Matching pagination">
          <button
            aria-label="Previous matching page"
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
            aria-label="Next matching page"
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

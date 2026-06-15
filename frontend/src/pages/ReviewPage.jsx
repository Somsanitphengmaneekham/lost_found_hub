import {
  AlertTriangle,
  Check,
  CircleHelp,
  ClipboardCheck,
  FileSearch,
  GitCompare,
  PackageCheck,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { matchStatusMeta, statusMeta } from "../data.js";
import { EmptyState } from "../components/common/FormControls.jsx";
import { canEditFoundPost, canEditLostPost, formatLaoDateTime, joinDetail, lostStatusLabel } from "../utils/ui.js";

const WAITING_FOUND_STATUSES = new Set(["awaiting_handover", "pending_approval"]);
const OPEN_LOST_STATUSES = new Set(["draft", "pending_approval", "published", "matched"]);

function countByStatus(items, statusSet) {
  return items.filter((item) => statusSet.has(item.status)).length;
}

function fieldLooksMissing(value) {
  return !String(value ?? "").trim() || String(value ?? "").includes("ຍັງບໍ່");
}

function foundWarnings(item) {
  const warnings = [];

  if (!item.images?.length) warnings.push("ບໍ່ມີຮູບປະກອບ");
  if (fieldLooksMissing(item.location)) warnings.push("ບໍ່ລະບຸສະຖານທີ່ພົບ");
  if (fieldLooksMissing(item.description)) warnings.push("ລາຍລະອຽດຍັງບໍ່ຊັດເຈນ");
  if (!item.color && !item.brand && !item.uniqueMark) warnings.push("ຄວນເພີ່ມສີ ຍີ່ຫໍ້ ຫຼື ຈຸດສັງເກດ");
  if (item.status === "awaiting_handover") warnings.push("ຍັງລໍຖ້າສົ່ງ ສີ່ງຂອງເຂົ້າຫ້ອງຄຸ້ມຄອງ");

  return warnings;
}

function lostWarnings(report) {
  const warnings = [];

  if (!report.images?.length) warnings.push("ບໍ່ມີຮູບປະກອບ");
  if (fieldLooksMissing(report.location)) warnings.push("ບໍ່ລະບຸສະຖານທີ່ສູນຫາຍ");
  if (fieldLooksMissing(report.description)) warnings.push("ລາຍລະອຽດຍັງບໍ່ຊັດເຈນ");
  if (!report.color && !report.brand && !report.uniqueMark) warnings.push("ຄວນເພີ່ມສີ ຍີ່ຫໍ້ ຫຼື ຈຸດສັງເກດ");

  return warnings;
}

function ReviewWarnings({ warnings }) {
  if (!warnings.length) return <span className="review-ok">ຂໍ້ມູນພື້ນຖານຄົບ</span>;

  return (
    <div className="review-warning-list">
      {warnings.map((warning) => (
        <span className="review-warning" key={warning}>
          <AlertTriangle size={13} />
          {warning}
        </span>
      ))}
    </div>
  );
}

function ReviewFoundRow({ currentUser, item, onDeleteFound, onEditFound }) {
  const meta = statusMeta[item.status] ?? { label: item.status, tone: "slate" };
  const canEdit = canEditFoundPost(item, currentUser);

  return (
    <article className="review-row with-image">
      <img className="review-row-image" src={item.image} alt={item.title} />
      <div className="review-row-main">
        <span className={`status-chip ${meta.tone}`}>{meta.label}</span>
        <h4>{item.title}</h4>
        <p>{item.location}</p>
        <small>{item.category} · {joinDetail(item.color, item.brand)}</small>
        <ReviewWarnings warnings={foundWarnings(item)} />
      </div>
      <div className="review-actions">
        {canEdit && (
          <button className="outline-button" onClick={() => onEditFound(item.id)} type="button">
            <Pencil size={16} />
            ແກ້ໄຂ
          </button>
        )}
        <button className="reject-button" onClick={() => onDeleteFound(item.id)} type="button">
          <Trash2 size={16} />
          ລຶບ
        </button>
      </div>
    </article>
  );
}

function ReviewLostRow({ currentUser, onDeleteLost, onEditLost, report }) {
  const canEdit = canEditLostPost(report, currentUser);

  return (
    <article className="review-row with-image">
      <img className="review-row-image" src={report.image} alt={report.title} />
      <div className="review-row-main">
        <span className="status-chip amber">{lostStatusLabel(report.status)}</span>
        <h4>{report.title}</h4>
        <p>{report.location}</p>
        <small>{report.category} · {joinDetail(report.color, report.brand)}</small>
        <ReviewWarnings warnings={lostWarnings(report)} />
      </div>
      <div className="review-actions">
        {canEdit && (
          <button className="outline-button" onClick={() => onEditLost(report.id)} type="button">
            <Pencil size={16} />
            ແກ້ໄຂ
          </button>
        )}
        <button className="reject-button" onClick={() => onDeleteLost(report.id)} type="button">
          <Trash2 size={16} />
          ລຶບ
        </button>
      </div>
    </article>
  );
}

export function ReviewPage({
  currentUser,
  foundItems,
  lostReports,
  matches,
  onDeleteFound,
  onDeleteLost,
  onEditFound,
  onEditLost,
  onConfirmMatch,
  onRejectMatch,
  onReturnMatch,
  returnRecords,
}) {
  const waitingFoundCount = countByStatus(foundItems, WAITING_FOUND_STATUSES);
  const activeLostCount = countByStatus(lostReports, OPEN_LOST_STATUSES);
  const suggestedMatchCount = matches.filter((match) => match.status === "suggested").length;
  const dataIssueCount =
    foundItems.filter((item) => foundWarnings(item).length).length +
    lostReports.filter((report) => lostWarnings(report).length).length;

  const latestMatches = matches.slice(0, 4);
  const returnReadyMatches = matches
    .filter((match) => match.status === "confirmed" && match.found?.status !== "returned")
    .slice(0, 4);

  return (
    <section className="panel review-section" id="review" aria-labelledby="review-title">
      <div className="panel-heading">
        <div>
          <h2 id="review-title">ກວດສອບ</h2>
          <p>ໜ້ານີ້ໃຊ້ສຳລັບອາຈານກວດເບີ່ງຂໍ້ມູນ ກ່ອນອະນຸມັດ ຈັບຄູ່ ຫຼື ບັນທຶກການສົ່ງຄືນສີ່ງຂອງ</p>
        </div>
        <span className="review-count">{foundItems.length + lostReports.length} ລາຍການ</span>
      </div>

      <div className="review-overview">
        <div className="review-stat-card">
          <ClipboardCheck size={22} />
          <span>ລໍຖ້າກວດປະກາດພົບເຫັນສີ່ງ</span>
          <strong>{waitingFoundCount}</strong>
        </div>
        <div className="review-stat-card">
          <CircleHelp size={22} />
          <span>ປະກາດສີ່ງຂອງສູນຫາຍທີ່ຍັງເປີດ</span>
          <strong>{activeLostCount}</strong>
        </div>
        <div className="review-stat-card">
          <GitCompare size={22} />
          <span>Match ທີ່ລໍຖ້າຢືນຢັນ</span>
          <strong>{suggestedMatchCount}</strong>
        </div>
        <div className="review-stat-card">
          <FileSearch size={22} />
          <span>ລາຍການທີ່ຄວນເຊັກຂໍ້ມູນ</span>
          <strong>{dataIssueCount}</strong>
        </div>
      </div>

      <div className="review-layout">
        <div className="review-column">
          <div className="review-column-title">
            <PackageCheck size={20} />
            <h3>ປະກາດພົບເຫັນສີ່ງຂອງ</h3>
            <span>{foundItems.length}</span>
          </div>
          <div className="review-list">
            {foundItems.length ? (
              foundItems.map((item) => (
                <ReviewFoundRow
                  currentUser={currentUser}
                  item={item}
                  key={item.id}
                  onDeleteFound={onDeleteFound}
                  onEditFound={onEditFound}
                />
              ))
            ) : (
              <EmptyState title="ຍັງບໍ່ມີປະກາດພົບເຫັນສີ່ງຂອງ" description="ເມື່ອມີຄົນແຈ້ງພົບເຫັນສີ່ງຂອງ ລາຍການຈະມາຢູ່ບ່ອນນີ້" />
            )}
          </div>
        </div>

        <div className="review-column">
          <div className="review-column-title amber-title">
            <CircleHelp size={20} />
            <h3>ປະກາດສີ່ງຂອງສູນຫາຍ</h3>
            <span>{lostReports.length}</span>
          </div>
          <div className="review-list">
            {lostReports.length ? (
              lostReports.map((report) => (
                <ReviewLostRow
                  currentUser={currentUser}
                  key={report.id}
                  onDeleteLost={onDeleteLost}
                  onEditLost={onEditLost}
                  report={report}
                />
              ))
            ) : (
              <EmptyState title="ຍັງບໍ່ມີປະກາດສີ່ງຂອງສູນຫາຍ" description="ເມື່ອນັກສຶກສາແຈ້ງສີ່ງຂອງສູນຫາຍ ລາຍການຈະມາຢູ່ບ່ອນນີ້" />
            )}
          </div>
        </div>
      </div>

      <div className="review-side-grid">
        <section className="review-side-card">
          <div className="review-side-heading">
            <GitCompare size={19} />
            <h3>Match ລ່າສຸດ</h3>
          </div>
          {latestMatches.length ? (
            <div className="review-mini-list">
              {latestMatches.map((match) => {
                const meta = matchStatusMeta[match.status] ?? { label: match.status, tone: "slate" };
                return (
                  <article className="review-mini-row" key={match.id}>
                    <span className={`status-chip ${meta.tone}`}>{meta.label}</span>
                    <strong>{match.lost?.title ?? "ສີ່ງຂອງສູນຫາຍ"} ↔ {match.found?.title ?? "ສີ່ງຂອງທີ່ພົບ"}</strong>
                    <small>{Math.round(match.matchScore)}% · {formatLaoDateTime(match.createdAt)}</small>
                    {match.status === "suggested" && (
                      <div className="review-mini-actions">
                        <button className="approve-button" onClick={() => onConfirmMatch(match.id)} type="button">
                          <Check size={15} />
                          ຢືນຢັນ
                        </button>
                        <button className="reject-button" onClick={() => onRejectMatch(match.id)} type="button">
                          <X size={15} />
                          ປະຕິເສດ
                        </button>
                      </div>
                    )}
                    {match.status === "confirmed" && match.found?.status !== "returned" && (
                      <div className="review-mini-actions">
                        <button className="outline-button" onClick={() => onReturnMatch(match.id)} type="button">
                          <ClipboardCheck size={15} />
                          ບັນທຶກຄືນຂອງ
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີ Match" description="ເມື່ອລະບົບຄຳນວນຄະແນນເກີນ 70% ຈະສະແດງບ່ອນນີ້" />
          )}
        </section>

        <section className="review-side-card">
          <div className="review-side-heading">
            <ClipboardCheck size={19} />
            <h3>ລໍຖ້າຄືນຂອງ</h3>
          </div>
          {returnReadyMatches.length ? (
            <div className="review-mini-list">
              {returnReadyMatches.map((match) => (
                <article className="review-mini-row" key={match.id}>
                  <span className="status-chip purple">ຢືນຢັນ Match ແລ້ວ</span>
                  <strong>{match.lost?.title ?? "ສີ່ງຂອງສູນຫາຍ"} ↔ {match.found?.title ?? "ສີ່ງຂອງທີ່ພົບ"}</strong>
                  <small>{match.found?.location || match.lost?.location || "ບໍ່ລະບຸສະຖານທີ່"}</small>
                  <div className="review-mini-actions">
                    <button className="outline-button" onClick={() => onReturnMatch(match.id)} type="button">
                      <ClipboardCheck size={15} />
                      ບັນທຶກຄືນຂອງ
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີລາຍການລໍຖ້າຄືນ" description="ຫຼັງອາຈານຢືນຢັນ Match ແລ້ວ ລາຍການຈະມາຢູ່ບ່ອນນີ້" />
          )}
        </section>

        <section className="review-side-card">
          <div className="review-side-heading">
            <ClipboardCheck size={19} />
            <h3>Checklist ກ່ອນດຳເນີນການ</h3>
          </div>
          <ul className="review-checklist">
            <li>ຮູບພາບຕ້ອງຊັດ ແລະ ເຫັນລັກສະນະສຳຄັນຂອງສິ່ງຂອງ</li>
            <li>ສະຖານທີ່ ວັນທີ ແລະ ເວລາ ຕ້ອງກວດກັບຂໍ້ມູນທີ່ຜູ້ແຈ້ງລະບຸ</li>
            <li>ຖ້າພົບ Match ຄວນເຊັກສີ ຍີ່ຫໍ້ ແລະ ຈຸດສັງເກດກ່ອນຢືນຢັນ</li>
            <li>ຫຼັງຄືນຂອງແລ້ວຕ້ອງມີບັນທຶກໃນ return_records</li>
          </ul>
          <div className="review-return-summary">
            <span>ຄືນຂອງແລ້ວ</span>
            <strong>{returnRecords.length}</strong>
          </div>
        </section>
      </div>
    </section>
  );
}

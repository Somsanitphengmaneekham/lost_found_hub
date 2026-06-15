import { Check, ClipboardCheck, Link2, Percent, X } from "lucide-react";
import { matchStatusMeta } from "../data.js";
import { formatLaoDateTime } from "../utils/ui.js";
import { EmptyState } from "../components/common/FormControls.jsx";

const MATCH_THRESHOLD = 70;

export function MatchingPage({ canReview, matches, onConfirm, onReject, onReturn, returnRecords }) {
  return (
    <section className="panel matching-panel" id="matching" aria-labelledby="matches-title">
      <div className="panel-heading">
        <div>
          <h2 id="matches-title">ລາຍການທີ່ອາດກົງກັນ</h2>
          <p>ອ່ານຈາກຕາຕະລາງ `matches` ຫຼັງລະບົບຄຳນວນ Weighted Score ຕັ້ງແຕ່ 70 ຄະແນນຂຶ້ນໄປ</p>
        </div>
        <div className="match-summary">
          <Percent size={18} />
          <strong>{MATCH_THRESHOLD}%</strong>
          <span>ເກນແນະນຳ</span>
        </div>
      </div>
      <div className="matching-list">
        {matches.length ? (
          matches.map((match) => (
            <article className="match-card" key={match.id}>
              <div className="score-block">
                <strong>{match.matchScore}</strong>
                <span>ຄະແນນ</span>
              </div>
              <div className="match-body">
                <div className="match-title-row">
                  <span className={`status-chip ${matchStatusMeta[match.status].tone}`}>
                    {matchStatusMeta[match.status].label}
                  </span>
                  <small>match #{match.id}</small>
                </div>
                <div className="match-pair">
                  <div>
                    <b>ຂອງສູນຫາຍ</b>
                    <h3>{match.lost.title}</h3>
                    <p>{match.lost.location}</p>
                  </div>
                  <Link2 size={22} />
                  <div>
                    <b>ຂອງທີ່ພົບ</b>
                    <h3>{match.found.title}</h3>
                    <p>{match.found.location}</p>
                  </div>
                </div>
                <div className="score-meter" aria-label={`ຄະແນນ ${match.matchScore}`}>
                  <span style={{ width: `${Math.min(match.matchScore, 100)}%` }} />
                </div>
                <div className="reason-list">
                  {match.reasons.map((reason) => (
                    <span key={reason.label}>
                      {reason.label} <b>+{reason.points}</b>
                    </span>
                  ))}
                </div>
              </div>
              <div className="match-actions">
                {!canReview && <span className="permission-note">ສະເພາະອາຈານສາມາດຢືນຢັນ match</span>}
                {canReview && match.status === "suggested" && (
                  <>
                    <button className="approve-button" onClick={() => onConfirm(match.id)} type="button">
                      <Check size={17} />
                      ຢືນຢັນ
                    </button>
                    <button className="reject-button" onClick={() => onReject(match.id)} type="button">
                      <X size={17} />
                      ປະຕິເສດ
                    </button>
                  </>
                )}
                {canReview && match.status === "confirmed" && match.found.status !== "returned" && (
                  <button className="outline-button" onClick={() => onReturn(match.id)} type="button">
                    <ClipboardCheck size={17} />
                    ບັນທຶກຄືນຂອງ
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="ຍັງບໍ່ມີລາຍການທີ່ອາດກົງກັນ" description="ເມື່ອຄະແນນຮອດເກນ ລະບົບຈະສ້າງລາຍການໃນ matches" />
        )}
      </div>
      {returnRecords.length > 0 && (
        <div className="return-log">
          <h3>return_records ຫຼ້າສຸດ</h3>
          {returnRecords.map((record) => (
            <p key={record.id}>
              claim {record.claimRequestId} ຄືນຂອງທີ່ {record.returnLocation} ເວລາ{" "}
              {formatLaoDateTime(record.returnedAt)}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

import { ArrowRight, Info, Link2, Percent } from "lucide-react";
import { formatLaoDateTime } from "../utils/ui.js";
import { EmptyState } from "../components/common/FormControls.jsx";

const MATCH_THRESHOLD = 70;

export function MatchingPage({ currentUser, matches, onViewFound }) {
  const recommendationMatches = matches.filter((match) => match.status !== "rejected");
  const visibleMatches = currentUser?.role === "teacher"
    ? recommendationMatches
    : recommendationMatches.filter((match) => Number(match.lost?.ownerId) === Number(currentUser?.id));

  return (
    <section className="panel matching-panel" id="matching" aria-labelledby="matches-title">
      <div className="panel-heading">
        <div>
          <h2 id="matches-title">ລາຍການພົບຂອງທີ່ອາດກົງກັນ</h2>
          <p>ລະບົບປຽບທຽບປະເພດ, ສະຖານທີ່, ວັນທີ ແລະ ລາຍລະອຽດ ແລ້ວແນະນຳລາຍການທີ່ໄດ້ {MATCH_THRESHOLD}% ຂຶ້ນໄປ</p>
        </div>
        <div className="match-summary">
          <Percent size={18} />
          <strong>{MATCH_THRESHOLD}%</strong>
          <span>ເກນແນະນຳ</span>
        </div>
      </div>

      <div className="match-information" role="note">
        <Info size={18} />
        <p>ເປີເຊັນນີ້ເປັນພຽງຜົນຄຳນວນເພື່ອຊ່ວຍຄົ້ນຫາ ບໍ່ແມ່ນການຢືນຢັນວ່າເປັນສິ່ງຂອງອັນດຽວກັນ</p>
      </div>

      <div className="matching-list">
        {visibleMatches.length ? (
          visibleMatches.map((match) => (
            <article className="match-card" key={match.id}>
              {/* Score badge */}
              <div className="score-block">
                <strong>{match.matchScore}</strong>
                <span>%</span>
              </div>

              <div className="match-body">
                {/* Header row */}
                <div className="match-title-row">
                  <span className="status-chip blue">ລະບົບແນະນຳ</span>
                  <small>{formatLaoDateTime(match.createdAt)}</small>
                </div>

                {/* Lost ↔ Found pair */}
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

                {/* Score meter */}
                <div className="score-meter" aria-label={`ຄະແນນ ${match.matchScore}%`}>
                  <span style={{ width: `${Math.min(match.matchScore, 100)}%` }} />
                </div>

                {/* Reason breakdown */}
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
                  <button className="outline-button" onClick={() => onViewFound(match.foundPostId)} type="button">
                    ເບິ່ງລາຍລະອຽດຂອງທີ່ພົບ
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="ຍັງບໍ່ມີລາຍການທີ່ຄ້າຍຄືກັນ"
            description="ເມື່ອມີຄົນໂພສ ລະບົບຈະປຽບທຽບ ແລະ ສະເໜີລາຍການທີ່ຄ້າຍຄືກັນ 70% ຂຶ້ນໄປໃຫ້ອັດຕະໂນມັດ"
          />
        )}
      </div>
    </section>
  );
}

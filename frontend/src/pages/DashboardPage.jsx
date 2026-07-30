import {
  ArrowRight,
  BadgeCheck,
  Check,
  ClipboardCheck,
  Clock3,
  FileQuestion,
  Inbox,
  Link2,
  MapPin,
  PackageCheck,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { statusMeta } from "../data.js";
import {
  canDeleteFoundPost,
  canDeleteLostPost,
  canEditFoundPost,
  canEditLostPost,
  formatLaoDateTime,
  joinDetail,
  lostStatusLabel,
} from "../utils/ui.js";
import { EmptyState } from "../components/common/FormControls.jsx";

const APPROVAL_STATUSES = new Set(["awaiting_handover", "pending_approval"]);

function numberText(value) {
  return Number(value ?? 0).toLocaleString("lo-LA");
}

function safeFoundStatus(status) {
  return statusMeta[status] ?? { label: status, tone: "slate" };
}

function userOwnsFound(item, currentUser) {
  return Number(item.finderId) === Number(currentUser.id) || item.finder === currentUser.fullName;
}

function userOwnsMatch(match, currentUser) {
  const lostOwnerId = match.lost?.ownerId;
  return Number(lostOwnerId) === Number(currentUser.id);
}

function topCounts(items, key, limit = 5) {
  const counts = new Map();

  items.forEach((item) => {
    const value = item[key] || "ບໍ່ລະບຸ";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function recentSortValue(item) {
  const dateValue = item.createdAt || item.updatedAt || item.foundAt || item.lostAt || "";
  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? 0 : time;
}

const roleGuideSteps = {
  teacher: [
    {
      icon: ShieldCheck,
      title: "ກວດລາຍການລໍຖ້າ",
      description: "ເຂົ້າໜ້າອະນຸມັດເພື່ອກວດຂໍ້ມູນຂອງສູນຫາຍ ແລະ ຂອງທີ່ພົບກ່ອນເຜີຍແຜ່.",
    },
    {
      icon: Link2,
      title: "ເບິ່ງລາຍການແນະນຳ",
      description: "ເບິ່ງຄະແນນຄວາມຄ້າຍຄືຈາກລະບົບ ເພື່ອຊ່ວຍກວດລາຍການທີ່ອາດໃກ້ຄຽງກັນ.",
    },
    {
      icon: ClipboardCheck,
      title: "ປິດສະຖານະຄືນຂອງ",
      description: "ເມື່ອຄືນສິ່ງຂອງແລ້ວ ໃຫ້ບັນທຶກສະຖານະສົ່ງຄືນໃນລະບົບ.",
    },
  ],
  student: [
    {
      icon: FileQuestion,
      title: "ແຈ້ງຂອງສູນຫາຍ",
      description: "ກອກຂໍ້ມູນສິ່ງຂອງ ສະຖານທີ່ ເວລາ ແລະ ໃສ່ຮູບຢ່າງໜ້ອຍ 1 ຮູບ.",
    },
    {
      icon: Inbox,
      title: "ແຈ້ງພົບຂອງ",
      description: "ບັນທຶກຂອງທີ່ພົບ ແລະ ນຳສົ່ງໃຫ້ຫ້ອງຄຸ້ມຄອງກວດສອບ.",
    },
    {
      icon: Clock3,
      title: "ຕິດຕາມສະຖານະ",
      description: "ເບິ່ງລາຍການຂອງຕົນເອງ ແລະ ແກ້ໄຂໄດ້ກ່ອນອາຈານອະນຸມັດ.",
    },
    {
      icon: Link2,
      title: "ກວດລາຍການທີ່ອາດກົງກັນ",
      description: "ຫຼັງສົ່ງປະກາດ ລະບົບຈະແນະນຳຂອງທີ່ພົບທີ່ຄ້າຍກັນພ້ອມເປີເຊັນ.",
    },
  ],
};

export function DashboardPage({
  currentUser,
  foundItems,
  lostReports,
  matches,
  onApproveFound,
  onDeleteFound,
  onDeleteLost,
  onEditFound,
  onEditLost,
  onMoveToApproval,
  onRejectFound,
  returnRecords,
}) {
  const isTeacher = currentUser.role === "teacher";

  if (isTeacher) {
    return (
      <TeacherDashboard
        foundItems={foundItems}
        lostReports={lostReports}
        matches={matches}
        onApproveFound={onApproveFound}
        onMoveToApproval={onMoveToApproval}
        onRejectFound={onRejectFound}
        returnRecords={returnRecords}
      />
    );
  }

  return (
    <StudentDashboard
      currentUser={currentUser}
      foundItems={foundItems}
      lostReports={lostReports}
      matches={matches}
      onDeleteFound={onDeleteFound}
      onDeleteLost={onDeleteLost}
      onEditFound={onEditFound}
      onEditLost={onEditLost}
      returnRecords={returnRecords}
    />
  );
}

function TeacherDashboard({
  foundItems,
  lostReports,
  matches,
  onApproveFound,
  onMoveToApproval,
  onRejectFound,
  returnRecords,
}) {
  const approvalItems = foundItems
    .filter((item) => APPROVAL_STATUSES.has(item.status))
    .sort((a, b) => (a.status === "pending_approval" ? -1 : 1) - (b.status === "pending_approval" ? -1 : 1));
  const recommendationMatches = matches.filter((match) => match.status !== "rejected");
  const activeFoundItems = foundItems.filter((item) => item.status !== "returned" && item.status !== "rejected");
  const categoryInsights = topCounts([...foundItems, ...lostReports], "category");
  const locationInsights = topCounts([...foundItems, ...lostReports], "location");
  const maxInsightCount = Math.max(...categoryInsights.map((item) => item.count), 1);

  const metrics = [
    {
      label: "ລາຍການລໍຖ້າກວດ",
      value: approvalItems.length,
      icon: ShieldCheck,
      tone: "amber",
    },
    {
      label: "ລາຍການໃກ້ຄຽງ",
      value: recommendationMatches.length,
      icon: Link2,
      tone: "blue",
    },
    {
      label: "ຍັງຄ້າງໃນລະບົບ",
      value: activeFoundItems.length,
      icon: PackageCheck,
      tone: "slate",
    },
  ];

  return (
    <section className="dashboard-page" id="dashboard" aria-labelledby="dashboard-title">
      <div className="dashboard-hero">
        <div>
          <span className="dashboard-eyebrow">Teacher Dashboard</span>
          <h2 id="dashboard-title">ພາບລວມການຈັດການຂອງສູນຫາຍ</h2>
          <p>ສະຫຼຸບວຽກທີ່ຕ້ອງກວດ, ລາຍການທີ່ອາດກົງກັນ ແລະ ການຄືນຂອງໃນບ່ອນດຽວ</p>
        </div>
        <a className="dashboard-primary-link" href="#approval">
          ໄປໜ້າອະນຸມັດ
          <ArrowRight size={18} />
        </a>
      </div>

      <DashboardGuide role="teacher" />

      <MetricGrid metrics={metrics} />

      <div className="dashboard-grid">
        <DashboardPanel
          actionHref="#approval"
          actionLabel="ເບິ່ງທັງໝົດ"
          className="dashboard-panel-large"
          icon={ShieldCheck}
          title="ວຽກທີ່ຕ້ອງກວດກ່ອນ"
        >
          {approvalItems.length ? (
            <div className="dashboard-list">
              {approvalItems.slice(0, 5).map((item) => (
                <FoundReviewRow
                  item={item}
                  key={item.id}
                  onApproveFound={onApproveFound}
                  onMoveToApproval={onMoveToApproval}
                  onRejectFound={onRejectFound}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="ບໍ່ມີລາຍການລໍຖ້າກວດ" description="ເມື່ອມີຄົນແຈ້ງພົບຂອງ ລາຍການຈະມາຢູ່ບ່ອນນີ້" />
          )}
        </DashboardPanel>

        <DashboardPanel
          actionHref="#matching"
          actionLabel="ເບິ່ງລາຍການໃກ້ຄຽງ"
          className="dashboard-panel-large"
          icon={Link2}
          title="ລາຍການໃກ້ຄຽງ"
        >
          {recommendationMatches.length ? (
            <div className="dashboard-list">
              {recommendationMatches.slice(0, 5).map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີລາຍການໃກ້ຄຽງ" description="ລະບົບຈະແນະນຳລາຍການເມື່ອຄະແນນຄວາມຄ້າຍຄືສູງພໍ" />
          )}
        </DashboardPanel>

        <DashboardPanel icon={BadgeCheck} title="ສະຖິຕິທີ່ຄວນຕິດຕາມ">
          <div className="dashboard-insights">
            <h3>ໝວດໝູ່ທີ່ແຈ້ງຫຼາຍທີ່ສຸດ</h3>
            <InsightBars items={categoryInsights} maxCount={maxInsightCount} />
            <h3>ສະຖານທີ່ ທີ່ຖືກແຈ້ງຫຼາຍທີ່ສຸດ</h3>
            <InsightBars items={locationInsights} maxCount={Math.max(...locationInsights.map((item) => item.count), 1)} />
          </div>
        </DashboardPanel>
      </div>

      <div className="dashboard-footer-strip">
        <span>
          <Inbox size={18} />
          ສີ່ງຂອງທີ່ພົບທັງໝົດ {numberText(foundItems.length)}
        </span>
        <span>
          <FileQuestion size={18} />
          ສີ່ງຂອງສູນຫາຍທັງໝົດ {numberText(lostReports.length)}
        </span>
        <span>
          <RotateCcw size={18} />
          ຄືນສີ່ງຂອງແລ້ວ {numberText(returnRecords.length)}
        </span>
      </div>
    </section>
  );
}

function StudentDashboard({
  currentUser,
  foundItems,
  lostReports,
  matches,
  onDeleteFound,
  onDeleteLost,
  onEditFound,
  onEditLost,
  returnRecords,
}) {
  const myLostReports = lostReports.filter((report) => Number(report.ownerId) === Number(currentUser.id));
  const myFoundItems = foundItems.filter((item) => userOwnsFound(item, currentUser));
  const myMatches = matches.filter(
    (match) => match.status !== "rejected" && userOwnsMatch(match, currentUser),
  );
  const latestItems = [
    ...myLostReports.map((item) => ({ ...item, kind: "lost" })),
    ...myFoundItems.map((item) => ({ ...item, kind: "found" })),
  ].sort((a, b) => recentSortValue(b) - recentSortValue(a));

  const metrics = [
    { label: "ສີ່ງຂອງສູນຫາຍຂອງຂ້ອຍ", value: myLostReports.length, icon: FileQuestion, tone: "amber" },
    { label: "ສີ່ງຂອງທີ່ຂ້ອຍແຈ້ງພົບ", value: myFoundItems.length, icon: Inbox, tone: "blue" },
    { label: "ລາຍການໃກ້ຄຽງ", value: myMatches.length, icon: Link2, tone: "green" },
    { label: "ການຄືນສີ່ງຂອງທັງໝົດ", value: returnRecords.length, icon: ClipboardCheck, tone: "slate" },
  ];

  return (
    <section className="dashboard-page" id="dashboard" aria-labelledby="dashboard-title">
      <div className="dashboard-hero">
        <div>
          <span className="dashboard-eyebrow">Student Dashboard</span>
          <h2 id="dashboard-title">ພາບລວມລາຍການຂອງຂ້ອຍ</h2>
          <p>ກວດສະຖານະສີ່ງຂອງທີ່ແຈ້ງສູນຫາຍ, ສີ່ງຂອງທີ່ແຈ້ງພົບ ແລະ ລາຍການໃກ້ຄຽງທີ່ອາດກ່ຽວຂ້ອງ</p>
        </div>
        <a className="dashboard-primary-link" href="#lost-form">
          ແຈ້ງສີ່ງຂອງສູນຫາຍ
          <ArrowRight size={18} />
        </a>
      </div>

      <DashboardGuide role="student" />

      <MetricGrid metrics={metrics} />

      <div className="dashboard-grid student">
        <DashboardPanel
          actionHref="#profile"
          actionLabel="ໂປຣໄຟລ໌"
          className="dashboard-panel-large"
          icon={Clock3}
          title="ສະຖານະລ່າສຸດຂອງຂ້ອຍ"
        >
          {latestItems.length ? (
            <div className="dashboard-list">
              {latestItems.slice(0, 6).map((item) => {
                const isLost = item.kind === "lost";
                const canEdit = isLost
                  ? canEditLostPost(item, currentUser)
                  : canEditFoundPost(item, currentUser);
                const canDelete = isLost
                  ? canDeleteLostPost(item, currentUser)
                  : canDeleteFoundPost(item, currentUser);

                return (
                  <article className="dashboard-user-row" key={`${item.kind}-${item.id}`}>
                    <img className="dashboard-user-image" src={item.image} alt={item.title} />
                    <div>
                      <span className={`dashboard-kind ${item.kind}`}>
                        {isLost ? "ຂອງສູນຫາຍ" : "ຂອງທີ່ພົບ"}
                      </span>
                      <h3>{item.title}</h3>
                      <p>
                        <MapPin size={15} />
                        {item.location}
                      </p>
                      {(canEdit || canDelete) && (
                        <div className="dashboard-inline-actions">
                          {canEdit && (
                            <button
                              className="outline-button"
                              onClick={() => (isLost ? onEditLost(item.id) : onEditFound(item.id))}
                              type="button"
                            >
                              <Pencil size={15} />
                              ແກ້ໄຂ
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="reject-button"
                              onClick={() => (isLost ? onDeleteLost(item.id) : onDeleteFound(item.id))}
                              type="button"
                            >
                              <Trash2 size={15} />
                              ລຶບ
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`status-chip ${isLost ? "blue" : safeFoundStatus(item.status).tone}`}>
                      {isLost ? lostStatusLabel(item.status) : safeFoundStatus(item.status).label}
                    </span>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີລາຍການຂອງຂ້ອຍ" description="ເລີ່ມຈາກແຈ້ງສີ່ງຂອງສູນຫາຍ ຫຼື ແຈ້ງພົບເຫັນສີ່ງຂອງ" />
          )}
        </DashboardPanel>

        <DashboardPanel
          actionHref="#matching"
          actionLabel="ເບິ່ງທັງໝົດ"
          icon={Link2}
          title="ລາຍການໃກ້ຄຽງທີ່ລະບົບແນະນຳ"
        >
          {myMatches.length ? (
            <div className="dashboard-list compact">
              {myMatches.slice(0, 4).map((match) => (
                <article className="dashboard-student-match" key={match.id}>
                  <div className="dashboard-score">{match.matchScore}%</div>
                  <div>
                    <h3>{match.lost?.title || "ສີ່ງຂອງສູນຫາຍ"} ↔ {match.found?.title || "ສີ່ງຂອງທີ່ພົບ"}</h3>
                    <p>{match.found?.location || match.lost?.location || "ບໍ່ລະບຸສະຖານທີ່"}</p>
                  </div>
                  <span className="status-chip blue">ລະບົບແນະນຳ</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີລາຍການໃກ້ຄຽງ" description="ຖ້າລະບົບພົບລາຍການທີ່ຄະແນນສູງ ຈະສະແດງຢູ່ບ່ອນນີ້" />
          )}
        </DashboardPanel>
      </div>
    </section>
  );
}

function DashboardGuide({ role }) {
  const steps = roleGuideSteps[role] ?? roleGuideSteps.student;
  const title = role === "teacher" ? "ວິທີໃຊ້ງານສຳລັບອາຈານ" : "ວິທີໃຊ້ງານສຳລັບນັກສຶກສາ";
  const description =
    role === "teacher"
      ? "ຂັ້ນຕອນຫຼັກທີ່ຫ້ອງຄຸ້ມຄອງໃຊ້ໃນການກວດສອບ ອະນຸມັດ ແລະ ສົ່ງຄືນສິ່ງຂອງ."
      : "ຂັ້ນຕອນສັ້ນໆ ສຳລັບການແຈ້ງຂອງສູນຫາຍ ແຈ້ງພົບຂອງ ແລະ ຕິດຕາມສະຖານະ.";

  return (
    <section className="dashboard-guide" id="how-to-use" aria-labelledby="dashboard-guide-title">
      <div className="dashboard-guide-head">
        <div>
          <span>ຄູ່ມືການໃຊ້ງານ</span>
          <h3 id="dashboard-guide-title">{title}</h3>
        </div>
        <p>{description}</p>
      </div>
      <div className="dashboard-guide-list">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <article className="dashboard-guide-step" key={step.title}>
              <Icon size={20} />
              <div>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MetricGrid({ metrics }) {
  return (
    <div className="dashboard-metrics">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <article className={`dashboard-metric ${metric.tone}`} key={metric.label}>
            <span>
              <Icon size={21} />
            </span>
            <div>
              <strong>{numberText(metric.value)}</strong>
              <p>{metric.label}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DashboardPanel({ actionHref, actionLabel, children, className = "", icon: Icon, title }) {
  return (
    <article className={`dashboard-panel ${className}`}>
      <div className="dashboard-panel-head">
        <h3>
          <Icon size={19} />
          {title}
        </h3>
        {actionHref && (
          <a href={actionHref}>
            {actionLabel}
            <ArrowRight size={15} />
          </a>
        )}
      </div>
      {children}
    </article>
  );
}

function FoundReviewRow({ item, onApproveFound, onMoveToApproval, onRejectFound }) {
  const meta = safeFoundStatus(item.status);

  function handleReject() {
    const reason = window.prompt("ກະລຸນາລະບຸເຫດຜົນທີ່ປະຕິເສດປະກາດນີ້");
    if (reason === null) return;
    if (!reason.trim()) return;
    onRejectFound(item.id, reason);
  }

  return (
    <article className="dashboard-work-row">
      <img src={item.image} alt={item.title} />
      <div className="dashboard-work-main">
        <div className="dashboard-row-top">
          <span className={`status-chip ${meta.tone}`}>{meta.label}</span>
          <small>{item.date} · {item.time}</small>
        </div>
        <h3>{item.title}</h3>
        <p>
          <MapPin size={15} />
          {item.location}
        </p>
        <small>{joinDetail(item.color, item.brand)}</small>
      </div>
      <div className="dashboard-actions">
        {item.status === "awaiting_handover" && (
          <button className="approve-button" onClick={() => onMoveToApproval(item.id)} type="button">
            <PackageCheck size={16} />
            ຮັບຂອງ
          </button>
        )}
        {item.status === "pending_approval" && (
          <button className="approve-button" onClick={() => onApproveFound(item.id)} type="button">
            <Check size={16} />
            ອະນຸມັດ
          </button>
        )}
        <button className="reject-button" onClick={handleReject} type="button">
          <X size={16} />
          ປະຕິເສດ
        </button>
      </div>
    </article>
  );
}

function MatchRow({ match }) {
  return (
    <article className="dashboard-match-row">
      <div className="dashboard-score">
        <strong>{match.matchScore}</strong>
        <span>%</span>
      </div>
      <div className="dashboard-match-main">
        <div className="dashboard-row-top">
          <span className="status-chip blue">ລະບົບແນະນຳ</span>
          <small>{formatLaoDateTime(match.createdAt)}</small>
        </div>
        <h3>{match.lost?.title || "ຂອງສູນຫາຍ"} ↔ {match.found?.title || "ຂອງທີ່ພົບ"}</h3>
        <p>{match.found?.location || match.lost?.location || "ບໍ່ລະບຸສະຖານທີ່"}</p>
      </div>
    </article>
  );
}

function InsightBars({ items, maxCount }) {
  if (!items.length) {
    return <p className="dashboard-muted">ຍັງບໍ່ມີຂໍ້ມູນພໍສຳລັບສະຖິຕິ</p>;
  }

  return (
    <div className="dashboard-bars">
      {items.map((item) => (
        <div className="dashboard-bar-row" key={item.label}>
          <div>
            <span>{item.label}</span>
            <strong>{numberText(item.count)}</strong>
          </div>
          <i>
            <b style={{ width: `${Math.max(12, (item.count / maxCount) * 100)}%` }} />
          </i>
        </div>
      ))}
    </div>
  );
}

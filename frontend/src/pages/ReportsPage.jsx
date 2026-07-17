import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileQuestion,
  GitCompare,
  Inbox,
  MapPin,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { statusMeta } from "../data.js";
import { EmptyState } from "../components/common/FormControls.jsx";
import {
  formatLaoDateTime,
  joinDetail,
  lostStatusLabel,
  roleLabel,
} from "../utils/ui.js";

const OPEN_FOUND_STATUSES = new Set(["awaiting_handover", "pending_approval", "approved", "matched"]);
const OPEN_LOST_STATUSES = new Set(["draft", "pending_approval", "published", "matched"]);

function numberText(value) {
  return Number(value ?? 0).toLocaleString("lo-LA");
}

function safeFoundStatus(status) {
  return statusMeta[status] ?? { label: status || "ບໍ່ລະບຸ", tone: "slate" };
}

function sortRecent(items) {
  return [...items].sort((a, b) => dateValue(b) - dateValue(a));
}

function dateValue(item) {
  const value = item.returnedAt || item.createdAt || item.foundAt || item.lostAt || "";
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function countBy(items, getKey, fallback = "ບໍ່ລະບຸ") {
  const counts = new Map();

  items.forEach((item) => {
    const key = getKey(item) || fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), "lo-LA"));
}

function statusBreakdown(items, labelForStatus) {
  return countBy(items, (item) => labelForStatus(item.status));
}

function monthBucket(value) {
  if (!value) return { key: "unknown", label: "ບໍ່ລະບຸວັນທີ", sortValue: -1 };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { key: "unknown", label: "ບໍ່ລະບຸວັນທີ", sortValue: -1 };

  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  return {
    key,
    label: new Intl.DateTimeFormat("lo-LA", { month: "short", year: "numeric" }).format(date),
    sortValue: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
  };
}

function monthBreakdown({ foundItems, lostReports, returnRecords }) {
  const counts = new Map();

  function add(value, field) {
    const bucket = monthBucket(value);
    const current = counts.get(bucket.key);

    counts.set(bucket.key, {
      label: bucket.label,
      sortValue: bucket.sortValue,
      found: current?.found ?? 0,
      lost: current?.lost ?? 0,
      returned: current?.returned ?? 0,
      [field]: (current?.[field] ?? 0) + 1,
    });
  }

  foundItems.forEach((item) => add(item.foundAt, "found"));
  lostReports.forEach((item) => add(item.lostAt, "lost"));
  returnRecords.forEach((item) => add(item.returnedAt, "returned"));

  return [...counts.values()]
    .sort((a, b) => b.sortValue - a.sortValue)
    .slice(0, 8);
}

function foundBelongsToUser(item, user) {
  return Number(item.finderId) === Number(user.id) || item.finder === user.fullName;
}

function matchBelongsToUser(match, user, myLostIds) {
  return (
    Number(match.lost?.ownerId) === Number(user.id) ||
    myLostIds.has(Number(match.lostPostId))
  );
}

function returnBelongsToUser(record, user, myFoundIds) {
  return record.receivedBy === user.username || record.receivedBy === user.fullName || myFoundIds.has(Number(record.foundPostId));
}

function reportScope({ currentUser, foundItems, lostReports, matches, returnRecords }) {
  if (currentUser.role === "teacher") {
    return {
      foundItems,
      lostReports,
      matches,
      returnRecords,
    };
  }

  const scopedLostReports = lostReports.filter((item) => Number(item.ownerId) === Number(currentUser.id));
  const scopedFoundItems = foundItems.filter((item) => foundBelongsToUser(item, currentUser));
  const myLostIds = new Set(scopedLostReports.map((item) => Number(item.id)));
  const myFoundIds = new Set(scopedFoundItems.map((item) => Number(item.id)));

  return {
    foundItems: scopedFoundItems,
    lostReports: scopedLostReports,
    matches: matches.filter((match) => matchBelongsToUser(match, currentUser, myLostIds)),
    returnRecords: returnRecords.filter((record) => returnBelongsToUser(record, currentUser, myFoundIds)),
  };
}

export function ReportsPage({ currentUser, foundItems, lostReports, matches, members, returnRecords }) {
  const isTeacher = currentUser.role === "teacher";
  const recommendationMatches = matches.filter((match) => match.status !== "rejected");
  const scoped = reportScope({
    currentUser,
    foundItems,
    lostReports,
    matches: recommendationMatches,
    returnRecords,
  });
  const openFoundCount = scoped.foundItems.filter((item) => OPEN_FOUND_STATUSES.has(item.status)).length;
  const openLostCount = scoped.lostReports.filter((item) => OPEN_LOST_STATUSES.has(item.status)).length;
  const recommendationCount = scoped.matches.filter((item) => item.status !== "rejected").length;
  const pendingApprovalCount =
    foundItems.filter((item) => ["awaiting_handover", "pending_approval"].includes(item.status)).length +
    lostReports.filter((item) => item.status === "pending_approval").length;
  const categoryRows = countBy([...scoped.foundItems, ...scoped.lostReports], (item) => item.category).slice(0, 6);
  const locationRows = countBy([...scoped.foundItems, ...scoped.lostReports], (item) => item.location).slice(0, 6);
  const foundStatusRows = statusBreakdown(scoped.foundItems, (status) => safeFoundStatus(status).label);
  const lostStatusRows = statusBreakdown(scoped.lostReports, lostStatusLabel);
  const monthRows = monthBreakdown(scoped);
  const maxMonthTotal = Math.max(...monthRows.map((item) => item.found + item.lost + item.returned), 1);
  const latestItems = sortRecent([
    ...scoped.foundItems.map((item) => ({ ...item, reportType: "found" })),
    ...scoped.lostReports.map((item) => ({ ...item, reportType: "lost" })),
  ]).slice(0, 5);
  const latestMatches = sortRecent(scoped.matches).slice(0, 5);
  const latestReturns = sortRecent(scoped.returnRecords).slice(0, 5);

  const metrics = isTeacher
    ? [
        { label: "ປະກາດພົບສີ່ງຂອງທັງໝົດ", value: foundItems.length, icon: Inbox, tone: "green" },
        { label: "ປະກາດສີ່ງຂອງສູນຫາຍທັງໝົດ", value: lostReports.length, icon: FileQuestion, tone: "amber" },
        { label: "ລໍຖ້າອະນຸມັດ", value: pendingApprovalCount, icon: ShieldCheck, tone: "blue" },
        { label: "ລາຍການທີ່ລະບົບແນະນຳ", value: recommendationCount, icon: GitCompare, tone: "purple" },
        { label: "ຄືນຂອງແລ້ວ", value: returnRecords.length, icon: ClipboardCheck, tone: "slate" },
      ]
    : [
        { label: "ສີ່ງຂອງສູນຫາຍຂອງຂ້ອຍ", value: scoped.lostReports.length, icon: FileQuestion, tone: "amber" },
        { label: "ສີ່ງຂອງທີ່ຂ້ອຍແຈ້ງພົບ", value: scoped.foundItems.length, icon: Inbox, tone: "green" },
        { label: "ລາຍການທີ່ຍັງເປີດ", value: openFoundCount + openLostCount, icon: PackageCheck, tone: "blue" },
        { label: "ລາຍການແນະນຳຂອງຂ້ອຍ", value: recommendationCount, icon: GitCompare, tone: "purple" },
        { label: "ຄືນສີ່ງຂອງແລ້ວ", value: scoped.returnRecords.length, icon: ClipboardCheck, tone: "slate" },
      ];

  return (
    <section className="reports-page" id="reports" aria-labelledby="reports-title">
      <div className="reports-hero">
        <div>
          <span className="reports-eyebrow">{isTeacher ? "Teacher Report" : "Student Report"}</span>
          <h2 id="reports-title">ລາຍງານ</h2>
          <p>
            {isTeacher
              ? "ສະຫຼຸບພາບລວມທັງລະບົບ ເພື່ອໃຫ້ອາຈານກວດວຽກ, ຕິດຕາມການຄືນສີ່ງຂອງ ແລະ ເບິ່ງສະຖິຕິຕາມປະເພດ/ສະຖານທີ່"
              : "ສະຫຼຸບສະຖານະສີ່ງຂອງລາຍການທີ່ເຈົ້າແຈ້ງໄວ້ ພ້ອມ Match ແລະ ການຄືນສີ່ງຂອງທີ່ກ່ຽວຂ້ອງ"}
          </p>
        </div>
        <div className="reports-hero-card">
          <TrendingUp size={22} />
          <span>{isTeacher ? "ຂໍ້ມູນລະດັບລະບົບ" : "ຂໍ້ມູນສ່ວນຕົວ"}</span>
          <strong>{numberText(scoped.foundItems.length + scoped.lostReports.length)} ລາຍການ</strong>
        </div>
      </div>

      <ReportMetricGrid metrics={metrics} />

      <div className="reports-layout">
        <ReportPanel icon={CalendarDays} title="ລາຍງານຕາມເດືອນ">
          {monthRows.length ? (
            <div className="reports-month-list">
              {monthRows.map((row) => (
                <article className="reports-month-row" key={row.label}>
                  <div>
                    <strong>{row.label}</strong>
                    <small>
                      ພົບ {numberText(row.found)} · ສູນຫາຍ {numberText(row.lost)} · ຄືນ {numberText(row.returned)}
                    </small>
                  </div>
                  <div className="reports-stacked-bar" aria-hidden="true">
                    <span className="found" style={{ width: `${(row.found / maxMonthTotal) * 100}%` }} />
                    <span className="lost" style={{ width: `${(row.lost / maxMonthTotal) * 100}%` }} />
                    <span className="returned" style={{ width: `${(row.returned / maxMonthTotal) * 100}%` }} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີຂໍ້ມູນລາຍງານ" description="ເມື່ອມີການແຈ້ງພົບ ຫຼື ແຈ້ງສູນຫາຍ ຂໍ້ມູນຈະສະແດງຢູ່ນີ້" />
          )}
        </ReportPanel>

        <ReportPanel icon={BarChart3} title="ສະຖານະລາຍການ">
          <div className="reports-two-column">
            <BreakdownList rows={foundStatusRows} title="ປະກາດພົບສີ່ງຂອງ" />
            <BreakdownList rows={lostStatusRows} title="ປະກາດສີ່ງຂອງສູນຫາຍ" />
          </div>
        </ReportPanel>

        <ReportPanel icon={PackageCheck} title="ປະເພດສິ່ງຂອງທີ່ພົບເຫັນຫຼາຍທີ່ສຸດ">
          <BreakdownList rows={categoryRows} showBars />
        </ReportPanel>

        <ReportPanel icon={MapPin} title="ສະຖານທີ່ທີ່ຖືກແຈ້ງຫຼາຍທີ່ສຸດ">
          <BreakdownList rows={locationRows} showBars />
        </ReportPanel>
      </div>

      <div className="reports-bottom-grid">
        <ReportPanel icon={GitCompare} title="Match ລ່າສຸດ">
          {latestMatches.length ? (
            <div className="reports-list">
              {latestMatches.map((match) => (
                <MatchReportRow key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີ Match" description="ເມື່ອ Weighted Matching ຄະແນນສູງພໍ ລາຍການຈະມາສະແດງຢູ່ນີ້" />
          )}
        </ReportPanel>

        <ReportPanel icon={ClipboardCheck} title="ການຄືນສີ່ງຂອງລ່າສຸດ">
          {latestReturns.length ? (
            <div className="reports-list">
              {latestReturns.map((record) => (
                <ReturnReportRow key={record.id} record={record} />
              ))}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີບັນທຶກຄືນສີ່ງຂອງ" description="ຫຼັງອາຈານກົດຄືນສີ່ງຂອງ ລາຍການຈະຖືກບັນທຶກໃນ return_records" />
          )}
        </ReportPanel>

        <ReportPanel icon={isTeacher ? Users : ShieldCheck} title={isTeacher ? "ຂໍ້ມູນຜູ້ໃຊ້" : "ສະຖານະບັນຊີ"}>
          {isTeacher ? (
            <TeacherUserReport members={members} />
          ) : (
            <StudentAccountReport currentUser={currentUser} recommendationCount={recommendationCount} />
          )}
        </ReportPanel>

        <ReportPanel icon={Inbox} title="ລາຍການລ່າສຸດ">
          {latestItems.length ? (
            <div className="reports-list">
              {latestItems.map((item) => (
                <RecentReportRow item={item} key={`${item.reportType}-${item.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState title="ຍັງບໍ່ມີລາຍການ" description="ເລີ່ມຈາກໜ້າແຈ້ງພົບເຫັນສີ່ງຂອງ ຫຼື ແຈ້ງສີ່ງຂອງສູນຫາຍ" />
          )}
        </ReportPanel>
      </div>
    </section>
  );
}

function ReportMetricGrid({ metrics }) {
  return (
    <div className="reports-metrics">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <article className={`reports-metric ${metric.tone}`} key={metric.label}>
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

function ReportPanel({ children, icon: Icon, title }) {
  return (
    <section className="reports-panel">
      <div className="reports-panel-heading">
        <h3>
          <Icon size={19} />
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function BreakdownList({ rows, showBars = false, title }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  if (!rows.length) {
    return <EmptyState title="ຍັງບໍ່ມີຂໍ້ມູນ" description="ຂໍ້ມູນຈະສະແດງຫຼັງຈາກມີການບັນທຶກລາຍການ" />;
  }

  return (
    <div className="reports-breakdown">
      {title && <h4>{title}</h4>}
      {rows.map((row) => (
        <div className="reports-breakdown-row" key={row.label}>
          <div>
            <span>{row.label}</span>
            <strong>{numberText(row.count)}</strong>
          </div>
          {showBars && (
            <i>
              <b style={{ width: `${Math.max(10, (row.count / max) * 100)}%` }} />
            </i>
          )}
        </div>
      ))}
    </div>
  );
}

function MatchReportRow({ match }) {
  return (
    <article className="reports-row">
      <div className="reports-score">
        <strong>{Math.round(match.matchScore)}</strong>
        <span>%</span>
      </div>
      <div>
        <span className="status-chip blue">ລະບົບແນະນຳ</span>
        <h4>{match.lost?.title || "ສີ່ງຂອງສູນຫາຍ"} ↔ {match.found?.title || "ສີ່ງຂອງທີ່ພົບ"}</h4>
        <p>{match.found?.location || match.lost?.location || "ບໍ່ລະບຸສະຖານທີ່"}</p>
        <small>{formatLaoDateTime(match.createdAt)}</small>
      </div>
    </article>
  );
}

function ReturnReportRow({ record }) {
  return (
    <article className="reports-row compact">
      <ClipboardCheck size={22} />
      <div>
        <h4>{record.claimRequestId || `Return #${record.id}`}</h4>
        <p>
          {record.returnedBy || "ອາຈານ"} → {record.receivedBy || "ຜູ້ຮັບຂອງ"}
        </p>
        <small>{record.returnLocation || "ຫ້ອງຄຸ້ມຄອງ"} · {formatLaoDateTime(record.returnedAt)}</small>
      </div>
    </article>
  );
}

function RecentReportRow({ item }) {
  const isFound = item.reportType === "found";
  const meta = isFound ? safeFoundStatus(item.status) : { label: lostStatusLabel(item.status), tone: "amber" };

  return (
    <article className="reports-row compact">
      {isFound ? <Inbox size={22} /> : <FileQuestion size={22} />}
      <div>
        <span className={`status-chip ${meta.tone}`}>{meta.label}</span>
        <h4>{item.title}</h4>
        <p>{item.location}</p>
        <small>{joinDetail(item.color, item.brand)} · {formatLaoDateTime(item.foundAt || item.lostAt)}</small>
      </div>
    </article>
  );
}

function TeacherUserReport({ members }) {
  const roleRows = countBy(members, (member) => roleLabel(member.role));
  const accountStatusRows = countBy(members, (member) => (member.isActive ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"));
  const activeCount = members.filter((member) => member.isActive).length;

  return (
    <div className="reports-user-summary">
      <div className="reports-user-total">
        <Users size={22} />
        <span>ຜູ້ໃຊ້ທັງໝົດ</span>
        <strong>{numberText(members.length)}</strong>
        <small>ເປີດໃຊ້ງານ {numberText(activeCount)} ບັນຊີ</small>
      </div>
      <div className="reports-two-column">
        <BreakdownList rows={roleRows} title="Role" />
        <BreakdownList rows={accountStatusRows} title="ສະຖານະບັນຊີ" />
      </div>
    </div>
  );
}

function StudentAccountReport({ currentUser, recommendationCount }) {
  return (
    <div className="reports-account">
      <div className="reports-account-avatar">
        {currentUser.avatarUrl ? <img alt="" src={currentUser.avatarUrl} /> : <ShieldCheck size={26} />}
      </div>
      <div>
        <h4>{currentUser.fullName}</h4>
        <p>{currentUser.studentCode || currentUser.username}</p>
      </div>
      <dl>
        <div>
          <dt>Role</dt>
          <dd>{roleLabel(currentUser.role)}</dd>
        </div>
        <div>
          <dt>ສະຖານະບັນຊີ</dt>
          <dd>{currentUser.isActive === false ? "ປິດໃຊ້ງານ" : "ໃຊ້ງານ"}</dd>
        </div>
        <div>
          <dt>ລາຍການທີ່ລະບົບແນະນຳ</dt>
          <dd>{numberText(recommendationCount)}</dd>
        </div>
      </dl>
    </div>
  );
}

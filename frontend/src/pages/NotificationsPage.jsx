import { useEffect, useState } from "react";
import { ArrowRight, Bell, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Search } from "lucide-react";
import { EmptyState } from "../components/common/FormControls.jsx";
import { formatLaoDateTime, normalizeText } from "../utils/ui.js";

const NOTIFICATIONS_PAGE_SIZE = 8;
const NOTIFICATION_SORT_OPTIONS = [
  { value: "latest", label: "ຫຼ້າສຸດກ່ອນ" },
  { value: "priority", label: "ສຳຄັນກ່ອນ" },
  { value: "oldest", label: "ເກົ່າສຸດກ່ອນ" },
];

const audienceCopy = {
  teacher: {
    eyebrow: "ແຈ້ງເຕືອນອາຈານ",
    title: "ແຈ້ງເຕືອນສຳລັບອາຈານ",
    description: "ສະແດງວຽກທີ່ຕ້ອງກວດ, ລາຍການລໍຖ້າອະນຸມັດ, ລາຍການໃກ້ຄຽງ ແລະ ການຄືນຂອງ",
  },
  student: {
    eyebrow: "ແຈ້ງເຕືອນນັກສຶກສາ",
    title: "ແຈ້ງເຕືອນສຳລັບນັກສຶກສາ",
    description: "ສະແດງສະຖານະລາຍການທີ່ທ່ານແຈ້ງໄວ້, ລາຍການໃກ້ຄຽງ ແລະ ການຄືນຂອງ",
  },
};

function notificationStats(notifications) {
  return {
    total: notifications.length,
    urgent: notifications.filter((item) => item.priority <= 1).length,
    workflow: notifications.filter((item) => item.href !== "#profile").length,
  };
}

function notificationDateValue(item) {
  const time = new Date(item.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareNotifications(a, b, sortMode) {
  if (sortMode === "priority") {
    return Number(a.priority ?? 9) - Number(b.priority ?? 9) || notificationDateValue(b) - notificationDateValue(a);
  }

  if (sortMode === "oldest") return notificationDateValue(a) - notificationDateValue(b);
  return notificationDateValue(b) - notificationDateValue(a) || Number(a.priority ?? 9) - Number(b.priority ?? 9);
}

export function NotificationsPage({ currentUser, notifications }) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const [page, setPage] = useState(1);
  const audience = currentUser.role === "teacher" ? "teacher" : "student";
  const copy = audienceCopy[audience];
  const stats = notificationStats(notifications);
  const query = normalizeText(search);
  const filteredNotifications = notifications.filter((notification) => {
    if (!query) return true;

    return normalizeText(
      `${notification.title} ${notification.description} ${notification.meta} ${notification.actionLabel}`,
    ).includes(query);
  });
  const sortedNotifications = [...filteredNotifications].sort((a, b) => compareNotifications(a, b, sortMode));
  const totalPages = Math.max(1, Math.ceil(sortedNotifications.length / NOTIFICATIONS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * NOTIFICATIONS_PAGE_SIZE;
  const visibleNotifications = sortedNotifications.slice(pageStart, pageStart + NOTIFICATIONS_PAGE_SIZE);
  const showPagination = totalPages > 1;

  useEffect(() => {
    setPage(1);
  }, [search, sortMode, notifications.length]);

  function goToPage(nextPage) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
    window.setTimeout(() => {
      document.getElementById("notifications-list-start")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <section className="notifications-page" id="notifications" aria-labelledby="notifications-title">
      <div className="notifications-hero">
        <div>
          <span className="notifications-eyebrow">{copy.eyebrow}</span>
          <h2 id="notifications-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
      </div>

      <div className="notifications-metrics">
        <NotificationMetric label="ທັງໝົດ" value={stats.total} />
        <NotificationMetric label="ສຳຄັນ" value={stats.urgent} />
        <NotificationMetric label="ໄປດຳເນີນການຕໍ່" value={stats.workflow} />
      </div>

      <div className="notifications-toolbar">
        <label className="approval-search">
          <Search size={18} />
          <input
            aria-label="ຄົ້ນຫາແຈ້ງເຕືອນ"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ຄົ້ນຫາຫົວຂໍ້, ລາຍລະອຽດ ຫຼື ລາຍການ..."
            type="search"
            value={search}
          />
        </label>
        <label className="approval-select">
          <span className="sr-only">ຈັດລຽງ</span>
          <select onChange={(event) => setSortMode(event.target.value)} value={sortMode}>
            {NOTIFICATION_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="notifications-layout">
        <div className="notifications-list" id="notifications-list-start" aria-live="polite">
          {visibleNotifications.length ? (
            visibleNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <EmptyState
              title="ຍັງບໍ່ມີແຈ້ງເຕືອນ"
              description="ເມື່ອມີລາຍການທີ່ຕ້ອງຕິດຕາມ ຂໍ້ມູນຈະສະແດງຢູ່ນີ້"
            />
          )}
          {showPagination && (
            <div className="pagination-controls notifications-pagination" aria-label="Notifications pagination">
              <button
                aria-label="Previous notifications page"
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
                aria-label="Next notifications page"
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

        <aside className="notifications-guide">
          <h3>ແຍກແຈ້ງເຕືອນຕາມຜູ້ໃຊ້</h3>
          <div>
            <strong>ອາຈານ</strong>
            <span>ອະນຸມັດປະກາດຂອງສູນຫາຍ/ຂອງທີ່ພົບ ແລະ ຕິດຕາມການຄືນຂອງ</span>
          </div>
          <div>
            <strong>ນັກສຶກສາ</strong>
            <span>ສະຖານະການປະກາດສິ່ງຂອງ, ລາຍການທີ່ອາດກົງກັນ ແລະ ການຄືນຂອງ</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

function NotificationMetric({ label, value }) {
  return (
    <article className="notification-metric">
      <strong>{Number(value).toLocaleString("lo-LA")}</strong>
      <span>{label}</span>
    </article>
  );
}

function NotificationCard({ notification }) {
  const isUrgent = notification.priority <= 1;

  return (
    <article className={`notification-card ${notification.tone}`}>
      <div className="notification-icon" aria-hidden="true">
        {isUrgent ? <Bell size={20} /> : <CheckCircle2 size={20} />}
      </div>
      <div className="notification-content">
        <div className="notification-title-row">
          <h3>{notification.title}</h3>
          <span className={`notification-priority ${isUrgent ? "urgent" : ""}`}>
            {isUrgent ? "ສຳຄັນ" : "ຕິດຕາມ"}
          </span>
        </div>
        <p>{notification.description}</p>
        <div className="notification-meta">
          <span>{notification.meta}</span>
          <span>
            <Clock3 size={14} />
            {formatLaoDateTime(notification.createdAt)}
          </span>
        </div>
      </div>
      <a className="notification-action" href={notification.href}>
        {notification.actionLabel}
        <ArrowRight size={16} />
      </a>
    </article>
  );
}

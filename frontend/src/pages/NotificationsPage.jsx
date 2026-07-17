import { ArrowRight, Bell, CheckCircle2, Clock3 } from "lucide-react";
import { EmptyState } from "../components/common/FormControls.jsx";
import { formatLaoDateTime } from "../utils/ui.js";

const audienceCopy = {
  teacher: {
    eyebrow: "ແຈ້ງເຕືອນອາຈານ",
    title: "ແຈ້ງເຕືອນສຳລັບອາຈານ",
    description: "ສະແດງວຽກທີ່ຕ້ອງກວດ, ລາຍການລໍຖ້າອະນຸມັດ, Match ແລະ ການຄືນຂອງ",
  },
  student: {
    eyebrow: "ແຈ້ງເຕືອນນັກສຶກສາ",
    title: "ແຈ້ງເຕືອນສຳລັບນັກສຶກສາ",
    description: "ສະແດງສະຖານະລາຍການທີ່ທ່ານແຈ້ງໄວ້, Match ທີ່ອາດກົງກັນ ແລະ ການຄືນຂອງ",
  },
};

function notificationStats(notifications) {
  return {
    total: notifications.length,
    urgent: notifications.filter((item) => item.priority <= 1).length,
    workflow: notifications.filter((item) => item.href !== "#profile").length,
  };
}

export function NotificationsPage({ currentUser, notifications }) {
  const audience = currentUser.role === "teacher" ? "teacher" : "student";
  const copy = audienceCopy[audience];
  const stats = notificationStats(notifications);

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

      <div className="notifications-layout">
        <div className="notifications-list" aria-live="polite">
          {notifications.length ? (
            notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <EmptyState
              title="ຍັງບໍ່ມີແຈ້ງເຕືອນ"
              description="ເມື່ອມີລາຍການທີ່ຕ້ອງຕິດຕາມ ຂໍ້ມູນຈະສະແດງຢູ່ນີ້"
            />
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

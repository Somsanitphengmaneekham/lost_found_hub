import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  ClipboardList,
  Database,
  FileBarChart2,
  FileQuestion,
  Inbox,
  LogIn,
  LogOut,
  PackageCheck,
  Settings,
  ShieldCheck,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { initials, roleLabel } from "../../utils/ui.js";
import { isAllowedImageUrl } from "../../utils/images.js";

function activeHrefFromHash(hash) {
  const href = hash || "#home";
  if (href === "#announcements") return "#home";
  if (href === "#register") return "#login";
  if (href === "#matches") return "#matching";
  if (href === "#review") return "#approval";
  return href;
}

export function Header({ currentUser, notificationCount = 0, onLogout }) {
  const [activeHref, setActiveHref] = useState(() => activeHrefFromHash(window.location.hash));
  const isTeacher = currentUser?.role === "teacher";
  const isStudent = currentUser?.role === "student";
  const safeAvatarUrl = currentUser && isAllowedImageUrl(currentUser.avatarUrl) ? currentUser.avatarUrl : "";
  const nav = currentUser
    ? [
        { label: "ໜ້າຫຼັກ", href: "#home", icon: Inbox },
        { label: "ແດຊບອດ", href: "#dashboard", icon: BarChart3 },
        ...(isStudent ? [{ label: "ລາຍການຂອງຂ້ອຍ", href: "#my-items", icon: ClipboardList }] : []),
        { label: "ລາຍງານ", href: "#reports", icon: FileBarChart2 },
        { label: "ແຈ້ງພົບຂອງ", href: "#found-form", icon: PackageCheck },
        { label: "ແຈ້ງຂອງສູນຫາຍ", href: "#lost-form", icon: FileQuestion },
        ...(isTeacher
          ? [
              { label: "ກວດສອບ", href: "#approval", icon: ShieldCheck },
              { label: "ຂໍ້ມູນພື້ນຖານ", href: "#master-data", icon: Database },
            ]
          : []),
        { label: "ໂປຣໄຟລ໌", href: "#profile", icon: Settings },
      ]
    : [];

  useEffect(() => {
    function syncActiveHref() {
      setActiveHref(activeHrefFromHash(window.location.hash));
    }

    syncActiveHref();
    window.addEventListener("hashchange", syncActiveHref);

    return () => window.removeEventListener("hashchange", syncActiveHref);
  }, []);

  return (
    <header className={`site-header ${currentUser ? "" : "public-header"}`}>
      <a className="brand" href="#home" aria-label="CampusFound ໜ້າຫຼັກ" onClick={() => setActiveHref("#home")}>
        <span className="brand-mark">
          <ShieldCheck size={28} />
        </span>
        <span>
          <strong>Lost and Found</strong>
          <small>ເວັບໄຊປະກາດສິ່ງຂອງສູນຫາຍ ແລະ ພົບເຫັນ</small>
        </span>
      </a>
      {nav.length > 0 && (
        <nav aria-label="ເມນູຫຼັກ">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <a
                className={activeHref === item.href ? "active" : ""}
                href={item.href}
                key={item.label}
                onClick={() => setActiveHref(item.href)}
              >
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
        </nav>
      )}
      <div className="user-area">
        {currentUser ? (
          <>
            <a
              className={`icon-button notification-link ${activeHref === "#notifications" ? "active" : ""}`}
              href="#notifications"
              aria-label="ໄປໜ້າແຈ້ງເຕືອນ"
              onClick={() => setActiveHref("#notifications")}
            >
              <Bell size={19} />
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount > 99 ? "99+" : notificationCount}</span>
              )}
            </a>
            <div className="avatar" aria-hidden="true">
              {safeAvatarUrl ? <img alt="" src={safeAvatarUrl} /> : initials(currentUser.fullName)}
            </div>
            <div className="user-meta">
              <strong>{currentUser.fullName}</strong>
              <small>{roleLabel(currentUser.role)} · {currentUser.username}</small>
            </div>
            <button className="logout-button" onClick={onLogout} type="button">
              <LogOut size={17} />
              ອອກຈາກລະບົບ
            </button>
            <a
              className={`icon-button header-profile-link ${activeHref === "#profile" ? "active" : ""}`}
              href="#profile"
              aria-label="ໄປໜ້າໂປຣໄຟລ໌"
              onClick={() => setActiveHref("#profile")}
            >
              {safeAvatarUrl ? <img className="header-profile-image" alt="" src={safeAvatarUrl} /> : <UserCircle size={24} />}
            </a>
          </>
        ) : (
          <>
            <a
              className={`header-auth-link ${activeHref === "#login" ? "active" : ""}`}
              href="#login"
              onClick={() => setActiveHref("#login")}
            >
              <LogIn size={17} />
              ເຂົ້າສູ່ລະບົບ
            </a>
            <a className="header-auth-link primary" href="#register" onClick={() => setActiveHref("#login")}>
              <UserPlus size={17} />
              ສະໝັກສະມາຊິກ
            </a>
          </>
        )}
      </div>
    </header>
  );
}

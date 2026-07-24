import { useEffect, useMemo, useState } from "react";

const ROUTE_ALIASES = {
  "": "home",
  announcements: "home",
  forgot: "login",
  "forgot-password": "login",
  register: "login",
  matches: "matching",
  review: "approval",
};

const PUBLIC_PAGES = new Set(["home", "announcement-detail", "login"]);
const STUDENT_PAGES = new Set([
  "home",
  "announcement-detail",
  "dashboard",
  "notifications",
  "reports",
  "found-form",
  "lost-form",
  "matching",
  "profile",
]);
const STUDENT_ONLY_PAGES = new Set(["my-items"]);
const TEACHER_PAGES = new Set(["approval", "master-data"]);

function pageFromHash(hash) {
  const page = String(hash ?? "").replace(/^#/, "") || "home";
  return ROUTE_ALIASES[page] ?? page;
}

function routeHash(page) {
  return `#${page}`;
}

function pageForRole(page, currentUser, canReview) {
  if (!currentUser) {
    return PUBLIC_PAGES.has(page) ? page : "login";
  }
  if (page === "login") return "home";
  if (STUDENT_ONLY_PAGES.has(page)) return currentUser.role === "student" ? page : "approval";
  if (STUDENT_PAGES.has(page)) return page;
  if (canReview && TEACHER_PAGES.has(page)) return page;
  return "home";
}

export function useRouter({ currentUser, canReview, setToast }) {
  const [activePage, setActivePage] = useState(() => pageFromHash(window.location.hash));

  const currentPage = useMemo(
    () => pageForRole(activePage, currentUser, canReview),
    [activePage, canReview, currentUser],
  );

  // Sync activePage เมื่อ hash เปลี่ยน
  useEffect(() => {
    function syncActivePage() {
      setActivePage(pageFromHash(window.location.hash));
    }
    syncActivePage();
    window.addEventListener("hashchange", syncActivePage);
    return () => window.removeEventListener("hashchange", syncActivePage);
  }, []);

  // Redirect เมื่อ role ไม่ตรงกับหน้า
  useEffect(() => {
    if (activePage !== currentPage) {
      if (!currentUser && currentPage === "login") {
        setToast("ກະລຸນາເຂົ້າລະບົບ ຫຼື ສະໝັກບັນຊີກ່ອນໃຊ້ງານໜ້ານີ້");
      }
      window.history.replaceState(null, "", routeHash(currentPage));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      setActivePage(currentPage);
      return;
    }
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 0);
  }, [activePage, currentPage, currentUser, setToast]);

  function navigateToPage(page) {
    const nextPage = pageFromHash(routeHash(page));
    const nextHash = routeHash(nextPage);
    setActivePage(nextPage);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 0);
  }

  return { currentPage, navigateToPage };
}

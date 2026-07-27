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

function parseHash(hash) {
  const raw = String(hash ?? "").replace(/^#/, "") || "home";
  const [pathPart, queryPart = ""] = raw.split("?");
  const page = ROUTE_ALIASES[pathPart] ?? pathPart;
  const params = Object.fromEntries(new URLSearchParams(queryPart));
  return { page, params };
}

function pageFromHash(hash) {
  return parseHash(hash).page;
}

function routeHash(page, params = {}) {
  const [pathPart, existingQuery = ""] = String(page ?? "home").replace(/^#/, "").split("?");
  const merged = {
    ...Object.fromEntries(new URLSearchParams(existingQuery)),
    ...params,
  };
  const query = new URLSearchParams(
    Object.entries(merged).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ).toString();
  return query ? `#${pathPart}?${query}` : `#${pathPart}`;
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
  const [routeState, setRouteState] = useState(() => parseHash(window.location.hash));

  const currentPage = useMemo(
    () => pageForRole(routeState.page, currentUser, canReview),
    [canReview, currentUser, routeState.page],
  );

  const routeParams = routeState.params;

  useEffect(() => {
    function syncActivePage() {
      setRouteState(parseHash(window.location.hash));
    }
    syncActivePage();
    window.addEventListener("hashchange", syncActivePage);
    return () => window.removeEventListener("hashchange", syncActivePage);
  }, []);

  useEffect(() => {
    if (routeState.page !== currentPage) {
      if (!currentUser && currentPage === "login") {
        setToast("ກະລຸນາເຂົ້າລະບົບ ຫຼື ສະໝັກບັນຊີກ່ອນໃຊ້ງານໜ້ານີ້");
      }
      const nextHash = routeHash(currentPage, routeState.params);
      window.history.replaceState(null, "", nextHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      setRouteState(parseHash(nextHash));
      return;
    }
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 0);
  }, [currentPage, currentUser, routeState.page, routeState.params, setToast]);

  function navigateToPage(page, params = {}) {
    const nextHash = routeHash(page, params);
    const parsed = parseHash(nextHash);
    setRouteState(parsed);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 0);
  }

  return { currentPage, navigateToPage, routeParams };
}

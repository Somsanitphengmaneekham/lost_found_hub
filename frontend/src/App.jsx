import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { statusMeta } from "./data.js";
import { buildNotifications } from "./utils/notifications.js";
import { lostStatusLabel, normalizeText } from "./utils/ui.js";
import { Header } from "./components/layout/Header.jsx";
import { Footer } from "./components/layout/Footer.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { AnnouncementDetailPage } from "./pages/AnnouncementDetailPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { FoundReportPage } from "./pages/FoundReportPage.jsx";
import { LostReportPage } from "./pages/LostReportPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { TeacherApprovalPage } from "./pages/TeacherApprovalPage.jsx";
import { MasterDataPage } from "./pages/MasterDataPage.jsx";
import { MatchingPage } from "./pages/MatchingPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { NotificationsPage } from "./pages/NotificationsPage.jsx";

// Custom hooks
import { useAppData } from "./hooks/useAppData.js";
import { useSession } from "./hooks/useSession.js";
import { useFoundPosts } from "./hooks/useFoundPosts.js";
import { useLostPosts } from "./hooks/useLostPosts.js";
import { useMasterData } from "./hooks/useMasterData.js";
import { useRouter } from "./hooks/useRouter.js";

const MATCH_THRESHOLD = 70;
const PUBLIC_FOUND_STATUSES = new Set(["approved", "matched"]);
const HOME_STATUS_ALL = "all";
const APPROVAL_STATUSES = new Set(["awaiting_handover", "pending_approval"]);
const REVIEW_ROLES = new Set(["teacher"]);

function activeMasterNames(items) {
  return items.filter((item) => item.isActive).map((item) => item.name);
}

function App() {
  const [toast, setToast] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeCategory, setActiveCategory] = useState("ທັງໝົດ");
  const [activeHomeStatus, setActiveHomeStatus] = useState(HOME_STATUS_ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);

  // ── Data layer ────────────────────────────────────────────────────────────
  const appData = useAppData();
  const {
    itemCategories,
    campusLocations,
    departmentList,
    memberList,
    setMemberList,
    foundItems,
    setFoundItems,
    lostReports,
    setLostReports,
    matchRows,
    returnRecords,
    appLoading,
    appError,
    masterDataLoading,
    masterDataError,
    loadAppData,
  } = appData;

  useEffect(() => {
    void loadAppData();
  }, [loadAppData]);

  // ── Session (Fix 1: localStorage persistence) ─────────────────────────────
  const session = useSession({ setMemberList, loadAppData, setToast, setLoginError });
  const { currentUser, setCurrentUser, login, logout, register, saveProfile, uploadProfileAvatar, uploadStudentCard } =
    session;

  // ── Routing ───────────────────────────────────────────────────────────────
  const canReview = currentUser ? REVIEW_ROLES.has(currentUser.role) : false;
  const { currentPage, navigateToPage } = useRouter({ currentUser, canReview, setToast });

  // ── Computed options ───────────────────────────────────────────────────────
  const categoryFormOptions = useMemo(() => activeMasterNames(itemCategories), [itemCategories]);
  const locationOptions = useMemo(() => activeMasterNames(campusLocations), [campusLocations]);
  const departmentOptions = useMemo(() => activeMasterNames(departmentList), [departmentList]);
  const categoryFilterOptions = useMemo(
    () => ["ທັງໝົດ", ...activeMasterNames(itemCategories)],
    [itemCategories],
  );
  const homeStatusFilterOptions = useMemo(
    () => [
      { label: "ທັງໝົດ", value: HOME_STATUS_ALL },
      { label: lostStatusLabel("published"), value: "published" },
      { label: statusMeta.approved.label, value: "approved" },
      { label: statusMeta.matched.label, value: "matched" },
    ],
    [],
  );

  // ── Found posts ────────────────────────────────────────────────────────────
  const foundPosts = useFoundPosts({ currentUser, foundItems, loadAppData, categoryFormOptions, setToast });
  const {
    foundForm,
    editingFoundId,
    appSaving,
    updateFound,
    submitFound,
    cancelEditFound,
    deleteFound,
    moveToApproval,
    approveFoundItem: approveFoundItemBase,
    rejectFoundItem,
    returnFoundItem,
  } = foundPosts;

  function startEditFound(id) {
    foundPosts.startEditFound(id, navigateToPage);
  }

  function approveFoundItem(id) {
    return approveFoundItemBase(id, setSelectedItemId);
  }

  // ── Lost posts ─────────────────────────────────────────────────────────────
  const lostPosts = useLostPosts({
    currentUser,
    lostReports,
    loadAppData,
    categoryFormOptions,
    navigateToPage,
    setToast,
  });
  const {
    lostForm,
    editingLostId,
    updateLost,
    submitLost,
    cancelEditLost,
    deleteLost,
    approveLostItem: approveLostItemBase,
    rejectLostItem,
  } = lostPosts;

  function startEditLost(id) {
    lostPosts.startEditLost(id, navigateToPage);
  }

  function approveLostItem(id) {
    return approveLostItemBase(id, setSelectedItemId);
  }

  // ── Master data ────────────────────────────────────────────────────────────
  const masterData = useMasterData({
    currentUser,
    itemCategories,
    campusLocations,
    departmentList,
    memberList,
    setFoundItems,
    setLostReports,
    setMemberList,
    setCurrentUser,
    loadAppData,
    setToast,
  });

  // ── Derived/computed state ─────────────────────────────────────────────────
  const homeItems = useMemo(() => {
    const query = normalizeText(searchTerm);
    const rows = [
      ...foundItems
        .filter((item) => PUBLIC_FOUND_STATUSES.has(item.status))
        .map((item) => ({ ...item, homeKey: `found-${item.id}`, homeType: "found", homeDate: item.foundAt })),
      ...lostReports
        .filter((report) => ["published", "matched"].includes(report.status))
        .map((report) => ({ ...report, homeKey: `lost-${report.id}`, homeType: "lost", homeDate: report.lostAt })),
    ];

    return rows
      .filter((item) => {
        const inCategory = activeCategory === "ທັງໝົດ" || item.category === activeCategory;
        const inStatus = activeHomeStatus === HOME_STATUS_ALL || item.status === activeHomeStatus;
        const inSearch =
          !query ||
          normalizeText(
            `${item.title} ${item.category} ${item.location} ${item.color} ${item.brand} ${item.description}`,
          ).includes(query);
        return inStatus && inCategory && inSearch;
      })
      .sort((a, b) => Number(new Date(b.homeDate || 0)) - Number(new Date(a.homeDate || 0)));
  }, [activeCategory, activeHomeStatus, foundItems, lostReports, searchTerm]);

  const statusCounts = useMemo(() => {
    return foundItems.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { awaiting_handover: 0, pending_approval: 0, approved: 0, matched: 0, returned: 0, rejected: 0 },
    );
  }, [foundItems]);

  const matchSummaries = useMemo(() => {
    return matchRows
      .map((match) => ({
        ...match,
        lost:
          match.lost ||
          lostReports.find((report) => report.id === match.lostPostId) || {
            id: match.lostPostId, title: "ຂອງສູນຫາຍ", location: "", status: "published",
          },
        found:
          match.found ||
          foundItems.find((item) => item.id === match.foundPostId) || {
            id: match.foundPostId, title: "ຂອງທີ່ພົບ", location: "", status: "approved",
          },
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [foundItems, lostReports, matchRows]);

  const teacherApprovalItems = useMemo(
    () => [
      ...foundItems.map((item) => ({
        ...item, approvalKey: `found-${item.id}`, kind: "found", personName: item.finder, eventAt: item.foundAt,
      })),
      ...lostReports.map((report) => ({
        ...report, approvalKey: `lost-${report.id}`, kind: "lost", personName: report.owner, eventAt: report.lostAt,
      })),
    ],
    [foundItems, lostReports],
  );

  const notifications = useMemo(
    () =>
      buildNotifications({
        currentUser, foundItems, lostReports, matches: matchSummaries, returnRecords,
      }),
    [currentUser, foundItems, lostReports, matchSummaries, returnRecords],
  );

  const approvalStats = useMemo(() => {
    return teacherApprovalItems.reduce(
      (acc, item) => {
        if (APPROVAL_STATUSES.has(item.status)) acc.waiting += 1;
        if (
          (item.kind === "found" && ["approved", "matched"].includes(item.status)) ||
          (item.kind === "lost" && ["published", "matched"].includes(item.status))
        ) {
          acc.approved += 1;
        }
        if (
          (item.kind === "found" && item.status === "returned") ||
          (item.kind === "lost" && ["closed", "resolved"].includes(item.status))
        ) {
          acc.returned += 1;
        }
        if (item.status === "rejected") acc.rejected += 1;
        return acc;
      },
      { waiting: 0, approved: 0, returned: 0, rejected: 0 },
    );
  }, [teacherApprovalItems]);

  const selectedAnnouncement = useMemo(() => {
    const selected = selectedItemId ? homeItems.find((item) => item.homeKey === selectedItemId) : null;
    if (selected) return selected;
    if (currentPage === "announcement-detail") return homeItems[0] ?? null;
    return null;
  }, [currentPage, homeItems, selectedItemId]);

  // ── Approval helpers ───────────────────────────────────────────────────────
  function approveApprovalItem(item) {
    return item.kind === "lost" ? approveLostItem(item.id) : approveFoundItem(item.id);
  }

  function rejectApprovalItem(item) {
    return item.kind === "lost" ? rejectLostItem(item.id) : rejectFoundItem(item.id);
  }

  function showAnnouncementDetail(homeKey) {
    setSelectedItemId(homeKey);
    navigateToPage("announcement-detail");
  }

  function showUsageGuide(event) {
    event.preventDefault();
    navigateToPage(currentUser ? "dashboard" : "home");
    window.setTimeout(() => {
      document.getElementById("how-to-use")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  // ── Page renderer ──────────────────────────────────────────────────────────
  function renderCurrentPage() {
    if (currentPage === "login") {
      return (
        <LoginPage
          appError={appError}
          appLoading={appLoading}
          departmentOptions={departmentOptions}
          error={loginError}
          onLogin={login}
          onRegister={register}
          onRetry={loadAppData}
        />
      );
    }

    if (currentPage === "announcement-detail") {
      return <AnnouncementDetailPage canReview={canReview} item={selectedAnnouncement} />;
    }

    if (currentPage === "dashboard") {
      return (
        <DashboardPage
          currentUser={currentUser}
          foundItems={foundItems}
          lostReports={lostReports}
          matches={matchSummaries}
          onApproveFound={approveFoundItem}
          onDeleteFound={deleteFound}
          onDeleteLost={deleteLost}
          onEditFound={startEditFound}
          onEditLost={startEditLost}
          onMoveToApproval={moveToApproval}
          onRejectFound={rejectFoundItem}
          returnRecords={returnRecords}
        />
      );
    }

    if (currentPage === "notifications") {
      return <NotificationsPage currentUser={currentUser} notifications={notifications} />;
    }

    if (currentPage === "reports") {
      return (
        <ReportsPage
          currentUser={currentUser}
          foundItems={foundItems}
          lostReports={lostReports}
          matches={matchSummaries}
          members={memberList}
          returnRecords={returnRecords}
        />
      );
    }

    if (currentPage === "found-form") {
      return (
        <FoundReportPage
          categoryOptions={categoryFormOptions}
          foundForm={foundForm}
          isEditing={Boolean(editingFoundId)}
          locationOptions={locationOptions}
          onCancel={cancelEditFound}
          onChange={updateFound}
          onSubmit={submitFound}
        />
      );
    }

    if (currentPage === "lost-form") {
      return (
        <LostReportPage
          categoryOptions={categoryFormOptions}
          isEditing={Boolean(editingLostId)}
          locationOptions={locationOptions}
          lostForm={lostForm}
          onCancel={cancelEditLost}
          onChange={updateLost}
          onSubmit={submitLost}
        />
      );
    }

    if (currentPage === "profile") {
      return (
        <ProfilePage
          key={currentUser.id}
          currentUser={currentUser}
          departmentOptions={departmentOptions}
          onSave={saveProfile}
          onUploadAvatar={uploadProfileAvatar}
          onUploadCard={uploadStudentCard}
        />
      );
    }

    if (canReview && currentPage === "approval") {
      return (
        <TeacherApprovalPage
          categoryOptions={categoryFilterOptions}
          items={teacherApprovalItems}
          onApprove={approveApprovalItem}
          onMoveToApproval={moveToApproval}
          onReject={rejectApprovalItem}
          onReturn={returnFoundItem}
          saving={appSaving}
          stats={approvalStats}
          students={memberList.filter((member) => member.role === "student" && member.isActive !== false)}
        />
      );
    }

    if (canReview && currentPage === "master-data") {
      return (
        <MasterDataPage
          campusLocations={campusLocations}
          currentUserId={currentUser.id}
          departmentList={departmentList}
          error={masterDataError}
          itemCategories={itemCategories}
          loading={masterDataLoading}
          members={memberList}
          onDeleteMember={masterData.removeMember}
          onReload={loadAppData}
          onRemoveCategory={masterData.removeCategory}
          onRemoveDepartment={masterData.removeDepartment}
          onRemoveLocation={masterData.removeLocation}
          onSaveCategory={masterData.saveCategory}
          onSaveDepartment={masterData.saveDepartment}
          onSaveLocation={masterData.saveLocation}
          onSaveMember={masterData.saveMember}
          onToggleCategoryActive={masterData.toggleCategoryActive}
          onToggleDepartmentActive={masterData.toggleDepartmentActive}
          onToggleLocationActive={masterData.toggleLocationActive}
          onToggleMemberActive={masterData.toggleMemberActive}
          saving={masterData.masterDataSaving}
        />
      );
    }

    if (currentPage === "matching") {
      return (
        <MatchingPage
          currentUser={currentUser}
          matches={matchSummaries}
          onViewFound={(foundPostId) => showAnnouncementDetail(`found-${foundPostId}`)}
        />
      );
    }

    return (
      <HomePage
        activeCategory={activeCategory}
        appError={appError}
        appLoading={appLoading}
        canReview={canReview}
        categoryFilterOptions={categoryFilterOptions}
        foundCount={foundItems.length}
        homeItems={homeItems}
        isAuthenticated={Boolean(currentUser)}
        activeStatus={activeHomeStatus}
        onCategoryChange={setActiveCategory}
        onClearToast={() => setToast("")}
        onReload={loadAppData}
        onSearch={setSearchTerm}
        onSelectItem={showAnnouncementDetail}
        onStatusChange={setActiveHomeStatus}
        returnedCount={returnRecords.length}
        searchTerm={searchTerm}
        selectedItemId={selectedItemId}
        statusFilterOptions={homeStatusFilterOptions}
        statusCounts={statusCounts}
        toast=""
      />
    );
  }

  return (
    <div className="app-shell">
      <Header currentUser={currentUser} notificationCount={notifications.length} onLogout={logout} />
      <GlobalToast onClear={() => setToast("")} toast={toast} />
      <main>{renderCurrentPage()}</main>
      <Footer currentUser={currentUser} onGuideClick={showUsageGuide} />
    </div>
  );
}

function GlobalToast({ onClear, toast }) {
  if (!toast) return null;

  return (
    <div className="toast" role="status">
      <Check size={18} />
      {toast}
      <button type="button" aria-label="ປິດຂໍ້ຄວາມ" onClick={onClear}>
        <X size={16} />
      </button>
    </div>
  );
}

// ── Pure utility functions (ไม่ใช่ hooks) ──────────────────────────────────
function containsSimilarDetail(lost, found) {
  const lostText = normalizeText(`${lost.brand} ${lost.uniqueMark} ${lost.description}`);
  const foundText = normalizeText(`${found.brand} ${found.uniqueMark} ${found.description}`);
  if (!lostText || !foundText) return false;
  return lostText.split(/\s+/u).some((word) => word.length >= 3 && foundText.includes(word));
}

function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return null;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86_400_000));
}

export default App;

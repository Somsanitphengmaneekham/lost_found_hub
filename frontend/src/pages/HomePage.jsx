import { useState } from "react";
import {
  Check,
  CircleHelp,
  ClipboardCheck,
  FileQuestion,
  Inbox,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import { statusMeta } from "../data.js";
import { EmptyState } from "../components/common/FormControls.jsx";
import { lostStatusLabel } from "../utils/ui.js";

export function HomePage({
  activeCategory,
  activeStatus,
  appError,
  appLoading,
  canReview,
  categoryFilterOptions,
  foundCount,
  homeItems,
  isAuthenticated,
  onCategoryChange,
  onClearToast,
  onReload,
  onSearch,
  onSelectItem,
  onStatusChange,
  returnedCount,
  searchTerm,
  selectedItemId,
  statusFilterOptions,
  statusCounts,
  toast,
}) {
  return (
    <>
      <section className="hero" id="home">
        <div className="hero-copy">
          <h1>
            <span>ເວັບໄຊປະກາດສີ່ງຂອງສູນຫາຍ ແລະ ພົບເຫັນ</span>
            <span>ພາຍໃນຄະນະວິທະຍາສາດທໍາມະຊາດ</span>
          </h1>
          <p>ຊ່ວຍໃຫ້ການຕາມຫາຂອງສູນຫາຍພາຍໃນຄະນະເປັນເລື່ອງງ່າຍ ແລະ ປອດໄພຂຶ້ນ</p>
          <div className="hero-actions">
            <a className="button button-primary" href={isAuthenticated ? "#found-form" : "#login"}>
              <Inbox size={18} />
              ແຈ້ງພົບຂອງ
            </a>
            <a className="button button-warm" href={isAuthenticated ? "#lost-form" : "#login"}>
              <CircleHelp size={18} />
              ແຈ້ງຂອງສູນຫາຍ
            </a>
          </div>
        </div>
      </section>

      <HomeSearchBar
        activeCategory={activeCategory}
        activeStatus={activeStatus}
        categoryOptions={categoryFilterOptions}
        onCategoryChange={onCategoryChange}
        onSearch={onSearch}
        onStatusChange={onStatusChange}
        searchTerm={searchTerm}
        statusOptions={statusFilterOptions}
      />

      {!isAuthenticated && <GuestHowToUse />}

      {appError && (
        <div className="master-data-alert app-api-alert" role="alert">
          <CircleHelp size={18} />
          <div>
            <strong>ເຊື່ອມຕໍ່ບໍ່ສຳເລັດ</strong>
            <p>{appError}</p>
          </div>
          <button className="outline-button" disabled={appLoading} onClick={onReload} type="button">
            <RotateCcw size={16} />
            ລອງໂຫຼດໃໝ່
          </button>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button type="button" aria-label="ປິດຂໍ້ຄວາມ" onClick={onClearToast}>
            <X size={16} />
          </button>
        </div>
      )}

      <Announcements
        announcementItems={homeItems}
        canReview={canReview}
        isAuthenticated={isAuthenticated}
        onSelect={onSelectItem}
        selectedItemId={selectedItemId}
      />

      <HomeStats foundCount={foundCount} returnedCount={returnedCount} statusCounts={statusCounts} />
    </>
  );
}

const guestGuideSteps = [
  {
    icon: UserPlus,
    title: "ສະໝັກສະມາຊິກ",
    description: "ນັກສຶກສາລົງທະບຽນ ແລະ ອັບໂຫຼດຮູບບັດນັກສຶກສາແລ້ວເຂົ້າໃຊ້ງານໄດ້ທັນທີ.",
  },
  {
    icon: FileQuestion,
    title: "ແຈ້ງຂອງສູນຫາຍ",
    description: "ປ້ອນລາຍລະອຽດ ສະຖານທີ່ ເວລາ ແລະ ຮູບພາບເພື່ອໃຫ້ລະບົບຊ່ວຍກວດຫາ.",
  },
  {
    icon: Inbox,
    title: "ແຈ້ງພົບຂອງ",
    description: "ບັນທຶກຂໍ້ມູນສິ່ງຂອງທີ່ພົບ ແລະ ນຳສົ່ງໃຫ້ຫ້ອງຄຸ້ມຄອງ.",
  },
  {
    icon: ShieldCheck,
    title: "ລໍຖ້າອະນຸມັດ",
    description: "ອາຈານກວດສອບຂໍ້ມູນ ແລ້ວຈຶ່ງເຜີຍແຜ່ປະກາດ ຫຼື ອັບເດດສະຖານະ.",
  },
];

function GuestHowToUse() {
  return (
    <section className="how-to-section" id="how-to-use" aria-labelledby="how-to-title">
      <div className="how-to-head">
        <div>
          <span>ສຳລັບຜູ້ໃຊ້ໃໝ່</span>
          <h2 id="how-to-title">ວິທີໃຊ້</h2>
        </div>
        <a className="outline-button" href="#login">
          <ClipboardCheck size={16} />
          ເລີ່ມໃຊ້ງານ
        </a>
      </div>
      <div className="how-to-grid">
        {guestGuideSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article className="how-to-card" key={step.title}>
              <div className="how-to-number">{index + 1}</div>
              <Icon size={22} />
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HomeSearchBar({
  activeCategory,
  activeStatus,
  categoryOptions,
  onCategoryChange,
  onSearch,
  onStatusChange,
  searchTerm,
  statusOptions,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  function resetFilters() {
    onSearch("");
    onCategoryChange(categoryOptions[0] ?? "ທັງໝົດ");
    onStatusChange(statusOptions[0]?.value ?? "all");
  }

  return (
    <section className="home-search" aria-label="ຄົ້ນຫາລາຍການຂອງສູນຫາຍ">
      <label className="home-search-input">
        <Search size={21} />
        <input
          aria-label="ຄົ້ນຫາສີ່ງຂອງທີ່ພົບຫຼ້າສຸດ"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="ຄົ້ນຫາສິ່ງຂອງທີ່ສູນຫາຍ..."
          type="search"
          value={searchTerm}
        />
      </label>
      <label className="home-category-select">
        <span className="sr-only">ໝວດໝູ່</span>
        <select onChange={(event) => onCategoryChange(event.target.value)} value={activeCategory}>
          {categoryOptions.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>
      <button
        aria-controls="home-filter-panel"
        aria-expanded={filtersOpen}
        className={`filter-button ${filtersOpen ? "active" : ""}`}
        onClick={() => setFiltersOpen((current) => !current)}
        type="button"
      >
        <SlidersHorizontal size={19} />
        ໂຕກອງ
      </button>
      {filtersOpen && (
        <div className="home-filter-panel" id="home-filter-panel">
          <div className="home-filter-group">
            <span>ສະຖານະ</span>
            <div className="home-filter-chips">
              {statusOptions.map((status) => (
                <button
                  className={activeStatus === status.value ? "active" : ""}
                  key={status.value}
                  onClick={() => onStatusChange(status.value)}
                  type="button"
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
          <div className="home-filter-group">
            <span>ໝວດໝູ່ດ່ວນ</span>
            <div className="home-filter-chips">
              {categoryOptions.slice(0, 6).map((category) => (
                <button
                  className={activeCategory === category ? "active" : ""}
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <button className="home-filter-reset" onClick={resetFilters} type="button">
            ລ້າງໂຕກອງ
          </button>
        </div>
      )}
    </section>
  );
}

function Announcements({ announcementItems, canReview, isAuthenticated, onSelect, selectedItemId }) {
  return (
    <section className="recent-section" id="announcements" aria-labelledby="announcement-title">
      <div className="recent-heading">
        <div>
          <h2 id="announcement-title">ລາຍການປະກາດຫຼ້າສຸດ</h2>
          <p>ອັບເດດແບບຣຽວໄທມ໌ຈາກພາຍໃນຄະນະ</p>
        </div>
        <a href={canReview ? "#approval" : "#dashboard"}>ເບິ່ງທັງໝົດ</a>
      </div>
      <div className="recent-grid">
        {announcementItems.length ? (
          announcementItems.slice(0, 4).map((item, index) => {
            const isLost = item.homeType === "lost";
            const badgeLabel = isLost
              ? lostStatusLabel(item.status)
              : statusMeta[item.status]?.label ?? item.status;

            return (
              <article className={`found-card ${selectedItemId === item.homeKey ? "selected" : ""}`} key={item.homeKey}>
                <img src={item.image} alt={item.title} />
                <div className="found-card-body">
                  <span className={`found-badge ${isLost ? "lost" : index === 0 ? "fresh" : ""}`}>
                    {isLost ? "ຂອງສູນຫາຍ" : badgeLabel}
                  </span>
                  <h3>{item.title}</h3>
                  <p>
                    <MapPin size={14} />
                    {item.location}
                  </p>
                  <div className="found-card-footer">
                    <span>{item.date}</span>
                    <button onClick={() => onSelect(item.homeKey)} type="button">
                      ເບິ່ງລາຍລະອຽດ
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState title="ບໍ່ພົບປະກາດ" description="ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ເລືອກໝວດໝູ່ອື່ນ" />
        )}
      </div>
    </section>
  );
}

function HomeStats({ foundCount, returnedCount, statusCounts }) {
  const successRate = foundCount
    ? Math.round(((statusCounts.returned + statusCounts.matched) / foundCount) * 100)
    : 0;
  const waitingCount = statusCounts.awaiting_handover + statusCounts.pending_approval;
  const stats = [
    { label: "ລາຍການທີ່ແຈ້ງພົບ", value: foundCount.toLocaleString("lo-LA"), tone: "ink" },
    { label: "ອັດຕາການຄືນສີ່ງຂອງສຳເລັດ", value: `${successRate}%`, tone: "green" },
    { label: "ລາຍການລໍຖ້າກວດສອບ", value: waitingCount.toLocaleString("lo-LA"), tone: "ink" },
    { label: "ສົ່ງຄືນເຈົ້າຂອງແລ້ວ", value: returnedCount.toLocaleString("lo-LA"), tone: "blue" },
  ];

  return (
    <section className="home-stats" aria-label="ສະຖິຕິລະບົບຈັດການຂອງສູນຫາຍ">
      {stats.map((item) => (
        <div className={`home-stat ${item.tone}`} key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </section>
  );
}

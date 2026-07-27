import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  FileQuestion,
  ImageIcon,
  MapPin,
  Palette,
  ShieldCheck,
  Tag,
  UserRound,
} from "lucide-react";
import { imageForCategory, statusMeta } from "../data.js";
import { formatLaoDateTime, lostStatusLabel } from "../utils/ui.js";

function valueOrDash(value) {
  return String(value ?? "").trim() || "-";
}

function detailValue(...parts) {
  const values = parts.map((part) => String(part ?? "").trim()).filter(Boolean);
  return values.length ? values.join(" / ") : "ບໍ່ລະບຸ";
}

function itemImages(item) {
  const images = Array.isArray(item?.images) ? item.images.filter((image) => image?.src) : [];

  if (images.length) return images;
  if (item?.image) return [{ id: `${item.homeKey}-image`, name: item.title, src: item.image }];

  return [{ id: `${item?.homeKey ?? "announcement"}-fallback`, name: item?.title ?? "", src: imageForCategory(item?.category) }];
}

function itemDateTime(item, isLost) {
  const value = isLost ? item.lostAt : item.foundAt;
  const formatted = formatLaoDateTime(value);
  if (formatted !== "-") return formatted;

  return detailValue(item.date, item.time);
}

export function AnnouncementDetailPage({
  canViewMatches,
  claimRequests = [],
  currentUser,
  item,
  onClaimFound,
  onReportFound,
  onViewMatches,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [claimPanelOpen, setClaimPanelOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimConfirmIdentity, setClaimConfirmIdentity] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSaving, setClaimSaving] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const claimPanelRef = useRef(null);
  const isLost = item?.homeType === "lost";

  useEffect(() => {
    setActiveImageIndex(0);
    setClaimPanelOpen(false);
    setClaimMessage("");
    setClaimConfirmIdentity(false);
    setClaimError("");
    setClaimSubmitted(false);
  }, [item?.homeKey]);

  const images = useMemo(() => itemImages(item), [item]);
  const activeImage = images[activeImageIndex] ?? images[0];

  if (!item) return null;

  const statusLabel = isLost ? lostStatusLabel(item.status) : statusMeta[item.status]?.label ?? item.status;
  const reporterLabel = isLost ? "ຜູ້ແຈ້ງສູນຫາຍ" : "ຜູ້ແຈ້ງພົບ";
  const reporterName = isLost ? item.owner : item.finder;
  const contactText = isLost ? item.contact : "ຕິດຕໍ່ຜ່ານຫ້ອງຄຸ້ມຄອງ";
  const isClaimableFound = !isLost && ["approved", "matched"].includes(item.status);
  const isOwnFoundPost = Number(item.finderId) === Number(currentUser?.id);
  const existingClaim = !isLost && currentUser
    ? claimRequests.find(
        (claim) =>
          Number(claim.foundPostId) === Number(item.id) &&
          Number(claim.claimantId) === Number(currentUser.id) &&
          ["submitted", "under_review", "approved", "returned"].includes(claim.status),
      )
    : null;
  const hasActiveClaim = ["submitted", "under_review", "approved"].includes(existingClaim?.status);
  const canClaimFound =
    isClaimableFound &&
    currentUser?.role === "student" &&
    !isOwnFoundPost &&
    !hasActiveClaim &&
    existingClaim?.status !== "returned" &&
    !claimSubmitted;
  const detailFacts = [
    { icon: Tag, label: "ໝວດໝູ່", value: valueOrDash(item.category) },
    { icon: MapPin, label: isLost ? "ສະຖານທີ່ສູນຫາຍ" : "ສະຖານທີ່ພົບ", value: valueOrDash(item.location) },
    { icon: CalendarClock, label: isLost ? "ວັນເວລາທີ່ສູນຫາຍ" : "ວັນເວລາທີ່ພົບ", value: itemDateTime(item, isLost) },
    { icon: Palette, label: "ສີ / ຍີ່ຫໍ້", value: detailValue(item.color, item.brand) },
  ];

  async function handleClaimSubmit(event) {
    event.preventDefault();
    if (!canClaimFound) return;
    if (!claimConfirmIdentity) {
      setClaimError("ກະລຸນາຢືນຢັນວ່າລາຍການນີ້ເປັນຂອງທ່ານກ່ອນສົ່ງຄຳຂໍຮັບ");
      return;
    }
    setClaimError("");
    setClaimSaving(true);

    try {
      const result = await onClaimFound?.(item, claimMessage.trim());
      if (result) {
        setClaimPanelOpen(false);
        setClaimSubmitted(true);
        setClaimMessage("");
        setClaimConfirmIdentity(false);
      }
    } catch (error) {
      setClaimError(error.message || "ບໍ່ສາມາດສົ່ງຄຳຂໍຮັບໄດ້");
    } finally {
      setClaimSaving(false);
    }
  }

  function openClaimPanel() {
    setClaimPanelOpen(true);
    setClaimConfirmIdentity(false);
    setClaimError("");
    window.setTimeout(() => {
      claimPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function claimUnavailableText() {
    if (!currentUser) return "";
    if (currentUser.role !== "student") return "ຄຳຂໍຮັບເປີດໃຫ້ນັກສຶກສາເທົ່ານັ້ນ";
    if (isOwnFoundPost) return "ທ່ານເປັນຜູ້ແຈ້ງພົບລາຍການນີ້";
    if (existingClaim?.status === "returned") return "ລາຍການນີ້ບັນທຶກວ່າຮັບຄືນແລ້ວ";
    if (!isClaimableFound) return "ລາຍການນີ້ຍັງບໍ່ພ້ອມໃຫ້ຂໍຮັບ";
    return "";
  }

  return (
    <section className="announcement-detail-page" id="announcement-detail" aria-labelledby="announcement-detail-title">
      <div className="announcement-detail-head">
        <a className="detail-back-link" href="#home">
          <ArrowLeft size={18} />
          ກັບໄປໜ້າຫຼັກ
        </a>
        <span className={`detail-status-pill ${isLost ? "lost" : ""}`}>
          {isLost ? <CircleHelp size={16} /> : <CheckCircle2 size={16} />}
          {isLost ? "ຂອງສູນຫາຍ" : "ຂອງທີ່ພົບ"} · {statusLabel}
        </span>
      </div>

      <div className="announcement-detail-shell">
        <div className="detail-media-panel">
          {activeImage?.src ? (
            <img className="detail-main-image" src={activeImage.src} alt={activeImage.name || item.title} />
          ) : (
            <div className="detail-image-empty">
              <ImageIcon size={34} />
              <span>ບໍ່ມີຮູບພາບ</span>
            </div>
          )}

          {images.length > 1 && (
            <div className="detail-image-strip" aria-label="ຮູບພາບທັງໝົດ">
              {images.map((image, index) => (
                <button
                  className={index === activeImageIndex ? "active" : ""}
                  key={image.id ?? image.src}
                  onClick={() => setActiveImageIndex(index)}
                  type="button"
                >
                  <img src={image.src} alt={image.name || `${item.title} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <article className="detail-content-panel">
          <span className="detail-kicker">{isLost ? "ລາຍລະອຽດຂອງສູນຫາຍ" : "ລາຍລະອຽດຂອງທີ່ພົບ"}</span>
          <h2 id="announcement-detail-title">{item.title}</h2>

          <div className="detail-fact-grid">
            {detailFacts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div className="detail-fact" key={fact.label}>
                  <Icon size={18} />
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              );
            })}
          </div>

          <div className="detail-section-block">
            <h3>
              <FileQuestion size={18} />
              ລາຍລະອຽດ / ຈຸດສັງເກດ
            </h3>
            <p>{valueOrDash(item.description)}</p>
            <dl className="detail-compact-list">
              <div>
                <dt>ຈຸດສັງເກດສະເພາະ</dt>
                <dd>{valueOrDash(item.uniqueMark)}</dd>
              </div>
              <div>
                <dt>{reporterLabel}</dt>
                <dd>{valueOrDash(reporterName)}</dd>
              </div>
              <div>
                <dt>ຊ່ອງທາງຕິດຕໍ່</dt>
                <dd>{valueOrDash(contactText)}</dd>
              </div>
            </dl>
          </div>

          <div className="detail-action-panel">
            <ShieldCheck size={22} />
            <div>
              <h3>{isLost ? "ຖ້າທ່ານພົບສິ່ງນີ້" : "ຖ້າຄິດວ່າເປັນຂອງທ່ານ"}</h3>
              <p>
                {isLost
                  ? "ໃຫ້ແຈ້ງພົບຂອງ ແລະ ນຳສິ່ງຂອງໄປສົ່ງຫ້ອງຄຸ້ມຄອງ ເພື່ອໃຫ້ອາຈານກວດສອບ."
                  : "ກວດລາຍລະອຽດ, ຈຸດສັງເກດ ແລະ ຕິດຕໍ່ຫ້ອງຄຸ້ມຄອງເພື່ອຢືນຢັນກ່ອນຮັບຂອງ."}
              </p>
            </div>
          </div>

          <div className="detail-action-buttons">
            {isLost && (
              <button className="button button-primary" onClick={() => onReportFound?.(item)} type="button">
                <ClipboardCheck size={18} />
                ແຈ້ງວ່າພົບຂອງນີ້
              </button>
            )}
            {!isLost && !currentUser && (
              <a className="button button-primary" href="#login">
                <UserRound size={18} />
                ເຂົ້າລະບົບເພື່ອຂໍຮັບຂອງ
              </a>
            )}
            {canClaimFound && (
              <button
                className="button button-primary claim-open-button"
                onClick={openClaimPanel}
                type="button"
              >
                <ClipboardCheck size={18} />
                ເປີດຟອມຂໍຮັບສິ່ງຂອງ
              </button>
            )}
            {!isLost && currentUser && !canClaimFound && !hasActiveClaim && !claimSubmitted && (
              <span className="detail-muted-action">{claimUnavailableText()}</span>
            )}
            {canViewMatches && (
              <button className="outline-button" onClick={() => onViewMatches?.(item)} type="button">
                <UserRound size={18} />
                ເບິ່ງລາຍການໃກ້ຄຽງ
              </button>
            )}
          </div>

          {!isLost && (claimSubmitted || hasActiveClaim) && (
            <div className="claim-request-success" role="status">
              <CheckCircle2 size={18} />
              <div>
                <strong>ສົ່ງຄຳຂໍຮັບແລ້ວ</strong>
                <span>ອາຈານຈະໄດ້ຮັບແຈ້ງເຕືອນ. ກະລຸນາໄປຫ້ອງຄຸ້ມຄອງພ້ອມບັດນັກສຶກສາເພື່ອຢືນຢັນກ່ອນຮັບຂອງ.</span>
              </div>
            </div>
          )}

          {!isLost && claimPanelOpen && canClaimFound && (
            <form className="claim-request-form" onSubmit={handleClaimSubmit} ref={claimPanelRef}>
              <header className="claim-request-form-head">
                <span className="claim-request-form-eyebrow">ຟອມຂໍຮັບ · ປະກາດຂອງທີ່ພົບ</span>
                <strong>ຂໍຮັບສິ່ງຂອງ: {item.title}</strong>
                <p>
                  ຟອມນີ້ໃຊ້ສະເພາະການຂໍຮັບຂອງທີ່ພົບ — ບໍ່ແມ່ນການແຈ້ງພົບ ຫຼື ແຈ້ງສູນຫາຍ.
                  ອາຈານຈະກວດຕົວຕົນຂອງທ່ານທີ່ຫ້ອງຄຸ້ມຄອງກ່ອນສົ່ງຄືນ.
                </p>
              </header>

              <ol className="claim-request-steps">
                <li>ກວດລາຍລະອຽດປະກາດໃຫ້ກົງກັບຂອງຂອງທ່ານ</li>
                <li>ສົ່ງຄຳຂໍຮັບຜ່ານຟອມນີ້</li>
                <li>ນຳບັດນັກສຶກສາໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ</li>
              </ol>

              <label className="claim-request-field">
                <span>ຈຸດສັງເກດ / ຂໍ້ຄວາມເພີ່ມເຕີມ</span>
                <textarea
                  maxLength={1000}
                  onChange={(event) => setClaimMessage(event.target.value)}
                  placeholder="ເຊັ່ນ ມີຮອຍສະເພາະ, ສີເຄສ, ຫຼື ຈະໄປຫ້ອງຄຸ້ມຄອງເວລາໃດ..."
                  value={claimMessage}
                />
              </label>

              <label className="claim-request-confirm">
                <input
                  checked={claimConfirmIdentity}
                  onChange={(event) => setClaimConfirmIdentity(event.target.checked)}
                  type="checkbox"
                />
                <span>ຂ້ອຍຢືນຢັນວ່າລາຍການນີ້ເປັນຂອງຂ້ອຍ ແລະ ຈະນຳບັດນັກສຶກສາໄປຢືນຢັນ</span>
              </label>

              {claimError && <p className="claim-request-error">{claimError}</p>}
              <div className="claim-request-actions">
                <button className="outline-button" onClick={() => setClaimPanelOpen(false)} type="button">
                  ຍົກເລີກ
                </button>
                <button
                  className="button button-primary claim-submit-button"
                  disabled={claimSaving || !claimConfirmIdentity}
                  type="submit"
                >
                  <ClipboardCheck size={18} />
                  {claimSaving ? "ກຳລັງສົ່ງ..." : "ສົ່ງຄຳຂໍຮັບສິ່ງຂອງ"}
                </button>
              </div>
            </form>
          )}
        </article>
      </div>
    </section>
  );
}

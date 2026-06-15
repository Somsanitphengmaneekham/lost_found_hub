import { useEffect, useMemo, useState } from "react";
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

export function AnnouncementDetailPage({ canReview, item }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const isLost = item?.homeType === "lost";

  useEffect(() => {
    setActiveImageIndex(0);
  }, [item?.homeKey]);

  const images = useMemo(() => itemImages(item), [item]);
  const activeImage = images[activeImageIndex] ?? images[0];

  if (!item) return null;

  const statusLabel = isLost ? lostStatusLabel(item.status) : statusMeta[item.status]?.label ?? item.status;
  const reporterLabel = isLost ? "ຜູ້ແຈ້ງສູນຫາຍ" : "ຜູ້ແຈ້ງພົບ";
  const reporterName = isLost ? item.owner : item.finder;
  const contactText = isLost ? item.contact : "ຕິດຕໍ່ຜ່ານຫ້ອງຄຸ້ມຄອງ";
  const detailFacts = [
    { icon: Tag, label: "ໝວດໝູ່", value: valueOrDash(item.category) },
    { icon: MapPin, label: isLost ? "ສະຖານທີ່ສູນຫາຍ" : "ສະຖານທີ່ພົບ", value: valueOrDash(item.location) },
    { icon: CalendarClock, label: isLost ? "ວັນເວລາທີ່ສູນຫາຍ" : "ວັນເວລາທີ່ພົບ", value: itemDateTime(item, isLost) },
    { icon: Palette, label: "ສີ / ຍີ່ຫໍ້", value: detailValue(item.color, item.brand) },
  ];

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
            <a className="button button-primary" href={isLost ? "#found-form" : "#lost-form"}>
              {isLost ? <ClipboardCheck size={18} /> : <CircleHelp size={18} />}
              {isLost ? "ແຈ້ງວ່າພົບຂອງນີ້" : "ແຈ້ງຂອງສູນຫາຍຂອງຂ້ອຍ"}
            </a>
            {canReview && (
              <a className="outline-button" href="#matching">
                <UserRound size={18} />
                ໄປກວດສອບ Match
              </a>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

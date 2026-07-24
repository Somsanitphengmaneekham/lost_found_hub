import { Check, CircleHelp, ClipboardCheck, ImageOff, Phone, ShieldCheck } from "lucide-react";
import { ImageUploadField } from "../components/common/ImageUploadField.jsx";
import { LocationInput, SelectInput, TextArea, TextInput } from "../components/common/FormControls.jsx";

export function LostReportPage({ categoryOptions, isEditing, locationOptions, lostForm, onCancel, onChange, onSubmit }) {
  function updateDetails(value) {
    onChange("description", value);
    onChange("uniqueMark", value);
  }

  function toggleNoImage(checked) {
    onChange("noImage", checked);
  }

  return (
    <section className="lost-report-page" id="lost-form" aria-labelledby="lost-report-title">
      <div className="lost-report-head">
        <div>
          <h2 id="lost-report-title">{isEditing ? "ແກ້ໄຂຂໍ້ມູນຂອງສູນຫາຍ" : "ແຈ້ງຂອງສູນຫາຍ"}</h2>
          <p>
            ຖ້າເຈົ້າເຮັດສິ່ງຂອງສູນຫາຍໃນພື້ນທີ່ຄະນະ ກະລຸນາລະບຸລາຍລະອຽດດ້ານລຸ່ມ ເພື່ອໃຫ້ລະບົບຊ່ວຍກວດກັບລາຍການທີ່ມີຜູ້ເກັບໄດ້
          </p>
        </div>
        <aside className="lost-safe-note">
          <ShieldCheck size={18} />
          <div>
            <strong>ຂໍ້ມູນຂອງເຈົ້າປອດໄພ</strong>
            <p>ພວກເຮົາຈະໃຊ້ຂໍ້ມູນຕິດຕໍ່ຂອງທ່ານເພື່ອແຈ້ງເຕືອນເມື່ອພົບລາຍການທີ່ກົງກັນເທົ່ານັ້ນ</p>
          </div>
        </aside>
      </div>

      <div className="lost-report-layout">
        <form className="lost-report-form" onSubmit={onSubmit}>
          <div className="lost-form-grid">
            <TextInput
              label="ຊື່ສີ່ງຂອງສູນຫາຍ"
              onChange={(value) => onChange("title", value)}
              placeholder="ເຊັ່ນ ກະເປົາເງິນ, ກະແຈລົດ"
              required
              value={lostForm.title}
            />
            <SelectInput
              categoryOptions={categoryOptions}
              label="ໝວດໝູ່"
              onChange={(value) => onChange("category", value)}
              value={lostForm.category}
            />
            <LocationInput
              label="ສະຖານທີ່ທີ່ຄາດວ່າສູນຫາຍ"
              locationOptions={locationOptions}
              onChange={(value) => onChange("location", value)}
              value={lostForm.location}
            />
            <div className="lost-time-group">
              <TextInput
                label="ວັນທີ່ ທີ່ຄາດວ່າສູນຫາຍ"
                onChange={(value) => onChange("date", value)}
                type="date"
                value={lostForm.date ?? ""}
              />
              <TextInput
                label="ເວລາທີ່ຄາດວ່າສູນຫາຍ"
                onChange={(value) => onChange("time", value)}
                step="60"
                type="time"
                value={lostForm.time ?? ""}
              />
            </div>
          </div>

          <TextArea
            label="ລາຍລະອຽດ/ລັກສະນະເດັ່ນ"
            onChange={updateDetails}
            placeholder="ລະບຸສີ ຍີ່ຫໍ້ ຮອຍຕຳໜິ ຫຼື ຈຸດສັງເກດພິເສດທີ່ຊ່ວຍຢືນຢັນສິ່ງຂອງ"
            value={lostForm.description}
          />

          <div className="lost-optional-row">
            <TextInput
              label="ສີ"
              onChange={(value) => onChange("color", value)}
              placeholder="ເຊັ່ນ ດຳ, ເທົາ, ຟ້າ, ຂາວ"
              value={lostForm.color}
            />
            <TextInput
              label="ຍີ່ຫໍ້"
              onChange={(value) => onChange("brand", value)}
              placeholder="ເຊັ່ນ Apple, Samsung"
              value={lostForm.brand}
            />
          </div>

          <div className="lost-no-image-section">
            <label className="lost-no-image-toggle">
              <input
                checked={Boolean(lostForm.noImage)}
                onChange={(event) => toggleNoImage(event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>ບໍ່ມີຮູບພາບຂອງສິ່ງຂອງ</strong>
                <small>ເລືອກຕົວເລືອກນີ້ໄດ້ສະເພາະກໍລະນີຂອງສູນຫາຍທີ່ບໍ່ມີຮູບຈິງ</small>
              </span>
            </label>

            {lostForm.noImage ? (
              <div className="lost-no-image-note">
                <ImageOff size={22} />
                <div>
                  <strong>ໂພສນີ້ຈະຖືກສົ່ງໂດຍບໍ່ມີຮູບ</strong>
                  <p>ອາຈານຈະກວດລາຍລະອຽດ, ສະຖານທີ່ ແລະ ຂໍ້ມູນອື່ນໆກ່ອນອະນຸມັດ.</p>
                </div>
              </div>
            ) : (
              <ImageUploadField
                images={lostForm.images}
                label="ຮູບພາບສິ່ງຂອງ"
                onChange={(images) => onChange("images", images)}
              />
            )}
          </div>

          <div className="lost-form-actions">
            <button className="outline-button" onClick={onCancel} type="button">
              {isEditing ? "ຍົກເລີກແກ້ໄຂ" : "ຍົກເລີກ"}
            </button>
            <button className="button button-lost" type="submit">
              <ClipboardCheck size={17} />
              {isEditing ? "ບັນທຶກການແກ້ໄຂ" : "ຢືນຢັນການແຈ້ງຂອງສູນຫາຍ"}
            </button>
          </div>
        </form>

        <aside className="lost-report-side">
          <article className="lost-guide-card">
            <div className="lost-guide-image" aria-hidden="true" />
            <div className="lost-guide-body">
              <h3>ຄຳແນະນຳໃນການແຈ້ງ</h3>
              <p>
                <Check size={17} />
                ລະບຸລາຍລະອຽດໃຫ້ຊັດເຈນທີ່ສຸດ ເຊັ່ນ ຮອຍຂີດຂ່ວນ ຫຼື ສະຕິກເກີ
              </p>
              <p>
                <Check size={17} />
                ລະບຸສະຖານທີ່ຫຼ້າສຸດທີ່ຈື່ໄດ້ ເພື່ອໃຫ້ເຈົ້າໜ້າທີ່ກວດສອບໄດ້ງ່າຍຂຶ້ນ
              </p>
            </div>
          </article>

          <article className="lost-help-card">
            <div>
              <CircleHelp size={18} />
              <h3>ຕ້ອງການຄວາມຊ່ວຍເຫຼືອ?</h3>
            </div>
            <p>ຖ້າເຈົ້າພົບບັນຫາໃນການໃຊ້ງານ ຫຼື ຕ້ອງການສອບຖາມຂໍ້ມູນເພີ່ມເຕີມ</p>
            <a href="tel:021234567">
              <Phone size={16} />
              ຕິດຕໍ່ເຈົ້າໜ້າທີ່
            </a>
          </article>
        </aside>
      </div>
    </section>
  );
}

import { Check, CircleHelp, ClipboardCheck, PackageCheck, ShieldCheck } from "lucide-react";
import { ImageUploadField } from "../components/common/ImageUploadField.jsx";
import { LocationInput, SelectInput, TextArea, TextInput } from "../components/common/FormControls.jsx";

export function FoundReportPage({ categoryOptions, foundForm, isEditing, locationOptions, onCancel, onChange, onSubmit }) {
  return (
    <section className="lost-report-page found-report-page" id="found-form" aria-labelledby="found-report-title">
      <div className="lost-report-head">
        <div>
          <h2 id="found-report-title">{isEditing ? "ແກ້ໄຂຂໍ້ມູນຂອງທີ່ພົບ" : "ແຈ້ງພົບຂອງ"}</h2>
          <p>
            ຖ້າເຮົາພົບສິ່ງຂອງໃນພື້ນທີ່ຄະນະ ກະລຸນາບັນທຶກລາຍລະອຽດໃຫ້ຄົບ ແລະ ນຳສີ່ງຂອງນັ້ນໄປສົ່ງທີ່ຫ້ອງຄຸ້ມຄອງ
            ເພື່ອໃຫ້ອາຈານກວດສອບ ແລະ ອະນຸມັດກ່ອນເຜີຍແຜ່ເປັນປະກາດລົງໃນເວັບໄຊ
          </p>
        </div>
        <aside className="lost-safe-note found-safe-note">
          <ShieldCheck size={18} />
          <div>
            <strong>ປະກາດຈະສະແດງຫຼັງອະນຸມັດ</strong>
            <p>
              ຂໍ້ມູນສີ່ງຂອງທີ່ພົບຈະຢູ່ໃນສະຖານະລໍຖ້າອາຈານກວດສອບ ແລະ ອະນຸມັດກ່ອນຈຶ່ງສະແດງໃນໜ້າເວັບ
            </p>
          </div>
        </aside>
      </div>

      <div className="lost-report-layout">
        <form className="lost-report-form" onSubmit={onSubmit}>
          {!isEditing && foundForm.sourceLostTitle && (
            <div className="found-linked-lost-note">
              <ClipboardCheck size={20} />
              <div>
                <strong>ກຳລັງແຈ້ງພົບຈາກປະກາດສູນຫາຍ</strong>
                <p>
                  ລາຍການ: <b>{foundForm.sourceLostTitle}</b>
                  {foundForm.sourceLostLocation ? ` · ສູນຫາຍທີ່ ${foundForm.sourceLostLocation}` : ""}
                </p>
                <span>ລະບົບເຕີມຂໍ້ມູນບາງສ່ວນໃຫ້ແລ້ວ ແຕ່ຕ້ອງລະບຸສະຖານທີ່ພົບ, ເວລາ ແລະ ຮູບພາບຂອງຈິງ.</span>
              </div>
            </div>
          )}
          <div className="lost-form-grid">
            <TextInput
              label="ຊື່ຂອງທີ່ພົບ"
              onChange={(value) => onChange("title", value)}
              placeholder="ເຊັ່ນ ຫູຟັງ, ກະເປົາເງິນ, ກະແຈລົດ"
              required
              value={foundForm.title}
            />
            <SelectInput
              categoryOptions={categoryOptions}
              label="ໝວດໝູ່"
              onChange={(value) => onChange("category", value)}
              value={foundForm.category}
            />
            <LocationInput
              label="ສະຖານທີ່ພົບ"
              locationOptions={locationOptions}
              onChange={(value) => onChange("location", value)}
              value={foundForm.location}
            />
            <div className="lost-time-group">
              <TextInput
                label="ວັນທີ່ພົບ"
                onChange={(value) => onChange("date", value)}
                type="date"
                value={foundForm.date ?? ""}
              />
              <TextInput
                label="ເວລາ"
                onChange={(value) => onChange("time", value)}
                step="60"
                type="time"
                value={foundForm.time ?? ""}
              />
            </div>
          </div>

          <TextArea
            label="ລາຍລະອຽດ/ລັກສະນະເດັ່ນ"
            onChange={(value) => onChange("description", value)}
            placeholder="ລະບຸສະພາບສິ່ງຂອງ ຈຸດທີ່ພົບ ສີ ຍີ່ຫໍ້ ຫຼື ລາຍລະອຽດທີ່ຊ່ວຍໃຫ້ເຈົ້າຂອງຢືນຢັນໄດ້"
            value={foundForm.description}
          />

          <div className="lost-optional-row">
            <TextInput
              label="ສີ"
              onChange={(value) => onChange("color", value)}
              placeholder="ເຊັ່ນ ດຳ, ເທົາ, ແດງ, ຂາວ"
              value={foundForm.color}
            />
            <TextInput
              label="ຍີ່ຫໍ້"
              onChange={(value) => onChange("brand", value)}
              placeholder="ເຊັ່ນ Apple, Samsung, Oppo"
              value={foundForm.brand}
            />
          </div>

          <TextArea
            label="ຈຸດສັງເກດສະເພາະ"
            onChange={(value) => onChange("uniqueMark", value)}
            placeholder="ເຊັ່ນ ມີຮອຍແຕກ ມີສະຕິກເກີ ມີພວງກະແຈ ຫຼື ມີຂໍ້ຄວາມຂຽນໄວ້"
            value={foundForm.uniqueMark}
          />

          <ImageUploadField
            images={foundForm.images}
            label="ຮູບພາບຂອງທີ່ພົບ"
            onChange={(images) => onChange("images", images)}
          />

          <div className="lost-form-actions">
            <button className="outline-button" onClick={onCancel} type="button">
              {isEditing ? "ຍົກເລີກແກ້ໄຂ" : "ລ້າງຟອມ"}
            </button>
            <button className="button button-lost" type="submit">
              <PackageCheck size={17} />
              {isEditing ? "ບັນທຶກການແກ້ໄຂ" : "ບັນທຶກຂໍ້ມູນຂອງທີ່ພົບ"}
            </button>
          </div>
        </form>

        <aside className="lost-report-side">
          <article className="lost-guide-card found-guide-card">
            <div className="lost-guide-image found-guide-image" aria-hidden="true" />
            <div className="lost-guide-body">
              <h3>ຂັ້ນຕອນຫຼັງແຈ້ງພົບ</h3>
              <p>
                <Check size={17} />
                ເກັບສີ່ງຂອງໄວ້ໃນສະພາບເດີມ ແລະ ນຳໄປສົ່ງຫ້ອງຄຸ້ມຄອງໃຫ້ໄວທີ່ສຸດ
              </p>
              <p>
                <Check size={17} />
                ຫຼັງຈາກບັນທຶກແລ້ວ ລາຍການຈະເຂົ້າຄິວໃຫ້ອາຈານກວດສອບ ແລະ ອະນຸມັດ
              </p>
              <p>
                <Check size={17} />
                ລະບຸສີ ຍີ່ຫໍ້ ແລະ ຈຸດສັງເກດ ເພື່ອຊ່ວຍໃຫ້ລະບົບຫາເຄື່ອງທີ່ໃກ້ຄຽງ
              </p>
            </div>
          </article>

          <article className="lost-help-card found-help-card">
            <div>
              <CircleHelp size={18} />
              <h3>ເອົາສິ່ງຂອງໄປສົ່ງຢູ່ໃສ?</h3>
            </div>
            <p>ນຳສິ່ງຂອງທີ່ພົບໄປສົ່ງທີ່ຫ້ອງຄຸ້ມຄອງ ຫຼື ຈຸດຮັບຝາກທີ່ຄະນະກຳນົດ ແລ້ວໃຫ້ອາຈານກົດອະນຸມັດລາຍການ</p>
            <a href="#approval">
              <ClipboardCheck size={16} />
              ເບິ່ງຄິວລໍຖ້າອະນຸມັດ
            </a>
          </article>
        </aside>
      </div>
    </section>
  );
}

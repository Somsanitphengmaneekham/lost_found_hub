import { ImagePlus, X } from "lucide-react";
import { useId, useState } from "react";
import { IMAGE_ACCEPT, IMAGE_TYPE_ERROR, isAllowedImageFile } from "../../utils/images.js";

export const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function revokePreview(image) {
  if (image?.isLocalFile && typeof image.src === "string" && image.src.startsWith("blob:")) {
    URL.revokeObjectURL(image.src);
  }
}

export function ImageUploadField({ images = [], label, onChange }) {
  const inputId = useId();
  const safeImages = Array.isArray(images) ? images : [];
  const [uploadError, setUploadError] = useState("");
  const remainingSlots = Math.max(0, MAX_IMAGES - safeImages.length);
  const isFull = remainingSlots === 0;

  function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setUploadError("");

    if (!selectedFiles.length) return;

    if (isFull) {
      setUploadError(`ອັບໂຫຼດຮູບໄດ້ສູງສຸດ ${MAX_IMAGES} ຮູບ`);
      return;
    }

    const acceptedImages = [];
    const existingFileKeys = new Set(
      safeImages.filter((image) => image.file).map((image) => fileKey(image.file)),
    );

    for (const file of selectedFiles.slice(0, remainingSlots)) {
      if (!isAllowedImageFile(file)) {
        setUploadError(IMAGE_TYPE_ERROR);
        continue;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError("ຂະໜາດຮູບຕ້ອງບໍ່ເກີນ 8 MB");
        continue;
      }

      const key = fileKey(file);
      if (existingFileKeys.has(key)) continue;
      existingFileKeys.add(key);

      acceptedImages.push({
        id: `file-${Date.now()}-${acceptedImages.length}-${file.name}`,
        name: file.name,
        src: URL.createObjectURL(file),
        file,
        isLocalFile: true,
      });
    }

    if (selectedFiles.length > remainingSlots) {
      setUploadError(`ເລືອກໄດ້ອີກ ${remainingSlots} ຮູບ ລະບົບຈຶ່ງຮັບເອົາສະເພາະຮູບທຳອິດ`);
    }

    if (acceptedImages.length) {
      onChange([...safeImages, ...acceptedImages]);
    }
  }

  function removeImage(imageId) {
    const image = safeImages.find((item) => item.id === imageId);
    revokePreview(image);
    onChange(safeImages.filter((item) => item.id !== imageId));
  }

  return (
    <div className="lost-upload-group">
      <span>
        {label} <b>*</b>
      </span>

      <label className={`lost-upload-box ${isFull ? "is-disabled" : ""}`} htmlFor={inputId}>
        <ImagePlus size={32} />
        <strong>{isFull ? "ອັບໂຫຼດຮູບຄົບແລ້ວ" : "ຄລິກເພື່ອເລືອກຮູບພາບ"}</strong>
        <small>
          ຕ້ອງມີຢ່າງນ້ອຍ 1 ຮູບ, ສູງສຸດ {MAX_IMAGES} ຮູບ, ຮອງຮັບ JPG, PNG, WEBP
        </small>
        <input
          accept={IMAGE_ACCEPT}
          className="sr-only"
          disabled={isFull}
          id={inputId}
          multiple
          onChange={handleFileChange}
          type="file"
        />
      </label>

      <small className="image-url-hint">
        ເລືອກແລ້ວ {safeImages.length}/{MAX_IMAGES} ຮູບ
      </small>
      {uploadError && <p className="image-url-error">{uploadError}</p>}

      {safeImages.length > 0 && (
        <div className="report-image-preview-grid">
          {safeImages.map((image, index) => (
            <figure className="report-image-preview" key={image.id}>
              <img alt={`ຕົວຢ່າງຮູບທີ່ ${index + 1}`} src={image.src} />
              <figcaption>
                <span title={image.name}>{image.name}</span>
                <button aria-label="ລຶບຮູບນີ້" onClick={() => removeImage(image.id)} type="button">
                  <X size={15} />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

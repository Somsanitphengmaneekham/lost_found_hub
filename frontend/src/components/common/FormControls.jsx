import { useEffect, useRef, useState } from "react";
import { FileQuestion, Upload } from "lucide-react";

const OTHER_LOCATION_VALUE = "__other_location__";

export function FormGrid({ children }) {
  return <div className="form-grid">{children}</div>;
}

export function TextInput({ label, value, onChange, placeholder, type = "text", required = false, ...inputProps }) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        {...inputProps}
        value={value ?? ""}
      />
    </label>
  );
}

export function SelectInput({ categoryOptions, label, value, onChange }) {
  return (
    <label className="field">
      <span>
        {label}
        <b>*</b>
      </span>
      <select onChange={(event) => onChange(event.target.value)} value={value ?? ""}>
        {categoryOptions.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
    </label>
  );
}

export function LocationInput({ label, locationOptions, value, onChange }) {
  const [customMode, setCustomMode] = useState(false);
  const justSelectedOtherRef = useRef(false);
  const currentValue = value ?? "";
  const hasKnownLocation = locationOptions.includes(currentValue);
  const isCustomValue = Boolean(currentValue) && !hasKnownLocation;

  useEffect(() => {
    if (isCustomValue) {
      justSelectedOtherRef.current = false;
      setCustomMode(true);
      return;
    }

    if (hasKnownLocation) {
      justSelectedOtherRef.current = false;
      setCustomMode(false);
      return;
    }

    if (!currentValue && !justSelectedOtherRef.current) {
      setCustomMode(false);
    }
  }, [currentValue, hasKnownLocation, isCustomValue]);

  function handleSelect(nextValue) {
    if (nextValue === OTHER_LOCATION_VALUE) {
      justSelectedOtherRef.current = true;
      setCustomMode(true);
      onChange("");
      return;
    }

    justSelectedOtherRef.current = false;
    setCustomMode(false);
    onChange(nextValue);
  }

  function handleCustomInput(nextValue) {
    justSelectedOtherRef.current = false;
    onChange(nextValue);
  }

  const selectValue = customMode || isCustomValue ? OTHER_LOCATION_VALUE : currentValue;

  return (
    <label className="field location-field">
      <span>{label}</span>
      <select onChange={(event) => handleSelect(event.target.value)} value={selectValue}>
        <option value="">ກະລຸນາເລືອກສະຖານທີ່</option>
        {locationOptions.map((location) => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
        <option value={OTHER_LOCATION_VALUE}>ອື່ນໆ / ລະບຸເອງ</option>
      </select>
      {(customMode || isCustomValue) && (
        <input
          className="location-custom-input"
          onChange={(event) => handleCustomInput(event.target.value)}
          placeholder="ພິມສະຖານທີ່ເອງ..."
          type="text"
          value={currentValue}
        />
      )}
      <small className="field-helper">ເລືອກ “ອື່ນໆ” ຖ້າສະຖານທີ່ບໍ່ຢູ່ໃນລາຍການ</small>
    </label>
  );
}

export function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value ?? ""} />
    </label>
  );
}

export function UploadRow({ helper, label }) {
  return (
    <button className="upload-row" type="button">
      <Upload size={18} />
      <span>
        {label}
        <small>{helper}</small>
      </span>
    </button>
  );
}

export function Metric({ label, value }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ description, title }) {
  return (
    <div className="empty-state">
      <FileQuestion size={30} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

import { useEffect, useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { normalizeText } from "../../utils/ui.js";

const RESULT_LIMIT = 8;

function studentCode(student) {
  return student.studentCode || student.username || "-";
}

function studentLabel(student) {
  return `${student.fullName} · ${studentCode(student)}`;
}

export function StudentSearchCombobox({ itemTitle, onChange, students, value }) {
  const listboxId = useId();
  const selectedStudent = students.find((student) => Number(student.id) === Number(value));
  const [query, setQuery] = useState(() => (selectedStudent ? studentLabel(selectedStudent) : ""));
  const [open, setOpen] = useState(false);
  const normalizedQuery = normalizeText(query);

  useEffect(() => {
    setQuery(selectedStudent ? studentLabel(selectedStudent) : "");
  }, [selectedStudent]);

  const visibleStudents = useMemo(() => {
    const matches = normalizedQuery
      ? students.filter((student) =>
          normalizeText(
            `${student.fullName} ${student.username} ${student.studentCode ?? ""} ${student.email ?? ""}`,
          ).includes(normalizedQuery),
        )
      : students;

    return matches.slice(0, RESULT_LIMIT);
  }, [normalizedQuery, students]);

  function clearSelection() {
    setQuery("");
    onChange("");
    setOpen(true);
  }

  function selectStudent(student) {
    setQuery(studentLabel(student));
    onChange(String(student.id));
    setOpen(false);
  }

  return (
    <div
      className="student-search-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span className="student-search-label">ນັກສຶກສາຜູ້ຮັບຄືນ</span>
      <div className="student-search-input">
        <Search aria-hidden="true" size={16} />
        <input
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-label={`ຄົ້ນຫານັກສຶກສາຜູ້ຮັບຄືນສຳລັບ ${itemTitle}`}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="ຄົ້ນຫາຊື່ ຫຼື ລະຫັດນັກສຶກສາ"
          role="combobox"
          type="search"
          value={query}
        />
        {query ? (
          <button aria-label="ລ້າງນັກສຶກສາທີ່ເລືອກ" className="student-search-clear" onClick={clearSelection} type="button">
            <X size={15} />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul className="student-search-results" id={listboxId} role="listbox">
          {visibleStudents.length ? (
            visibleStudents.map((student) => (
              <li key={student.id} role="presentation">
                <button
                  aria-selected={Number(student.id) === Number(value)}
                  onClick={() => selectStudent(student)}
                  role="option"
                  type="button"
                >
                  <strong>{student.fullName}</strong>
                  <span>{studentCode(student)} · {student.username}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="student-search-empty">ບໍ່ພົບນັກສຶກສາຕາມຄຳຄົ້ນຫາ</li>
          )}
          {students.length > RESULT_LIMIT && !normalizedQuery ? (
            <li className="student-search-hint">ພິມຊື່ ຫຼື ລະຫັດເພື່ອຄົ້ນຫາໃຫ້ແຄບລົງ</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

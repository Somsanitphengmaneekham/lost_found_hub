function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeSheetName(name, usedNames) {
  const baseName = String(name || "Sheet")
    .replace(/[\[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Sheet";

  let sheetName = baseName;
  let index = 2;

  while (usedNames.has(sheetName)) {
    const suffix = ` ${index}`;
    sheetName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }

  usedNames.add(sheetName);
  return sheetName;
}

function cellType(value) {
  if (typeof value === "number" && Number.isFinite(value)) return "Number";
  return "String";
}

function cellXml(value, styleId = "") {
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";
  const type = cellType(value);
  const safeValue = type === "Number" ? value : escapeXml(value);
  return `<Cell${style}><Data ss:Type="${type}">${safeValue}</Data></Cell>`;
}

function rowXml(values, styleId = "") {
  return `<Row>${values.map((value) => cellXml(value, styleId)).join("")}</Row>`;
}

function sheetXml(sheet) {
  const header = rowXml(sheet.columns, "Header");
  const body = sheet.rows.map((row) => rowXml(sheet.columns.map((column) => row[column] ?? ""))).join("");

  return `
    <Worksheet ss:Name="${escapeXml(sheet.name)}">
      <Table>
        ${header}
        ${body}
      </Table>
    </Worksheet>`;
}

export function exportExcelWorkbook({ fileName, sheets }) {
  const usedNames = new Set();
  const normalizedSheets = sheets
    .filter((sheet) => Array.isArray(sheet.columns) && sheet.columns.length)
    .map((sheet) => ({
      ...sheet,
      name: normalizeSheetName(sheet.name, usedNames),
      rows: Array.isArray(sheet.rows) ? sheet.rows : [],
    }));

  const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#DDF4F0" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
    </Style>
  </Styles>
  ${normalizedSheets.map(sheetXml).join("")}
</Workbook>`;

  const blob = new Blob([workbookXml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName || "lost-found-report"}.xls`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

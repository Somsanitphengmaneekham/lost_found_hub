import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs", "ux-ui-wireframes-simple");

const W = 1360;
const H = 860;
const C = {
  bg: "#f6fafb",
  ink: "#102f38",
  muted: "#6b7d84",
  line: "#9ab5bf",
  softLine: "#d1e0e5",
  header: "#24564f",
  green: "#129b48",
  teal: "#0f817a",
  blue: "#1187dd",
  red: "#dd3d3d",
  yellow: "#ffd86b",
  white: "#ffffff",
  pale: "#eef7f8",
  paleGreen: "#e7f7ef",
  paleBlue: "#eaf4ff",
  paleYellow: "#fff8df",
  paleRed: "#fff0f0",
  gray: "#edf2f4",
};

const pages = [
  { id: "01", slug: "home", title: "Home", subtitle: "Public first page", role: "Guest / All users", nav: "Home", type: "home" },
  { id: "02", slug: "login-register", title: "Login & Register", subtitle: "Login and student-only registration", role: "Guest", nav: "", type: "auth" },
  { id: "03", slug: "dashboard", title: "Dashboard", subtitle: "Role-based summary after login", role: "Student / Teacher", nav: "Dashboard", type: "dashboard" },
  { id: "04", slug: "report-lost", title: "Report Lost Item", subtitle: "Student submits lost item for teacher approval", role: "Student", nav: "Report Lost", type: "lostForm" },
  { id: "05", slug: "report-found", title: "Report Found Item", subtitle: "Student submits found item and sends item to protection office", role: "Student", nav: "Report Found", type: "foundForm" },
  { id: "06", slug: "announcement-detail", title: "Announcement Detail", subtitle: "Deep item information page", role: "All users", nav: "Home", type: "detail" },
  { id: "07", slug: "notifications", title: "Notifications", subtitle: "Different messages for student and teacher", role: "Student / Teacher", nav: "Notifications", type: "notifications" },
  { id: "08", slug: "reports", title: "Reports", subtitle: "Report overview and charts", role: "Student / Teacher", nav: "Reports", type: "reports" },
  { id: "09", slug: "profile", title: "Profile", subtitle: "Personal data, avatar, identity card", role: "Student / Teacher", nav: "Profile", type: "profile" },
  { id: "10", slug: "approval", title: "Teacher Approval", subtitle: "Teacher checks lost/found posts before publishing", role: "Teacher only", nav: "Approval", type: "approval" },
  { id: "11", slug: "review-return", title: "Review & Return", subtitle: "Teacher changes item status and records return", role: "Teacher only", nav: "Review", type: "review" },
  { id: "12", slug: "matching", title: "Weighted Matching", subtitle: "Compare possible lost/found matches", role: "Teacher only", nav: "Matching", type: "matching" },
  { id: "13", slug: "master-data", title: "Master Data", subtitle: "Categories, locations, departments, users", role: "Teacher only", nav: "Master Data", type: "master" },
];

function e(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function tag(name, attrs, body = "") {
  const pairs = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}="${e(value)}"`)
    .join(" ");
  return body ? `<${name} ${pairs}>${body}</${name}>` : `<${name} ${pairs}/>`;
}

function rect(x, y, w, h, fill = C.white, stroke = C.line, rx = 8, sw = 2, extra = {}) {
  return tag("rect", { x, y, width: w, height: h, rx, fill, stroke, "stroke-width": sw, ...extra });
}

function line(x1, y1, x2, y2, stroke = C.line, sw = 2, extra = {}) {
  return tag("line", { x1, y1, x2, y2, stroke, "stroke-width": sw, ...extra });
}

function circle(cx, cy, r, fill = C.gray, stroke = C.line, sw = 2) {
  return tag("circle", { cx, cy, r, fill, stroke, "stroke-width": sw });
}

function text(x, y, value, opts = {}) {
  const { size = 18, weight = 600, fill = C.ink, anchor = "start" } = opts;
  return tag("text", {
    x,
    y,
    "font-family": "Segoe UI, Noto Sans Lao, Arial, sans-serif",
    "font-size": size,
    "font-weight": weight,
    fill,
    "text-anchor": anchor,
  }, e(value));
}

function pill(x, y, w, label, fill = C.paleGreen, color = C.teal) {
  return `${rect(x, y, w, 34, fill, "none", 17, 0)}${text(x + w / 2, y + 23, label, { size: 14, weight: 800, fill: color, anchor: "middle" })}`;
}

function input(x, y, w, label = "", fill = "#fbfdfe") {
  return `${label ? text(x, y - 10, label, { size: 14, weight: 700 }) : ""}${rect(x, y, w, 44, fill, C.line, 5)}${line(x + 15, y + 24, x + w - 15, y + 24, C.softLine, 2)}`;
}

function button(x, y, w, label, fill = C.green, color = C.white) {
  return `${rect(x, y, w, 48, fill, fill, 8)}${text(x + w / 2, y + 31, label, { size: 16, weight: 800, fill: color, anchor: "middle" })}`;
}

function imageBox(x, y, w, h, label = "Image") {
  return [
    rect(x, y, w, h, C.gray, C.softLine, 8),
    line(x + 18, y + h - 18, x + w - 18, y + 18, C.softLine, 2),
    line(x + 18, y + 18, x + w - 18, y + h - 18, C.softLine, 2),
    circle(x + w / 2, y + h / 2 - 12, 22, C.white, C.softLine, 2),
    text(x + w / 2, y + h / 2 + 38, label, { size: 14, weight: 700, fill: C.muted, anchor: "middle" }),
  ].join("");
}

function itemCard(x, y, w, h, title = "Item card", status = "Status") {
  return [
    rect(x, y, w, h, C.white, C.line, 8),
    imageBox(x + 14, y + 14, w - 28, 118, "photo"),
    text(x + 18, y + 158, title, { size: 18, weight: 900 }),
    text(x + 18, y + 186, "Location • Date", { size: 14, weight: 600, fill: C.muted }),
    pill(x + 18, y + h - 48, 96, status, C.paleYellow, C.ink),
    button(x + w - 124, y + h - 52, 104, "Detail", C.header, C.white),
  ].join("");
}

function table(x, y, w, h, rows = 5, cols = 4) {
  const parts = [rect(x, y, w, h, C.white, C.line, 8), rect(x, y, w, 44, C.pale, C.line, 8)];
  for (let c = 1; c < cols; c += 1) parts.push(line(x + (w / cols) * c, y, x + (w / cols) * c, y + h, C.softLine, 1));
  for (let r = 1; r <= rows; r += 1) parts.push(line(x, y + 44 + ((h - 44) / rows) * r, x + w, y + 44 + ((h - 44) / rows) * r, C.softLine, 1));
  return parts.join("");
}

function chartBars(x, y, w, h) {
  const vals = [0.45, 0.7, 0.35, 0.9, 0.56, 0.78];
  const gap = 16;
  const bw = (w - gap * (vals.length + 1)) / vals.length;
  return [
    rect(x, y, w, h, C.white, C.line, 8),
    ...vals.map((v, i) => rect(x + gap + i * (bw + gap), y + h - 24 - v * (h - 70), bw, v * (h - 70), i % 2 ? C.blue : C.teal, "none", 5, 0)),
    line(x + 24, y + h - 24, x + w - 24, y + h - 24, C.line, 2),
  ].join("");
}

function donut(x, y, r) {
  return [
    circle(x, y, r, C.paleBlue, C.blue, 16),
    tag("path", { d: `M ${x} ${y - r} A ${r} ${r} 0 1 1 ${x + r * 0.92} ${y + r * 0.38}`, fill: "none", stroke: C.green, "stroke-width": 18, "stroke-linecap": "round" }),
    circle(x, y, r - 28, C.white, "none", 0),
    text(x, y + 7, "85%", { size: 24, weight: 900, fill: C.ink, anchor: "middle" }),
  ].join("");
}

function header(page) {
  const nav = ["Home", "Dashboard", "Reports", "Report Found", "Report Lost", "Approval", "Profile"];
  const navItems = nav
    .map((n, i) => {
      const x = 470 + i * 105;
      const active = page.nav === n;
      return `${text(x, 70, n, { size: 14, weight: active ? 900 : 700, fill: active ? C.white : "#c9dddd", anchor: "middle" })}${active ? line(x - 35, 83, x + 35, 83, "#9cffb0", 4) : ""}`;
    })
    .join("");
  return [
    rect(0, 0, W, 96, C.header, C.header, 0, 0),
    text(38, 54, "Lost and Found", { size: 30, weight: 900, fill: C.white }),
    text(38, 80, `${page.id}. ${page.title}`, { size: 13, weight: 700, fill: "#d3e5e7" }),
    page.nav ? navItems : "",
    rect(1182, 28, 52, 42, "#356b64", "#7da29f", 8),
    text(1208, 56, "↪", { size: 22, fill: C.white, anchor: "middle" }),
    circle(1264, 49, 22, "#356b64", "#7da29f", 2),
    text(1264, 57, "•", { size: 36, fill: C.white, anchor: "middle" }),
  ].join("");
}

function titleBlock(page) {
  return [
    text(58, 138, page.title, { size: 34, weight: 900 }),
    text(60, 168, page.subtitle, { size: 16, weight: 600, fill: C.muted }),
    pill(1110, 126, 190, page.role, C.paleBlue, C.ink),
  ].join("");
}

function shell(page, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#102f38" flood-opacity="0.12"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
${header(page)}
${titleBlock(page)}
<g filter="url(#shadow)">${body}</g>
</svg>`;
}

function home() {
  return [
    rect(58, 195, 1244, 245, C.pale, C.line, 14),
    imageBox(82, 220, 410, 185, "Campus hero image"),
    text(535, 252, "Public landing area", { size: 26, weight: 900 }),
    text(535, 290, "New users quickly understand what this system does.", { size: 16, fill: C.muted }),
    button(535, 330, 150, "Report Found", C.green),
    button(705, 330, 150, "Report Lost", C.blue),
    rect(200, 410, 960, 64, C.white, C.line, 10),
    input(230, 420, 560, ""),
    rect(812, 420, 180, 44, C.white, C.line, 6),
    text(902, 448, "Category", { size: 15, fill: C.muted, anchor: "middle" }),
    button(1012, 418, 120, "Filter", C.white, C.ink),
    text(58, 540, "Latest announcements", { size: 26, weight: 900 }),
    itemCard(58, 570, 285, 220, "Phone", "Lost"),
    itemCard(373, 570, 285, 220, "Wallet", "Found"),
    itemCard(688, 570, 285, 220, "Keys", "Found"),
    rect(1010, 570, 292, 220, C.paleGreen, C.line, 8),
    text(1030, 605, "How to use", { size: 23, weight: 900 }),
    text(1030, 642, "1. Register or login", { size: 16, fill: C.muted }),
    text(1030, 672, "2. Report lost/found item", { size: 16, fill: C.muted }),
    text(1030, 702, "3. Teacher approves", { size: 16, fill: C.muted }),
    text(1030, 732, "4. Follow notification", { size: 16, fill: C.muted }),
  ].join("");
}

function auth() {
  return [
    rect(92, 210, 470, 430, C.white, C.line, 12),
    circle(170, 310, 52, C.paleBlue, C.blue, 3),
    text(250, 305, "Brand / welcome", { size: 28, weight: 900 }),
    text(250, 342, "Login to submit reports", { size: 16, fill: C.muted }),
    rect(620, 210, 640, 160, C.paleBlue, C.line, 12),
    text(650, 252, "Login form", { size: 24, weight: 900 }),
    input(650, 292, 250, "Username"),
    input(930, 292, 250, "Password"),
    button(650, 340, 530, "Login", C.green),
    rect(620, 410, 640, 330, C.white, C.line, 12),
    text(650, 452, "Student register only", { size: 24, weight: 900 }),
    input(650, 498, 250, "First name"),
    input(930, 498, 250, "Last name"),
    input(650, 580, 250, "Email"),
    input(930, 580, 250, "Student code"),
    rect(650, 650, 250, 64, C.paleYellow, C.line, 8),
    text(675, 688, "Upload student card", { size: 16, weight: 800 }),
    button(930, 658, 250, "Register", C.green),
    rect(92, 675, 470, 65, C.paleYellow, C.line, 8),
    text(122, 714, "Teacher account is created internally.", { size: 17, weight: 800, fill: C.ink }),
  ].join("");
}

function dashboard() {
  return [
    ...[0, 1, 2, 3].map((i) => {
      const labels = ["My lost", "My found", "Possible match", "Returned"];
      return `${rect(58 + i * 315, 205, 285, 116, C.white, C.line, 12)}${text(82 + i * 315, 248, labels[i], { size: 18, weight: 800 })}${text(82 + i * 315, 292, String([2, 1, 3, 0][i]), { size: 36, weight: 900, fill: i === 2 ? C.blue : C.teal })}`;
    }),
    rect(58, 355, 560, 360, C.white, C.line, 12),
    text(88, 400, "Student dashboard", { size: 24, weight: 900 }),
    table(88, 430, 500, 230, 4, 3),
    button(88, 678, 180, "Report lost", C.blue),
    button(288, 678, 180, "Report found", C.green),
    rect(650, 355, 652, 360, C.paleBlue, C.line, 12),
    text(680, 400, "Teacher dashboard", { size: 24, weight: 900 }),
    chartBars(680, 430, 300, 210),
    table(1010, 430, 250, 210, 4, 2),
    button(680, 678, 210, "Go to approval", C.teal),
    button(910, 678, 210, "Review returns", C.header),
  ].join("");
}

function reportForm(kind) {
  const isLost = kind === "lost";
  return [
    rect(58, 205, 800, 585, C.white, C.line, 12),
    text(88, 250, isLost ? "Lost item form" : "Found item form", { size: 25, weight: 900 }),
    input(88, 300, 340, "Item name"),
    input(468, 300, 340, "Category"),
    input(88, 390, 470, isLost ? "Expected lost location" : "Found location"),
    input(588, 390, 220, "Date / time"),
    rect(88, 482, 720, 110, C.white, C.line, 6),
    text(108, 522, "Description / color / brand / unique mark", { size: 16, fill: C.muted }),
    rect(88, 625, 720, 92, C.pale, C.line, 8, 2, { "stroke-dasharray": "8 8" }),
    text(448, 670, "Upload image files 1-3", { size: 20, weight: 900, fill: C.muted, anchor: "middle" }),
    button(520, 735, 130, "Cancel", C.white, C.ink),
    button(668, 735, 140, "Submit", isLost ? C.blue : C.green),
    rect(900, 205, 402, 210, isLost ? C.paleYellow : C.paleGreen, C.line, 12),
    text(930, 250, isLost ? "Lost flow" : "Found flow", { size: 24, weight: 900 }),
    text(930, 290, "1. Student submits", { size: 17, fill: C.muted }),
    text(930, 322, "2. Teacher verifies", { size: 17, fill: C.muted }),
    text(930, 354, "3. Post appears after approval", { size: 17, fill: C.muted }),
    rect(900, 455, 402, 260, C.white, C.line, 12),
    imageBox(930, 485, 342, 150, isLost ? "Example lost photo" : "Example found photo"),
    text(930, 675, isLost ? "Contact data is pulled from profile." : "Bring item to protection office.", { size: 17, weight: 800 }),
  ].join("");
}

function detail() {
  return [
    rect(58, 205, 535, 470, C.white, C.line, 12),
    imageBox(92, 238, 467, 300, "Large item photo"),
    ...[0, 1, 2].map((i) => imageBox(92 + i * 160, 560, 140, 86, "thumb")),
    rect(630, 205, 672, 470, C.white, C.line, 12),
    pill(660, 240, 130, "Published", C.paleGreen, C.teal),
    text(660, 300, "Item title", { size: 34, weight: 900 }),
    text(660, 345, "Category • Location • Date", { size: 18, fill: C.muted }),
    line(660, 378, 1260, 378, C.softLine, 2),
    text(660, 425, "Color / brand / unique mark", { size: 20, weight: 800 }),
    rect(660, 455, 600, 90, C.pale, C.softLine, 8),
    text(685, 505, "Full description", { size: 18, fill: C.muted }),
    rect(660, 575, 280, 60, C.paleYellow, C.line, 8),
    text(690, 612, "Privacy / safe contact note", { size: 17, weight: 800 }),
    button(980, 582, 280, "Action button", C.header),
  ].join("");
}

function notifications() {
  return [
    rect(58, 205, 760, 560, C.white, C.line, 12),
    text(88, 250, "Notification list", { size: 26, weight: 900 }),
    ...[0, 1, 2, 3, 4].map((i) => {
      const fills = [C.paleGreen, C.paleBlue, C.paleYellow, C.white, C.white];
      return `${rect(88, 285 + i * 88, 700, 68, fills[i], C.softLine, 8)}${circle(122, 319 + i * 88, 14, i < 2 ? C.green : C.blue, "none", 0)}${text(150, 313 + i * 88, ["Post approved", "Possible match", "Teacher review needed", "Identity verified", "Return completed"][i], { size: 18, weight: 800 })}${text(150, 338 + i * 88, "Short message + time + link", { size: 14, fill: C.muted })}`;
    }),
    rect(860, 205, 442, 250, C.paleGreen, C.line, 12),
    text(890, 250, "Student notifications", { size: 23, weight: 900 }),
    text(890, 292, "• Own post approved/rejected", { size: 17, fill: C.muted }),
    text(890, 325, "• Matching suggestion found", { size: 17, fill: C.muted }),
    text(890, 358, "• Item returned", { size: 17, fill: C.muted }),
    rect(860, 485, 442, 280, C.paleBlue, C.line, 12),
    text(890, 530, "Teacher notifications", { size: 23, weight: 900 }),
    text(890, 572, "• New post waiting approval", { size: 17, fill: C.muted }),
    text(890, 605, "• Identity card waiting review", { size: 17, fill: C.muted }),
    text(890, 638, "• Return record needed", { size: 17, fill: C.muted }),
  ].join("");
}

function reports() {
  return [
    rect(58, 205, 1244, 80, C.white, C.line, 12),
    input(88, 225, 260, "Date range"),
    input(378, 225, 260, "Category"),
    input(668, 225, 260, "Status"),
    button(1050, 222, 200, "Export / Print", C.header),
    ...[0, 1, 2, 3].map((i) => `${rect(58 + i * 315, 320, 285, 110, C.white, C.line, 12)}${text(84 + i * 315, 365, ["Lost", "Found", "Returned", "Pending"][i], { size: 18, weight: 800 })}${text(84 + i * 315, 405, ["24", "39", "18", "7"][i], { size: 34, weight: 900, fill: [C.blue, C.teal, C.green, "#bd7b00"][i] })}`),
    rect(58, 470, 610, 290, C.white, C.line, 12),
    text(88, 512, "Monthly chart", { size: 22, weight: 900 }),
    chartBars(88, 535, 520, 190),
    rect(700, 470, 602, 290, C.white, C.line, 12),
    text(730, 512, "Status/category summary", { size: 22, weight: 900 }),
    donut(840, 635, 74),
    table(960, 545, 290, 180, 4, 2),
  ].join("");
}

function profile() {
  return [
    rect(58, 205, 360, 540, C.white, C.line, 12),
    circle(238, 300, 70, C.teal, "none", 0),
    text(238, 312, "AV", { size: 30, weight: 900, fill: C.white, anchor: "middle" }),
    text(110, 410, "Full name", { size: 28, weight: 900 }),
    text(110, 448, "Role • Department", { size: 17, fill: C.muted }),
    line(110, 488, 366, 488, C.softLine, 2),
    text(110, 532, "Student/employee code", { size: 17, weight: 800 }),
    text(110, 582, "Identity status", { size: 17, weight: 800 }),
    button(110, 650, 210, "Change avatar", C.teal),
    rect(455, 205, 847, 315, C.white, C.line, 12),
    text(485, 250, "Edit profile information", { size: 25, weight: 900 }),
    input(485, 300, 240, "First name"),
    input(755, 300, 240, "Last name"),
    input(1025, 300, 240, "Phone"),
    input(485, 390, 360, "Email"),
    input(875, 390, 390, "Department"),
    button(1065, 455, 200, "Save", C.green),
    rect(455, 555, 400, 190, C.paleYellow, C.line, 12),
    text(485, 600, "Student card upload", { size: 22, weight: 900 }),
    rect(485, 628, 330, 64, C.white, C.line, 8, 2, { "stroke-dasharray": "8 8" }),
    text(650, 667, "Choose file + preview", { size: 16, anchor: "middle", fill: C.muted }),
    rect(890, 555, 412, 190, C.paleGreen, C.line, 12),
    text(920, 600, "Profile photo preview", { size: 22, weight: 900 }),
    imageBox(920, 625, 150, 86, "avatar"),
  ].join("");
}

function approval() {
  return [
    rect(58, 205, 1244, 80, C.white, C.line, 12),
    input(88, 225, 600, "Search item/member"),
    input(718, 225, 180, "Status"),
    pill(1035, 228, 220, "12 waiting", C.paleYellow, "#9a6700"),
    rect(58, 325, 760, 440, C.white, C.line, 12),
    text(88, 370, "Approval queue", { size: 26, weight: 900 }),
    ...[0, 1, 2].map((i) => `${rect(88, 405 + i * 112, 700, 86, i === 0 ? C.paleGreen : C.white, C.softLine, 8)}${imageBox(108, 420 + i * 112, 92, 56, "photo")}${text(222, 444 + i * 112, ["Lost phone", "Found wallet", "Lost keys"][i], { size: 19, weight: 900 })}${text(222, 470 + i * 112, "Student • Location • Time", { size: 14, fill: C.muted })}${button(610, 424 + i * 112, 80, "Approve", C.green)}${button(700, 424 + i * 112, 70, "Reject", C.red)}`),
    rect(850, 325, 452, 190, C.paleBlue, C.line, 12),
    text(880, 370, "Daily summary", { size: 24, weight: 900 }),
    text(880, 415, "Waiting: 12", { size: 18, fill: C.muted }),
    text(880, 448, "Approved: 45", { size: 18, fill: C.muted }),
    rect(850, 545, 452, 220, C.paleYellow, C.line, 12),
    text(880, 590, "Teacher checklist", { size: 24, weight: 900 }),
    text(880, 632, "• Check information", { size: 17, fill: C.muted }),
    text(880, 664, "• Check identity", { size: 17, fill: C.muted }),
    text(880, 696, "• Check item handover", { size: 17, fill: C.muted }),
  ].join("");
}

function review() {
  return [
    rect(58, 205, 1244, 82, C.white, C.line, 12),
    input(88, 226, 330, "Search"),
    input(448, 226, 220, "Status"),
    button(1040, 223, 210, "Return item", C.green),
    rect(58, 330, 360, 420, C.paleYellow, C.line, 12),
    text(88, 376, "Waiting return", { size: 24, weight: 900 }),
    itemCard(88, 410, 300, 240, "Matched phone", "Match"),
    rect(458, 330, 392, 420, C.white, C.line, 12),
    text(488, 376, "Status timeline", { size: 24, weight: 900 }),
    ...[0, 1, 2, 3].map((i) => `${circle(520, 430 + i * 70, 14, [C.blue, C.green, C.yellow, C.teal][i], "none", 0)}${i < 3 ? line(520, 444 + i * 70, 520, 486 + i * 70, C.softLine, 3) : ""}${text(550, 437 + i * 70, ["Submitted", "Approved", "Matched", "Returned"][i], { size: 18, weight: 800 })}`),
    rect(890, 330, 412, 420, C.paleGreen, C.line, 12),
    text(920, 376, "Return record form", { size: 24, weight: 900 }),
    input(920, 420, 330, "Returned by"),
    input(920, 505, 330, "Received by"),
    input(920, 590, 330, "Return location"),
    button(920, 675, 330, "Save returned status", C.green),
  ].join("");
}

function matching() {
  return [
    rect(58, 205, 1244, 86, C.paleBlue, C.line, 12),
    text(88, 255, "Matching score = category + location + date + color/detail", { size: 22, weight: 900 }),
    pill(1030, 230, 190, "Score ≥ 70%", C.paleGreen, C.teal),
    rect(58, 330, 540, 360, C.white, C.line, 12),
    text(88, 376, "Lost post", { size: 26, weight: 900 }),
    imageBox(88, 405, 190, 145, "lost photo"),
    text(310, 435, "Lost phone", { size: 25, weight: 900 }),
    text(310, 472, "Category / location / date", { size: 17, fill: C.muted }),
    table(88, 580, 470, 70, 1, 4),
    rect(762, 330, 540, 360, C.white, C.line, 12),
    text(792, 376, "Found post", { size: 26, weight: 900 }),
    imageBox(792, 405, 190, 145, "found photo"),
    text(1014, 435, "Found phone", { size: 25, weight: 900 }),
    text(1014, 472, "Category / location / date", { size: 17, fill: C.muted }),
    table(792, 580, 470, 70, 1, 4),
    line(608, 510, 752, 510, C.teal, 5),
    circle(680, 510, 55, C.paleGreen, C.teal, 5),
    text(680, 518, "82%", { size: 26, weight: 900, fill: C.teal, anchor: "middle" }),
    button(410, 725, 170, "Confirm", C.green),
    button(600, 725, 170, "Reject", C.red),
    button(790, 725, 170, "Returned", C.header),
  ].join("");
}

function master() {
  return [
    rect(58, 205, 1244, 70, C.white, C.line, 12),
    ...["Categories", "Locations", "Departments", "Users"].map((label, i) => `${rect(88 + i * 180, 222, 150, 38, i === 0 ? C.paleGreen : C.white, C.line, 6)}${text(163 + i * 180, 247, label, { size: 14, weight: 800, anchor: "middle", fill: i === 0 ? C.teal : C.muted })}`),
    rect(58, 315, 375, 430, C.paleGreen, C.line, 12),
    text(88, 362, "Add / edit record", { size: 24, weight: 900 }),
    input(88, 410, 290, "Name"),
    input(88, 500, 290, "Code / detail"),
    rect(88, 585, 28, 28, C.teal, C.teal, 4),
    text(130, 606, "Active in forms", { size: 17, weight: 800 }),
    button(88, 655, 180, "Save", C.green),
    rect(470, 315, 832, 430, C.white, C.line, 12),
    text(500, 362, "Record list", { size: 24, weight: 900 }),
    table(500, 395, 760, 280, 5, 5),
    button(970, 690, 90, "Edit", C.white, C.teal),
    button(1080, 690, 90, "Disable", C.white, C.ink),
    button(1190, 690, 70, "Delete", C.white, C.red),
  ].join("");
}

const renderers = {
  home,
  auth,
  dashboard,
  lostForm: () => reportForm("lost"),
  foundForm: () => reportForm("found"),
  detail,
  notifications,
  reports,
  profile,
  approval,
  review,
  matching,
  master,
};

function svgForPage(page) {
  return shell(page, renderers[page.type]());
}

function indexHtml() {
  const cards = pages
    .map((page) => {
      const name = `${page.id}-${page.slug}`;
      return `<article>
        <a href="./${name}.png"><img src="./${name}.png" alt="${e(page.title)}"></a>
        <h2>${page.id}. ${e(page.title)}</h2>
        <p>${e(page.subtitle)}</p>
        <p><a href="./${name}.png">PNG</a> · <a href="./${name}.svg">SVG</a></p>
      </article>`;
    })
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Simple UX/UI Wireframes</title>
  <style>
    body{margin:0;background:#f6fafb;color:#102f38;font-family:Segoe UI,Noto Sans Lao,Arial,sans-serif}
    header{background:#24564f;color:white;padding:30px 42px}
    h1{margin:0 0 8px;font-size:32px}
    main{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px;padding:32px 42px}
    article{background:white;border:1px solid #cbdde3;padding:14px;box-shadow:0 8px 24px rgba(16,47,56,.08)}
    img{display:block;width:100%;border:1px solid #d7e4e8;background:white}
    h2{font-size:18px;margin:14px 0 6px}
    p{margin:4px 0;color:#6b7d84}
    a{color:#0f817a;font-weight:800}
  </style>
</head>
<body>
  <header>
    <h1>Simple UX/UI Wireframes</h1>
    <p>Cleaner page-specific wireframes with less text and more visual structure.</p>
  </header>
  <main>${cards}</main>
</body>
</html>`;
}

async function renderPng(browser, svg, pngPath) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, { waitUntil: "load" });
  await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: W, height: H }, timeout: 120_000 });
  await page.close();
}

async function main() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const page of pages) {
      const name = `${page.id}-${page.slug}`;
      const svg = svgForPage(page);
      await fs.writeFile(path.join(outputDir, `${name}.svg`), svg, "utf8");
      await renderPng(browser, svg, path.join(outputDir, `${name}.png`));
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(outputDir, "index.html"), indexHtml(), "utf8");
  await fs.writeFile(
    path.join(outputDir, "README.md"),
    [
      "# Simple UX/UI Wireframes",
      "",
      "This is the revised wireframe set. It is intentionally less text-heavy and each page uses a different layout shape so it is easier for teachers to understand.",
      "",
      "Use PNG files in reports or slides. Use SVG files if a sharper editable image is needed.",
      "",
      ...pages.map((page) => `- ${page.id}-${page.slug}.png — ${page.title}`),
      "",
    ].join("\n"),
    "utf8",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

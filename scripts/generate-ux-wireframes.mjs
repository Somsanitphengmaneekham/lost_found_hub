import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs", "ux-ui-wireframes");

const WIDTH = 1200;
const HEIGHT = 900;
const COLORS = {
  ink: "#14323b",
  muted: "#5b7078",
  line: "#183946",
  lightLine: "#9bb7c2",
  header: "#24564f",
  soft: "#eef7f8",
  card: "#ffffff",
  blue: "#e9f2ff",
  green: "#e7f7ef",
  yellow: "#fff4d8",
  red: "#fff0f0",
  gray: "#f4f7f8",
};

const pages = [
  {
    id: "01",
    file: "guest-home",
    title: "Guest Home / ໜ້າຫຼັກກ່ອນ Login",
    route: "#home",
    role: "Guest",
    activeNav: "Home",
    loggedIn: false,
    sections: [
      { x: 60, y: 135, w: 1080, h: 250, label: "Hero section", lines: ["Faculty image background", "Website title + short intro", "Primary buttons: Report Found / Report Lost"], fill: COLORS.soft },
      { x: 130, y: 355, w: 940, h: 72, label: "Search + Filter bar", lines: ["Keyword search", "Category dropdown", "Filter button"], fill: COLORS.card },
      { x: 60, y: 465, w: 690, h: 260, label: "Latest public announcements", lines: ["Approved found posts", "Published lost posts", "Item card grid: image, title, location, date, status, detail button"], fill: COLORS.card },
      { x: 780, y: 465, w: 360, h: 260, label: "Short usage guide for new users", lines: ["1. Register / Login", "2. Report lost or found item", "3. Teacher verifies", "4. Follow notification"], fill: COLORS.green },
      { x: 60, y: 755, w: 1080, h: 70, label: "Footer", lines: ["Faculty contact + วิธีใช้งาน link"], fill: COLORS.gray },
    ],
  },
  {
    id: "02",
    file: "login-register",
    title: "Login & Student Register / ເຂົ້າລະບົບ ແລະ ສະໝັກ",
    route: "#login / #register",
    role: "Guest",
    activeNav: "",
    loggedIn: false,
    sections: [
      { x: 80, y: 135, w: 460, h: 160, label: "Brand block", lines: ["Lost and Found logo", "Welcome text", "Purpose of website"], fill: COLORS.card },
      { x: 590, y: 135, w: 530, h: 270, label: "Login form", lines: ["Username", "Password", "Login button", "Error message area"], fill: COLORS.blue },
      { x: 80, y: 435, w: 1040, h: 335, label: "Student register form", lines: ["Only students can register", "Name, surname, email, phone", "Department, student code", "Password + confirm password", "Upload student card image preview"], fill: COLORS.green },
      { x: 80, y: 795, w: 1040, h: 45, label: "Note", lines: ["Teacher accounts are created by protection office/admin, not by public register form"], fill: COLORS.yellow },
    ],
  },
  {
    id: "03",
    file: "dashboard",
    title: "Dashboard / ແດຊບອດ",
    route: "#dashboard",
    role: "Student / Teacher",
    activeNav: "Dashboard",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 1080, h: 86, label: "Role guide", lines: ["Student sees own report progress", "Teacher sees verification and return work summary"], fill: COLORS.green },
      { x: 60, y: 245, w: 250, h: 120, label: "KPI card", lines: ["My lost posts / pending"], fill: COLORS.card },
      { x: 330, y: 245, w: 250, h: 120, label: "KPI card", lines: ["My found posts / pending"], fill: COLORS.card },
      { x: 600, y: 245, w: 250, h: 120, label: "KPI card", lines: ["Matched suggestions"], fill: COLORS.card },
      { x: 870, y: 245, w: 270, h: 120, label: "KPI card", lines: ["Returned items"], fill: COLORS.card },
      { x: 60, y: 395, w: 525, h: 330, label: "Student activity list", lines: ["Own lost/found posts", "Status badge", "Edit/delete allowed before approval"], fill: COLORS.card },
      { x: 615, y: 395, w: 525, h: 330, label: "Teacher work list", lines: ["Pending approval", "Identity check", "Match/return shortcuts"], fill: COLORS.blue },
      { x: 60, y: 755, w: 1080, h: 70, label: "Help / วิธีใช้งานตามบทบาท", lines: ["Quick instruction cards for current role"], fill: COLORS.gray },
    ],
  },
  {
    id: "04",
    file: "report-lost",
    title: "Report Lost Item / ແຈ້ງຂອງສູນຫາຍ",
    route: "#lost-form",
    role: "Student",
    activeNav: "Report Lost",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 720, h: 80, label: "Page heading", lines: ["Explain that teacher must approve before publishing"], fill: COLORS.card },
      { x: 810, y: 135, w: 330, h: 80, label: "Privacy note", lines: ["Use registered contact data"], fill: COLORS.green },
      { x: 60, y: 245, w: 720, h: 500, label: "Lost item form", lines: ["Item name, category", "Expected lost location", "Date + time", "Description, color, brand, unique mark", "Upload 1-3 image files", "Cancel / Submit buttons"], fill: COLORS.card },
      { x: 810, y: 245, w: 330, h: 230, label: "Guide panel", lines: ["Describe details clearly", "Add photo evidence", "Status becomes pending approval"], fill: COLORS.yellow },
      { x: 810, y: 505, w: 330, h: 240, label: "Support panel", lines: ["Faculty/protection office contact"], fill: COLORS.green },
    ],
  },
  {
    id: "05",
    file: "report-found",
    title: "Report Found Item / ແຈ້ງພົບຂອງ",
    route: "#found-form",
    role: "Student",
    activeNav: "Report Found",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 720, h: 80, label: "Page heading", lines: ["Tell finder to send item to protection office"], fill: COLORS.card },
      { x: 810, y: 135, w: 330, h: 80, label: "Approval note", lines: ["Teacher approves before public post"], fill: COLORS.green },
      { x: 60, y: 245, w: 720, h: 500, label: "Found item form", lines: ["Item name, category", "Found location", "Date + time", "Description, color, brand, unique mark", "Upload 1-3 image files", "Submit found item"], fill: COLORS.card },
      { x: 810, y: 245, w: 330, h: 245, label: "After submit guide", lines: ["Bring item to protection office", "Teacher verifies", "Weighted matching runs"], fill: COLORS.yellow },
      { x: 810, y: 520, w: 330, h: 225, label: "Where to send item?", lines: ["Protection office / faculty receiving point"], fill: COLORS.green },
    ],
  },
  {
    id: "06",
    file: "announcement-detail",
    title: "Announcement Detail / ລາຍລະອຽດປະກາດ",
    route: "#announcement-detail",
    role: "Guest / Student / Teacher",
    activeNav: "Home",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 520, h: 420, label: "Image gallery", lines: ["Large selected image", "Thumbnail images 1-3"], fill: COLORS.card },
      { x: 610, y: 135, w: 530, h: 420, label: "Item information", lines: ["Title, status, type: lost/found", "Category, location, date/time", "Color, brand, unique mark", "Description"], fill: COLORS.card },
      { x: 60, y: 585, w: 520, h: 185, label: "Owner/finder safety note", lines: ["Show only safe contact flow", "No public sensitive identity"], fill: COLORS.yellow },
      { x: 610, y: 585, w: 530, h: 185, label: "Action area", lines: ["Student: view status / claim request", "Teacher: approve/reject/return shortcuts"], fill: COLORS.green },
    ],
  },
  {
    id: "07",
    file: "notifications",
    title: "Notifications / ແຈ້ງເຕືອນ",
    route: "#notifications",
    role: "Student / Teacher",
    activeNav: "Notifications",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 1080, h: 82, label: "Notification header", lines: ["Role-based notification summary", "Unread count"], fill: COLORS.card },
      { x: 60, y: 250, w: 700, h: 500, label: "Notification list", lines: ["Matched item found", "Post approved/rejected", "Return completed", "Identity verified", "Each row has timestamp + action link"], fill: COLORS.card },
      { x: 790, y: 250, w: 350, h: 235, label: "Student-only examples", lines: ["Your post is approved", "Possible matching found", "Item returned"], fill: COLORS.green },
      { x: 790, y: 515, w: 350, h: 235, label: "Teacher-only examples", lines: ["New post waiting approval", "Student card waiting review", "Return confirmation needed"], fill: COLORS.blue },
    ],
  },
  {
    id: "08",
    file: "reports",
    title: "Reports / ລາຍງານ",
    route: "#reports",
    role: "Student / Teacher",
    activeNav: "Reports",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 1080, h: 80, label: "Report filters", lines: ["Date range", "Category", "Status", "Export/print area"], fill: COLORS.card },
      { x: 60, y: 245, w: 255, h: 115, label: "KPI", lines: ["Lost count"], fill: COLORS.blue },
      { x: 335, y: 245, w: 255, h: 115, label: "KPI", lines: ["Found count"], fill: COLORS.blue },
      { x: 610, y: 245, w: 255, h: 115, label: "KPI", lines: ["Returned count"], fill: COLORS.green },
      { x: 885, y: 245, w: 255, h: 115, label: "KPI", lines: ["Pending count"], fill: COLORS.yellow },
      { x: 60, y: 390, w: 525, h: 300, label: "Charts", lines: ["Monthly lost/found chart", "Category breakdown"], fill: COLORS.card },
      { x: 615, y: 390, w: 525, h: 300, label: "Report table", lines: ["Status summary", "User/member summary", "Return records"], fill: COLORS.card },
      { x: 60, y: 720, w: 1080, h: 80, label: "Role difference", lines: ["Student sees own statistics; teacher sees faculty-wide statistics"], fill: COLORS.gray },
    ],
  },
  {
    id: "09",
    file: "profile",
    title: "Profile / ໂປຣໄຟລ໌",
    route: "#profile",
    role: "Student / Teacher",
    activeNav: "Profile",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 340, h: 520, label: "Profile card", lines: ["Avatar image / initials", "Full name", "Role + identity status", "Department", "Student/employee code"], fill: COLORS.card },
      { x: 430, y: 135, w: 710, h: 315, label: "Edit personal information", lines: ["First name, last name", "Email, phone", "Department", "Save profile"], fill: COLORS.card },
      { x: 430, y: 480, w: 340, h: 175, label: "Avatar upload", lines: ["Choose profile image file", "Preview before save"], fill: COLORS.green },
      { x: 800, y: 480, w: 340, h: 175, label: "Student card upload", lines: ["Student only", "Upload card for identity verification"], fill: COLORS.yellow },
      { x: 60, y: 690, w: 1080, h: 90, label: "Security note", lines: ["Teacher/admin verifies identity; contact data comes from registered profile"], fill: COLORS.gray },
    ],
  },
  {
    id: "10",
    file: "teacher-approval",
    title: "Teacher Approval / ອະນຸມັດ",
    route: "#approval",
    role: "Teacher only",
    activeNav: "Approval",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 720, h: 78, label: "Search + filter queue", lines: ["Search item / owner", "Status filter", "Sort latest"], fill: COLORS.card },
      { x: 810, y: 135, w: 330, h: 78, label: "Approval stats", lines: ["Waiting / approved / rejected"], fill: COLORS.blue },
      { x: 60, y: 245, w: 720, h: 500, label: "Pending approval cards", lines: ["Lost and found posts waiting", "Item image + details", "Approve / Reject buttons", "Found item handover verification"], fill: COLORS.card },
      { x: 810, y: 245, w: 330, h: 230, label: "Teacher checklist", lines: ["Check correct info", "Check identity", "Check item handover"], fill: COLORS.yellow },
      { x: 810, y: 505, w: 330, h: 240, label: "Decision result", lines: ["Approved post appears on public home", "Rejected post keeps reason/history"], fill: COLORS.green },
    ],
  },
  {
    id: "11",
    file: "review-status-return",
    title: "Review & Return Status / ກວດສອບ",
    route: "#review",
    role: "Teacher only",
    activeNav: "Review",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 1080, h: 80, label: "Review toolbar", lines: ["Filter by status", "Search item/member", "Show pending return and matched items"], fill: COLORS.card },
      { x: 60, y: 245, w: 515, h: 440, label: "Approved/matched item list", lines: ["Found items", "Lost posts", "Current status", "Detail action"], fill: COLORS.card },
      { x: 605, y: 245, w: 535, h: 440, label: "Status change panel", lines: ["Confirm match", "Reject match", "Mark returned to owner", "Record returned_by / received_by / location"], fill: COLORS.green },
      { x: 60, y: 720, w: 1080, h: 80, label: "Audit style note", lines: ["Used for teacher operation after approval, not for students"], fill: COLORS.gray },
    ],
  },
  {
    id: "12",
    file: "matching",
    title: "Weighted Matching / ຈັບຄູ່",
    route: "#matching",
    role: "Teacher only",
    activeNav: "Matching",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 1080, h: 86, label: "Matching summary", lines: ["Only scores >= 70% are suggested", "Score: category/location/date/color-detail"], fill: COLORS.blue },
      { x: 60, y: 250, w: 520, h: 445, label: "Lost item column", lines: ["Lost post info", "Owner", "Lost date/location", "Image preview"], fill: COLORS.card },
      { x: 620, y: 250, w: 520, h: 445, label: "Found item column", lines: ["Found post info", "Finder", "Found date/location", "Image preview"], fill: COLORS.card },
      { x: 60, y: 725, w: 1080, h: 70, label: "Teacher actions", lines: ["Confirm match / Reject match / Mark returned"], fill: COLORS.green },
    ],
  },
  {
    id: "13",
    file: "master-data",
    title: "Master Data Management / ຂໍ້ມູນພື້ນຖານ",
    route: "#master-data",
    role: "Teacher only",
    activeNav: "Master Data",
    loggedIn: true,
    sections: [
      { x: 60, y: 135, w: 1080, h: 86, label: "Master data tabs", lines: ["Item categories", "Locations", "Departments", "Users"], fill: COLORS.card },
      { x: 60, y: 250, w: 360, h: 470, label: "Add/Edit form", lines: ["Name/code/details", "Active checkbox", "Save button"], fill: COLORS.green },
      { x: 450, y: 250, w: 690, h: 470, label: "Data table/list", lines: ["Existing records", "Edit", "Enable/disable", "Delete where allowed"], fill: COLORS.card },
      { x: 60, y: 750, w: 1080, h: 65, label: "User management note", lines: ["Teacher can manage users and identity status; public register only creates student accounts"], fill: COLORS.yellow },
    ],
  },
];

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(value, maxChars = 34) {
  const words = String(value ?? "").split(/\s+/u);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
      continue;
    }
    if ((line + " " + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line += " " + word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function text(x, y, value, options = {}) {
  const {
    size = 18,
    weight = 500,
    fill = COLORS.ink,
    anchor = "start",
    family = "Noto Sans Lao, Segoe UI, Arial, sans-serif",
  } = options;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text>`;
}

function rect(x, y, w, h, options = {}) {
  const { fill = COLORS.card, stroke = COLORS.line, width = 2, radius = 0, dash = "" } = options;
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dashAttr}/>`;
}

function sectionBox(section) {
  const bodyLines = (section.lines ?? []).flatMap((line) => wrapText(line, Math.max(18, Math.floor(section.w / 16))));
  const parts = [
    rect(section.x, section.y, section.w, section.h, { fill: section.fill, radius: 4, stroke: COLORS.line }),
    text(section.x + 18, section.y + 34, section.label, { size: 18, weight: 800 }),
  ];
  bodyLines.slice(0, Math.floor((section.h - 48) / 24)).forEach((line, index) => {
    parts.push(text(section.x + 22, section.y + 66 + index * 24, `• ${line}`, { size: 15, weight: 500, fill: COLORS.muted }));
  });
  return parts.join("\n");
}

function browserHeader(page) {
  const navItems = page.loggedIn
    ? ["Home", "Dashboard", "Reports", "Report Found", "Report Lost", "Approval", "Profile"]
    : ["Home"];
  const nav = navItems
    .map((item, index) => {
      const x = 430 + index * 92;
      const active = item === page.activeNav;
      return [
        text(x, 82, item, { size: 13, weight: active ? 800 : 600, fill: active ? "#ffffff" : "#d5e4e6", anchor: "middle" }),
        active ? `<line x1="${x - 28}" y1="95" x2="${x + 28}" y2="95" stroke="#9cffb0" stroke-width="4"/>` : "",
      ].join("\n");
    })
    .join("\n");

  const rightButtons = page.loggedIn
    ? [
        rect(1048, 44, 34, 34, { fill: "#2f6760", stroke: "#a7c5c8", radius: 4 }),
        text(1065, 67, "🔔", { size: 18, anchor: "middle", fill: "#ffffff" }),
        rect(1090, 44, 34, 34, { fill: "#2f6760", stroke: "#a7c5c8", radius: 4 }),
        text(1107, 67, "↪", { size: 18, anchor: "middle", fill: "#ffffff" }),
        rect(1132, 44, 34, 34, { fill: "#2f6760", stroke: "#a7c5c8", radius: 4 }),
        text(1149, 67, "👤", { size: 17, anchor: "middle", fill: "#ffffff" }),
      ].join("\n")
    : [
        rect(986, 44, 78, 34, { fill: "#3d6965", stroke: "#a7c5c8", radius: 4 }),
        text(1025, 67, "Login", { size: 13, weight: 700, anchor: "middle", fill: "#ffffff" }),
        rect(1075, 44, 92, 34, { fill: "#d7f5e9", stroke: "#d7f5e9", radius: 4 }),
        text(1121, 67, "Register", { size: 13, weight: 700, anchor: "middle", fill: COLORS.ink }),
      ].join("\n");

  return [
    rect(40, 30, 1120, 80, { fill: COLORS.header, stroke: COLORS.header }),
    text(68, 72, "Lost and Found", { size: 25, weight: 900, fill: "#ffffff" }),
    text(68, 98, `${page.id}. ${page.title} · ${page.route}`, { size: 12, weight: 600, fill: "#d5e4e6" }),
    nav,
    rightButtons,
  ].join("\n");
}

function pageChrome(page) {
  return [
    rect(20, 20, WIDTH - 40, HEIGHT - 40, { fill: "#ffffff", stroke: COLORS.line, width: 2 }),
    browserHeader(page),
  ].join("\n");
}

function makeSvg(page) {
  const sections = page.sections.map(sectionBox).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#14323b" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f5fafb"/>
  ${pageChrome(page)}
  <g filter="url(#shadow)">
    ${sections}
  </g>
</svg>`;
}

function makeIndexHtml() {
  const cards = pages
    .map(
      (page) => `
        <article>
          <a href="./${page.id}-${page.file}.png"><img src="./${page.id}-${page.file}.png" alt="${escapeXml(page.title)}"/></a>
          <h2>${page.id}. ${escapeXml(page.title)}</h2>
          <p>${escapeXml(page.route)} · ${escapeXml(page.role)}</p>
          <p><a href="./${page.id}-${page.file}.svg">SVG</a> · <a href="./${page.id}-${page.file}.png">PNG</a></p>
        </article>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="lo">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lost and Found UX/UI Wireframes</title>
  <style>
    body { margin: 0; font-family: "Noto Sans Lao", "Segoe UI", Arial, sans-serif; background: #f5fafb; color: #14323b; }
    header { padding: 32px 40px 20px; background: #24564f; color: white; }
    h1 { margin: 0 0 8px; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 22px; padding: 28px 40px 48px; }
    article { background: white; border: 1px solid #bad0d6; padding: 14px; box-shadow: 0 8px 24px rgba(20,50,59,.08); }
    img { width: 100%; display: block; border: 1px solid #d4e2e6; background: white; }
    h2 { font-size: 18px; margin: 14px 0 6px; }
    p { margin: 4px 0; color: #5b7078; }
    a { color: #006b61; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>Lost and Found UX/UI Wireframes</h1>
    <p>Low-fidelity structure images for every major page.</p>
  </header>
  <main>${cards}</main>
</body>
</html>`;
}

async function renderPng(svgPath, pngPath, browser) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120_000);
  const svg = await fs.readFile(svgPath, "utf8");
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:white}svg{display:block}</style></head><body>${svg}</body></html>`,
    { waitUntil: "load" },
  );
  await page.screenshot({
    path: pngPath,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    timeout: 120_000,
  });
  await page.close();
}

async function main() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const page of pages) {
      const baseName = `${page.id}-${page.file}`;
      const svgPath = path.join(outputDir, `${baseName}.svg`);
      const pngPath = path.join(outputDir, `${baseName}.png`);
      await fs.writeFile(svgPath, makeSvg(page), "utf8");
      await renderPng(svgPath, pngPath, browser);
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(outputDir, "index.html"), makeIndexHtml(), "utf8");
  await fs.writeFile(
    path.join(outputDir, "README.md"),
    [
      "# Lost and Found UX/UI Wireframes",
      "",
      "This folder contains low-fidelity UX/UI structure images for the major pages of the Lost and Found website.",
      "",
      "Use the PNG files for reports or presentations. Use the SVG files if a sharper editable version is needed.",
      "",
      ...pages.map((page) => `- ${page.id}-${page.file}.png — ${page.title}`),
      "",
    ].join("\n"),
    "utf8",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

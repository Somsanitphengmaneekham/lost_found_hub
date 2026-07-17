import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const inputDir = path.join(rootDir, "docs", "ux-ui-wireframes-simple");
const outputDir = path.join(rootDir, "docs", "ux-ui-wireframes-lao");

const WIDTH = 1360;
const HEIGHT = 860;

const translations = new Map([
  ["Lost and Found", "ລະບົບຂອງເສຍ ແລະ ຂອງພົບເຫັນ"],
  ["01. Home", "01. ໜ້າຫຼັກ"],
  ["02. Login &amp; Register", "02. ເຂົ້າລະບົບ ແລະ ສະໝັກ"],
  ["03. Dashboard", "03. ແດຊບອດ"],
  ["04. Report Lost Item", "04. ແຈ້ງຂອງສູນຫາຍ"],
  ["05. Report Found Item", "05. ແຈ້ງພົບຂອງ"],
  ["06. Announcement Detail", "06. ລາຍລະອຽດປະກາດ"],
  ["07. Notifications", "07. ການແຈ້ງເຕືອນ"],
  ["08. Reports", "08. ລາຍງານ"],
  ["09. Profile", "09. ໂປຣໄຟລ໌"],
  ["10. Teacher Approval", "10. ໜ້າອະນຸມັດ"],
  ["11. Review &amp; Return", "11. ກວດສອບ ແລະ ສົ່ງຄືນ"],
  ["12. Weighted Matching", "12. ຈັບຄູ່ດ້ວຍຄະແນນ"],
  ["13. Master Data", "13. ຂໍ້ມູນພື້ນຖານ"],

  ["Home", "ໜ້າຫຼັກ"],
  ["Dashboard", "ແດຊບອດ"],
  ["Reports", "ລາຍງານ"],
  ["Report Found", "ແຈ້ງພົບຂອງ"],
  ["Report Lost", "ແຈ້ງຂອງສູນຫາຍ"],
  ["Approval", "ອະນຸມັດ"],
  ["Profile", "ໂປຣໄຟລ໌"],
  ["Login &amp; Register", "ເຂົ້າລະບົບ ແລະ ສະໝັກ"],
  ["Report Lost Item", "ແຈ້ງຂອງສູນຫາຍ"],
  ["Report Found Item", "ແຈ້ງພົບຂອງ"],
  ["Announcement Detail", "ລາຍລະອຽດປະກາດ"],
  ["Notifications", "ການແຈ້ງເຕືອນ"],
  ["Teacher Approval", "ໜ້າອະນຸມັດ"],
  ["Review &amp; Return", "ກວດສອບ ແລະ ສົ່ງຄືນ"],
  ["Weighted Matching", "ຈັບຄູ່ດ້ວຍຄະແນນ"],
  ["Master Data", "ຂໍ້ມູນພື້ນຖານ"],

  ["Public first page", "ໜ້າທຳອິດສຳລັບຜູ້ໃຊ້ທົ່ວໄປ"],
  ["Login and student-only registration", "ເຂົ້າລະບົບ ແລະ ສະໝັກໄດ້ສະເພາະນັກສຶກສາ"],
  ["Role-based summary after login", "ສະຫຼຸບຂໍ້ມູນຕາມບົດບາດຫຼັງເຂົ້າລະບົບ"],
  ["Student submits lost item for teacher approval", "ນັກສຶກສາແຈ້ງຂອງສູນຫາຍ ແລ້ວລໍຖ້າອາຈານອະນຸມັດ"],
  ["Student submits found item and sends item to protection office", "ນັກສຶກສາແຈ້ງພົບຂອງ ແລະ ນຳຂອງໄປສົ່ງຫ້ອງຄຸ້ມຄອງ"],
  ["Deep item information page", "ໜ້າສະແດງລາຍລະອຽດສິ່ງຂອງ"],
  ["Different messages for student and teacher", "ການແຈ້ງເຕືອນແຍກຕາມນັກສຶກສາ ແລະ ອາຈານ"],
  ["Report overview and charts", "ສະຫຼຸບລາຍງານ ແລະ ກຣາຟ"],
  ["Personal data, avatar, identity card", "ຂໍ້ມູນສ່ວນຕົວ ຮູບໂປຣໄຟລ໌ ແລະ ບັດນັກສຶກສາ"],
  ["Teacher checks lost/found posts before publishing", "ອາຈານກວດສອບກ່ອນເຜີຍແຜ່ປະກາດ"],
  ["Teacher changes item status and records return", "ອາຈານປ່ຽນສະຖານະ ແລະ ບັນທຶກການສົ່ງຄືນ"],
  ["Compare possible lost/found matches", "ປຽບທຽບລາຍການທີ່ອາດກົງກັນ"],
  ["Categories, locations, departments, users", "ໝວດໝູ່ ສະຖານທີ່ ພາກວິຊາ ແລະ ຜູ້ໃຊ້"],

  ["Guest / All users", "ຜູ້ເຂົ້າຊົມ / ຜູ້ໃຊ້ທຸກຄົນ"],
  ["Guest", "ຜູ້ເຂົ້າຊົມ"],
  ["Student / Teacher", "ນັກສຶກສາ / ອາຈານ"],
  ["Student", "ນັກສຶກສາ"],
  ["All users", "ຜູ້ໃຊ້ທຸກຄົນ"],
  ["Teacher only", "ສະເພາະອາຈານ"],

  ["Campus hero image", "ຮູບຫຼັກຂອງຄະນະ"],
  ["Public landing area", "ພື້ນທີ່ແນະນຳເວັບໄຊ"],
  ["New users quickly understand what this system does.", "ຜູ້ໃຊ້ໃໝ່ເຂົ້າໃຈວິທີໃຊ້ງານໄດ້ໄວ"],
  ["Category", "ໝວດໝູ່"],
  ["Filter", "ຕົວກອງ"],
  ["Latest announcements", "ປະກາດຫຼ້າສຸດ"],
  ["photo", "ຮູບພາບ"],
  ["Phone", "ໂທລະສັບ"],
  ["Wallet", "ກະເປົາເງິນ"],
  ["Keys", "ກະແຈ"],
  ["Location • Date", "ສະຖານທີ່ • ວັນທີ"],
  ["Lost", "ສູນຫາຍ"],
  ["Found", "ພົບເຫັນ"],
  ["Detail", "ລາຍລະອຽດ"],
  ["How to use", "ວິທີໃຊ້ງານ"],
  ["1. Register or login", "1. ສະໝັກ ຫຼື ເຂົ້າລະບົບ"],
  ["2. Report lost/found item", "2. ແຈ້ງຂອງສູນຫາຍ/ພົບຂອງ"],
  ["3. Teacher approves", "3. ອາຈານອະນຸມັດ"],
  ["4. Follow notification", "4. ຕິດຕາມການແຈ້ງເຕືອນ"],

  ["Brand / welcome", "ໂລໂກ້ / ຂໍ້ຄວາມຕ້ອນຮັບ"],
  ["Login to submit reports", "ເຂົ້າລະບົບເພື່ອແຈ້ງຂໍ້ມູນ"],
  ["Login form", "ຟອມເຂົ້າລະບົບ"],
  ["Username", "ຊື່ຜູ້ໃຊ້"],
  ["Password", "ລະຫັດຜ່ານ"],
  ["Login", "ເຂົ້າລະບົບ"],
  ["Student register only", "ສະໝັກໄດ້ສະເພາະນັກສຶກສາ"],
  ["First name", "ຊື່"],
  ["Last name", "ນາມສະກຸນ"],
  ["Email", "ອີເມວ"],
  ["Student code", "ລະຫັດນັກສຶກສາ"],
  ["Upload student card", "ອັບໂຫຼດບັດນັກສຶກສາ"],
  ["Register", "ສະໝັກ"],
  ["Teacher account is created internally.", "ບັນຊີອາຈານຖືກສ້າງໂດຍພາຍໃນເທົ່ານັ້ນ"],

  ["My lost", "ຂອງສູນຫາຍຂອງຂ້ອຍ"],
  ["My found", "ຂອງພົບເຫັນຂອງຂ້ອຍ"],
  ["Possible match", "ລາຍການອາດກົງກັນ"],
  ["Returned", "ສົ່ງຄືນແລ້ວ"],
  ["Student dashboard", "ແດຊບອດນັກສຶກສາ"],
  ["Report lost", "ແຈ້ງຂອງສູນຫາຍ"],
  ["Report found", "ແຈ້ງພົບຂອງ"],
  ["Teacher dashboard", "ແດຊບອດອາຈານ"],
  ["Go to approval", "ໄປໜ້າອະນຸມັດ"],
  ["Review returns", "ກວດການສົ່ງຄືນ"],

  ["Lost item form", "ຟອມແຈ້ງຂອງສູນຫາຍ"],
  ["Found item form", "ຟອມແຈ້ງພົບຂອງ"],
  ["Item name", "ຊື່ສິ່ງຂອງ"],
  ["Expected lost location", "ສະຖານທີ່ຄາດວ່າສູນຫາຍ"],
  ["Found location", "ສະຖານທີ່ພົບ"],
  ["Date / time", "ວັນທີ / ເວລາ"],
  ["Description / color / brand / unique mark", "ລາຍລະອຽດ / ສີ / ຍີ່ຫໍ້ / ຈຸດສັງເກດ"],
  ["Upload image files 1-3", "ອັບໂຫຼດຮູບພາບ 1-3 ຮູບ"],
  ["Cancel", "ຍົກເລີກ"],
  ["Submit", "ສົ່ງຂໍ້ມູນ"],
  ["Lost flow", "ຂັ້ນຕອນຂອງສູນຫາຍ"],
  ["Found flow", "ຂັ້ນຕອນຂອງພົບຂອງ"],
  ["1. Student submits", "1. ນັກສຶກສາສົ່ງຂໍ້ມູນ"],
  ["2. Teacher verifies", "2. ອາຈານກວດສອບ"],
  ["3. Post appears after approval", "3. ປະກາດສະແດງຫຼັງອະນຸມັດ"],
  ["Example lost photo", "ຕົວຢ່າງຮູບຂອງສູນຫາຍ"],
  ["Example found photo", "ຕົວຢ່າງຮູບຂອງພົບເຫັນ"],
  ["Contact data is pulled from profile.", "ຂໍ້ມູນຕິດຕໍ່ດຶງຈາກໂປຣໄຟລ໌"],
  ["Bring item to protection office.", "ນຳຂອງໄປສົ່ງຫ້ອງຄຸ້ມຄອງ"],

  ["Large item photo", "ຮູບສິ່ງຂອງຂະໜາດໃຫຍ່"],
  ["thumb", "ຮູບຍ່ອຍ"],
  ["Published", "ເຜີຍແຜ່ແລ້ວ"],
  ["Item title", "ຊື່ສິ່ງຂອງ"],
  ["Category • Location • Date", "ໝວດໝູ່ • ສະຖານທີ່ • ວັນທີ"],
  ["Color / brand / unique mark", "ສີ / ຍີ່ຫໍ້ / ຈຸດສັງເກດ"],
  ["Full description", "ລາຍລະອຽດເຕັມ"],
  ["Privacy / safe contact note", "ໝາຍເຫດຄວາມປອດໄພ"],
  ["Action button", "ປຸ່ມດຳເນີນການ"],

  ["Notification list", "ລາຍການແຈ້ງເຕືອນ"],
  ["Post approved", "ປະກາດຖືກອະນຸມັດ"],
  ["Short message + time + link", "ຂໍ້ຄວາມສັ້ນ + ເວລາ + ລິ້ງ"],
  ["Teacher review needed", "ລໍຖ້າອາຈານກວດສອບ"],
  ["Identity verified", "ຢືນຢັນຕົວຕົນແລ້ວ"],
  ["Return completed", "ສົ່ງຄືນສຳເລັດ"],
  ["Student notifications", "ແຈ້ງເຕືອນສຳລັບນັກສຶກສາ"],
  ["• Own post approved/rejected", "• ປະກາດຂອງຕົນຖືກອະນຸມັດ/ປະຕິເສດ"],
  ["• Matching suggestion found", "• ພົບລາຍການທີ່ອາດກົງກັນ"],
  ["• Item returned", "• ສິ່ງຂອງຖືກສົ່ງຄືນ"],
  ["Teacher notifications", "ແຈ້ງເຕືອນສຳລັບອາຈານ"],
  ["• New post waiting approval", "• ມີປະກາດໃໝ່ລໍຖ້າອະນຸມັດ"],
  ["• Identity card waiting review", "• ບັດນັກສຶກສາລໍຖ້າກວດສອບ"],
  ["• Return record needed", "• ຕ້ອງບັນທຶກການສົ່ງຄືນ"],

  ["Date range", "ຊ່ວງວັນທີ"],
  ["Status", "ສະຖານະ"],
  ["Export / Print", "ສົ່ງອອກ / ພິມ"],
  ["Monthly chart", "ກຣາຟລາຍເດືອນ"],
  ["Status/category summary", "ສະຫຼຸບສະຖານະ/ໝວດໝູ່"],
  ["Pending", "ລໍຖ້າ"],

  ["Full name", "ຊື່ ແລະ ນາມສະກຸນ"],
  ["Role • Department", "ບົດບາດ • ພາກວິຊາ"],
  ["Student/employee code", "ລະຫັດນັກສຶກສາ/ພະນັກງານ"],
  ["Identity status", "ສະຖານະຢືນຢັນຕົວຕົນ"],
  ["Change avatar", "ປ່ຽນຮູບໂປຣໄຟລ໌"],
  ["Edit profile information", "ແກ້ໄຂຂໍ້ມູນໂປຣໄຟລ໌"],
  ["Department", "ພາກວິຊາ"],
  ["Save", "ບັນທຶກ"],
  ["Student card upload", "ອັບໂຫຼດບັດນັກສຶກສາ"],
  ["Choose file + preview", "ເລືອກໄຟລ໌ + ສະແດງຕົວຢ່າງ"],
  ["Profile photo preview", "ຕົວຢ່າງຮູບໂປຣໄຟລ໌"],
  ["avatar", "ຮູບໂປຣໄຟລ໌"],

  ["Search item/member", "ຄົ້ນຫາສິ່ງຂອງ/ຜູ້ໃຊ້"],
  ["12 waiting", "ລໍຖ້າ 12 ລາຍການ"],
  ["Approval queue", "ຄິວລໍຖ້າອະນຸມັດ"],
  ["Lost phone", "ໂທລະສັບສູນຫາຍ"],
  ["Found wallet", "ພົບກະເປົາເງິນ"],
  ["Lost keys", "ກະແຈສູນຫາຍ"],
  ["Student • Location • Time", "ນັກສຶກສາ • ສະຖານທີ່ • ເວລາ"],
  ["Approve", "ອະນຸມັດ"],
  ["Reject", "ປະຕິເສດ"],
  ["Daily summary", "ສະຫຼຸບມື້ນີ້"],
  ["Waiting: 12", "ລໍຖ້າ: 12"],
  ["Approved: 45", "ອະນຸມັດແລ້ວ: 45"],
  ["Teacher checklist", "ລາຍການກວດຂອງອາຈານ"],
  ["• Check information", "• ກວດຂໍ້ມູນ"],
  ["• Check identity", "• ກວດຕົວຕົນ"],
  ["• Check item handover", "• ກວດການສົ່ງມອບສິ່ງຂອງ"],

  ["Search", "ຄົ້ນຫາ"],
  ["Return item", "ສົ່ງຄືນສິ່ງຂອງ"],
  ["Waiting return", "ລໍຖ້າສົ່ງຄືນ"],
  ["Matched phone", "ໂທລະສັບທີ່ກົງກັນ"],
  ["Match", "ກົງກັນ"],
  ["Status timeline", "ລຳດັບສະຖານະ"],
  ["Submitted", "ສົ່ງຂໍ້ມູນແລ້ວ"],
  ["Approved", "ອະນຸມັດແລ້ວ"],
  ["Matched", "ຈັບຄູ່ແລ້ວ"],
  ["Return record form", "ຟອມບັນທຶກການສົ່ງຄືນ"],
  ["Returned by", "ຜູ້ສົ່ງຄືນ"],
  ["Received by", "ຜູ້ຮັບຄືນ"],
  ["Return location", "ສະຖານທີ່ສົ່ງຄືນ"],
  ["Save returned status", "ບັນທຶກສະຖານະສົ່ງຄືນ"],

  ["Matching score = category + location + date + color/detail", "ຄະແນນຈັບຄູ່ = ໝວດໝູ່ + ສະຖານທີ່ + ວັນທີ + ສີ/ລາຍລະອຽດ"],
  ["Score ≥ 70%", "ຄະແນນ ≥ 70%"],
  ["Lost post", "ປະກາດຂອງສູນຫາຍ"],
  ["Found post", "ປະກາດຂອງພົບເຫັນ"],
  ["lost photo", "ຮູບຂອງສູນຫາຍ"],
  ["found photo", "ຮູບຂອງພົບເຫັນ"],
  ["Category / location / date", "ໝວດໝູ່ / ສະຖານທີ່ / ວັນທີ"],
  ["Found phone", "ພົບໂທລະສັບ"],
  ["Confirm", "ຢືນຢັນ"],

  ["Categories", "ໝວດໝູ່"],
  ["Locations", "ສະຖານທີ່"],
  ["Departments", "ພາກວິຊາ"],
  ["Users", "ຜູ້ໃຊ້"],
  ["Add / edit record", "ເພີ່ມ / ແກ້ໄຂຂໍ້ມູນ"],
  ["Name", "ຊື່"],
  ["Code / detail", "ລະຫັດ / ລາຍລະອຽດ"],
  ["Active in forms", "ເປີດໃຊ້ໃນຟອມ"],
  ["Record list", "ລາຍການຂໍ້ມູນ"],
  ["Edit", "ແກ້ໄຂ"],
  ["Disable", "ປິດໃຊ້"],
  ["Delete", "ລຶບ"],
  ["AV", "ຮູບ"],
]);

function translateSvg(svg) {
  return svg
    .replaceAll("Segoe UI, Noto Sans Lao, Arial, sans-serif", "Noto Sans Lao, Phetsarath OT, Leelawadee UI, Segoe UI, Arial, sans-serif")
    .replace(/(<text\b[^>]*>)(.*?)(<\/text>)/g, (match, open, content, close) => {
      const translated = translations.get(content);
      return translated ? `${open}${translated}${close}` : match;
    });
}

async function renderPng(browser, svg, pngPath) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, { waitUntil: "load" });
  await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT }, timeout: 120_000 });
  await page.close();
}

function makeIndexHtml(files) {
  const cards = files
    .map((file) => {
      const base = file.replace(/\.svg$/, "");
      return `<article>
        <a href="./${base}.png"><img src="./${base}.png" alt="${base}"></a>
        <h2>${base}</h2>
        <p><a href="./${base}.png">PNG</a> · <a href="./${base}.svg">SVG</a></p>
      </article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="lo">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UX/UI Wireframes Lao</title>
  <style>
    body{margin:0;background:#f6fafb;color:#102f38;font-family:"Noto Sans Lao","Phetsarath OT","Leelawadee UI","Segoe UI",Arial,sans-serif}
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
    <h1>ໂຄງສ້າງ UX/UI ພາສາລາວ</h1>
    <p>Wireframe ແບບອ່ານງ່າຍ ແລະ ໃຊ້ຂໍ້ຄວາມພາສາລາວ.</p>
  </header>
  <main>${cards}</main>
</body>
</html>`;
}

async function main() {
  const inputFiles = (await fs.readdir(inputDir)).filter((file) => file.endsWith(".svg")).sort();
  if (!inputFiles.length) {
    throw new Error(`No SVG files found in ${inputDir}. Run generate-simple-ux-wireframes.mjs first.`);
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const file of inputFiles) {
      const sourceSvg = await fs.readFile(path.join(inputDir, file), "utf8");
      const laoSvg = translateSvg(sourceSvg);
      const base = file.replace(/\.svg$/, "");
      await fs.writeFile(path.join(outputDir, file), laoSvg, "utf8");
      await renderPng(browser, laoSvg, path.join(outputDir, `${base}.png`));
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(outputDir, "index.html"), makeIndexHtml(inputFiles), "utf8");
  await fs.writeFile(
    path.join(outputDir, "README.md"),
    [
      "# UX/UI Wireframes Lao",
      "",
      "This folder contains the Lao-language version of the simplified UX/UI wireframes.",
      "",
      "Use PNG files in reports or presentations. Use SVG files if a sharper editable image is needed.",
      "",
      ...inputFiles.map((file) => `- ${file.replace(/\\.svg$/, ".png")}`),
      "",
    ].join("\n"),
    "utf8",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

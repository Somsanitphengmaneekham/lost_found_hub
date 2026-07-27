/**
 * Thorough notification-system audit (in-app + email wiring).
 * Does NOT send real emails (NOTIFICATION_EMAIL_ENABLED forced off for service calls).
 *
 * Run: node scripts/test-notifications.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { buildNotifications } from "../frontend/src/utils/notifications.js";
import {
  notifyTeachersOfPostSubmission,
  notifyTeachersOfClaimRequest,
  notifyPostAuthorOfDecision,
  notifyLostOwnerItemFound,
  notifyLostOwnersOfFoundMatches,
} from "../backend/src/services/post-notification-service.js";
import { isEmailDeliveryConfigured } from "../backend/src/services/email-delivery.js";

const results = [];
let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    results.push({ ok: true, name });
  } else {
    failed += 1;
    results.push({ ok: false, name, detail: String(detail) });
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

const teacher = { id: 1, role: "teacher", fullName: "ອາຈານທົດສອບ", username: "teacher01" };
const student = { id: 2, role: "student", fullName: "ນັກສຶກສາທົດສອບ", username: "student01" };
const otherStudent = { id: 99, role: "student", fullName: "ຄົນອື່ນ", username: "other" };

const sampleFound = {
  pending: {
    id: 101,
    title: "ກະເປົ໋າເຂຽວ",
    location: "ຫ້ອງວິທະຍາສາດ",
    status: "pending_approval",
    finderId: 2,
    finder: "ນັກສຶກສາທົດສອບ",
    foundAt: "2026-07-20T10:00:00.000Z",
  },
  handover: {
    id: 102,
    title: "ກະເປົ໋າຟ້າ",
    location: "ຫ້ອງຄອມ",
    status: "awaiting_handover",
    finderId: 2,
    finder: "ນັກສຶກສາທົດສອບ",
    foundAt: "2026-07-21T10:00:00.000Z",
  },
  approved: {
    id: 103,
    title: "ກະເປົ໋າແດງ",
    location: "ຫ້ອງນ້ຳ",
    status: "approved",
    finderId: 2,
    finder: "ນັກສຶກສາທົດສອບ",
    foundAt: "2026-07-19T10:00:00.000Z",
    approvedAt: "2026-07-22T10:00:00.000Z",
  },
  rejected: {
    id: 104,
    title: "ກະເປົ໋າເຫຼືອງ",
    location: "ລານ",
    status: "rejected",
    rejectReason: "ຮູບບໍ່ຊັດ",
    finderId: 2,
    finder: "ນັກສຶກສາທົດສອບ",
    foundAt: "2026-07-18T10:00:00.000Z",
  },
  matched: {
    id: 105,
    title: "ກະເປົ໋າດຳ",
    location: "ຫ້ອງວິທະຍາສາດ",
    status: "matched",
    finderId: 2,
    finder: "ນັກສຶກສາທົດສອບ",
    foundAt: "2026-07-17T10:00:00.000Z",
  },
};

const sampleLost = {
  pending: {
    id: 201,
    title: "ກະເປົາເຂຽວຂອງຂ້ອຍ",
    location: "ຫ້ອງວິທະຍາສາດ",
    status: "pending_approval",
    ownerId: 2,
    owner: "ນັກສຶກສາທົດສອບ",
    lostAt: "2026-07-20T09:00:00.000Z",
  },
  published: {
    id: 202,
    title: "ກະເປົາຟ້າຂອງຂ້ອຍ",
    location: "ຫ້ອງຄອມ",
    status: "published",
    ownerId: 2,
    owner: "ນັກສຶກສາທົດສອບ",
    lostAt: "2026-07-19T09:00:00.000Z",
  },
  matched: {
    id: 203,
    title: "ກະເປົາແດງຂອງຂ້ອຍ",
    location: "ຫ້ອງນ້ຳ",
    status: "matched",
    ownerId: 2,
    owner: "ນັກສຶກສາທົດສອບ",
    lostAt: "2026-07-18T09:00:00.000Z",
    updatedAt: "2026-07-23T09:00:00.000Z",
  },
  rejected: {
    id: 204,
    title: "ກະເປົາເຫຼືອງຂອງຂ້ອຍ",
    location: "ລານ",
    status: "rejected",
    ownerId: 2,
    owner: "ນັກສຶກສາທົດສອບ",
    lostAt: "2026-07-17T09:00:00.000Z",
  },
};

const sampleClaims = [
  {
    id: 301,
    status: "submitted",
    foundTitle: "ກະເປົ໋າແດງ",
    claimantId: 2,
    claimantName: "ນັກສຶກສາທົດສອບ",
    createdAt: "2026-07-24T10:00:00.000Z",
  },
  {
    id: 302,
    status: "under_review",
    foundTitle: "ກະເປົ໋າເຂຽວ",
    claimantId: 2,
    claimantName: "ນັກສຶກສາທົດສອບ",
    createdAt: "2026-07-24T11:00:00.000Z",
  },
  {
    id: 303,
    status: "approved",
    foundTitle: "ກະເປົ໋າຟ້າ",
    claimantId: 2,
    claimantName: "ນັກສຶກສາທົດສອບ",
    createdAt: "2026-07-24T12:00:00.000Z",
  },
  {
    id: 304,
    status: "rejected",
    foundTitle: "ກະເປົ໋າດຳ",
    claimantId: 2,
    claimantName: "ນັກສຶກສາທົດສອບ",
    createdAt: "2026-07-24T13:00:00.000Z",
  },
];

const sampleMatches = [
  {
    id: 401,
    lostPostId: 202,
    foundPostId: 103,
    matchScore: 88,
    status: "suggested",
    createdAt: "2026-07-22T12:00:00.000Z",
    lost: { ownerId: 2, title: "ກະເປົາຟ້າຂອງຂ້ອຍ" },
    found: { title: "ກະເປົ໋າແດງ" },
  },
  {
    id: 402,
    lostPostId: 202,
    foundPostId: 999,
    matchScore: 40,
    status: "rejected",
    createdAt: "2026-07-22T13:00:00.000Z",
    lost: { ownerId: 2, title: "ກະເປົາຟ້າຂອງຂ້ອຍ" },
    found: { title: "ບໍ່ກ່ຽວ" },
  },
];

const sampleReturns = [
  {
    id: 501,
    foundPostId: 103,
    lostPostId: 202,
    receivedBy: "ນັກສຶກສາທົດສອບ",
    returnedAt: "2026-07-25T10:00:00.000Z",
  },
];

section("1) In-app: buildNotifications — teacher");

{
  const notes = buildNotifications({
    currentUser: teacher,
    foundItems: Object.values(sampleFound),
    lostReports: Object.values(sampleLost),
    matches: sampleMatches,
    returnRecords: sampleReturns,
    claimRequests: sampleClaims,
  });

  assert("teacher gets pending found", notes.some((n) => n.id.includes("teacher-found-101-pending_approval")));
  assert("teacher gets awaiting handover found", notes.some((n) => n.id.includes("teacher-found-102-awaiting_handover")));
  assert("teacher does NOT get approved found", !notes.some((n) => n.id.includes("teacher-found-103")));
  assert("teacher gets pending lost", notes.some((n) => n.id.includes("teacher-lost-201-pending_approval")));
  assert("teacher does NOT get published lost", !notes.some((n) => n.id.includes("teacher-lost-202")));
  assert("teacher gets submitted claim", notes.some((n) => n.id.includes("teacher-claim-301")));
  assert("teacher gets under_review claim", notes.some((n) => n.id.includes("teacher-claim-302")));
  assert("teacher does NOT get approved claim", !notes.some((n) => n.id.includes("teacher-claim-303")));
  assert("teacher does NOT get rejected claim", !notes.some((n) => n.id.includes("teacher-claim-304")));
  assert("teacher does NOT see student matches/returns", !notes.some((n) => n.audience === "student"));
  assert("teacher priority: pending before handover", (() => {
    const pending = notes.find((n) => n.id.includes("pending_approval") && n.id.includes("found"));
    const handover = notes.find((n) => n.id.includes("awaiting_handover"));
    return pending && handover && pending.priority < handover.priority;
  })());
  assert("teacher hrefs go to #approval", notes.every((n) => n.href === "#approval"));
}

section("2) In-app: buildNotifications — student owner");

{
  const notes = buildNotifications({
    currentUser: student,
    foundItems: Object.values(sampleFound),
    lostReports: Object.values(sampleLost),
    matches: sampleMatches,
    returnRecords: sampleReturns,
    claimRequests: sampleClaims,
  });

  const ids = notes.map((n) => n.id);
  assert("student found handover", ids.includes("student-found-handover-102"));
  assert("student found pending", ids.includes("student-found-pending-101"));
  assert("student found approved", ids.includes("student-found-approved-103"));
  assert("student found rejected", ids.includes("student-found-rejected-104"));
  assert("student found matched has NO dedicated found card", !ids.some((id) => id.includes("student-found") && id.includes("105")));
  assert("student lost pending", ids.includes("student-lost-201-pending_approval"));
  assert("student lost published", ids.includes("student-lost-202-published"));
  assert("student lost matched", ids.includes("student-lost-203-matched"));
  assert("student lost rejected", ids.includes("student-lost-204-rejected"));
  assert("student match suggested shown", ids.includes("student-match-401"));
  assert("student rejected match hidden", !ids.includes("student-match-402"));
  assert("student return shown", ids.includes("student-return-501"));
  assert("student claim submitted", ids.includes("student-claim-301-submitted"));
  assert("student claim under_review", ids.includes("student-claim-302-under_review"));
  assert("student claim approved", ids.includes("student-claim-303-approved"));
  assert("student claim rejected hidden", !ids.includes("student-claim-304-rejected"));

  const claimTitles = notes.filter((n) => n.id.startsWith("student-claim-")).map((n) => n.title);
  assert(
    "BUG CHECK: claim cards use distinct titles by status",
    new Set(claimTitles).size === claimTitles.length && !claimTitles.every((t) => t === claimTitles[0]),
    `all claim titles identical: ${JSON.stringify(claimTitles)}`,
  );
}

section("3) In-app: isolation — other student sees nothing of sample owner");

{
  const notes = buildNotifications({
    currentUser: otherStudent,
    foundItems: Object.values(sampleFound),
    lostReports: Object.values(sampleLost),
    matches: sampleMatches,
    returnRecords: sampleReturns,
    claimRequests: sampleClaims,
  });
  assert("other student has no cards from sample data", notes.length === 0, `got ${notes.length}`);
}

section("4) In-app: empty / guest");

{
  assert("guest returns []", buildNotifications({ currentUser: null, foundItems: [], lostReports: [], matches: [], returnRecords: [], claimRequests: [] }).length === 0);
  assert(
    "teacher with empty data returns []",
    buildNotifications({
      currentUser: teacher,
      foundItems: [],
      lostReports: [],
      matches: [],
      returnRecords: [],
      claimRequests: [],
    }).length === 0,
  );
}

section("5) Static wiring: posts-routes dispatch coverage");

{
  const routesSrc = readFileSync(new URL("../backend/src/routes/posts-routes.js", import.meta.url), "utf8");
  const matchesSrc = readFileSync(new URL("../backend/src/routes/matches-routes.js", import.meta.url), "utf8");

  const expectedDispatches = [
    ["found create", /notifyTeachersOfPostSubmission\(pool,\s*\{\s*postType:\s*"found"/],
    ["found move-to-approval", /move-to-approval[\s\S]*?notifyTeachersOfPostSubmission/],
    ["found claim", /\/claim[\s\S]*?notifyTeachersOfClaimRequest/],
    ["found approve author", /found-posts\/:id\/approve[\s\S]*?notifyPostAuthorOfDecision[\s\S]*?approved/],
    ["found approve matches", /found-posts\/:id\/approve[\s\S]*?notifyLostOwnersOfFoundMatches/],
    ["found reject", /found-posts\/:id\/reject[\s\S]*?notifyPostAuthorOfDecision[\s\S]*?rejected/],
    ["lost create", /notifyTeachersOfPostSubmission\(pool,\s*\{\s*postType:\s*"lost"/],
    ["lost approve author", /lost-posts\/:id\/approve[\s\S]*?notifyPostAuthorOfDecision[\s\S]*?approved/],
    ["lost approve matches", /lost-posts\/:id\/approve[\s\S]*?notifyLostOwnersOfFoundMatches/],
    ["lost mark-found", /mark-found[\s\S]*?notifyLostOwnerItemFound/],
    ["lost reject", /lost-posts\/:id\/reject[\s\S]*?notifyPostAuthorOfDecision[\s\S]*?rejected/],
  ];

  for (const [name, pattern] of expectedDispatches) {
    assert(`email wired: ${name}`, pattern.test(routesSrc));
  }

  assert(
    "GAP: found return has NO email dispatch",
    !/\/return[\s\S]{0,2500}?dispatchEmailNotification/.test(routesSrc) ||
      !routesSrc.includes('app.post("/api/found-posts/:id/return"'),
    "return route exists; checking absence of dispatch near return",
  );

  // More precise: return handler block shouldn't call dispatch
  const returnBlock = routesSrc.match(/app\.post\("\/api\/found-posts\/:id\/return"[\s\S]*?(?=app\.(post|put|delete|get)\()/);
  assert("found /return has no dispatchEmailNotification", returnBlock ? !returnBlock[0].includes("dispatchEmailNotification") : false);

  assert("matches-routes has no email notifications", !matchesSrc.includes("dispatchEmailNotification") && !matchesSrc.includes("notify"));
}

section("6) Email service dry-run against real DB (no send)");

process.env.NOTIFICATION_EMAIL_ENABLED = "false";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  assert("SMTP configured in env", isEmailDeliveryConfigured());
  assert("APP_PUBLIC_URL set", Boolean(process.env.APP_PUBLIC_URL));

  const [teachers] = await pool.query(
    `SELECT COUNT(*) AS c FROM members WHERE role='teacher' AND is_active=1 AND email IS NOT NULL AND email<>''`,
  );
  const teacherCount = Number(teachers[0].c);
  assert("active teachers with email >= 1", teacherCount >= 1, teacherCount);

  const [foundRows] = await pool.query(
    `SELECT id, title, status, finder_id FROM found_posts WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 5`,
  );
  const [lostRows] = await pool.query(
    `SELECT id, title, status, owner_id FROM lost_posts WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 5`,
  );
  const [claimRows] = await pool.query(
    `SELECT id, status, found_post_id, claimant_id FROM claim_requests ORDER BY id DESC LIMIT 5`,
  );
  const [matchRows] = await pool.query(
    `SELECT id, lost_post_id AS lostPostId, found_post_id AS foundPostId, match_score AS matchScore FROM matches ORDER BY id DESC LIMIT 5`,
  );

  console.log(
    JSON.stringify(
      {
        teacherRecipients: teacherCount,
        sampleFound: foundRows.length,
        sampleLost: lostRows.length,
        sampleClaims: claimRows.length,
        sampleMatches: matchRows.length,
      },
      null,
      2,
    ),
  );

  const fakeFoundPost = {
    id: foundRows[0]?.id ?? 1,
    title: foundRows[0]?.title ?? "test found",
    locationName: "ຫ້ອງທົດສອບ",
    foundAt: "2026-07-26 10:00:00",
    finderName: "Tester",
  };

  const submitResult = await notifyTeachersOfPostSubmission(pool, { postType: "found", post: fakeFoundPost });
  assert(
    "notifyTeachersOfPostSubmission skips when disabled",
    submitResult.skipped === teacherCount && submitResult.sent === 0,
    JSON.stringify(submitResult),
  );

  const lostSubmit = await notifyTeachersOfPostSubmission(pool, {
    postType: "lost",
    post: {
      id: lostRows[0]?.id ?? 1,
      title: lostRows[0]?.title ?? "test lost",
      locationName: "ຫ້ອງທົດສອບ",
      lostAt: "2026-07-26 09:00:00",
      ownerName: "Tester",
    },
  });
  assert("lost submit skips when disabled", lostSubmit.skipped === teacherCount && lostSubmit.sent === 0, JSON.stringify(lostSubmit));

  if (claimRows[0]) {
    const claimDetail = {
      id: claimRows[0].id,
      foundTitle: "test item",
      claimantName: "Tester",
      locationName: "lab",
      claimMessage: "mine",
    };
    const claimResult = await notifyTeachersOfClaimRequest(pool, { claim: claimDetail });
    assert("claim notify skips when disabled", claimResult.skipped === teacherCount && claimResult.sent === 0, JSON.stringify(claimResult));
  } else {
    assert("claim notify skipped (no claim rows in DB)", true);
  }

  if (foundRows[0]) {
    const decision = await notifyPostAuthorOfDecision(pool, {
      postType: "found",
      postId: foundRows[0].id,
      decision: "approved",
    });
    assert(
      "found decision notify returns counts (skip or no-email owner)",
      typeof decision.sent === "number" && typeof decision.skipped === "number",
      JSON.stringify(decision),
    );
  }

  if (lostRows[0]) {
    const markFound = await notifyLostOwnerItemFound(pool, { lostPostId: lostRows[0].id, matchCount: 2 });
    assert(
      "mark-found notify returns counts",
      typeof markFound.sent === "number" && typeof markFound.skipped === "number",
      JSON.stringify(markFound),
    );
  }

  if (matchRows.length) {
    let matchNotify;
    let matchError = null;
    try {
      matchNotify = await notifyLostOwnersOfFoundMatches(pool, { matches: matchRows });
    } catch (error) {
      matchError = error;
    }
    assert(
      "BUG CHECK: match notify query compatible with live matches schema",
      !matchError,
      matchError?.message || JSON.stringify(matchNotify),
    );
    if (!matchError) {
      assert(
        "match notify returns counts without throwing",
        typeof matchNotify.sent === "number",
        JSON.stringify(matchNotify),
      );
    }
  } else {
    const empty = await notifyLostOwnersOfFoundMatches(pool, { matches: [] });
    assert("empty matches short-circuit", empty.sent === 0 && empty.skipped === 0, JSON.stringify(empty));
  }

  // Schema compatibility checks that affect notifications
  const [matchCols] = await pool.query(`SHOW COLUMNS FROM matches`);
  const matchColNames = matchCols.map((col) => col.Field);
  assert(
    "matches.status column exists (used by email SQL and in-app reject filter)",
    matchColNames.includes("status"),
    `actual columns: ${matchColNames.join(", ")}`,
  );

  const [foundStatusRows] = await pool.query(`SELECT DISTINCT status FROM found_posts WHERE deleted_at IS NULL`);
  const foundStatuses = foundStatusRows.map((row) => row.status);
  assert(
    "live DB currently has awaiting_handover rows OR create path still uses it",
    foundStatuses.includes("awaiting_handover") || false,
    `live found statuses: ${foundStatuses.join(", ")} — create API uses pending_approval directly`,
  );

  // Live projection from DB-shaped objects (best-effort map)
  const [liveFound] = await pool.query(`
    SELECT
      fp.id,
      fp.title,
      fp.status,
      fp.finder_id AS finderId,
      fp.found_at AS foundAt,
      fp.approved_at AS approvedAt,
      fp.reject_reason AS rejectReason,
      CONCAT(m.first_name, ' ', m.last_name) AS finder,
      CONCAT(l.name_th, IF(l.floor IS NOT NULL AND l.floor <> '', CONCAT(' ຊັ້ນ ', l.floor), '')) AS location
    FROM found_posts fp
    INNER JOIN members m ON m.id = fp.finder_id
    LEFT JOIN locations l ON l.id = fp.found_location_id
    WHERE fp.deleted_at IS NULL
    ORDER BY fp.id DESC
    LIMIT 50
  `);

  const [liveLost] = await pool.query(`
    SELECT
      lp.id,
      lp.title,
      lp.status,
      lp.owner_id AS ownerId,
      lp.lost_at AS lostAt,
      lp.updated_at AS updatedAt,
      lp.created_at AS createdAt,
      CONCAT(m.first_name, ' ', m.last_name) AS owner,
      CONCAT(l.name_th, IF(l.floor IS NOT NULL AND l.floor <> '', CONCAT(' ຊັ້ນ ', l.floor), '')) AS location
    FROM lost_posts lp
    INNER JOIN members m ON m.id = lp.owner_id
    LEFT JOIN locations l ON l.id = lp.lost_location_id
    WHERE lp.deleted_at IS NULL
    ORDER BY lp.id DESC
    LIMIT 50
  `);

  const [liveClaims] = await pool.query(`
    SELECT
      cr.id,
      cr.status,
      cr.claimant_id AS claimantId,
      cr.created_at AS createdAt,
      fp.title AS foundTitle,
      CONCAT(m.first_name, ' ', m.last_name) AS claimantName
    FROM claim_requests cr
    INNER JOIN found_posts fp ON fp.id = cr.found_post_id
    INNER JOIN members m ON m.id = cr.claimant_id
    ORDER BY cr.id DESC
    LIMIT 50
  `);

  const [liveReturns] = await pool.query(`
    SELECT
      rr.id,
      rr.found_post_id AS foundPostId,
      cr.lost_post_id AS lostPostId,
      rr.returned_at AS returnedAt,
      received.username AS receivedBy
    FROM return_records rr
    LEFT JOIN claim_requests cr ON cr.id = rr.claim_request_id
    LEFT JOIN members received ON received.id = rr.received_by
    ORDER BY rr.id DESC
    LIMIT 50
  `);

  const [memberTeacher] = await pool.query(`SELECT id, role, username, CONCAT(first_name,' ',last_name) AS fullName FROM members WHERE role='teacher' AND is_active=1 LIMIT 1`);
  const [memberStudent] = await pool.query(`SELECT id, role, username, CONCAT(first_name,' ',last_name) AS fullName FROM members WHERE role='student' AND is_active=1 LIMIT 1`);

  if (memberTeacher[0]) {
    const teacherNotes = buildNotifications({
      currentUser: memberTeacher[0],
      foundItems: liveFound,
      lostReports: liveLost,
      matches: [],
      returnRecords: liveReturns,
      claimRequests: liveClaims,
    });
    assert("live teacher buildNotifications runs", Array.isArray(teacherNotes));
    console.log(`live teacher notification count: ${teacherNotes.length}`);
  }

  if (memberStudent[0]) {
    const studentNotes = buildNotifications({
      currentUser: memberStudent[0],
      foundItems: liveFound,
      lostReports: liveLost,
      matches: [],
      returnRecords: liveReturns,
      claimRequests: liveClaims,
    });
    assert("live student buildNotifications runs", Array.isArray(studentNotes));
    console.log(`live student (${memberStudent[0].username}) notification count: ${studentNotes.length}`);
  }
} finally {
  await pool.end();
}

section("7) Coverage matrix (email vs in-app)");

const matrix = [
  ["Create found post", "email:teachers", "in-app:teacher pending/handover + student own"],
  ["Move found to approval", "email:teachers", "in-app:teacher pending"],
  ["Create lost post", "email:teachers", "in-app:teacher pending + student own"],
  ["Approve found", "email:author + matched lost owners", "in-app:student approved (+ matches)"],
  ["Reject found", "email:author", "in-app:student rejected"],
  ["Approve lost", "email:author + match owners", "in-app:student published"],
  ["Reject lost", "email:author", "in-app:student rejected"],
  ["Mark lost found", "email:lost owner", "in-app:student matched"],
  ["Submit claim", "email:teachers", "in-app:teacher + student claim"],
  ["Return item", "NO EMAIL", "in-app:student return only"],
  ["Claim approved/rejected after submit", "NO EMAIL", "partial: approved shown (same title); rejected hidden"],
  ["Confirm/reject match (matches-routes)", "NO EMAIL", "in-app via match status filter only"],
  ["Read/unread / dismiss", "N/A", "MISSING"],
  ["Notification preferences", "N/A", "MISSING"],
  ["Push / realtime", "N/A", "MISSING"],
];

for (const [event, email, inapp] of matrix) {
  console.log(`- ${event}\n    email: ${email}\n    in-app: ${inapp}`);
}

section("SUMMARY");
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(`\n${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exitCode = failed ? 1 : 0;

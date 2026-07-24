import { isEmailDeliveryConfigured, sendEmail } from "./email-delivery.js";

const POST_TYPE_COPY = {
  lost: {
    label: "ຂອງສູນຫາຍ",
    heading: "ມີນັກສຶກສາສົ່ງປະກາດຂອງສູນຫາຍໃໝ່",
    subject: "ນັກສຶກສາສົ່ງປະກາດຂອງສູນຫາຍລໍຖ້າອະນຸມັດ",
  },
  found: {
    label: "ຂອງທີ່ພົບ",
    heading: "ມີນັກສຶກສາສົ່ງປະກາດພົບສິ່ງຂອງໃໝ່",
    subject: "ນັກສຶກສາສົ່ງປະກາດພົບສິ່ງຂອງລໍຖ້າອະນຸມັດ",
  },
};

function isEnabled(value, defaultValue = true) {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function notificationEmailEnabled() {
  return isEnabled(process.env.NOTIFICATION_EMAIL_ENABLED, true) && isEmailDeliveryConfigured();
}

function publicAppUrl(hash) {
  const baseUrl = String(process.env.APP_PUBLIC_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
  return `${baseUrl}/${hash}`;
}

function postTypeCopy(postType) {
  return POST_TYPE_COPY[postType] ?? POST_TYPE_COPY.found;
}

function postTypeLabel(postType) {
  return postTypeCopy(postType).label;
}

function personName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || row.username || "ຜູ້ໃຊ້";
}

function postOwnerName(post) {
  return post.finderName || post.ownerName || post.contactName || "ບໍ່ລະບຸ";
}

function postEventTime(post, postType) {
  return postType === "lost" ? post.lostAt : post.foundAt;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailShell({ heading, intro, rows, actionUrl, actionLabel }) {
  const rowHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #5d6b73; width: 150px;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; color: #0a2d3f; font-weight: 700;">${escapeHtml(value || "ບໍ່ລະບຸ")}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="margin: 0; padding: 24px; background: #f4faf9; font-family: 'Noto Sans Lao', Arial, sans-serif;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #d6e5e1; border-radius: 14px; overflow: hidden;">
        <div style="padding: 22px 26px; background: #245b55; color: #ffffff;">
          <div style="font-size: 14px; opacity: 0.88;">Lost and Found Hub</div>
          <h1 style="margin: 8px 0 0; font-size: 24px; line-height: 1.45;">${escapeHtml(heading)}</h1>
        </div>
        <div style="padding: 24px 26px;">
          <p style="margin: 0 0 18px; color: #334b55; line-height: 1.7;">${escapeHtml(intro)}</p>
          <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e1ece9; border-bottom: 1px solid #e1ece9;">
            ${rowHtml}
          </table>
          <div style="margin-top: 24px;">
            <a
              href="${escapeHtml(actionUrl)}"
              style="display: inline-block; padding: 13px 18px; background: #159947; color: #ffffff; border-radius: 10px; text-decoration: none; font-weight: 800;"
            >${escapeHtml(actionLabel)}</a>
          </div>
          <p style="margin: 20px 0 0; color: #71828a; font-size: 13px; line-height: 1.6;">
            ຖ້າປຸ່ມກົດບໍ່ໄດ້ ສາມາດເປີດລິ້ງນີ້ໄດ້ໂດຍກົງ:<br />
            <a href="${escapeHtml(actionUrl)}" style="color: #0b766d;">${escapeHtml(actionUrl)}</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

async function deliverMessages(messages, eventName) {
  if (!notificationEmailEnabled() || messages.length === 0) {
    return { sent: 0, failed: 0, skipped: messages.length };
  }

  const results = await Promise.allSettled(messages.map((message) => sendEmail(message)));
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length) {
    console.error(
      `[email-notification] ${eventName}: ${failed.length}/${messages.length} failed`,
      failed.map((result) => result.reason?.message || "unknown email error"),
    );
  }

  const sent = messages.length - failed.length;
  console.info(`[email-notification] ${eventName}: ${sent}/${messages.length} sent`);
  return { sent, failed: failed.length, skipped: 0 };
}

export async function notifyTeachersOfPostSubmission(db, { postType, post }) {
  const [teachers] = await db.execute(
    `
      SELECT username, first_name, last_name, email
      FROM members
      WHERE role = 'teacher'
        AND is_active = 1
        AND email IS NOT NULL
        AND email <> ''
    `,
  );

  const copy = postTypeCopy(postType);
  const typeLabel = postTypeLabel(postType);
  const approvalUrl = publicAppUrl("#approval");
  const reporterName = postOwnerName(post);
  const rows = [
    ["ປະເພດປະກາດ", typeLabel],
    ["ຫົວຂໍ້", post.title],
    ["ຜູ້ແຈ້ງ", reporterName],
    ["ສະຖານທີ່", post.locationName],
    ["ວັນເວລາ", postEventTime(post, postType)],
    ["ສະຖານະ", "ລໍຖ້າອະນຸມັດ"],
  ];

  const messages = teachers.map((teacher) => {
    const teacherName = personName(teacher);
    const intro = `ສະບາຍດີ ${teacherName}, ${copy.heading} ກະລຸນາເຂົ້າໄປກວດສອບຂໍ້ມູນ ແລະ ກົດອະນຸມັດ ຫຼື ປະຕິເສດໃນເວັບ.`;

    return {
      to: teacher.email,
      subject: `[Lost and Found] ${copy.subject}`,
      text: [
        `ສະບາຍດີ ${teacherName}`,
        "",
        copy.heading,
        "ກະລຸນາເຂົ້າໄປກວດສອບຂໍ້ມູນ ແລະ ກົດອະນຸມັດ ຫຼື ປະຕິເສດໃນເວັບ.",
        "",
        `ປະເພດປະກາດ: ${typeLabel}`,
        `ຫົວຂໍ້: ${post.title || "ບໍ່ລະບຸ"}`,
        `ຜູ້ແຈ້ງ: ${reporterName}`,
        `ສະຖານທີ່: ${post.locationName || "ບໍ່ລະບຸ"}`,
        `ວັນເວລາ: ${postEventTime(post, postType) || "ບໍ່ລະບຸ"}`,
        "",
        `ເຂົ້າໄປກວດສອບ: ${approvalUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: copy.heading,
        intro,
        rows,
        actionUrl: approvalUrl,
        actionLabel: "ເຂົ້າໄປກວດສອບໃນເວັບ",
      }),
    };
  });

  return deliverMessages(messages, `${postType}-post-submitted:${post.id}`);
}

export async function notifyTeachersOfClaimRequest(db, { claim }) {
  const [teachers] = await db.execute(
    `
      SELECT username, first_name, last_name, email
      FROM members
      WHERE role = 'teacher'
        AND is_active = 1
        AND email IS NOT NULL
        AND email <> ''
    `,
  );

  const approvalUrl = publicAppUrl("#approval");
  const rows = [
    ["ລາຍການທີ່ຂໍຮັບ", claim.foundTitle],
    ["ຜູ້ຂໍຮັບ", claim.claimantName],
    ["ສະຖານທີ່ພົບ", claim.locationName],
    ["ຂໍ້ຄວາມ", claim.claimMessage],
    ["ສະຖານະ", "ລໍຖ້າກວດສອບ"],
  ];

  const messages = teachers.map((teacher) => {
    const teacherName = personName(teacher);
    const intro = `ສະບາຍດີ ${teacherName}, ມີນັກສຶກສາສົ່ງຄຳຂໍຮັບສິ່ງຂອງ. ກະລຸນາກວດສອບຕົວຕົນ ແລະ ສິ່ງຂອງຈິງທີ່ຫ້ອງຄຸ້ມຄອງກ່ອນບັນທຶກການສົ່ງຄືນ.`;

    return {
      to: teacher.email,
      subject: `[Lost and Found] ມີຄຳຂໍຮັບສິ່ງຂອງລໍຖ້າກວດສອບ`,
      text: [
        `ສະບາຍດີ ${teacherName}`,
        "",
        "ມີນັກສຶກສາສົ່ງຄຳຂໍຮັບສິ່ງຂອງ",
        `ລາຍການ: ${claim.foundTitle || "ບໍ່ລະບຸ"}`,
        `ຜູ້ຂໍຮັບ: ${claim.claimantName || "ບໍ່ລະບຸ"}`,
        `ສະຖານທີ່ພົບ: ${claim.locationName || "ບໍ່ລະບຸ"}`,
        `ຂໍ້ຄວາມ: ${claim.claimMessage || "ບໍ່ລະບຸ"}`,
        "",
        "ກະລຸນາກວດສອບຕົວຕົນ ແລະ ສິ່ງຂອງຈິງທີ່ຫ້ອງຄຸ້ມຄອງກ່ອນບັນທຶກການສົ່ງຄືນ.",
        "",
        `ເຂົ້າໄປກວດສອບ: ${approvalUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: "ມີຄຳຂໍຮັບສິ່ງຂອງໃໝ່",
        intro,
        rows,
        actionUrl: approvalUrl,
        actionLabel: "ເຂົ້າໄປກວດສອບໃນເວັບ",
      }),
    };
  });

  return deliverMessages(messages, `claim-request-submitted:${claim.id}`);
}

async function findPostRecipient(db, postType, postId) {
  const isLost = postType === "lost";
  const table = isLost ? "lost_posts" : "found_posts";
  const ownerColumn = isLost ? "owner_id" : "finder_id";
  const locationColumn = isLost ? "lost_location_id" : "found_location_id";

  const [rows] = await db.execute(
    `
      SELECT
        p.id,
        p.title,
        m.username,
        m.first_name,
        m.last_name,
        m.email,
        l.name_th AS location_name
      FROM ${table} p
      INNER JOIN members m ON m.id = p.${ownerColumn}
      LEFT JOIN locations l ON l.id = p.${locationColumn}
      WHERE p.id = ?
      LIMIT 1
    `,
    [postId],
  );

  return rows[0] ?? null;
}

export async function notifyLostOwnerItemFound(db, { lostPostId, matchCount = 0 }) {
  const recipient = await findPostRecipient(db, "lost", lostPostId);
  if (!recipient?.email) return { sent: 0, failed: 0, skipped: 1 };

  const notificationsUrl = publicAppUrl("#notifications");
  const matchText = Number(matchCount) > 0 ? `${Number(matchCount).toLocaleString("lo-LA")} ລາຍການ` : "ບໍ່ມີລາຍການໃກ້ຄຽງ";
  const intro =
    "ອາຈານໄດ້ກວດສອບແລ້ວ ແລະ ກົດແຈ້ງວ່າມີສິ່ງຂອງທີ່ອາດເປັນຂອງທ່ານຢູ່ທີ່ຫ້ອງຄຸ້ມຄອງ. ກະລຸນານຳບັດນັກສຶກສາ ແລະ ໄປຢືນຢັນລາຍລະອຽດກັບອາຈານກ່ອນຮັບຂອງ.";

  const rows = [
    ["ປະກາດຂອງສູນຫາຍ", recipient.title],
    ["ສະຖານທີ່ທີ່ແຈ້ງຫາຍ", recipient.location_name],
    ["ລາຍການໃກ້ຄຽງໃນລະບົບ", matchText],
    ["ຂັ້ນຕອນຕໍ່ໄປ", "ໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ"],
  ];

  return deliverMessages(
    [
      {
        to: recipient.email,
        subject: "[Lost and Found] ອາຈານແຈ້ງວ່າພົບຂອງຂອງທ່ານແລ້ວ",
        text: [
          `ສະບາຍດີ ${personName(recipient)}`,
          "",
          "ອາຈານແຈ້ງວ່າພົບຂອງທີ່ອາດເປັນຂອງທ່ານແລ້ວ",
          `ປະກາດຂອງສູນຫາຍ: ${recipient.title || "ບໍ່ລະບຸ"}`,
          `ສະຖານທີ່ທີ່ແຈ້ງຫາຍ: ${recipient.location_name || "ບໍ່ລະບຸ"}`,
          `ລາຍການໃກ້ຄຽງໃນລະບົບ: ${matchText}`,
          "",
          "ກະລຸນານຳບັດນັກສຶກສາ ແລະ ໄປຢືນຢັນລາຍລະອຽດທີ່ຫ້ອງຄຸ້ມຄອງກ່ອນຮັບຂອງ.",
          "",
          `ເບິ່ງແຈ້ງເຕືອນ: ${notificationsUrl}`,
        ].join("\n"),
        html: emailShell({
          heading: "ອາຈານແຈ້ງວ່າພົບຂອງຂອງທ່ານແລ້ວ",
          intro,
          rows,
          actionUrl: notificationsUrl,
          actionLabel: "ເບິ່ງແຈ້ງເຕືອນ",
        }),
      },
    ],
    `lost-owner-marked-found:${lostPostId}`,
  );
}

export async function notifyPostAuthorOfDecision(db, { postType, postId, decision, reason }) {
  const recipient = await findPostRecipient(db, postType, postId);
  if (!recipient?.email) return { sent: 0, failed: 0, skipped: 1 };

  const approved = decision === "approved";
  const typeLabel = postTypeLabel(postType);
  const resultLabel = approved ? "ອະນຸມັດແລ້ວ" : "ຖືກປະຕິເສດ";
  const notificationsUrl = publicAppUrl("#notifications");
  const lines = [
    `ສະບາຍດີ ${personName(recipient)}`,
    "",
    `ປະກາດ${typeLabel}ຂອງທ່ານ${resultLabel}`,
    `ຫົວຂໍ້: ${recipient.title}`,
    `ສະຖານທີ່: ${recipient.location_name || "ບໍ່ລະບຸ"}`,
  ];

  if (!approved) {
    lines.push(`ເຫດຜົນ: ${String(reason || "ຂໍ້ມູນຍັງບໍ່ຄົບ ຫຼື ບໍ່ຖືກຕ້ອງ").trim()}`);
  }

  lines.push("", `ເບິ່ງແຈ້ງເຕືອນ: ${notificationsUrl}`);

  const html = emailShell({
    heading: `ປະກາດ${typeLabel}ຂອງທ່ານ${resultLabel}`,
    intro: approved
      ? "ປະກາດຂອງທ່ານຖືກອະນຸມັດແລ້ວ ແລະ ສາມາດສະແດງໃນເວັບໄດ້."
      : "ປະກາດຂອງທ່ານຖືກປະຕິເສດ ກະລຸນາກວດສອບເຫດຜົນໃນໜ້າແຈ້ງເຕືອນ.",
    rows: [
      ["ປະເພດປະກາດ", typeLabel],
      ["ຫົວຂໍ້", recipient.title],
      ["ສະຖານທີ່", recipient.location_name],
      ["ສະຖານະ", resultLabel],
      ["ເຫດຜົນ", approved ? "" : reason],
    ].filter(([, value]) => value !== ""),
    actionUrl: notificationsUrl,
    actionLabel: "ເບິ່ງແຈ້ງເຕືອນ",
  });

  return deliverMessages(
    [
      {
        to: recipient.email,
        subject: `[Lost and Found] ປະກາດ${typeLabel}ຂອງທ່ານ${resultLabel}`,
        text: lines.join("\n"),
        html,
      },
    ],
    `${postType}-post-${decision}:${postId}`,
  );
}

function matchSelectors(matches) {
  const ids = new Set();
  const pairs = new Map();

  for (const match of matches ?? []) {
    const id = Number(typeof match === "number" ? match : match.matchId ?? match.id);
    if (Number.isInteger(id) && id > 0) ids.add(id);

    if (typeof match !== "object" || match === null) continue;

    const lostPostId = Number(match.lostPostId);
    const foundPostId = Number(match.foundPostId);
    if (Number.isInteger(lostPostId) && lostPostId > 0 && Number.isInteger(foundPostId) && foundPostId > 0) {
      pairs.set(`${lostPostId}:${foundPostId}`, [lostPostId, foundPostId]);
    }
  }

  return {
    ids: [...ids],
    pairs: [...pairs.values()],
  };
}

export async function notifyLostOwnersOfFoundMatches(db, { matches }) {
  const { ids, pairs } = matchSelectors(matches);
  if (!ids.length && !pairs.length) return { sent: 0, failed: 0, skipped: 0 };

  const conditions = [];
  const params = [];

  if (ids.length) {
    conditions.push(`m.id IN (${ids.map(() => "?").join(", ")})`);
    params.push(...ids);
  }

  if (pairs.length) {
    conditions.push(pairs.map(() => "(m.lost_post_id = ? AND m.found_post_id = ?)").join(" OR "));
    params.push(...pairs.flat());
  }

  const [rows] = await db.execute(
    `
      SELECT
        m.id,
        m.match_score,
        lp.title AS lost_title,
        lp.lost_at,
        fp.title AS found_title,
        fp.found_at,
        CONCAT(
          fl.name_th,
          IF(fl.floor IS NOT NULL AND fl.floor <> '', CONCAT(' ຊັ້ນ ', fl.floor), '')
        ) AS found_location_name,
        owner.username,
        owner.first_name,
        owner.last_name,
        owner.email
      FROM matches m
      INNER JOIN lost_posts lp ON lp.id = m.lost_post_id
      INNER JOIN found_posts fp ON fp.id = m.found_post_id
      INNER JOIN members owner ON owner.id = lp.owner_id
      LEFT JOIN locations fl ON fl.id = fp.found_location_id
      WHERE (${conditions.join(" OR ")})
        AND (m.status IS NULL OR m.status <> 'rejected')
        AND lp.deleted_at IS NULL
        AND fp.deleted_at IS NULL
        AND lp.status IN ('published', 'matched')
        AND fp.status IN ('approved', 'matched')
        AND owner.is_active = 1
        AND owner.email IS NOT NULL
        AND owner.email <> ''
      ORDER BY m.match_score DESC, m.created_at DESC
    `,
    params,
  );

  if (!rows.length) return { sent: 0, failed: 0, skipped: ids.length + pairs.length };

  const matchUrl = publicAppUrl("#matching");
  const messages = rows.map((row) => {
    const ownerName = personName(row);
    const scoreText = `${Math.round(Number(row.match_score) || 0)}%`;
    const rowsForEmail = [
      ["ຂອງທີ່ທ່ານແຈ້ງຫາຍ", row.lost_title],
      ["ລາຍການທີ່ພົບ", row.found_title],
      ["ສະຖານທີ່ພົບ", row.found_location_name],
      ["ວັນເວລາພົບ", row.found_at],
      ["ຄະແນນຄວາມໃກ້ຄຽງ", scoreText],
    ];
    const intro =
      "ລະບົບພົບວ່າມີລາຍການພົບຂອງທີ່ຖືກສົ່ງເຂົ້າຫ້ອງຄຸ້ມຄອງ ແລະ ມີຂໍ້ມູນໃກ້ຄຽງກັບປະກາດຂອງຫາຍຂອງທ່ານ. ກະລຸນາກວດລາຍລະອຽດ ແລະ ໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ.";

    return {
      to: row.email,
      subject: "[Lost and Found] ມີລາຍການພົບຂອງທີ່ອາດເປັນຂອງທ່ານ",
      text: [
        `ສະບາຍດີ ${ownerName}`,
        "",
        "ມີລາຍການພົບຂອງທີ່ອາດເປັນຂອງທ່ານ",
        `ຂອງທີ່ທ່ານແຈ້ງຫາຍ: ${row.lost_title || "ບໍ່ລະບຸ"}`,
        `ລາຍການທີ່ພົບ: ${row.found_title || "ບໍ່ລະບຸ"}`,
        `ສະຖານທີ່ພົບ: ${row.found_location_name || "ບໍ່ລະບຸ"}`,
        `ຄະແນນຄວາມໃກ້ຄຽງ: ${scoreText}`,
        "",
        "ນີ້ເປັນລາຍການແນະນຳຈາກລະບົບ ຍັງບໍ່ແມ່ນການຢືນຢັນ 100%. ກະລຸນາໄປກວດສອບທີ່ຫ້ອງຄຸ້ມຄອງ.",
        "",
        `ເບິ່ງລາຍການໃກ້ຄຽງ: ${matchUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: "ມີລາຍການພົບຂອງທີ່ອາດເປັນຂອງທ່ານ",
        intro,
        rows: rowsForEmail,
        actionUrl: matchUrl,
        actionLabel: "ເບິ່ງລາຍການໃກ້ຄຽງ",
      }),
    };
  });

  return deliverMessages(messages, `lost-owner-found-matches:${ids.join(",") || pairs.map(([lost, found]) => `${lost}-${found}`).join(",")}`);
}

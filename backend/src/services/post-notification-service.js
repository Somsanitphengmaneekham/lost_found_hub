import { isEmailDeliveryConfigured, sendEmail } from "./email-delivery.js";
import {
  createNotification,
  createNotificationsForMembers,
  ensureNotificationSchema,
  listActiveTeacherIds,
} from "./notification-store.js";

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
  const normalizedHash = String(hash || "").startsWith("#") ? hash : `#${hash || ""}`;
  return `${baseUrl}/${normalizedHash}`;
}

function pickupLocationText() {
  return String(process.env.PICKUP_LOCATION || "ຫ້ອງຄຸ້ມຄອງ").trim() || "ຫ້ອງຄຸ້ມຄອງ";
}

function pickupHoursText() {
  return String(process.env.PICKUP_HOURS || "ຈັນ–ສຸກ 08:00–16:00").trim() || "ຈັນ–ສຸກ 08:00–16:00";
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
      SELECT id, username, first_name, last_name, email
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

  const allTeacherIds = await listActiveTeacherIds(db);
  await createNotificationsForMembers(db, allTeacherIds, {
    eventType: `${postType}_post_submitted`,
    title: copy.heading,
    body: `${post.title || "ປະກາດໃໝ່"} · ${post.locationName || "ບໍ່ລະບຸສະຖານທີ່"}`,
    meta: `ສະເພາະອາຈານ · ${reporterName}`,
    href: "#approval",
    actionLabel: "ໄປອະນຸມັດ",
    tone: "amber",
    priority: 1,
    entityType: postType === "lost" ? "lost_post" : "found_post",
    entityId: post.id,
  });

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
      SELECT id, username, first_name, last_name, email
      FROM members
      WHERE role = 'teacher'
        AND is_active = 1
        AND email IS NOT NULL
        AND email <> ''
    `,
  );

  const foundPostId = claim.foundPostId ?? claim.found_post_id;
  const claimPath = foundPostId ? `#approval?found=${foundPostId}&claim=${claim.id}` : "#approval";
  const approvalUrl = publicAppUrl(claimPath);
  const rows = [
    ["ລາຍການທີ່ຂໍຮັບ", claim.foundTitle],
    ["ຜູ້ຂໍຮັບ", claim.claimantName],
    ["ສະຖານທີ່ພົບ", claim.locationName],
    ["ຂໍ້ຄວາມ", claim.claimMessage],
    ["ສະຖານະ", "ລໍຖ້າກວດສອບ"],
  ];

  const allTeacherIds = await listActiveTeacherIds(db);
  await createNotificationsForMembers(db, allTeacherIds, {
    eventType: "claim_request_submitted",
    title: "ບັດນັກສຶກສາລໍຖ້າກວດສອບ",
    body: `${claim.foundTitle || "ສິ່ງຂອງທີ່ພົບ"} · ${claim.claimantName || "ນັກສຶກສາ"}`,
    meta: "ສະເພາະອາຈານ · ກວດບັດ/ຕົວຕົນກ່ອນສົ່ງຄືນ",
    href: claimPath,
    actionLabel: "ໄປກວດສອບ",
    tone: "amber",
    priority: 1,
    entityType: "claim_request",
    entityId: claim.id,
  });

  if (claim.claimantId) {
    const studentPath = foundPostId
      ? `#announcement-detail?found=${foundPostId}&claim=${claim.id}`
      : "#notifications";
    await createNotification(db, {
      memberId: claim.claimantId,
      eventType: "claim_request_received",
      title: "ລໍຖ້າອາຈານກວດສອບ",
      body: `${claim.foundTitle || "ສິ່ງຂອງທີ່ພົບ"} · ກະລຸນາໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ`,
      meta: "ສະເພາະນັກສຶກສາ · ລໍຖ້າກວດສອບຕົວຕົນ",
      href: studentPath,
      actionLabel: "ເບິ່ງລາຍລະອຽດ",
      tone: "blue",
      priority: 2,
      entityType: "claim_request",
      entityId: claim.id,
    });
  }

  const pickupLocation = pickupLocationText();
  const pickupHours = pickupHoursText();
  const studentDetailUrl = foundPostId
    ? publicAppUrl(`#announcement-detail?found=${foundPostId}&claim=${claim.id}`)
    : publicAppUrl("#notifications");

  const teacherMessages = teachers.map((teacher) => {
    const teacherName = personName(teacher);
    const intro = `ສະບາຍດີ ${teacherName}, ມີນັກສຶກສາຂໍຮັບສິ່ງຂອງ — ບັດນັກສຶກສາລໍຖ້າກວດສອບ. ກະລຸນາກວດຕົວຕົນ ແລະ ສິ່ງຂອງຈິງທີ່ຫ້ອງຄຸ້ມຄອງກ່ອນບັນທຶກການສົ່ງຄືນ.`;

    return {
      to: teacher.email,
      subject: `[Lost and Found] ບັດນັກສຶກສາລໍຖ້າກວດສອບ`,
      text: [
        `ສະບາຍດີ ${teacherName}`,
        "",
        "ມີນັກສຶກສາສົ່ງຄຳຂໍຮັບສິ່ງຂອງ — ບັດ/ຕົວຕົນລໍຖ້າກວດສອບ",
        `ລາຍການ: ${claim.foundTitle || "ບໍ່ລະບຸ"}`,
        `ຜູ້ຂໍຮັບ: ${claim.claimantName || "ບໍ່ລະບຸ"}`,
        `ສະຖານທີ່ພົບ: ${claim.locationName || "ບໍ່ລະບຸ"}`,
        `ຂໍ້ຄວາມ: ${claim.claimMessage || "ບໍ່ລະບຸ"}`,
        "",
        "ກະລຸນາກວດສອບບັດນັກສຶກສາ ແລະ ສິ່ງຂອງຈິງທີ່ຫ້ອງຄຸ້ມຄອງກ່ອນບັນທຶກການສົ່ງຄືນ.",
        "",
        `ເຂົ້າໄປກວດສອບ: ${approvalUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: "ບັດນັກສຶກສາລໍຖ້າກວດສອບ",
        intro,
        rows,
        actionUrl: approvalUrl,
        actionLabel: "ເຂົ້າໄປກວດສອບໃນເວັບ",
      }),
    };
  });

  const claimantMessages = [];
  if (claim.claimantEmail) {
    const claimantName = claim.claimantName || "ນັກສຶກສາ";
    claimantMessages.push({
      to: claim.claimantEmail,
      subject: "[Lost and Found] ຮັບຄຳຂໍຮັບສິ່ງຂອງຂອງທ່ານແລ້ວ",
      text: [
        `ສະບາຍດີ ${claimantName}`,
        "",
        "ລະບົບໄດ້ຮັບຄຳຂໍຮັບສິ່ງຂອງຂອງທ່ານແລ້ວ",
        `ລາຍການ: ${claim.foundTitle || "ບໍ່ລະບຸ"}`,
        `ສະຖານທີ່ພົບ: ${claim.locationName || "ບໍ່ລະບຸ"}`,
        `ສະຖານະ: ລໍຖ້າອາຈານກວດສອບ`,
        `ຈຸດຢືນຢັນ: ${pickupLocation}`,
        `ເວລາໃຫ້ບໍລິການ: ${pickupHours}`,
        "",
        "ກະລຸນານຳບັດນັກສຶກສາໄປຢືນຢັນຕົວຕົນທີ່ຫ້ອງຄຸ້ມຄອງ.",
        "",
        `ເບິ່ງລາຍລະອຽດ: ${studentDetailUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: "ຮັບຄຳຂໍຮັບສິ່ງຂອງຂອງທ່ານແລ້ວ",
        intro: `ລະບົບໄດ້ຮັບຄຳຂໍຮັບແລ້ວ. ກະລຸນາໄປຢືນຢັນຕົວຕົນທີ່ ${pickupLocation} ໃນວັນເວລາ ${pickupHours}.`,
        rows: [
          ["ລາຍການທີ່ຂໍຮັບ", claim.foundTitle],
          ["ສະຖານທີ່ພົບ", claim.locationName],
          ["ສະຖານະ", "ລໍຖ້າອາຈານກວດສອບ"],
          ["ຈຸດຢືນຢັນ", pickupLocation],
          ["ເວລາໃຫ້ບໍລິການ", pickupHours],
        ],
        actionUrl: studentDetailUrl,
        actionLabel: "ເບິ່ງລາຍລະອຽດໃນເວັບ",
      }),
    });
  }

  return deliverMessages(
    [...teacherMessages, ...claimantMessages],
    `claim-request-submitted:${claim.id}`,
  );
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
        m.id AS member_id,
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
  if (!recipient) return { sent: 0, failed: 0, skipped: 1 };

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

  await createNotification(db, {
    memberId: recipient.member_id,
    eventType: "lost_marked_found",
    title: "ອາຈານແຈ້ງວ່າພົບຂອງຂອງທ່ານແລ້ວ",
    body: `${recipient.title || "ປະກາດຂອງສູນຫາຍ"} · ${recipient.location_name || "ບໍ່ລະບຸສະຖານທີ່"}`,
    meta: "ສະເພາະນັກສຶກສາ · ນຳບັດໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ",
    href: "#notifications",
    actionLabel: "ເບິ່ງແຈ້ງເຕືອນ",
    tone: "green",
    priority: 1,
    entityType: "lost_post",
    entityId: lostPostId,
  });

  if (!recipient.email) return { sent: 0, failed: 0, skipped: 1 };

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
  if (!recipient) return { sent: 0, failed: 0, skipped: 1 };

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

  await createNotification(db, {
    memberId: recipient.member_id,
    eventType: `${postType}_post_${decision}`,
    title: `ປະກາດ${typeLabel}ຂອງທ່ານ${resultLabel}`,
    body: approved
      ? `${recipient.title || "ປະກາດ"} · ${recipient.location_name || "ບໍ່ລະບຸສະຖານທີ່"}`
      : `${recipient.title || "ປະກາດ"} · ${String(reason || "ກະລຸນາກວດລາຍລະອຽດແລ້ວສົ່ງໃໝ່").trim()}`,
    meta: approved ? "ສະເພາະນັກສຶກສາ · ເຜີຍແຜ່ໃນໜ້າຫຼັກ" : "ສະເພາະນັກສຶກສາ · ຕ້ອງແກ້ໄຂ",
    href: "#notifications",
    actionLabel: "ເບິ່ງແຈ້ງເຕືອນ",
    tone: approved ? "green" : "red",
    priority: approved ? 4 : 1,
    entityType: postType === "lost" ? "lost_post" : "found_post",
    entityId: postId,
  });

  if (!recipient.email) return { sent: 0, failed: 0, skipped: 1 };

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
  await ensureNotificationSchema(db);
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
        lp.id AS lost_post_id,
        lp.title AS lost_title,
        lp.lost_at,
        fp.title AS found_title,
        fp.found_at,
        CONCAT(
          fl.name_th,
          IF(fl.floor IS NOT NULL AND fl.floor <> '', CONCAT(' ຊັ້ນ ', fl.floor), '')
        ) AS found_location_name,
        owner.id AS owner_id,
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
        AND COALESCE(m.status, 'suggested') <> 'rejected'
        AND lp.deleted_at IS NULL
        AND fp.deleted_at IS NULL
        AND lp.status IN ('published', 'matched')
        AND fp.status IN ('approved', 'matched')
        AND owner.is_active = 1
      ORDER BY m.match_score DESC, m.created_at DESC
    `,
    params,
  );

  if (!rows.length) return { sent: 0, failed: 0, skipped: ids.length + pairs.length };

  const matchUrl = publicAppUrl("#matching");

  for (const row of rows) {
    await createNotification(db, {
      memberId: row.owner_id,
      eventType: "match_suggested",
      title: "ມີລາຍການພົບຂອງທີ່ອາດເປັນຂອງທ່ານ",
      body: `${row.found_title || "ຂອງທີ່ພົບ"} ອາດກົງກັບ ${row.lost_title || "ຂອງສູນຫາຍ"}`,
      meta: `ຄະແນນ ${Math.round(Number(row.match_score) || 0)}% · ໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ`,
      href: "#matching",
      actionLabel: "ເບິ່ງລາຍການໃກ້ຄຽງ",
      tone: "green",
      priority: 2,
      entityType: "match",
      entityId: row.id,
    });
  }

  const emailRows = rows.filter((row) => row.email);
  const messages = emailRows.map((row) => {
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

export async function notifyClaimantOfDecision(db, { claim, decision, reason = "" }) {
  const approved = decision === "approved";
  const resultLabel = approved ? "ອະນຸມັດແລ້ວ" : "ຖືກປະຕິເສດ";
  const claimantId = Number(claim.claimantId);
  const claimantEmail = claim.claimantEmail;
  const claimantName = claim.claimantName || "ນັກສຶກສາ";
  const pickupLocation = pickupLocationText();
  const pickupHours = pickupHoursText();
  const foundPostId = claim.foundPostId ?? claim.found_post_id;
  const studentDetailPath = foundPostId
    ? `#announcement-detail?found=${foundPostId}&claim=${claim.id}`
    : "#notifications";
  const studentDetailUrl = publicAppUrl(studentDetailPath);
  // Wireframe student case "ຢືນຢັນຕົວຕົນແລ້ວ" = claim approved after identity check
  const approvedTitle = "ຢືນຢັນຕົວຕົນແລ້ວ";
  const rejectedTitle = "ຄຳຂໍຮັບສິ່ງຂອງຖືກປະຕິເສດ";

  if (Number.isInteger(claimantId) && claimantId > 0) {
    await createNotification(db, {
      memberId: claimantId,
      eventType: approved ? "identity_verified" : `claim_request_${decision}`,
      title: approved ? approvedTitle : rejectedTitle,
      body: approved
        ? `${claim.foundTitle || "ສິ່ງຂອງທີ່ພົບ"} · ມາຮັບທີ່ ${pickupLocation} (${pickupHours})`
        : `${claim.foundTitle || "ສິ່ງຂອງທີ່ພົບ"} · ${String(reason || "ກະລຸນາກວດສອບເຫດຜົນ").trim()}`,
      meta: approved
        ? "ສະເພາະນັກສຶກສາ · ຢືນຢັນຕົວຕົນແລ້ວ · ມາຮັບຂອງ"
        : "ສະເພາະນັກສຶກສາ · ຄຳຂໍຮັບບໍ່ຜ່ານ",
      href: studentDetailPath,
      actionLabel: "ເບິ່ງລາຍລະອຽດ",
      tone: approved ? "green" : "red",
      priority: 1,
      entityType: "claim_request",
      entityId: claim.id,
    });
  }

  if (!claimantEmail) return { sent: 0, failed: 0, skipped: 1 };

  const rows = [
    ["ລາຍການທີ່ຂໍຮັບ", claim.foundTitle],
    ["ສະຖານທີ່ພົບ", claim.locationName],
    ["ສະຖານະ", approved ? "ຢືນຢັນຕົວຕົນແລ້ວ" : resultLabel],
    ["ຈຸດຮັບຂອງ", approved ? pickupLocation : ""],
    ["ເວລາໃຫ້ບໍລິການ", approved ? pickupHours : ""],
    ["ເຫດຜົນ", approved ? "" : reason],
  ].filter(([, value]) => value !== "" && value != null);

  return deliverMessages(
    [
      {
        to: claimantEmail,
        subject: approved
          ? "[Lost and Found] ຢືນຢັນຕົວຕົນແລ້ວ — ມາຮັບສິ່ງຂອງໄດ້"
          : `[Lost and Found] ຄຳຂໍຮັບສິ່ງຂອງຂອງທ່ານ${resultLabel}`,
        text: [
          `ສະບາຍດີ ${claimantName}`,
          "",
          approved
            ? "ອາຈານໄດ້ຢືນຢັນຕົວຕົນຂອງທ່ານແລ້ວ ແລະ ອະນຸມັດຄຳຂໍຮັບສິ່ງຂອງ"
            : `ຄຳຂໍຮັບສິ່ງຂອງຂອງທ່ານ${resultLabel}`,
          `ລາຍການ: ${claim.foundTitle || "ບໍ່ລະບຸ"}`,
          `ສະຖານທີ່ພົບ: ${claim.locationName || "ບໍ່ລະບຸ"}`,
          ...(approved
            ? [
                `ຈຸດຮັບຂອງ: ${pickupLocation}`,
                `ເວລາໃຫ້ບໍລິການ: ${pickupHours}`,
                "ກະລຸນານຳບັດນັກສຶກສາໄປຮັບຂອງທີ່ຫ້ອງຄຸ້ມຄອງ.",
              ]
            : [
                `ເຫດຜົນ: ${String(reason || "ຂໍ້ມູນຍັງບໍ່ພຽງພໍ").trim()}`,
                "ກະລຸນາກວດສອບເຫດຜົນ ແລະ ຕິດຕໍ່ຫ້ອງຄຸ້ມຄອງຖ້າຕ້ອງການຂໍ້ມູນເພີ່ມ.",
              ]),
          "",
          `ເບິ່ງລາຍລະອຽດ: ${studentDetailUrl}`,
        ].join("\n"),
        html: emailShell({
          heading: approved ? approvedTitle : `ຄຳຂໍຮັບສິ່ງຂອງຂອງທ່ານ${resultLabel}`,
          intro: approved
            ? `ອາຈານຢືນຢັນຕົວຕົນແລ້ວ. ກະລຸນາມາຮັບສິ່ງຂອງທີ່ ${pickupLocation} ໃນວັນເວລາ ${pickupHours}.`
            : "ຄຳຂໍຮັບຖືກປະຕິເສດ ກະລຸນາກວດເຫດຜົນໃນໜ້າແຈ້ງເຕືອນ.",
          rows,
          actionUrl: studentDetailUrl,
          actionLabel: "ເບິ່ງລາຍລະອຽດໃນເວັບ",
        }),
      },
    ],
    `claim-request-${decision}:${claim.id}`,
  );
}

async function findFoundPostFinder(db, foundPostId) {
  if (!foundPostId) return null;
  const [rows] = await db.execute(
    `
      SELECT
        fp.id,
        fp.title,
        m.id AS member_id,
        m.username,
        m.first_name,
        m.last_name,
        m.email
      FROM found_posts fp
      INNER JOIN members m ON m.id = fp.finder_id
      WHERE fp.id = ?
      LIMIT 1
    `,
    [foundPostId],
  );
  return rows[0] ?? null;
}

export async function notifyClaimantOfReturn(db, { claim, foundTitle }) {
  await ensureNotificationSchema(db);
  const claimantId = Number(claim?.claimantId);
  const claimantEmail = claim?.claimantEmail;
  const claimantName = claim?.claimantName || "ນັກສຶກສາ";
  const title = foundTitle || claim?.foundTitle || "ສິ່ງຂອງທີ່ພົບ";
  const pickupLocation = pickupLocationText();
  const notificationsUrl = publicAppUrl("#reports");
  const foundPostId = claim?.foundPostId ?? claim?.found_post_id;
  const messages = [];

  if (Number.isInteger(claimantId) && claimantId > 0) {
    await createNotification(db, {
      memberId: claimantId,
      eventType: "claim_request_returned",
      title: "ສົ່ງຄືນສຳເລັດ",
      body: `${title} · ບັນທຶກການຄືນຂອງທີ່ ${pickupLocation} ແລ້ວ`,
      meta: "ສະເພາະນັກສຶກສາ · ຮັບສິ່ງຂອງຄືນແລ້ວ",
      href: "#reports",
      actionLabel: "ເບິ່ງລາຍງານ",
      tone: "green",
      priority: 2,
      entityType: "claim_request",
      entityId: claim.id,
    });
  }

  if (claimantEmail) {
    messages.push({
      to: claimantEmail,
      subject: "[Lost and Found] ສົ່ງຄືນສຳເລັດ — ທ່ານຮັບສິ່ງຂອງຄືນແລ້ວ",
      text: [
        `ສະບາຍດີ ${claimantName}`,
        "",
        "ອາຈານໄດ້ບັນທຶກວ່າທ່ານຮັບສິ່ງຂອງຄືນແລ້ວ",
        `ລາຍການ: ${title}`,
        `ສະຖານທີ່: ${pickupLocation}`,
        "",
        `ເບິ່ງລາຍງານ: ${notificationsUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: "ສົ່ງຄືນສຳເລັດ",
        intro: "ອາຈານໄດ້ບັນທຶກການຄືນສິ່ງຂອງໃຫ້ທ່ານແລ້ວ.",
        rows: [
          ["ລາຍການ", title],
          ["ສະຖານທີ່", pickupLocation],
          ["ສະຖານະ", "ຄືນຂອງແລ້ວ"],
        ],
        actionUrl: notificationsUrl,
        actionLabel: "ເບິ່ງລາຍງານ",
      }),
    });
  }

  // Wireframe / legacy: finder also learns the item was returned
  const finder = await findFoundPostFinder(db, foundPostId);
  if (finder && Number(finder.member_id) !== claimantId) {
    await createNotification(db, {
      memberId: finder.member_id,
      eventType: "found_item_returned",
      title: "ສົ່ງຄືນສຳເລັດ",
      body: `${title} · ລາຍການທີ່ທ່ານແຈ້ງພົບຖືກຄືນໃຫ້ເຈົ້າຂອງແລ້ວ`,
      meta: "ສະເພາະນັກສຶກສາ · ການຄືນຂອງສຳເລັດ",
      href: "#reports",
      actionLabel: "ເບິ່ງລາຍງານ",
      tone: "green",
      priority: 3,
      entityType: "found_post",
      entityId: foundPostId,
    });

    if (finder.email) {
      messages.push({
        to: finder.email,
        subject: "[Lost and Found] ສົ່ງຄືນສຳເລັດ — ລາຍການທີ່ທ່ານແຈ້ງພົບ",
        text: [
          `ສະບາຍດີ ${personName(finder)}`,
          "",
          "ລາຍການທີ່ທ່ານແຈ້ງພົບຖືກຄືນໃຫ້ເຈົ້າຂອງແລ້ວ",
          `ລາຍການ: ${title}`,
          `ສະຖານທີ່: ${pickupLocation}`,
          "",
          `ເບິ່ງລາຍງານ: ${notificationsUrl}`,
        ].join("\n"),
        html: emailShell({
          heading: "ສົ່ງຄືນສຳເລັດ",
          intro: "ອາຈານໄດ້ບັນທຶກວ່າລາຍການທີ່ທ່ານແຈ້ງພົບຖືກຄືນໃຫ້ເຈົ້າຂອງແລ້ວ.",
          rows: [
            ["ລາຍການ", title],
            ["ສະຖານທີ່", pickupLocation],
            ["ສະຖານະ", "ຄືນຂອງແລ້ວ"],
          ],
          actionUrl: notificationsUrl,
          actionLabel: "ເບິ່ງລາຍງານ",
        }),
      });
    }
  }

  if (!messages.length) return { sent: 0, failed: 0, skipped: 1 };

  return deliverMessages(messages, `claim-request-returned:${claim?.id || "unknown"}`);
}

export async function notifyMatchConfirmed(db, { match }) {
  await ensureNotificationSchema(db);
  const matchUrl = publicAppUrl("#matching");
  const lostTitle = match.lostTitle || match.lost?.title || "ຂອງສູນຫາຍ";
  const foundTitle = match.foundTitle || match.found?.title || "ຂອງທີ່ພົບ";
  const scoreText = `${Math.round(Number(match.matchScore) || 0)}%`;

  const recipients = [];
  if (match.lostOwnerId) {
    recipients.push({
      memberId: match.lostOwnerId,
      email: match.lostOwnerEmail,
      name: match.lostOwnerName || "ເຈົ້າຂອງ",
      role: "owner",
    });
  }
  if (match.foundFinderId && Number(match.foundFinderId) !== Number(match.lostOwnerId)) {
    recipients.push({
      memberId: match.foundFinderId,
      email: match.foundFinderEmail,
      name: match.foundFinderName || "ຜູ້ພົບ",
      role: "finder",
    });
  }

  for (const recipient of recipients) {
    await createNotification(db, {
      memberId: recipient.memberId,
      eventType: "match_confirmed",
      title: "ຢືນຢັນລາຍການໃກ້ຄຽງແລ້ວ",
      body: `${foundTitle} ກົງກັບ ${lostTitle}`,
      meta: `ຄະແນນ ${scoreText} · ໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ`,
      href: "#matching",
      actionLabel: "ເບິ່ງລາຍການໃກ້ຄຽງ",
      tone: "green",
      priority: 1,
      entityType: "match",
      entityId: match.id,
    });
  }

  const messages = recipients
    .filter((recipient) => recipient.email)
    .map((recipient) => ({
      to: recipient.email,
      subject: "[Lost and Found] ຢືນຢັນລາຍການໃກ້ຄຽງແລ້ວ",
      text: [
        `ສະບາຍດີ ${recipient.name}`,
        "",
        "ລາຍການໃກ້ຄຽງຖືກຢືນຢັນແລ້ວ",
        `ຂອງສູນຫາຍ: ${lostTitle}`,
        `ຂອງທີ່ພົບ: ${foundTitle}`,
        `ຄະແນນ: ${scoreText}`,
        "",
        "ກະລຸນາໄປຢືນຢັນລາຍລະອຽດ ແລະ ຮັບສິ່ງຂອງທີ່ຫ້ອງຄຸ້ມຄອງ.",
        "",
        `ເບິ່ງລາຍການ: ${matchUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: "ຢືນຢັນລາຍການໃກ້ຄຽງແລ້ວ",
        intro: "ອາຈານ ຫຼື ລະບົບໄດ້ຢືນຢັນວ່າລາຍການນີ້ໃກ້ຄຽງກັນແລ້ວ ກະລຸນາໄປດຳເນີນການຕໍ່ທີ່ຫ້ອງຄຸ້ມຄອງ.",
        rows: [
          ["ຂອງສູນຫາຍ", lostTitle],
          ["ຂອງທີ່ພົບ", foundTitle],
          ["ຄະແນນຄວາມໃກ້ຄຽງ", scoreText],
        ],
        actionUrl: matchUrl,
        actionLabel: "ເບິ່ງລາຍການໃກ້ຄຽງ",
      }),
    }));

  return deliverMessages(messages, `match-confirmed:${match.id}`);
}

export async function notifyAuthorOfSubmissionPending(db, { postType, post }) {
  await ensureNotificationSchema(db);
  const postId = post?.id;
  if (!postId) return { sent: 0, failed: 0, skipped: 1 };

  const recipient = await findPostRecipient(db, postType, postId);
  if (!recipient) return { sent: 0, failed: 0, skipped: 1 };

  const typeLabel = postTypeLabel(postType);
  const notificationsUrl = publicAppUrl("#notifications");
  const location = recipient.location_name || post.locationName || "ບໍ່ລະບຸສະຖານທີ່";

  await createNotification(db, {
    memberId: recipient.member_id,
    eventType: `${postType}_post_pending`,
    title: "ລໍຖ້າອາຈານກວດສອບ",
    body: `${recipient.title || post.title || "ປະກາດ"} · ${location}`,
    meta: `ສະເພາະນັກສຶກສາ · ປະກາດ${typeLabel}ລໍຖ້າອະນຸມັດ`,
    href: "#dashboard",
    actionLabel: "ເບິ່ງ Dashboard",
    tone: "blue",
    priority: 2,
    entityType: postType === "lost" ? "lost_post" : "found_post",
    entityId: postId,
  });

  if (!recipient.email) return { sent: 0, failed: 0, skipped: 1 };

  return deliverMessages(
    [
      {
        to: recipient.email,
        subject: `[Lost and Found] ຮັບປະກາດ${typeLabel}ຂອງທ່ານແລ້ວ — ລໍຖ້າອະນຸມັດ`,
        text: [
          `ສະບາຍດີ ${personName(recipient)}`,
          "",
          `ລະບົບໄດ້ຮັບປະກາດ${typeLabel}ຂອງທ່ານແລ້ວ ແລະ ກຳລັງລໍຖ້າອາຈານກວດສອບ`,
          `ຫົວຂໍ້: ${recipient.title || post.title || "ບໍ່ລະບຸ"}`,
          `ສະຖານທີ່: ${location}`,
          "",
          `ເບິ່ງແຈ້ງເຕືອນ: ${notificationsUrl}`,
        ].join("\n"),
        html: emailShell({
          heading: "ລໍຖ້າອາຈານກວດສອບ",
          intro: `ປະກາດ${typeLabel}ຂອງທ່ານຖືກບັນທຶກແລ້ວ ແລະ ລໍຖ້າອາຈານອະນຸມັດ.`,
          rows: [
            ["ປະເພດປະກາດ", typeLabel],
            ["ຫົວຂໍ້", recipient.title || post.title],
            ["ສະຖານທີ່", location],
            ["ສະຖານະ", "ລໍຖ້າອະນຸມັດ"],
          ],
          actionUrl: notificationsUrl,
          actionLabel: "ເບິ່ງແຈ້ງເຕືອນ",
        }),
      },
    ],
    `${postType}-post-pending:${postId}`,
  );
}

/** Wireframe teacher case: ຕ້ອງບັນທຶກການສົ່ງຄືນ */
export async function notifyTeachersOfReturnNeeded(db, { source, title, detail, href, entityType, entityId }) {
  await ensureNotificationSchema(db);
  const [teachers] = await db.execute(
    `
      SELECT id, username, first_name, last_name, email
      FROM members
      WHERE role = 'teacher'
        AND is_active = 1
        AND email IS NOT NULL
        AND email <> ''
    `,
  );

  const path = href || "#approval";
  const approvalUrl = publicAppUrl(path);
  const itemTitle = title || "ສິ່ງຂອງ";
  const detailText = detail || "ກະລຸນາບັນທຶກການສົ່ງຄືນເມື່ອເຈົ້າຂອງມາຮັບ";

  const allTeacherIds = await listActiveTeacherIds(db);
  await createNotificationsForMembers(db, allTeacherIds, {
    eventType: "return_confirmation_needed",
    title: "ຕ້ອງບັນທຶກການສົ່ງຄືນ",
    body: `${itemTitle} · ${detailText}`,
    meta: `ສະເພາະອາຈານ · ${source || "ລໍຖ້າບັນທຶກຄືນຂອງ"}`,
    href: path,
    actionLabel: "ໄປບັນທຶກຄືນຂອງ",
    tone: "amber",
    priority: 2,
    entityType: entityType || "claim_request",
    entityId: entityId || null,
  });

  const messages = teachers.map((teacher) => {
    const teacherName = personName(teacher);
    return {
      to: teacher.email,
      subject: "[Lost and Found] ຕ້ອງບັນທຶກການສົ່ງຄືນ",
      text: [
        `ສະບາຍດີ ${teacherName}`,
        "",
        "ມີລາຍການທີ່ພ້ອມສົ່ງຄືນ — ກະລຸນາບັນທຶກເມື່ອເຈົ້າຂອງມາຮັບ",
        `ລາຍການ: ${itemTitle}`,
        `ລາຍລະອຽດ: ${detailText}`,
        "",
        `ເຂົ້າໄປບັນທຶກ: ${approvalUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: "ຕ້ອງບັນທຶກການສົ່ງຄືນ",
        intro: `ສະບາຍດີ ${teacherName}, ມີລາຍການທີ່ພ້ອມໃຫ້ບັນທຶກການສົ່ງຄືນ.`,
        rows: [
          ["ລາຍການ", itemTitle],
          ["ລາຍລະອຽດ", detailText],
          ["ແຫຼ່ງ", source || "ລະບົບ"],
        ],
        actionUrl: approvalUrl,
        actionLabel: "ເຂົ້າໄປບັນທຶກໃນເວັບ",
      }),
    };
  });

  return deliverMessages(messages, `return-needed:${entityType || "item"}:${entityId || "unknown"}`);
}

export async function notifyMatchRejected(db, { match }) {
  await ensureNotificationSchema(db);
  const matchUrl = publicAppUrl("#matching");
  const lostTitle = match.lostTitle || match.lost?.title || "ຂອງສູນຫາຍ";
  const foundTitle = match.foundTitle || match.found?.title || "ຂອງທີ່ພົບ";
  const scoreText = `${Math.round(Number(match.matchScore) || 0)}%`;

  const recipients = [];
  if (match.lostOwnerId) {
    recipients.push({
      memberId: match.lostOwnerId,
      email: match.lostOwnerEmail,
      name: match.lostOwnerName || "ເຈົ້າຂອງ",
    });
  }
  if (match.foundFinderId && Number(match.foundFinderId) !== Number(match.lostOwnerId)) {
    recipients.push({
      memberId: match.foundFinderId,
      email: match.foundFinderEmail,
      name: match.foundFinderName || "ຜູ້ພົບ",
    });
  }

  for (const recipient of recipients) {
    await createNotification(db, {
      memberId: recipient.memberId,
      eventType: "match_rejected",
      title: "ລາຍການໃກ້ຄຽງຖືກປະຕິເສດ",
      body: `${foundTitle} ບໍ່ກົງກັບ ${lostTitle}`,
      meta: `ຄະແນນ ${scoreText} · ບໍ່ດຳເນີນການຕໍ່`,
      href: "#matching",
      actionLabel: "ເບິ່ງລາຍການໃກ້ຄຽງ",
      tone: "slate",
      priority: 3,
      entityType: "match",
      entityId: match.id,
    });
  }

  const messages = recipients
    .filter((recipient) => recipient.email)
    .map((recipient) => ({
      to: recipient.email,
      subject: "[Lost and Found] ລາຍການໃກ້ຄຽງຖືກປະຕິເສດ",
      text: [
        `ສະບາຍດີ ${recipient.name}`,
        "",
        "ລາຍການໃກ້ຄຽງຖືກປະຕິເສດແລ້ວ",
        `ຂອງສູນຫາຍ: ${lostTitle}`,
        `ຂອງທີ່ພົບ: ${foundTitle}`,
        `ຄະແນນ: ${scoreText}`,
        "",
        `ເບິ່ງລາຍການ: ${matchUrl}`,
      ].join("\n"),
      html: emailShell({
        heading: "ລາຍການໃກ້ຄຽງຖືກປະຕິເສດ",
        intro: "ລາຍການນີ້ຖືກປະຕິເສດວ່າບໍ່ໃກ້ຄຽງກັນ ຫຼື ບໍ່ດຳເນີນການຕໍ່.",
        rows: [
          ["ຂອງສູນຫາຍ", lostTitle],
          ["ຂອງທີ່ພົບ", foundTitle],
          ["ຄະແນນຄວາມໃກ້ຄຽງ", scoreText],
        ],
        actionUrl: matchUrl,
        actionLabel: "ເບິ່ງລາຍການໃກ້ຄຽງ",
      }),
    }));

  return deliverMessages(messages, `match-rejected:${match.id}`);
}

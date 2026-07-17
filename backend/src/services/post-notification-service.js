import { isEmailDeliveryConfigured, sendEmail } from "./email-delivery.js";

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

function postTypeLabel(postType) {
  return postType === "lost" ? "ຂອງສູນຫາຍ" : "ຂອງທີ່ພົບ";
}

function personName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || row.username || "ຜູ້ໃຊ້";
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

  const typeLabel = postTypeLabel(postType);
  const messages = teachers.map((teacher) => ({
    to: teacher.email,
    subject: `[Lost and Found] ມີປະກາດ${typeLabel}ລໍຖ້າອະນຸມັດ`,
    text: [
      `ສະບາຍດີ ${personName(teacher)}`,
      "",
      `ມີປະກາດ${typeLabel}ໃໝ່ລໍຖ້າອາຈານກວດສອບ ແລະ ອະນຸມັດ`,
      `ຫົວຂໍ້: ${post.title}`,
      `ສະຖານທີ່: ${post.locationName || "ບໍ່ລະບຸ"}`,
      `ຜູ້ແຈ້ງ: ${post.finderName || post.ownerName || "ບໍ່ລະບຸ"}`,
      "",
      `ເຂົ້າໄປກວດສອບ: ${publicAppUrl("#approval")}`,
    ].join("\n"),
  }));

  return deliverMessages(messages, `${postType}-post-submitted:${post.id}`);
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

export async function notifyPostAuthorOfDecision(db, { postType, postId, decision, reason }) {
  const recipient = await findPostRecipient(db, postType, postId);
  if (!recipient?.email) return { sent: 0, failed: 0, skipped: 1 };

  const approved = decision === "approved";
  const typeLabel = postTypeLabel(postType);
  const resultLabel = approved ? "ອະນຸມັດແລ້ວ" : "ຖືກປະຕິເສດ";
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

  lines.push("", `ເບິ່ງແຈ້ງເຕືອນ: ${publicAppUrl("#notifications")}`);

  return deliverMessages(
    [
      {
        to: recipient.email,
        subject: `[Lost and Found] ປະກາດ${typeLabel}ຂອງທ່ານ${resultLabel}`,
        text: lines.join("\n"),
      },
    ],
    `${postType}-post-${decision}:${postId}`,
  );
}

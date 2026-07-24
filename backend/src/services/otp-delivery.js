import { isEmailDeliveryConfigured, sendEmail } from "./email-delivery.js";

function isEnabled(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function hasSmtpConfig() {
  return isEmailDeliveryConfigured();
}

function publicAppUrl(hash = "#home") {
  const baseUrl = String(process.env.APP_PUBLIC_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
  return `${baseUrl}/${hash}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildOtpMessage({ otp, expiresInMinutes }) {
  const resetUrl = publicAppUrl("#forgot-password");

  return [
    "Lost and Found password reset OTP",
    "",
    `Your OTP is ${otp}`,
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    `Open the website: ${resetUrl}`,
    "",
    "If you did not request this, you can ignore this message.",
  ].join("\n");
}

function buildOtpHtml({ otp, expiresInMinutes }) {
  const resetUrl = publicAppUrl("#forgot-password");

  return `
    <div style="margin: 0; padding: 24px; background: #f4faf9; font-family: 'Noto Sans Lao', Arial, sans-serif;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #d6e5e1; border-radius: 14px; overflow: hidden;">
        <div style="padding: 22px 26px; background: #245b55; color: #ffffff;">
          <div style="font-size: 14px; opacity: 0.88;">Lost and Found Hub</div>
          <h1 style="margin: 8px 0 0; font-size: 24px; line-height: 1.45;">ລະຫັດ OTP ສຳລັບປ່ຽນລະຫັດຜ່ານ</h1>
        </div>
        <div style="padding: 24px 26px;">
          <p style="margin: 0 0 14px; color: #334b55; line-height: 1.7;">
            ນຳລະຫັດ OTP ນີ້ໄປຢືນຢັນໃນເວັບໄຊ Lost and Found Hub.
          </p>
          <div style="margin: 18px 0; padding: 16px; text-align: center; background: #eef8f6; border-radius: 12px;">
            <div style="font-size: 34px; letter-spacing: 8px; color: #0a2d3f; font-weight: 800;">${escapeHtml(otp)}</div>
            <div style="margin-top: 8px; color: #5d6b73;">ໝົດອາຍຸໃນ ${escapeHtml(expiresInMinutes)} ນາທີ</div>
          </div>
          <a
            href="${escapeHtml(resetUrl)}"
            style="display: inline-block; padding: 13px 18px; background: #159947; color: #ffffff; border-radius: 10px; text-decoration: none; font-weight: 800;"
          >ເຂົ້າເວັບເພື່ອປ່ຽນລະຫັດຜ່ານ</a>
          <p style="margin: 20px 0 0; color: #71828a; font-size: 13px; line-height: 1.6;">
            ຖ້າປຸ່ມກົດບໍ່ໄດ້ ສາມາດເປີດລິ້ງນີ້ໄດ້ໂດຍກົງ:<br />
            <a href="${escapeHtml(resetUrl)}" style="color: #0b766d;">${escapeHtml(resetUrl)}</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendEmailOtp({ destination, otp, expiresInMinutes }) {
  try {
    await sendEmail({
      to: destination,
      subject: "Lost and Found password reset OTP",
      text: buildOtpMessage({ otp, expiresInMinutes }),
      html: buildOtpHtml({ otp, expiresInMinutes }),
    });
  } catch (error) {
    const deliveryError = new Error(
      error?.code === "EAUTH"
        ? "Gmail ປະຕິເສດບັນຊີຜູ້ສົ່ງ ກະລຸນາກວດ SMTP_USER ແລະ Google App Password"
        : "ບໍ່ສາມາດສົ່ງ OTP ຜ່ານ Gmail ໄດ້ໃນຂະນະນີ້ ກະລຸນາລອງໃໝ່",
      { cause: error },
    );
    deliveryError.statusCode = 502;
    throw deliveryError;
  }
}

export async function deliverPasswordResetOtp({ destination, otp, expiresInMinutes }) {
  if (hasSmtpConfig()) {
    await sendEmailOtp({ destination, otp, expiresInMinutes });
    return { mode: "email" };
  }

  if (!isEnabled(process.env.OTP_DEV_MODE, false)) {
    const error = new Error(
      "ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ Gmail OTP. ກະລຸນາຕັ້ງ SMTP_HOST, SMTP_USER ແລະ SMTP_PASS ໃນໄຟລ໌ .env",
    );
    error.statusCode = 503;
    throw error;
  }

  console.info(`[password-reset] email OTP for ${destination}: ${otp}`);
  return { mode: "dev", debugOtp: otp };
}

import { isEmailDeliveryConfigured, sendEmail } from "./email-delivery.js";

function isEnabled(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function hasSmtpConfig() {
  return isEmailDeliveryConfigured();
}

function buildOtpMessage({ otp, expiresInMinutes }) {
  return [
    "Lost and Found password reset OTP",
    "",
    `Your OTP is ${otp}`,
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request this, you can ignore this message.",
  ].join("\n");
}

async function sendEmailOtp({ destination, otp, expiresInMinutes }) {
  try {
    await sendEmail({
      to: destination,
      subject: "Lost and Found password reset OTP",
      text: buildOtpMessage({ otp, expiresInMinutes }),
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

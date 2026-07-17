import nodemailer from "nodemailer";

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT ?? 587);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS.replace(/\s+/g, ""),
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

function isRetryableConnectionError(error) {
  return error?.command === "CONN" || ["ECONNECTION", "ECONNRESET", "ESOCKET", "ETIMEDOUT"].includes(error?.code);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function sendEmail({ to, subject, text, html }) {
  if (!isEmailDeliveryConfigured()) {
    const error = new Error("SMTP email is not configured");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const transporter = createTransporter();

    try {
      return await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        ...(html ? { html } : {}),
      });
    } catch (error) {
      if (attempt === 1 && isRetryableConnectionError(error)) {
        await wait(750);
        continue;
      }
      throw error;
    } finally {
      transporter.close();
    }
  }

  return null;
}

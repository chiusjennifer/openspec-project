import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
});

export async function sendTemporaryPasswordEmail(email: string, temporaryPassword: string): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Your attendance system temporary password",
    text: [
      "Your account has been created.",
      `Temporary password: ${temporaryPassword}`,
      "Please sign in and reset your password immediately."
    ].join("\n")
  });
}

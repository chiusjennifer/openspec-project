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

export async function sendPasswordResetEmail(email: string, resetLink: string, expiresMinutes: number): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Password reset request",
    text: [
      "We received a password reset request for your account.",
      `Reset link: ${resetLink}`,
      `This link will expire in ${expiresMinutes} minutes.`,
      "If you did not request this, you can ignore this email."
    ].join("\n")
  });
}

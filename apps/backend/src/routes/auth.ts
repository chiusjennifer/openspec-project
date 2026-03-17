import { Router } from "express";
import { env } from "../config/env.js";
import { query } from "../db/client.js";
import { comparePassword, createPasswordResetToken, createToken, hashPassword, hashPasswordResetToken } from "../services/auth.js";
import { sendPasswordResetEmail } from "../services/email.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ message: "email and password are required" });
    return;
  }

  const result = await query<{
    id: string;
    email: string;
    password_hash: string;
    must_reset_password: boolean;
    role_name: "admin" | "employee";
    is_active: boolean;
  }>(
    `SELECT u.id, u.email, u.password_hash, u.must_reset_password, u.is_active, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = createToken({
    id: user.id,
    email: user.email,
    roleName: user.role_name,
    mustResetPassword: user.must_reset_password
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      roleName: user.role_name,
      mustResetPassword: user.must_reset_password
    }
  });
});

authRouter.post("/reset-password", async (req, res) => {
  const { userId, newPassword } = req.body as { userId?: string; newPassword?: string };
  if (!userId || !newPassword || newPassword.length < 8) {
    res.status(400).json({ message: "userId and newPassword(>=8) are required" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await query(
    `UPDATE users
     SET password_hash = $1,
         must_reset_password = FALSE,
         temp_password_expires_at = NULL,
         reset_password_token_hash = NULL,
         reset_password_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  );

  res.json({ message: "Password reset completed" });
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ message: "email is required" });
    return;
  }

  const genericMessage = "If this email exists, a password reset link has been sent.";

  const userResult = await query<{ id: string; email: string; is_active: boolean }>(
    `SELECT id, email, is_active
     FROM users
     WHERE email = $1`,
    [email]
  );

  const user = userResult.rows[0];
  if (!user || !user.is_active) {
    res.json({ message: genericMessage });
    return;
  }

  const rawToken = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000).toISOString();

  await query(
    `UPDATE users
     SET reset_password_token_hash = $1, reset_password_expires_at = $2, updated_at = NOW()
     WHERE id = $3`,
    [tokenHash, expiresAt, user.id]
  );

  const frontendBaseUrl = env.FRONTEND_BASE_URL.replace(/\/+$/, "");
  const resetLink = `${frontendBaseUrl}/?resetToken=${encodeURIComponent(rawToken)}`;
  await sendPasswordResetEmail(user.email, resetLink, env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES);

  res.json({ message: genericMessage });
});

authRouter.post("/reset-password-by-token", async (req, res) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token || !newPassword || newPassword.length < 8) {
    res.status(400).json({ message: "token and newPassword(>=8) are required" });
    return;
  }

  const tokenHash = hashPasswordResetToken(token);
  const userResult = await query<{
    id: string;
    email: string;
    role_name: "admin" | "employee";
  }>(
    `SELECT u.id, u.email, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.reset_password_token_hash = $1
       AND u.reset_password_expires_at > NOW()
       AND u.is_active = TRUE`,
    [tokenHash]
  );

  const user = userResult.rows[0];
  if (!user) {
    res.status(400).json({ message: "Reset token is invalid or expired" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await query(
    `UPDATE users
     SET password_hash = $1,
         must_reset_password = FALSE,
         temp_password_expires_at = NULL,
         reset_password_token_hash = NULL,
         reset_password_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, user.id]
  );

  const sessionToken = createToken({
    id: user.id,
    email: user.email,
    roleName: user.role_name,
    mustResetPassword: false
  });

  res.json({
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      roleName: user.role_name,
      mustResetPassword: false
    }
  });
});

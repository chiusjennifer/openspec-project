import { Router } from "express";
import { query } from "../db/client.js";
import { comparePassword, createToken, hashPassword } from "../services/auth.js";

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
     SET password_hash = $1, must_reset_password = FALSE, temp_password_expires_at = NULL, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  );

  res.json({ message: "Password reset completed" });
});

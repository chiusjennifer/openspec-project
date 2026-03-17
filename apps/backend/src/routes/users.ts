import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { query, withTransaction } from "../db/client.js";
import { createTemporaryPassword, hashPassword } from "../services/auth.js";
import { sendTemporaryPasswordEmail } from "../services/email.js";
import { env } from "../config/env.js";

export const usersRouter = Router();

usersRouter.get("/me", async (req, res) => {
  const result = await query<{ id: string; email: string; full_name: string; role_name: string; must_reset_password: boolean }>(
    `SELECT u.id, u.email, u.full_name, u.must_reset_password, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [req.user?.id]
  );

  res.json(result.rows[0] ?? null);
});

usersRouter.get("/", requireRole("admin"), async (_req, res) => {
  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.is_active, u.must_reset_password, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at DESC`
  );
  res.json(result.rows);
});

usersRouter.post("/", requireRole("admin"), async (req, res) => {
  const { email, fullName, roleName, approverId } = req.body as {
    email?: string;
    fullName?: string;
    roleName?: "admin" | "employee";
    approverId?: string;
  };

  const normalizedEmail = email?.trim();
  const normalizedFullName = fullName?.trim();
  const normalizedApproverId = approverId?.trim();

  if (!normalizedEmail || !normalizedFullName || !roleName) {
    res.status(400).json({ message: "email, fullName, roleName are required" });
    return;
  }

  const tempPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);
  const tempExpiry = new Date(Date.now() + env.TEMP_PASSWORD_EXPIRES_HOURS * 60 * 60 * 1000).toISOString();

  let user: { id: string; email: string; full_name: string };
  try {
    user = await withTransaction(async (client) => {
      const role = await client.query<{ id: string }>("SELECT id FROM roles WHERE name = $1", [roleName]);
      if (!role.rows[0]) {
        throw new Error("Role not found");
      }

      const created = await client.query<{ id: string; email: string; full_name: string }>(
        `INSERT INTO users(email, full_name, password_hash, role_id, must_reset_password, temp_password_expires_at)
         VALUES($1, $2, $3, $4, TRUE, $5)
         RETURNING id, email, full_name`,
        [normalizedEmail, normalizedFullName, passwordHash, role.rows[0].id, tempExpiry]
      );

      await client.query(
        `INSERT INTO leave_balances(user_id, annual_minutes, compensatory_minutes)
         VALUES($1, 0, 0)
         ON CONFLICT(user_id) DO NOTHING`,
        [created.rows[0].id]
      );

      if (normalizedApproverId) {
        const approver = await client.query<{ id: string }>(
          "SELECT id FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1",
          [normalizedApproverId]
        );
        if (!approver.rows[0]) {
          throw new Error("Approver not found");
        }

        await client.query(
          `INSERT INTO user_approvers(user_id, approver_id)
           VALUES($1, $2)
           ON CONFLICT(user_id) DO UPDATE SET approver_id = EXCLUDED.approver_id`,
          [created.rows[0].id, normalizedApproverId]
        );
      }

      return created.rows[0];
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Role not found") {
      res.status(400).json({ message: "角色不存在" });
      return;
    }
    if (error instanceof Error && error.message === "Approver not found") {
      res.status(400).json({ message: "簽核者不存在或已停用" });
      return;
    }

    const code = (error as { code?: string }).code;
    if (code === "22P02") {
      res.status(400).json({ message: "簽核者格式不正確" });
      return;
    }
    if (code === "23505") {
      res.status(409).json({ message: "此電子郵件已存在" });
      return;
    }
    console.error("Create user failed", error);
    res.status(500).json({ message: "新增使用者失敗，請稍後再試" });
    return;
  }

  let emailSent = true;
  let message = "使用者建立成功，已寄送臨時密碼信件";
  try {
    await sendTemporaryPasswordEmail(normalizedEmail, tempPassword);
  } catch (error) {
    emailSent = false;
    message = "使用者已建立，但臨時密碼信件寄送失敗，請稍後重試寄送";
    console.error("Failed to send temporary password email", error);
  }

  res.status(201).json({ ...user, emailSent, message });
});

usersRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const { fullName, roleName, isActive, approverId } = req.body as {
    fullName?: string;
    roleName?: "admin" | "employee";
    isActive?: boolean;
    approverId?: string;
  };

  await withTransaction(async (client) => {
    if (fullName !== undefined || isActive !== undefined || roleName !== undefined) {
      let roleId: string | null = null;
      if (roleName) {
        const roleResult = await client.query<{ id: string }>("SELECT id FROM roles WHERE name = $1", [roleName]);
        roleId = roleResult.rows[0]?.id ?? null;
      }

      await client.query(
        `UPDATE users
         SET full_name = COALESCE($1, full_name),
             is_active = COALESCE($2, is_active),
             role_id = COALESCE($3, role_id),
             updated_at = NOW()
         WHERE id = $4`,
        [fullName ?? null, isActive ?? null, roleId, req.params.id]
      );
    }

    if (approverId !== undefined) {
      await client.query(
        `INSERT INTO user_approvers(user_id, approver_id)
         VALUES($1, $2)
         ON CONFLICT(user_id) DO UPDATE SET approver_id = EXCLUDED.approver_id`,
        [req.params.id, approverId]
      );
    }
  });

  res.json({ message: "User updated" });
});

usersRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  await query("UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ message: "User deactivated" });
});

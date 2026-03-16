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

  if (!email || !fullName || !roleName) {
    res.status(400).json({ message: "email, fullName, roleName are required" });
    return;
  }

  const tempPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);
  const tempExpiry = new Date(Date.now() + env.TEMP_PASSWORD_EXPIRES_HOURS * 60 * 60 * 1000).toISOString();

  const user = await withTransaction(async (client) => {
    const role = await client.query<{ id: string }>("SELECT id FROM roles WHERE name = $1", [roleName]);
    if (!role.rows[0]) {
      throw new Error("Role not found");
    }

    const created = await client.query<{ id: string; email: string; full_name: string }>(
      `INSERT INTO users(email, full_name, password_hash, role_id, must_reset_password, temp_password_expires_at)
       VALUES($1, $2, $3, $4, TRUE, $5)
       RETURNING id, email, full_name`,
      [email, fullName, passwordHash, role.rows[0].id, tempExpiry]
    );

    await client.query(
      `INSERT INTO leave_balances(user_id, annual_minutes, compensatory_minutes)
       VALUES($1, 0, 0)
       ON CONFLICT(user_id) DO NOTHING`,
      [created.rows[0].id]
    );

    if (approverId) {
      await client.query(
        `INSERT INTO user_approvers(user_id, approver_id)
         VALUES($1, $2)
         ON CONFLICT(user_id) DO UPDATE SET approver_id = EXCLUDED.approver_id`,
        [created.rows[0].id, approverId]
      );
    }

    return created.rows[0];
  });

  await sendTemporaryPasswordEmail(email, tempPassword);
  res.status(201).json(user);
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

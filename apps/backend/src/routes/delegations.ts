import { Router } from "express";
import { query } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";

export const delegationsRouter = Router();

delegationsRouter.get("/", requireRole("employee", "admin"), async (req, res) => {
  const result = await query(
    `SELECT * FROM delegations WHERE approver_id = $1 ORDER BY created_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows);
});

delegationsRouter.post("/", requireRole("employee", "admin"), async (req, res) => {
  const { delegateUserId, startDate, endDate } = req.body as {
    delegateUserId?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!delegateUserId || !startDate || !endDate) {
    res.status(400).json({ message: "delegateUserId, startDate, endDate are required" });
    return;
  }

  const result = await query(
    `INSERT INTO delegations(approver_id, delegate_user_id, start_date, end_date, is_active)
     VALUES($1, $2, $3, $4, TRUE)
     RETURNING *`,
    [req.user!.id, delegateUserId, startDate, endDate]
  );

  res.status(201).json(result.rows[0]);
});

delegationsRouter.patch("/:id", requireRole("employee", "admin"), async (req, res) => {
  const { delegateUserId, startDate, endDate, isActive } = req.body as {
    delegateUserId?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  };

  await query(
    `UPDATE delegations
     SET delegate_user_id = COALESCE($1, delegate_user_id),
         start_date = COALESCE($2::date, start_date),
         end_date = COALESCE($3::date, end_date),
         is_active = COALESCE($4, is_active)
     WHERE id = $5
       AND approver_id = $6`,
    [delegateUserId ?? null, startDate ?? null, endDate ?? null, isActive ?? null, req.params.id, req.user!.id]
  );

  res.json({ message: "Delegation updated" });
});

delegationsRouter.post("/:id/revoke", requireRole("employee", "admin"), async (req, res) => {
  await query(
    `UPDATE delegations
     SET is_active = FALSE
     WHERE id = $1
       AND approver_id = $2`,
    [req.params.id, req.user!.id]
  );

  res.json({ message: "Delegation revoked" });
});

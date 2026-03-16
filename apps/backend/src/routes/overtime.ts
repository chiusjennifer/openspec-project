import { Router } from "express";
import { query, withTransaction } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";
import { minutesBetween } from "../services/time.js";
import { resolveApprover } from "../services/approver.js";

export const overtimeRouter = Router();

const COMP_OFF_DIVISOR = 60;

overtimeRouter.post("/", requireRole("employee", "admin"), async (req, res) => {
  const { startAt, endAt, reason } = req.body as { startAt?: string; endAt?: string; reason?: string };
  if (!startAt || !endAt || !reason) {
    res.status(400).json({ message: "startAt, endAt, reason are required" });
    return;
  }

  try {
    minutesBetween(startAt, endAt);
  } catch {
    res.status(400).json({ message: "Invalid time range" });
    return;
  }

  const approverId = await resolveApprover(req.user!.id, startAt.slice(0, 10));

  const result = await query(
    `INSERT INTO overtime_requests(user_id, start_at, end_at, reason, status, approver_id)
     VALUES($1, $2, $3, $4, 'submitted', $5)
     RETURNING *`,
    [req.user!.id, startAt, endAt, reason, approverId]
  );

  res.status(201).json(result.rows[0]);
});

overtimeRouter.get("/", requireRole("employee", "admin"), async (req, res) => {
  const result = await query(
    `SELECT * FROM overtime_requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows);
});

overtimeRouter.patch("/:id/cancel", requireRole("employee", "admin"), async (req, res) => {
  const result = await query(
    `UPDATE overtime_requests
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'submitted'
     RETURNING id`,
    [req.params.id, req.user!.id]
  );

  if (!result.rows[0]) {
    res.status(400).json({ message: "Only submitted requests can be cancelled" });
    return;
  }

  res.json({ message: "Overtime request cancelled" });
});

export async function applyOvertimeApproval(overtimeRequestId: string, actorId: string, decision: "approved" | "rejected", comment?: string): Promise<void> {
  await withTransaction(async (client) => {
    const requestResult = await client.query<{
      id: string;
      user_id: string;
      start_at: string;
      end_at: string;
      status: string;
    }>(`SELECT id, user_id, start_at, end_at, status FROM overtime_requests WHERE id = $1 FOR UPDATE`, [overtimeRequestId]);

    const request = requestResult.rows[0];
    if (!request || request.status !== "submitted") {
      throw new Error("Request not available for decision");
    }

    await client.query(
      `UPDATE overtime_requests
       SET status = $1, approved_by = $2, decision_comment = $3, decided_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [decision, actorId, comment ?? null, overtimeRequestId]
    );

    if (decision === "approved") {
      const overtimeMinutes = minutesBetween(request.start_at, request.end_at);
      const compMinutes = Math.floor(overtimeMinutes / COMP_OFF_DIVISOR) * 60;

      await client.query(
        `UPDATE leave_balances
         SET compensatory_minutes = compensatory_minutes + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [compMinutes, request.user_id]
      );
    }
  });
}

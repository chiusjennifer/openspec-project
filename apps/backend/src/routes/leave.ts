import { Router } from "express";
import { query, withTransaction } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";
import { minutesBetween } from "../services/time.js";
import { resolveApprover } from "../services/approver.js";

export const leaveRouter = Router();

leaveRouter.post("/", requireRole("employee"), async (req, res) => {
  const { leaveType, startAt, endAt, reason } = req.body as {
    leaveType?: "annual" | "compensatory";
    startAt?: string;
    endAt?: string;
    reason?: string;
  };

  if (!leaveType || !startAt || !endAt || !reason) {
    res.status(400).json({ message: "leaveType, startAt, endAt, reason are required" });
    return;
  }

  try {
    minutesBetween(startAt, endAt);
  } catch {
    res.status(400).json({ message: "Invalid time range" });
    return;
  }

  const approverId = await resolveApprover(req.user!.id, startAt.slice(0, 10));
  if (!approverId) {
    res.status(400).json({ message: "No admin approver available" });
    return;
  }

  const result = await query(
    `INSERT INTO leave_requests(user_id, leave_type, start_at, end_at, reason, status, approver_id)
     VALUES ($1, $2, $3, $4, $5, 'submitted', $6)
     RETURNING *`,
    [req.user!.id, leaveType, startAt, endAt, reason, approverId]
  );

  res.status(201).json(result.rows[0]);
});

leaveRouter.get("/", requireRole("employee", "admin"), async (req, res) => {
  const result = await query(
    `SELECT * FROM leave_requests
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows);
});

leaveRouter.patch("/:id/cancel", requireRole("employee", "admin"), async (req, res) => {
  const result = await query(
    `UPDATE leave_requests
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'submitted'
     RETURNING id`,
    [req.params.id, req.user!.id]
  );

  if (!result.rows[0]) {
    res.status(400).json({ message: "Only submitted requests can be cancelled" });
    return;
  }

  res.json({ message: "Leave request cancelled" });
});

export async function applyLeaveApproval(leaveRequestId: string, actorId: string, decision: "approved" | "rejected", comment?: string): Promise<void> {
  await withTransaction(async (client) => {
    const requestResult = await client.query<{
      id: string;
      user_id: string;
      leave_type: "annual" | "compensatory";
      start_at: string;
      end_at: string;
      status: string;
    }>(`SELECT id, user_id, leave_type, start_at, end_at, status FROM leave_requests WHERE id = $1 FOR UPDATE`, [leaveRequestId]);

    const request = requestResult.rows[0];
    if (!request || request.status !== "submitted") {
      throw new Error("Request not available for decision");
    }

    await client.query(
      `UPDATE leave_requests
       SET status = $1, approved_by = $2, decision_comment = $3, decided_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [decision, actorId, comment ?? null, leaveRequestId]
    );

    if (decision === "approved") {
      const consumedMinutes = minutesBetween(request.start_at, request.end_at);
      const column = request.leave_type === "annual" ? "annual_minutes" : "compensatory_minutes";
      await client.query(
        `UPDATE leave_balances
         SET ${column} = ${column} - $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [consumedMinutes, request.user_id]
      );
    }
  });
}

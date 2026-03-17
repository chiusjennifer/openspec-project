import { Router } from "express";
import { query } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";
import { applyLeaveApproval } from "./leave.js";
import { applyOvertimeApproval } from "./overtime.js";
import { applyAttendanceCorrectionDecision } from "./attendance-corrections.js";

export const approvalsRouter = Router();

approvalsRouter.get("/pending", requireRole("admin"), async (req, res) => {
  const leave = await query(
    `SELECT 'leave' AS type, id, user_id, start_at, end_at, reason, status, created_at
     FROM leave_requests
     WHERE approver_id = $1 AND status = 'submitted'`,
    [req.user!.id]
  );

  const overtime = await query(
    `SELECT 'overtime' AS type, id, user_id, start_at, end_at, reason, status, created_at
     FROM overtime_requests
     WHERE approver_id = $1 AND status = 'submitted'`,
    [req.user!.id]
  );

  const corrections = await query(
    `SELECT 'attendance_correction' AS type,
            id,
            user_id,
            requested_timestamp AS start_at,
            requested_timestamp AS end_at,
            reason,
            status,
            created_at,
            attendance_date,
            event_type
     FROM attendance_correction_requests
     WHERE approver_id = $1
       AND status = 'pending_approval'`,
    [req.user!.id]
  );

  res.json([...leave.rows, ...overtime.rows, ...corrections.rows]);
});

approvalsRouter.post("/leave/:id/decision", requireRole("admin"), async (req, res) => {
  const { decision, comment } = req.body as { decision?: "approved" | "rejected"; comment?: string };
  if (!decision) {
    res.status(400).json({ message: "decision is required" });
    return;
  }

  const allowed = await query<{ id: string }>(
    `SELECT id FROM leave_requests WHERE id = $1 AND approver_id = $2 AND status = 'submitted'`,
    [req.params.id, req.user!.id]
  );

  if (!allowed.rows[0]) {
    res.status(403).json({ message: "Not allowed to decide this request" });
    return;
  }

  await applyLeaveApproval(req.params.id, req.user!.id, decision, comment);
  res.json({ message: "Leave request decision recorded" });
});

approvalsRouter.post("/overtime/:id/decision", requireRole("admin"), async (req, res) => {
  const { decision, comment } = req.body as { decision?: "approved" | "rejected"; comment?: string };
  if (!decision) {
    res.status(400).json({ message: "decision is required" });
    return;
  }

  const allowed = await query<{ id: string }>(
    `SELECT id FROM overtime_requests WHERE id = $1 AND approver_id = $2 AND status = 'submitted'`,
    [req.params.id, req.user!.id]
  );

  if (!allowed.rows[0]) {
    res.status(403).json({ message: "Not allowed to decide this request" });
    return;
  }

  await applyOvertimeApproval(req.params.id, req.user!.id, decision, comment);
  res.json({ message: "Overtime request decision recorded" });
});

approvalsRouter.post("/attendance-corrections/:id/decision", requireRole("admin"), async (req, res) => {
  const { decision, comment } = req.body as { decision?: "approved" | "rejected"; comment?: string };
  if (!decision) {
    res.status(400).json({ message: "decision is required" });
    return;
  }

  try {
    await applyAttendanceCorrectionDecision(req.params.id, req.user!.id, decision, comment);
  } catch (error) {
    const code = (error as Error).message;
    if (code === "INVALID_STATE") {
      res.status(400).json({ message: "Correction request is not pending approval" });
      return;
    }
    if (code === "FORBIDDEN") {
      res.status(403).json({ message: "Not allowed to decide this correction request" });
      return;
    }
    throw error;
  }

  res.json({ message: "Attendance correction decision recorded" });
});

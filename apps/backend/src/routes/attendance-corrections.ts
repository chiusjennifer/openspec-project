import { Router } from "express";
import type { PoolClient, QueryResultRow } from "pg";
import { query, withTransaction } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";
import { resolveApprover } from "../services/approver.js";

export const attendanceCorrectionsRouter = Router();

type CorrectionStatus = "submitted" | "auto_approved" | "pending_approval" | "approved" | "rejected" | "expired" | "cancelled";

type CorrectionPolicy = {
  id: string;
  org_key: string;
  submission_window_days: number;
  monthly_quota_per_employee: number;
  requires_evidence_after_hours: number;
  auto_approve_max_minutes_delta: number;
  payroll_lock_days: number;
  admin_override_enabled: boolean;
};

const POLICY_KEY = "default";

function isValidDate(input?: string): boolean {
  return !!input && /^\d{4}-\d{2}-\d{2}$/.test(input);
}

function isValidIso(input?: string): boolean {
  return !!input && !Number.isNaN(Date.parse(input));
}

function daysBetween(dateA: Date, dateB: Date): number {
  const a = Date.UTC(dateA.getUTCFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
  const b = Date.UTC(dateB.getUTCFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
  return Math.floor((a - b) / (24 * 60 * 60 * 1000));
}

function minutesDiff(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (60 * 1000));
}

async function getPolicy(client?: PoolClient): Promise<CorrectionPolicy> {
  const runQuery = async <T extends QueryResultRow>(sql: string, params: unknown[]): Promise<{ rows: T[] }> => {
    if (client) {
      return client.query<T>(sql, params);
    }
    return query<T>(sql, params);
  };

  const result = await runQuery<CorrectionPolicy>(
    `SELECT id, org_key, submission_window_days, monthly_quota_per_employee,
            requires_evidence_after_hours, auto_approve_max_minutes_delta,
            payroll_lock_days, admin_override_enabled
     FROM attendance_correction_policies
     WHERE org_key = $1
     LIMIT 1`,
    [POLICY_KEY]
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const inserted = await runQuery<CorrectionPolicy>(
    `INSERT INTO attendance_correction_policies(org_key)
     VALUES($1)
     ON CONFLICT(org_key) DO UPDATE SET org_key = EXCLUDED.org_key
     RETURNING id, org_key, submission_window_days, monthly_quota_per_employee,
               requires_evidence_after_hours, auto_approve_max_minutes_delta,
               payroll_lock_days, admin_override_enabled`,
    [POLICY_KEY]
  );

  return inserted.rows[0];
}

async function appendAudit(
  client: PoolClient,
  correctionRequestId: string,
  actorUserId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<void> {
  await client.query(
    `INSERT INTO attendance_correction_audits(correction_request_id, actor_user_id, action, payload)
     VALUES($1, $2, $3, $4::jsonb)`,
    [correctionRequestId, actorUserId, action, JSON.stringify(payload)]
  );
}

attendanceCorrectionsRouter.get("/policy", requireRole("employee", "admin"), async (_req, res) => {
  const policy = await getPolicy();
  res.json(policy);
});

attendanceCorrectionsRouter.patch("/policy", requireRole("admin"), async (req, res) => {
  const {
    submissionWindowDays,
    monthlyQuotaPerEmployee,
    requiresEvidenceAfterHours,
    autoApproveMaxMinutesDelta,
    payrollLockDays,
    adminOverrideEnabled
  } = req.body as {
    submissionWindowDays?: number;
    monthlyQuotaPerEmployee?: number;
    requiresEvidenceAfterHours?: number;
    autoApproveMaxMinutesDelta?: number;
    payrollLockDays?: number;
    adminOverrideEnabled?: boolean;
  };

  if (
    submissionWindowDays !== undefined && submissionWindowDays <= 0 ||
    monthlyQuotaPerEmployee !== undefined && monthlyQuotaPerEmployee < 0 ||
    requiresEvidenceAfterHours !== undefined && requiresEvidenceAfterHours < 0 ||
    autoApproveMaxMinutesDelta !== undefined && autoApproveMaxMinutesDelta < 0 ||
    payrollLockDays !== undefined && payrollLockDays < 0
  ) {
    res.status(400).json({ message: "Policy values are invalid" });
    return;
  }

  await getPolicy();

  const result = await query<CorrectionPolicy>(
    `UPDATE attendance_correction_policies
     SET submission_window_days = COALESCE($1, submission_window_days),
         monthly_quota_per_employee = COALESCE($2, monthly_quota_per_employee),
         requires_evidence_after_hours = COALESCE($3, requires_evidence_after_hours),
         auto_approve_max_minutes_delta = COALESCE($4, auto_approve_max_minutes_delta),
         payroll_lock_days = COALESCE($5, payroll_lock_days),
         admin_override_enabled = COALESCE($6, admin_override_enabled),
         updated_by = $7,
         updated_at = NOW()
     WHERE org_key = $8
     RETURNING id, org_key, submission_window_days, monthly_quota_per_employee,
               requires_evidence_after_hours, auto_approve_max_minutes_delta,
               payroll_lock_days, admin_override_enabled`,
    [
      submissionWindowDays ?? null,
      monthlyQuotaPerEmployee ?? null,
      requiresEvidenceAfterHours ?? null,
      autoApproveMaxMinutesDelta ?? null,
      payrollLockDays ?? null,
      adminOverrideEnabled ?? null,
      req.user!.id,
      POLICY_KEY
    ]
  );

  if (!result.rows[0]) {
    const policy = await getPolicy();
    res.json(policy);
    return;
  }

  res.json(result.rows[0]);
});

attendanceCorrectionsRouter.post("/", requireRole("employee", "admin"), async (req, res) => {
  const { attendanceDate, eventType, requestedTimestamp, reason, evidenceUrl, overrideReason } = req.body as {
    attendanceDate?: string;
    eventType?: "clock_in" | "clock_out";
    requestedTimestamp?: string;
    reason?: string;
    evidenceUrl?: string;
    overrideReason?: string;
  };

  if (!attendanceDate || !eventType || !requestedTimestamp || !reason) {
    res.status(400).json({ message: "attendanceDate, eventType, requestedTimestamp, reason are required" });
    return;
  }

  if (!isValidDate(attendanceDate) || !isValidIso(requestedTimestamp)) {
    res.status(400).json({ message: "Invalid attendanceDate or requestedTimestamp" });
    return;
  }

  if (!["clock_in", "clock_out"].includes(eventType)) {
    res.status(400).json({ message: "eventType must be clock_in or clock_out" });
    return;
  }

  try {
    const inserted = await withTransaction(async (client) => {
      const policy = await getPolicy(client);

      const attendanceDateObj = new Date(`${attendanceDate}T00:00:00.000Z`);
      const today = new Date();
      const ageDays = daysBetween(today, attendanceDateObj);

      if (ageDays > policy.submission_window_days) {
        throw new Error("OUTSIDE_SUBMISSION_WINDOW");
      }

      if (ageDays > policy.payroll_lock_days) {
        if (!(req.user!.roleName === "admin" && policy.admin_override_enabled && overrideReason)) {
          throw new Error("PAYROLL_LOCKED");
        }
      }

      const quotaResult = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM attendance_correction_requests
         WHERE user_id = $1
           AND date_trunc('month', attendance_date) = date_trunc('month', $2::date)
           AND status <> 'cancelled'`,
        [req.user!.id, attendanceDate]
      );

      if (quotaResult.rows[0].count >= policy.monthly_quota_per_employee) {
        throw new Error("MONTHLY_QUOTA_EXCEEDED");
      }

      const duplicateResult = await client.query<{ id: string }>(
        `SELECT id
         FROM attendance_correction_requests
         WHERE user_id = $1
           AND attendance_date = $2::date
           AND event_type = $3
           AND status IN ('submitted', 'pending_approval')
         LIMIT 1`,
        [req.user!.id, attendanceDate, eventType]
      );

      if (duplicateResult.rows[0]) {
        throw new Error("DUPLICATE_PENDING_REQUEST");
      }

      const attendanceResult = await client.query<{
        id: string;
        clock_in_at: string | null;
        clock_out_at: string | null;
      }>(
        `SELECT id, clock_in_at, clock_out_at
         FROM attendance_records
         WHERE user_id = $1
           AND attendance_date = $2::date
         LIMIT 1`,
        [req.user!.id, attendanceDate]
      );

      const attendance = attendanceResult.rows[0] ?? null;
      const existingTimestamp = eventType === "clock_in" ? attendance?.clock_in_at : attendance?.clock_out_at;
      const requestedAtDate = new Date(requestedTimestamp);
      const minutesDelta = existingTimestamp ? minutesDiff(requestedAtDate, new Date(existingTimestamp)) : null;

      const evidenceThresholdMinutes = policy.requires_evidence_after_hours * 60;
      const requiresEvidence = minutesDelta !== null && minutesDelta > evidenceThresholdMinutes;
      if (requiresEvidence && !evidenceUrl) {
        throw new Error("EVIDENCE_REQUIRED");
      }

      const canAutoApprove =
        minutesDelta !== null &&
        minutesDelta <= policy.auto_approve_max_minutes_delta &&
        !requiresEvidence;

      const approverId = canAutoApprove ? null : await resolveApprover(req.user!.id, attendanceDate);
      const nextStatus: CorrectionStatus = canAutoApprove ? "auto_approved" : (approverId ? "pending_approval" : "submitted");

      const created = await client.query(
        `INSERT INTO attendance_correction_requests(
           user_id, attendance_record_id, attendance_date, event_type, requested_timestamp,
           reason, evidence_url, status, policy_snapshot, minutes_delta, approver_id, override_reason
         )
         VALUES($1, $2, $3::date, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12)
         RETURNING *`,
        [
          req.user!.id,
          attendance?.id ?? null,
          attendanceDate,
          eventType,
          requestedTimestamp,
          reason,
          evidenceUrl ?? null,
          nextStatus,
          JSON.stringify(policy),
          minutesDelta,
          approverId,
          overrideReason ?? null
        ]
      );

      const createdRequest = created.rows[0];

      await appendAudit(client, createdRequest.id, req.user!.id, "submitted", {
        attendanceDate,
        eventType,
        requestedTimestamp,
        nextStatus
      });

      if (canAutoApprove) {
        const clockColumn = eventType === "clock_in" ? "clock_in_at" : "clock_out_at";

        if (attendance?.id) {
          await client.query(
            `UPDATE attendance_records
             SET ${clockColumn} = $1
             WHERE id = $2`,
            [requestedTimestamp, attendance.id]
          );
        } else {
          const insertClockIn = eventType === "clock_in" ? requestedTimestamp : null;
          const insertClockOut = eventType === "clock_out" ? requestedTimestamp : null;
          await client.query(
            `INSERT INTO attendance_records(user_id, attendance_date, clock_in_at, clock_out_at)
             VALUES($1, $2::date, $3, $4)`,
            [req.user!.id, attendanceDate, insertClockIn, insertClockOut]
          );
        }

        await appendAudit(client, createdRequest.id, req.user!.id, "auto_approved", {
          requestedTimestamp,
          eventType
        });
      }

      return createdRequest;
    });

    res.status(201).json(inserted);
  } catch (error) {
    const code = (error as Error).message;
    if (code === "OUTSIDE_SUBMISSION_WINDOW") {
      res.status(400).json({ message: "Correction request is outside submission window" });
      return;
    }
    if (code === "PAYROLL_LOCKED") {
      res.status(400).json({ message: "Correction request is blocked by payroll lock" });
      return;
    }
    if (code === "MONTHLY_QUOTA_EXCEEDED") {
      res.status(400).json({ message: "Monthly correction quota exceeded" });
      return;
    }
    if (code === "DUPLICATE_PENDING_REQUEST") {
      res.status(400).json({ message: "Duplicate pending correction request exists" });
      return;
    }
    if (code === "EVIDENCE_REQUIRED") {
      res.status(400).json({ message: "Evidence is required for this correction request" });
      return;
    }
    throw error;
  }
});

attendanceCorrectionsRouter.get("/", requireRole("employee", "admin"), async (req, res) => {
  const { userId, status } = req.query as { userId?: string; status?: string };

  const targetUserId = req.user!.roleName === "admin" && userId ? userId : req.user!.id;
  const result = await query(
    `SELECT *
     FROM attendance_correction_requests
     WHERE user_id = $1
       AND ($2::text IS NULL OR status = $2)
     ORDER BY created_at DESC`,
    [targetUserId, status ?? null]
  );

  res.json(result.rows);
});

attendanceCorrectionsRouter.get("/pending-approvals", requireRole("employee", "admin"), async (req, res) => {
  const result = await query(
    `SELECT *
     FROM attendance_correction_requests
     WHERE approver_id = $1
       AND status = 'pending_approval'
     ORDER BY created_at ASC`,
    [req.user!.id]
  );

  res.json(result.rows);
});

export async function applyAttendanceCorrectionDecision(
  correctionRequestId: string,
  actorId: string,
  decision: "approved" | "rejected",
  comment?: string
): Promise<void> {
  try {
    await withTransaction(async (client) => {
      const target = await client.query<{
        id: string;
        user_id: string;
        attendance_record_id: string | null;
        attendance_date: string;
        event_type: "clock_in" | "clock_out";
        requested_timestamp: string;
        approver_id: string | null;
        status: CorrectionStatus;
      }>(
        `SELECT id, user_id, attendance_record_id, attendance_date, event_type, requested_timestamp, approver_id, status
         FROM attendance_correction_requests
         WHERE id = $1
         FOR UPDATE`,
        [correctionRequestId]
      );

      const request = target.rows[0];
      if (!request || request.status !== "pending_approval") {
        throw new Error("INVALID_STATE");
      }
      if (request.approver_id !== actorId) {
        throw new Error("FORBIDDEN");
      }

      await client.query(
        `UPDATE attendance_correction_requests
         SET status = $1,
             decided_by = $2,
             decision_comment = $3,
             decided_at = NOW(),
             updated_at = NOW()
         WHERE id = $4`,
        [decision, actorId, comment ?? null, correctionRequestId]
      );

      if (decision === "approved") {
        const clockColumn = request.event_type === "clock_in" ? "clock_in_at" : "clock_out_at";
        if (request.attendance_record_id) {
          await client.query(
            `UPDATE attendance_records
             SET ${clockColumn} = $1
             WHERE id = $2`,
            [request.requested_timestamp, request.attendance_record_id]
          );
        } else {
          const insertClockIn = request.event_type === "clock_in" ? request.requested_timestamp : null;
          const insertClockOut = request.event_type === "clock_out" ? request.requested_timestamp : null;
          await client.query(
            `INSERT INTO attendance_records(user_id, attendance_date, clock_in_at, clock_out_at)
             VALUES($1, $2::date, $3, $4)`,
            [request.user_id, request.attendance_date, insertClockIn, insertClockOut]
          );
        }
      }

      await appendAudit(client, correctionRequestId, actorId, decision, {
        comment: comment ?? null
      });
    });
  } catch (error) {
    const code = (error as Error).message;
    if (code === "INVALID_STATE") {
      throw new Error("INVALID_STATE");
    }
    if (code === "FORBIDDEN") {
      throw new Error("FORBIDDEN");
    }
    throw new Error("UNKNOWN");
  }
}

attendanceCorrectionsRouter.post("/:id/decision", requireRole("employee", "admin"), async (req, res) => {
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

attendanceCorrectionsRouter.patch("/:id/cancel", requireRole("employee", "admin"), async (req, res) => {
  const result = await query(
    `UPDATE attendance_correction_requests
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
       AND status IN ('submitted', 'pending_approval')
     RETURNING id`,
    [req.params.id, req.user!.id]
  );

  if (!result.rows[0]) {
    res.status(400).json({ message: "Only submitted or pending_approval requests can be cancelled" });
    return;
  }

  res.json({ message: "Attendance correction request cancelled" });
});

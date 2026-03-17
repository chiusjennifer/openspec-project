import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import request from "supertest";

const databaseUrl = process.env.DATABASE_URL;
const runIntegration = databaseUrl ? describe : describe.skip;

runIntegration("attendance corrections integration", () => {
  let pool: Pool;
  let app: import("express").Express;
  let createToken: (user: { id: string; email: string; roleName: "admin" | "employee"; mustResetPassword: boolean }) => string;

  let employeeId = "";
  let approverId = "";
  let adminId = "";
  let employeeToken = "";
  let approverToken = "";

  const unique = randomUUID().slice(0, 8);
  const employeeEmail = `employee_${unique}@example.com`;
  const approverEmail = `approver_${unique}@example.com`;
  const adminEmail = `admin_${unique}@example.com`;

  const autoDate = new Date();
  autoDate.setUTCDate(autoDate.getUTCDate() - 1);
  const autoDateText = autoDate.toISOString().slice(0, 10);

  const manualDate = new Date();
  manualDate.setUTCDate(manualDate.getUTCDate() - 2);
  const manualDateText = manualDate.toISOString().slice(0, 10);

  beforeAll(async () => {
    process.env.JWT_SECRET ||= "1234567890abcdef1234567890abcdef";
    process.env.DATABASE_URL ||= databaseUrl;
    process.env.SMTP_HOST ||= "localhost";
    process.env.SMTP_PORT ||= "1025";
    process.env.SMTP_FROM ||= "test@example.com";
    process.env.INITIAL_ADMIN_EMAIL ||= "admin@example.com";
    process.env.INITIAL_ADMIN_PASSWORD ||= "Admin1234!";

    ({ app } = await import("../src/app.js"));
    ({ createToken } = await import("../src/services/auth.js"));

    pool = new Pool({ connectionString: databaseUrl });
    await pool.query("SELECT 1");

    await pool.query("INSERT INTO roles(name) VALUES('admin') ON CONFLICT(name) DO NOTHING");
    await pool.query("INSERT INTO roles(name) VALUES('employee') ON CONFLICT(name) DO NOTHING");

    const createdApprover = await pool.query<{ id: string }>(
      `INSERT INTO users(email, full_name, password_hash, role_id, must_reset_password)
       VALUES($1, 'Approver User', 'x', (SELECT id FROM roles WHERE name='employee'), FALSE)
       RETURNING id`,
      [approverEmail]
    );
    approverId = createdApprover.rows[0].id;

    const createdEmployee = await pool.query<{ id: string }>(
      `INSERT INTO users(email, full_name, password_hash, role_id, must_reset_password)
       VALUES($1, 'Employee User', 'x', (SELECT id FROM roles WHERE name='employee'), FALSE)
       RETURNING id`,
      [employeeEmail]
    );
    employeeId = createdEmployee.rows[0].id;

    const createdAdmin = await pool.query<{ id: string }>(
      `INSERT INTO users(email, full_name, password_hash, role_id, must_reset_password)
       VALUES($1, 'Admin User', 'x', (SELECT id FROM roles WHERE name='admin'), FALSE)
       RETURNING id`,
      [adminEmail]
    );
    adminId = createdAdmin.rows[0].id;

    await pool.query(
      `INSERT INTO user_approvers(user_id, approver_id)
       VALUES($1, $2)
       ON CONFLICT(user_id) DO UPDATE SET approver_id = EXCLUDED.approver_id`,
      [employeeId, approverId]
    );

    await pool.query(
      `INSERT INTO attendance_correction_policies(org_key, updated_by)
       VALUES('default', $1)
       ON CONFLICT(org_key) DO UPDATE SET updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [adminId]
    );

    employeeToken = createToken({
      id: employeeId,
      email: employeeEmail,
      roleName: "employee",
      mustResetPassword: false
    });

    approverToken = createToken({
      id: approverId,
      email: approverEmail,
      roleName: "employee",
      mustResetPassword: false
    });
  });

  afterAll(async () => {
    await pool.query("DELETE FROM attendance_correction_audits WHERE actor_user_id = ANY($1::uuid[])", [[employeeId, approverId, adminId]]);
    await pool.query("DELETE FROM attendance_correction_audits WHERE correction_request_id IN (SELECT id FROM attendance_correction_requests WHERE user_id = ANY($1::uuid[]))", [[employeeId, approverId, adminId]]);
    await pool.query("DELETE FROM attendance_correction_requests WHERE user_id = ANY($1::uuid[])", [[employeeId, approverId, adminId]]);
    await pool.query("DELETE FROM attendance_records WHERE user_id = ANY($1::uuid[])", [[employeeId, approverId, adminId]]);
    await pool.query("DELETE FROM user_approvers WHERE user_id = ANY($1::uuid[])", [[employeeId, approverId, adminId]]);
    await pool.query("DELETE FROM leave_balances WHERE user_id = ANY($1::uuid[])", [[employeeId, approverId, adminId]]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [[employeeId, approverId, adminId]]);
    await pool.end();
  });

  it("auto-approves low-risk correction and updates attendance", async () => {
    await pool.query(
      `UPDATE attendance_correction_policies
       SET submission_window_days = 30,
           monthly_quota_per_employee = 10,
           requires_evidence_after_hours = 10,
           auto_approve_max_minutes_delta = 20,
           payroll_lock_days = 30,
           admin_override_enabled = TRUE
       WHERE org_key = 'default'`
    );

    await pool.query(
      `INSERT INTO attendance_records(user_id, attendance_date, clock_in_at, clock_out_at)
       VALUES($1, $2::date, $3, $4)
       ON CONFLICT (user_id, attendance_date)
       DO UPDATE SET clock_in_at = EXCLUDED.clock_in_at, clock_out_at = EXCLUDED.clock_out_at`,
      [employeeId, autoDateText, `${autoDateText}T08:00:00.000Z`, `${autoDateText}T17:00:00.000Z`]
    );

    const response = await request(app)
      .post("/attendance-corrections")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        attendanceDate: autoDateText,
        eventType: "clock_out",
        requestedTimestamp: `${autoDateText}T17:10:00.000Z`,
        reason: "Forgot to clock out after meeting"
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("auto_approved");

    const attendance = await pool.query<{ clock_out_at: string }>(
      `SELECT clock_out_at::text FROM attendance_records WHERE user_id = $1 AND attendance_date = $2::date`,
      [employeeId, autoDateText]
    );
    expect(attendance.rows[0].clock_out_at.startsWith(`${autoDateText} 17:10:00`)).toBe(true);
  });

  it("routes high-risk correction to approver and supports decision via approvals API", async () => {
    await pool.query(
      `UPDATE attendance_correction_policies
       SET submission_window_days = 30,
           monthly_quota_per_employee = 10,
           requires_evidence_after_hours = 10,
           auto_approve_max_minutes_delta = 5,
           payroll_lock_days = 30,
           admin_override_enabled = TRUE
       WHERE org_key = 'default'`
    );

    await pool.query(
      `INSERT INTO attendance_records(user_id, attendance_date, clock_in_at, clock_out_at)
       VALUES($1, $2::date, $3, $4)
       ON CONFLICT (user_id, attendance_date)
       DO UPDATE SET clock_in_at = EXCLUDED.clock_in_at, clock_out_at = EXCLUDED.clock_out_at`,
      [employeeId, manualDateText, `${manualDateText}T08:00:00.000Z`, `${manualDateText}T17:00:00.000Z`]
    );

    const submit = await request(app)
      .post("/attendance-corrections")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        attendanceDate: manualDateText,
        eventType: "clock_out",
        requestedTimestamp: `${manualDateText}T18:00:00.000Z`,
        reason: "Missed punch while handling customer issue"
      });

    expect(submit.status).toBe(201);
    expect(submit.body.status).toBe("pending_approval");

    const pending = await request(app)
      .get("/approvals/pending")
      .set("Authorization", `Bearer ${approverToken}`);

    expect(pending.status).toBe(200);
    const correctionItem = pending.body.find((item: { type: string; id: string }) => item.type === "attendance_correction" && item.id === submit.body.id);
    expect(correctionItem).toBeTruthy();

    const decided = await request(app)
      .post(`/approvals/attendance-corrections/${submit.body.id}/decision`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({ decision: "approved", comment: "Checked and approved" });

    expect(decided.status).toBe(200);

    const correction = await pool.query<{ status: string }>(
      `SELECT status FROM attendance_correction_requests WHERE id = $1`,
      [submit.body.id]
    );
    expect(correction.rows[0].status).toBe("approved");

    const attendance = await pool.query<{ clock_out_at: string }>(
      `SELECT clock_out_at::text FROM attendance_records WHERE user_id = $1 AND attendance_date = $2::date`,
      [employeeId, manualDateText]
    );
    expect(attendance.rows[0].clock_out_at.startsWith(`${manualDateText} 18:00:00`)).toBe(true);
  });
});

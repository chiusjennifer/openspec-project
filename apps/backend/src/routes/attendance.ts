import { Router } from "express";
import { query } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";
import { todayDateString } from "../services/time.js";

export const attendanceRouter = Router();

attendanceRouter.post("/clock-in", requireRole("employee", "admin"), async (req, res) => {
  const userId = req.user!.id;
  const attendanceDate = todayDateString();

  const existing = await query<{ clock_in_at: string | null }>(
    `SELECT clock_in_at FROM attendance_records WHERE user_id = $1 AND attendance_date = $2`,
    [userId, attendanceDate]
  );

  if (existing.rows[0]?.clock_in_at) {
    res.status(400).json({ message: "Already clocked in" });
    return;
  }

  await query(
    `INSERT INTO attendance_records(user_id, attendance_date, clock_in_at)
     VALUES($1, $2, NOW())
     ON CONFLICT(user_id, attendance_date)
     DO UPDATE SET clock_in_at = EXCLUDED.clock_in_at`,
    [userId, attendanceDate]
  );

  res.json({ message: "Clock-in recorded" });
});

attendanceRouter.post("/clock-out", requireRole("employee", "admin"), async (req, res) => {
  const userId = req.user!.id;
  const attendanceDate = todayDateString();

  const existing = await query<{ clock_in_at: string | null; clock_out_at: string | null }>(
    `SELECT clock_in_at, clock_out_at FROM attendance_records WHERE user_id = $1 AND attendance_date = $2`,
    [userId, attendanceDate]
  );

  if (!existing.rows[0]?.clock_in_at) {
    res.status(400).json({ message: "Must clock-in before clock-out" });
    return;
  }

  if (existing.rows[0]?.clock_out_at) {
    res.status(400).json({ message: "Already clocked out" });
    return;
  }

  await query(
    `UPDATE attendance_records SET clock_out_at = NOW() WHERE user_id = $1 AND attendance_date = $2`,
    [userId, attendanceDate]
  );

  res.json({ message: "Clock-out recorded" });
});

attendanceRouter.get("/", requireRole("employee", "admin"), async (req, res) => {
  const { startDate, endDate, userId } = req.query as { startDate?: string; endDate?: string; userId?: string };

  if (!startDate || !endDate) {
    res.status(400).json({ message: "startDate and endDate are required" });
    return;
  }

  const targetUserId = req.user!.roleName === "admin" && userId ? userId : req.user!.id;

  const result = await query(
    `SELECT id, user_id, attendance_date, clock_in_at, clock_out_at
     FROM attendance_records
     WHERE user_id = $1
       AND attendance_date BETWEEN $2::date AND $3::date
     ORDER BY attendance_date DESC`,
    [targetUserId, startDate, endDate]
  );

  res.json(result.rows);
});

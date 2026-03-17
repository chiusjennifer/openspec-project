import "dotenv/config";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { query } from "./db/client.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { attendanceRouter } from "./routes/attendance.js";
import { leaveRouter } from "./routes/leave.js";
import { overtimeRouter } from "./routes/overtime.js";
import { approvalsRouter } from "./routes/approvals.js";
import { delegationsRouter } from "./routes/delegations.js";
import { attendanceCorrectionsRouter } from "./routes/attendance-corrections.js";
import { requireAuth } from "./middleware/auth.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use(requireAuth);
app.use("/users", usersRouter);
app.use("/attendance", attendanceRouter);
app.use("/leave-requests", leaveRouter);
app.use("/overtime-requests", overtimeRouter);
app.use("/approvals", approvalsRouter);
app.use("/delegations", delegationsRouter);
app.use("/attendance-corrections", attendanceCorrectionsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export function startServer(): void {
  app.listen(env.API_PORT, () => {
    console.log(`API listening on ${env.API_PORT}`);
  });
}

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const runIntegration = databaseUrl ? describe : describe.skip;

runIntegration("database integration", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("can query roles table after migrations", async () => {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM roles");
    expect(result.rows[0].count).toBeGreaterThanOrEqual(0);
  });

  it("can query attendance correction policy table after migrations", async () => {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM attendance_correction_policies");
    expect(result.rows[0].count).toBeGreaterThanOrEqual(0);
  });
});

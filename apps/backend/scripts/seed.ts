import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { hashPassword } from "../src/services/auth.js";

dotenv.config({ path: path.resolve(process.cwd(), "..", "..", ".env") });

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!databaseUrl || !initialAdminEmail || !initialAdminPassword) {
    throw new Error("DATABASE_URL, INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query("INSERT INTO roles(name) VALUES('admin') ON CONFLICT(name) DO NOTHING");
    await pool.query("INSERT INTO roles(name) VALUES('employee') ON CONFLICT(name) DO NOTHING");

    const adminRole = await pool.query<{ id: string }>("SELECT id FROM roles WHERE name='admin' LIMIT 1");
    if (!adminRole.rows[0]) {
      throw new Error("Admin role not found");
    }

    const passwordHash = await hashPassword(initialAdminPassword);

    const adminResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, full_name, password_hash, role_id, is_active, must_reset_password)
       VALUES ($1, $2, $3, $4, TRUE, FALSE)
       ON CONFLICT(email) DO UPDATE SET role_id = EXCLUDED.role_id
       RETURNING id`,
      [initialAdminEmail, "System Admin", passwordHash, adminRole.rows[0].id]
    );

    await pool.query(
      `INSERT INTO leave_balances (user_id, annual_minutes, compensatory_minutes)
       VALUES ($1, 0, 0)
       ON CONFLICT(user_id) DO NOTHING`,
      [adminResult.rows[0].id]
    );

    console.log("Seed completed");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

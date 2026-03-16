import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(process.cwd(), "..", "..", ".env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(): Promise<void> {
  const migrationDir = path.resolve(__dirname, "..", "migrations");
  const files = (await fs.readdir(migrationDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    for (const file of files) {
      const sql = await fs.readFile(path.join(migrationDir, file), "utf8");
      await pool.query(sql);
      console.log(`Applied migration ${file}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

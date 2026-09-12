import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export async function applyMigrations(databaseUrl: string, migrationsDir?: string): Promise<string[]> {
  const directory =
    migrationsDir ??
    process.env.MIGRATIONS_DIR ??
    join(dirname(fileURLToPath(import.meta.url)), "../../../migrations");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const files = (await readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const applied: string[] = [];
    for (const file of files) {
      const existing = await client.query("SELECT 1 FROM schema_migrations WHERE id = $1", [file]);
      if (existing.rowCount) continue;
      const sql = await readFile(join(directory, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
        await client.query("COMMIT");
        applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return applied;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && process.argv[1].includes("migrate")) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const applied = await applyMigrations(url);
  console.log(applied.length ? `Applied ${applied.join(", ")}` : "Migrations already applied");
}

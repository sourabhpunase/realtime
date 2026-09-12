import { applyMigrations } from "./migrate.js";
import { PostgresStore } from "./postgres.js";
import { MemoryStore, type PlatformStore } from "./store.js";

export async function createStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<PlatformStore> {
  const driver = env.STORE_DRIVER ?? "memory";
  if (driver !== "postgres") {
    const store = new MemoryStore();
    await store.ready();
    return store;
  }
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error("STORE_DRIVER=postgres requires DATABASE_URL");
  }
  await applyMigrations(url);
  const store = new PostgresStore(url);
  await store.ready();
  return store;
}

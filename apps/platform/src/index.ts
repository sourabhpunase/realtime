import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPlatform } from "./createPlatform.js";
import { mediaAdapterFromEnv } from "./media.js";
import { seedLocalDevelopment } from "./seed.js";
import { createStoreFromEnv } from "./storeFactory.js";

function loadLocalEnv(): void {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(here, "../../../.env"),
    resolve(here, "../../.env"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      /* Node without loadEnvFile, or a malformed file */
    }
  }
}

loadLocalEnv();

const port = Number(process.env.PLATFORM_PORT ?? 3080);
const store = await createStoreFromEnv();

if (process.env.SEED_DEMO !== "false") {
  await seedLocalDevelopment(store, {
    publicKey: process.env.DEMO_PUBLIC_KEY ?? "pk_test_sample_local_dev_only",
    secretKey: process.env.DEMO_SECRET_KEY ?? "sk_test_sample_local_dev_only_rotate",
  });
}

const platform = await createPlatform({
  store,
  signingSeed: process.env.PLATFORM_SIGNING_SEED ?? "dev-signing-seed-not-for-production",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:4000")
    .split(",")
    .map((item) => item.trim()),
  media: mediaAdapterFromEnv(),
  redisUrl: process.env.REDIS_URL || undefined,
});

const bound = await platform.listen(port);
console.log(
  JSON.stringify({
    level: "info",
    msg: "platform_listening",
    port: bound,
    store: store.driver,
    media: platform.media.enabled,
    instance: platform.instance,
  }),
);
console.log(`Realtime platform listening on http://localhost:${bound}`);
console.log(`Store: ${store.driver}`);
console.log(`Instance: ${platform.instance}`);
console.log(`Voice: ${platform.media.enabled ? "LiveKit" : "disabled (set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)"}`);
console.log("Health: GET /health  Ready: GET /ready");

const shutdown = async () => {
  await platform.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

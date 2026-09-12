import { hashApiSecret } from "./lib.js";
import type { PlatformStore } from "./store.js";

export async function seedLocalDevelopment(
  store: PlatformStore,
  keys: { publicKey: string; secretKey: string },
) {
  const existing = await store.findCredentialBySecretHash(hashApiSecret(keys.secretKey));
  if (existing) {
    console.log(`Using existing application credentials ${keys.publicKey}`);
    return { credential: existing };
  }
  const tenant = await store.createTenant("Local Development");
  const application = await store.createApplication(
    tenant.id,
    "Sample Integrator",
    "development",
  );
  await store.addCredential(application.id, keys.publicKey, keys.secretKey);
  await store.ensureRoom(application.id, "doc:welcome", "Welcome");
  console.log(`Seeded application ${application.id} public key ${keys.publicKey}`);
  return { tenant, application };
}

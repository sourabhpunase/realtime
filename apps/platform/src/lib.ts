import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function randomId(): string {
  return randomBytes(16).toString("hex");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashApiSecret(secret: string): string {
  return sha256Hex(secret);
}

export function newKeyPair(environment: "development" | "production"): {
  publicKey: string;
  secretKey: string;
} {
  const prefix = environment === "production" ? "live" : "test";
  const publicKey = `pk_${prefix}_${randomBytes(18).toString("hex")}`;
  const secretKey = `sk_${prefix}_${randomBytes(24).toString("hex")}`;
  return { publicKey, secretKey };
}

export function secretPrefix(secretKey: string): string {
  return `${secretKey.slice(0, 12)}…`;
}

export function stableColor(userId: string): string {
  const palette = [
    "#2563eb",
    "#dc2626",
    "#059669",
    "#d97706",
    "#7c3aed",
    "#0891b2",
    "#db2777",
    "#4f46e5",
  ];
  const digest = createHash("sha256").update(userId).digest();
  return palette[digest[0] % palette.length];
}

export function roomChannel(applicationId: string, externalId: string): string {
  return `app:${applicationId}:room:${externalId}`;
}

export function clampTtl(
  requested: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = requested ?? fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "sample_session";

export function signSession(userId: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString("base64url");
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function readSession(cookieHeader: string | undefined, secret: string): string | null {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!cookie) return null;
  const value = cookie.slice(COOKIE.length + 1);
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string };
  return data.userId;
}

export function sessionCookie(value: string): string {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`;
}

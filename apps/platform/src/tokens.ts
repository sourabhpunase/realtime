import { createHmac, randomUUID } from "node:crypto";
import {
  DEFAULT_TOKEN_TTL_SECONDS,
  MAX_TOKEN_TTL_SECONDS,
  MIN_TOKEN_TTL_SECONDS,
  TOKEN_AUDIENCE,
  TOKEN_ISSUER,
  RoomTokenClaimsSchema,
  RealtimeError,
  STATUS_BY_CODE,
  type IdentifyRequest,
  type Permission,
  type RoomTokenClaims,
  normalizePermissions,
} from "@realtime/protocol";
import { SignJWT, jwtVerify, errors as JoseErrors } from "jose";
import { clampTtl, stableColor } from "./lib.js";
import type { Application, PlatformStore, RoomRecord } from "./store.js";

const ALLOWED_ALGS = ["HS256"] as const;
const CLOCK_TOLERANCE = 5;

export type PlatformSigner = {
  kid: string;
  secret: Uint8Array;
};

export function signerFromSeed(seed: string, kid = "k1"): PlatformSigner {
  const digest = createHmac("sha256", "realtime-platform-signing")
    .update(seed)
    .digest();
  return { kid, secret: digest };
}

export async function signRoomToken(
  signer: PlatformSigner,
  input: {
    tenantId: string;
    application: Application;
    room: RoomRecord;
    user: IdentifyRequest["user"];
    permissions: Permission[];
    ttlSeconds?: number;
  },
): Promise<{ token: string; claims: RoomTokenClaims }> {
  const ttl = clampTtl(
    input.ttlSeconds,
    MIN_TOKEN_TTL_SECONDS,
    MAX_TOKEN_TTL_SECONDS,
    DEFAULT_TOKEN_TTL_SECONDS,
  );
  const now = Math.floor(Date.now() / 1000);
  const claims: RoomTokenClaims = {
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    sub: input.user.id,
    tid: input.tenantId,
    aid: input.application.id,
    env: input.application.environment,
    rid: input.room.externalId,
    room_uuid: input.room.id,
    perms: normalizePermissions(input.permissions),
    name: input.user.name,
    avatar: input.user.avatar,
    color: input.user.color ?? stableColor(input.user.id),
    jti: randomUUID(),
    iat: now,
    nbf: now,
    exp: now + ttl,
  };

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", kid: signer.kid, typ: "JWT" })
    .sign(signer.secret);

  return { token, claims };
}

export async function verifyRoomToken(
  token: string,
  resolveSigner: (kid: string | undefined) => PlatformSigner | undefined,
): Promise<RoomTokenClaims> {
  const { payload } = await jwtVerify(token, async (header) => {
    const signer = resolveSigner(header.kid);
    if (!signer) {
      throw new RealtimeError("UNAUTHORIZED", "Unknown signing key", 401);
    }
    return signer.secret;
  }, {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    algorithms: [...ALLOWED_ALGS],
    clockTolerance: CLOCK_TOLERANCE,
  }).catch((error: unknown) => {
    if (error instanceof JoseErrors.JWTExpired) {
      throw new RealtimeError("TOKEN_EXPIRED", "Room token expired", STATUS_BY_CODE.TOKEN_EXPIRED);
    }
    if (error instanceof RealtimeError) throw error;
    throw new RealtimeError("UNAUTHORIZED", "Invalid room token", 401);
  });

  return RoomTokenClaimsSchema.parse(payload);
}

export function assertActiveSession(
  store: PlatformStore,
  claims: RoomTokenClaims,
): void {
  if (store.isJtiRevoked(claims.jti)) {
    throw new RealtimeError("TOKEN_REVOKED", "Session revoked", 401);
  }
  if (store.isUserRevoked(claims.aid, claims.rid, claims.sub)) {
    throw new RealtimeError("TOKEN_REVOKED", "User access revoked", 401);
  }
}

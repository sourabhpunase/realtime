import { z } from "zod";
import { PERMISSIONS } from "./permissions.js";
import { UserInfoSchema } from "./events.js";

export const TOKEN_ISSUER = "realtime-platform";
export const TOKEN_AUDIENCE = "realtime-room";
export const DEFAULT_TOKEN_TTL_SECONDS = 900;
export const MIN_TOKEN_TTL_SECONDS = 60;
export const MAX_TOKEN_TTL_SECONDS = 3600;

export const RoomTokenClaimsSchema = z.object({
  iss: z.literal(TOKEN_ISSUER),
  aud: z.literal(TOKEN_AUDIENCE),
  sub: z.string().min(1),
  tid: z.string().uuid(),
  aid: z.string().uuid(),
  env: z.enum(["development", "production"]),
  rid: z.string().min(1),
  room_uuid: z.string().uuid(),
  perms: z.array(z.enum(PERMISSIONS)),
  name: z.string().min(1),
  avatar: z.string().optional(),
  color: z.string(),
  jti: z.string().min(1),
  iat: z.number(),
  nbf: z.number(),
  exp: z.number(),
});

export type RoomTokenClaims = z.infer<typeof RoomTokenClaimsSchema>;

export const IdentifyRequestSchema = z.object({
  user: UserInfoSchema,
  room: z.string().min(1).max(256),
  permissions: z.array(z.string()).min(1),
  ttlSeconds: z.number().int().optional(),
});

export type IdentifyRequest = z.infer<typeof IdentifyRequestSchema>;

export const IdentifyResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  expiresIn: z.number(),
  sessionId: z.string(),
  room: z.object({
    id: z.string(),
    internalId: z.string(),
  }),
  permissions: z.array(z.string()),
  user: UserInfoSchema.extend({ color: z.string() }),
});

export type IdentifyResponse = z.infer<typeof IdentifyResponseSchema>;

export const EnsureRoomRequestSchema = z.object({
  id: z.string().min(1).max(256),
  title: z.string().max(256).optional(),
});

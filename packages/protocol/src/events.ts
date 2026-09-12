import { z } from "zod";
import { PERMISSIONS, type Permission } from "./permissions.js";

export const PROTOCOL_VERSION = 1;

export const UserInfoSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  avatar: z.string().url().max(512).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const NormalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const CursorMoveSchema = NormalizedPointSchema.extend({
  surface: z.literal("collaboration").default("collaboration"),
});

export const PresenceUpdateSchema = z.object({
  status: z.enum(["active", "idle", "offline"]).optional(),
  typing: z.boolean().optional(),
});

export const TypingUpdateSchema = z.object({
  typing: z.boolean(),
});

export const JoinRoomSchema = z.object({
  roomId: z.string().min(1).max(256),
  protocol: z.literal(PROTOCOL_VERSION).default(PROTOCOL_VERSION),
});

export const LeaveRoomSchema = z.object({
  roomId: z.string().min(1).max(256),
});

export const RoomErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});

export const ParticipantSchema = UserInfoSchema.extend({
  sessionId: z.string(),
  permissions: z.array(z.enum(PERMISSIONS)),
  status: z.enum(["active", "idle", "offline"]).default("active"),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;
export type CursorMove = z.infer<typeof CursorMoveSchema>;
export type PresenceUpdate = z.infer<typeof PresenceUpdateSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;

export type EventDirection = "c2s" | "s2c" | "both";
export type DeliverySemantics = "ephemeral" | "durable" | "ack";

export type EventDefinition = {
  name: string;
  direction: EventDirection;
  permission?: Permission;
  delivery: DeliverySemantics;
  description: string;
};

export const EVENT_CATALOG: readonly EventDefinition[] = [
  {
    name: "join-room",
    direction: "c2s",
    permission: "room:join",
    delivery: "ack",
    description: "Join the room named in the connection token",
  },
  {
    name: "leave-room",
    direction: "c2s",
    permission: "room:join",
    delivery: "ack",
    description: "Leave the current room",
  },
  {
    name: "room-users",
    direction: "s2c",
    delivery: "durable",
    description: "Full presence snapshot after join",
  },
  {
    name: "user-joined",
    direction: "s2c",
    delivery: "durable",
    description: "A participant entered the room",
  },
  {
    name: "user-left",
    direction: "s2c",
    delivery: "durable",
    description: "A participant left or disconnected",
  },
  {
    name: "presence:update",
    direction: "both",
    permission: "presence:write",
    delivery: "ephemeral",
    description: "Idle/active/typing presence",
  },
  {
    name: "cursor-move",
    direction: "c2s",
    permission: "presence:write",
    delivery: "ephemeral",
    description: "Normalized pointer inside the collaboration surface",
  },
  {
    name: "cursor-update",
    direction: "s2c",
    delivery: "ephemeral",
    description: "Broadcast pointer position",
  },
  {
    name: "typing:update",
    direction: "both",
    permission: "presence:write",
    delivery: "ephemeral",
    description: "Typing indicator",
  },
  {
    name: "yjs:sync",
    direction: "both",
    permission: "room:read",
    delivery: "ack",
    description: "State-vector exchange for missing Yjs updates",
  },
  {
    name: "yjs:update",
    direction: "both",
    permission: "room:write",
    delivery: "durable",
    description: "Incremental Yjs update (persisted before ack)",
  },
  {
    name: "yjs:reset",
    direction: "s2c",
    delivery: "durable",
    description: "Document generation changed after an authorized restore",
  },
  {
    name: "awareness:update",
    direction: "both",
    permission: "presence:write",
    delivery: "ephemeral",
    description: "Yjs awareness (editor carets and selections)",
  },
  {
    name: "comment:created",
    direction: "both",
    permission: "comments:write",
    delivery: "durable",
    description: "New comment or reply",
  },
  {
    name: "comment:updated",
    direction: "both",
    permission: "comments:write",
    delivery: "durable",
    description: "Edited comment body",
  },
  {
    name: "comment:deleted",
    direction: "both",
    permission: "comments:write",
    delivery: "durable",
    description: "Deleted comment",
  },
  {
    name: "thread:resolved",
    direction: "both",
    permission: "comments:write",
    delivery: "durable",
    description: "Thread marked resolved",
  },
  {
    name: "thread:reopened",
    direction: "both",
    permission: "comments:write",
    delivery: "durable",
    description: "Thread reopened",
  },
  {
    name: "room:permissions-changed",
    direction: "s2c",
    delivery: "durable",
    description: "Grants for this session changed or were revoked",
  },
  {
    name: "room:error",
    direction: "s2c",
    delivery: "ephemeral",
    description: "Structured operation error",
  },
  {
    name: "suggestion:created",
    direction: "s2c",
    delivery: "durable",
    description: "A pending document proposal was stored",
  },
  {
    name: "suggestion:updated",
    direction: "s2c",
    delivery: "durable",
    description: "A proposal was accepted, rejected, or withdrawn",
  },
  {
    name: "chat:message",
    direction: "s2c",
    delivery: "durable",
    description: "In-room chat message",
  },
  {
    name: "reaction:changed",
    direction: "s2c",
    delivery: "durable",
    description: "Reaction added or removed on a chat/comment/suggestion",
  },
] as const;

export const LEGACY_EVENTS = [
  "join-project",
  "join-document",
  "content-change",
  "content-update",
  "cursor-click",
  "cursor-hover",
  "input-change",
  "typing-start",
  "typing-stop",
] as const;

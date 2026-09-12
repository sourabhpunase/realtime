import { z } from "zod";

export const MAX_YJS_UPDATE_CHARS = 400_000;
export const MAX_YJS_UPDATE_BYTES = 256_000;

export const YjsSyncRequestSchema = z.object({
  stateVector: z.string().max(MAX_YJS_UPDATE_CHARS).optional(),
  generation: z.number().int().positive().optional(),
  requestId: z.string().max(80).optional(),
});

export const YjsUpdateRequestSchema = z.object({
  update: z.string().min(1).max(MAX_YJS_UPDATE_CHARS),
  generation: z.number().int().positive(),
  requestId: z.string().max(80).optional(),
});

export const AwarenessUpdateSchema = z.object({
  update: z.string().min(1).max(64_000),
});

export const CommentCreateSchema = z.object({
  body: z.string().min(1).max(8000),
  threadId: z.string().uuid().optional(),
  quote: z.string().max(2000).optional(),
  anchor: z
    .object({
      relStart: z.unknown(),
      relEnd: z.unknown(),
    })
    .optional(),
  mentionIds: z.array(z.string().max(128)).max(20).optional(),
});

export const CommentPatchSchema = z.object({
  body: z.string().min(1).max(8000).optional(),
  status: z.enum(["open", "resolved"]).optional(),
});

export const VersionCreateSchema = z.object({
  name: z.string().min(1).max(120),
});

export const SuggestionCreateSchema = z.object({
  kind: z.enum(["insert", "delete", "replace"]),
  insertText: z.string().max(8000).optional(),
  deleteText: z.string().max(8000).optional(),
  quote: z.string().max(2000).optional(),
  offset: z.number().int().min(0).max(1_000_000).optional(),
});

export const SuggestionDecideSchema = z.object({
  action: z.enum(["accept", "reject", "withdraw"]),
});

export const ChatCreateSchema = z.object({
  body: z.string().min(1).max(2000),
  clientId: z.string().max(80).optional(),
});

export const ReactionSchema = z.object({
  targetType: z.enum(["chat", "comment", "suggestion"]),
  targetId: z.string().min(1).max(80),
  emoji: z.string().min(1).max(16),
});

export const RoomGrantSchema = z.object({
  userId: z.string().min(1).max(128),
  permissions: z.array(z.string()).min(1).max(32),
});

export type SuggestionKind = "insert" | "delete" | "replace";
export type SuggestionStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type SuggestionRecord = {
  id: string;
  roomId: string;
  kind: SuggestionKind;
  status: SuggestionStatus;
  insertText?: string;
  deleteText?: string;
  quote?: string;
  offset?: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

export type ChatMessageRecord = {
  id: string;
  roomId: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

export type ReactionRecord = {
  targetType: "chat" | "comment" | "suggestion";
  targetId: string;
  emoji: string;
  userId: string;
  userName: string;
};

export type CommentThread = {
  id: string;
  roomId: string;
  status: "open" | "resolved";
  quote?: string;
  anchor?: { relStart: unknown; relEnd: unknown };
  createdBy: string;
  createdByName: string;
  createdAt: string;
  comments: CommentRecord[];
};

export type CommentRecord = {
  id: string;
  threadId: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type DocumentVersion = {
  id: string;
  roomId: string;
  name: string;
  seq: number;
  generation: number;
  createdBy: string;
  createdAt: string;
};

export type DocumentSyncState =
  | "synchronizing"
  | "saving"
  | "saved"
  | "offline"
  | "recovery_required"
  | "permission_denied";

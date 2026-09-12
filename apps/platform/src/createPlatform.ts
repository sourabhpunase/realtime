import http from "node:http";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { Server } from "socket.io";
import {
  AwarenessUpdateSchema,
  CommentCreateSchema,
  CommentPatchSchema,
  CursorMoveSchema,
  IdentifyRequestSchema,
  JoinRoomSchema,
  LeaveRoomSchema,
  PROTOCOL_VERSION,
  PresenceUpdateSchema,
  RealtimeError,
  STATUS_BY_CODE,
  TypingUpdateSchema,
  VersionCreateSchema,
  YjsSyncRequestSchema,
  YjsUpdateRequestSchema,
  MediaTokenRequestSchema,
  authorizeMediaSources,
  SuggestionCreateSchema,
  SuggestionDecideSchema,
  ChatCreateSchema,
  ReactionSchema,
  RoomGrantSchema,
  hasPermission,
  normalizePermissions,
  type Participant,
  type Permission,
  type RoomTokenClaims,
} from "@realtime/protocol";
import { hashApiSecret, roomChannel, safeEqualHex } from "./lib.js";
import { memoryCluster, connectRedisCluster, type Cluster } from "./cluster.js";
import { DisabledMediaAdapter, mediaRevocationPayload, type MediaAdapter } from "./media.js";
import { MemoryStore, type PlatformStore } from "./store.js";
import {
  DocumentEngine,
  assembleThreads,
  decodeUpdate,
  encodeUpdate,
  newId,
  serializeChat,
  serializeComment,
  serializeGrant,
  serializeReaction,
  serializeSuggestion,
  serializeThread,
} from "./documents.js";
import {
  assertActiveSession,
  signRoomToken,
  signerFromSeed,
  verifyRoomToken,
  type PlatformSigner,
} from "./tokens.js";

export type PlatformOptions = {
  store?: PlatformStore;
  signingSeed?: string;
  corsOrigins?: string[];
  revocationPollMs?: number;
  media?: MediaAdapter;
  redisUrl?: string;
};

type SocketCtx = RoomTokenClaims & { joined: boolean };

const buckets = new WeakMap<object, { count: number; resetAt: number }>();

function rateLimit(key: object, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof RealtimeError) {
    res.status(error.status).json(error.toJSON());
    return;
  }
  const message = error instanceof Error ? error.message : "Internal error";
  res.status(500).json(new RealtimeError("INTERNAL", message, 500).toJSON());
}

function readBearer(req: Request): string | undefined {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7).trim();
}

export async function createPlatform(options: PlatformOptions = {}) {
  const store = options.store ?? new MemoryStore();
  await store.ready();
  const signer: PlatformSigner = signerFromSeed(
    options.signingSeed ?? "dev-signing-seed-not-for-production",
  );
  const signers = new Map<string, PlatformSigner>([[signer.kid, signer]]);
  const corsOrigins = options.corsOrigins ?? ["http://localhost:4000"];

  const app = express();
  app.disable("x-powered-by");
  const documents = new DocumentEngine(store);
  const media = options.media ?? new DisabledMediaAdapter();
  let cluster: Cluster = memoryCluster();
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    maxHttpBufferSize: 1_000_000,
  });

  if (options.redisUrl) {
    cluster = await connectRedisCluster(options.redisUrl, io, (roomId) => {
      documents.invalidate(roomId);
    });
  }
  documents.setOnPersist((roomId) => {
    void cluster.invalidateDoc(roomId);
  });

  function channelFor(claims: RoomTokenClaims): string {
    return roomChannel(claims.aid, claims.rid);
  }

  async function authenticateSecret(req: Request) {
    const secret = readBearer(req);
    if (!secret || !secret.startsWith("sk_")) {
      throw new RealtimeError("UNAUTHORIZED", "Secret key required", 401);
    }
    const credential = await store.findCredentialBySecretHash(hashApiSecret(secret));
    if (!credential || !safeEqualHex(credential.secretHash, hashApiSecret(secret))) {
      throw new RealtimeError("UNAUTHORIZED", "Invalid secret key", 401);
    }
    if (credential.revokedAt) {
      throw new RealtimeError("KEY_REVOKED", "API key revoked", 401);
    }
    const application = await store.getApplication(credential.applicationId);
    if (!application) {
      throw new RealtimeError("UNAUTHORIZED", "Application missing", 401);
    }
    const tenant = await store.getTenant(application.tenantId);
    if (!tenant) {
      throw new RealtimeError("UNAUTHORIZED", "Tenant missing", 401);
    }
    await store.touchCredential(credential.id);
    return { credential, application, tenant };
  }

  async function authenticateRoomToken(req: Request) {
    const token = readBearer(req);
    if (!token) throw new RealtimeError("UNAUTHORIZED", "Room token required", 401);
    const claims = await verifyRoomToken(token, (kid) => signers.get(kid ?? signer.kid));
    assertActiveSession(store, claims);
    return claims;
  }

  async function resolveRoom(
    req: Request,
    externalId: string,
    permission?: Permission,
  ) {
    const secret = readBearer(req);
    if (secret?.startsWith("sk_")) {
      const ctx = await authenticateSecret(req);
      const room = await store.getRoomByExternal(ctx.application.id, externalId);
      if (!room) throw new RealtimeError("ROOM_NOT_FOUND", "Room not found", 404);
      return {
        room,
        actor: { id: "application", name: "Application" },
        applicationId: ctx.application.id,
      };
    }
    const claims = await authenticateRoomToken(req);
    if (claims.rid !== externalId) {
      throw new RealtimeError("WRONG_ROOM", "Token is not valid for this room", 403);
    }
    if (permission && !hasPermission(claims.perms, permission)) {
      throw new RealtimeError("FORBIDDEN", `${permission} required`, 403);
    }
    const room = await store.getRoomByExternal(claims.aid, externalId);
    if (!room) throw new RealtimeError("ROOM_NOT_FOUND", "Room not found", 404);
    return {
      room,
      actor: { id: claims.sub, name: claims.name },
      applicationId: claims.aid,
      claims,
    };
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true, protocol: PROTOCOL_VERSION });
  });

  app.get("/ready", async (_req, res) => {
    const ok = await store.health();
    res.status(ok ? 200 : 503).json({
      ok,
      store: store.driver,
      media: media.enabled,
      instance: cluster.mode,
    });
  });

  app.post("/v1/rooms", async (req, res) => {
    try {
      const { application } = await authenticateSecret(req);
      const id = String(req.body?.id ?? "");
      if (!id) throw new RealtimeError("INVALID_PAYLOAD", "Room id required");
      const room = await store.ensureRoom(application.id, id, req.body?.title);
      res.status(201).json({
        room: {
          id: room.externalId,
          internalId: room.id,
          title: room.title,
          generation: room.generation,
          connectedCount: (await cluster.presenceList(roomChannel(application.id, room.externalId)))
            .length,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/v1/rooms/:id", async (req, res) => {
    try {
      let applicationId: string;
      const secret = readBearer(req);
      if (secret?.startsWith("sk_")) {
        const ctx = await authenticateSecret(req);
        applicationId = ctx.application.id;
      } else {
        const claims = await authenticateRoomToken(req);
        if (claims.rid !== req.params.id) {
          throw new RealtimeError("WRONG_ROOM", "Token is not valid for this room", 403);
        }
        if (!hasPermission(claims.perms, "room:read")) {
          throw new RealtimeError("FORBIDDEN", "room:read required", 403);
        }
        applicationId = claims.aid;
      }
      const room = await store.getRoomByExternal(applicationId, req.params.id);
      if (!room) throw new RealtimeError("ROOM_NOT_FOUND", "Room not found", 404);
      const online = await cluster.presenceList(roomChannel(applicationId, room.externalId));
      res.json({
        room: {
          id: room.externalId,
          internalId: room.id,
          title: room.title,
          generation: room.generation,
          updatedAt: room.updatedAt.toISOString(),
        },
        connected: online,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/v1/tokens", async (req, res) => {
    try {
      const { application, tenant } = await authenticateSecret(req);
      const body = IdentifyRequestSchema.parse(req.body);
      const permissions = normalizePermissions(body.permissions);
      if (!hasPermission(permissions, "room:join")) {
        throw new RealtimeError("UNKNOWN_PERMISSION", "room:join is required");
      }
      const room = await store.ensureRoom(application.id, body.room);
      const { token, claims } = await signRoomToken(signer, {
        tenantId: tenant.id,
        application,
        room,
        user: body.user,
        permissions,
        ttlSeconds: body.ttlSeconds,
      });
      res.json({
        token,
        expiresAt: new Date(claims.exp * 1000).toISOString(),
        expiresIn: claims.exp - claims.iat,
        sessionId: claims.jti,
        room: { id: room.externalId, internalId: room.id },
        permissions: claims.perms,
        user: {
          id: claims.sub,
          name: claims.name,
          avatar: claims.avatar,
          color: claims.color,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        sendError(res, new RealtimeError("INVALID_PAYLOAD", error.message));
        return;
      }
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/revoke", async (req, res) => {
    try {
      const { application } = await authenticateSecret(req);
      const room = await store.getRoomByExternal(application.id, req.params.id);
      if (!room) throw new RealtimeError("ROOM_NOT_FOUND", "Room not found", 404);
      await store.revokeSession({
        applicationId: application.id,
        roomExternalId: room.externalId,
        jti: req.body?.sessionId,
        userId: req.body?.userId,
        reason: req.body?.reason ?? "revoked",
      });
      if (req.body?.userId) {
        await media.removeParticipant(application.id, room.externalId, String(req.body.userId));
      }
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/v1/rooms/:id/comments", async (req, res) => {
    try {
      const { room } = await resolveRoom(req, req.params.id, "room:read");
      res.json({ threads: await assembleThreads(store, room.id) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/comments", async (req, res) => {
    try {
      const { room, actor } = await resolveRoom(req, req.params.id, "comments:write");
      const body = CommentCreateSchema.parse(req.body);
      const now = new Date();
      const thread = body.threadId
        ? await store.getThread(body.threadId)
        : await store.createThread({
            id: newId(),
            roomId: room.id,
            status: "open",
            quote: body.quote,
            anchor: body.anchor as { relStart: unknown; relEnd: unknown } | undefined,
            createdBy: actor.id,
            createdByName: actor.name,
            createdAt: now,
          });
      if (!thread || thread.roomId !== room.id) {
        throw new RealtimeError("ROOM_NOT_FOUND", "Thread not found", 404);
      }
      const comment = await store.addComment({
        id: newId(),
        threadId: thread.id,
        roomId: room.id,
        body: body.body,
        authorId: actor.id,
        authorName: actor.name,
        createdAt: now,
        updatedAt: now,
      });
      const payload = serializeThread(
        thread,
        (await store.listComments(room.id)).filter((item) => item.threadId === thread.id),
      );
      io.to(roomChannel(room.applicationId, room.externalId)).emit("comment:created", payload);
      res.status(201).json({ thread: payload, comment: serializeComment(comment) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.patch("/v1/rooms/:id/comments/:commentId", async (req, res) => {
    try {
      const { room, actor, claims } = await resolveRoom(req, req.params.id, "comments:write");
      const comment = await store.getComment(req.params.commentId);
      if (!comment || comment.roomId !== room.id) {
        throw new RealtimeError("ROOM_NOT_FOUND", "Comment not found", 404);
      }
      const canAdmin = claims ? hasPermission(claims.perms, "room:admin") : true;
      if (comment.authorId !== actor.id && !canAdmin) {
        throw new RealtimeError("FORBIDDEN", "Cannot edit another author's comment", 403);
      }
      const patch = CommentPatchSchema.parse(req.body);
      if (patch.body) {
        comment.body = patch.body;
        comment.updatedAt = new Date();
      }
      if (patch.status) {
        const thread = await store.getThread(comment.threadId);
        if (thread) {
          thread.status = patch.status;
          await store.updateThread(thread);
        }
        io.to(roomChannel(room.applicationId, room.externalId)).emit(
          patch.status === "resolved" ? "thread:resolved" : "thread:reopened",
          { threadId: comment.threadId },
        );
      }
      await store.updateComment(comment);
      io.to(roomChannel(room.applicationId, room.externalId)).emit(
        "comment:updated",
        serializeComment(comment),
      );
      res.json({ comment: serializeComment(comment) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete("/v1/rooms/:id/comments/:commentId", async (req, res) => {
    try {
      const { room, actor, claims } = await resolveRoom(req, req.params.id, "comments:write");
      const comment = await store.getComment(req.params.commentId);
      if (!comment || comment.roomId !== room.id) {
        throw new RealtimeError("ROOM_NOT_FOUND", "Comment not found", 404);
      }
      const canAdmin = claims ? hasPermission(claims.perms, "room:admin") : true;
      if (comment.authorId !== actor.id && !canAdmin) {
        throw new RealtimeError("FORBIDDEN", "Cannot delete another author's comment", 403);
      }
      comment.deletedAt = new Date();
      comment.body = "";
      await store.updateComment(comment);
      io.to(roomChannel(room.applicationId, room.externalId)).emit("comment:deleted", {
        commentId: comment.id,
        threadId: comment.threadId,
      });
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/v1/rooms/:id/versions", async (req, res) => {
    try {
      const { room } = await resolveRoom(req, req.params.id, "history:read");
      res.json({
        versions: (await store.listVersions(room.id)).map((version) => ({
          id: version.id,
          name: version.name,
          seq: version.seq,
          generation: version.generation,
          createdBy: version.createdBy,
          createdAt: version.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/versions", async (req, res) => {
    try {
      const { room, actor } = await resolveRoom(req, req.params.id, "room:write");
      const body = VersionCreateSchema.parse(req.body);
      const snapshot = await documents.snapshotBytes(room);
      const version = await store.addVersion({
        id: newId(),
        roomId: room.id,
        name: body.name,
        seq: await documents.currentSeq(room),
        generation: room.generation,
        snapshot,
        createdBy: actor.id,
        createdAt: new Date(),
      });
      res.status(201).json({
        version: {
          id: version.id,
          name: version.name,
          seq: version.seq,
          generation: version.generation,
          createdBy: version.createdBy,
          createdAt: version.createdAt.toISOString(),
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/versions/:versionId/restore", async (req, res) => {
    try {
      const { room } = await resolveRoom(req, req.params.id, "history:restore");
      const version = await store.getVersion(req.params.versionId);
      if (!version || version.roomId !== room.id) {
        throw new RealtimeError("ROOM_NOT_FOUND", "Version not found", 404);
      }
      const updated = await documents.restore(room, version.snapshot);
      io.to(roomChannel(updated.applicationId, updated.externalId)).emit("yjs:reset", {
        generation: updated.generation,
        update: encodeUpdate(version.snapshot),
        versionId: version.id,
      });
      res.json({
        room: {
          id: updated.externalId,
          generation: updated.generation,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/v1/rooms/:id/suggestions", async (req, res) => {
    try {
      const { room } = await resolveRoom(req, req.params.id, "room:read");
      res.json({ suggestions: (await store.listSuggestions(room.id)).map(serializeSuggestion) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/suggestions", async (req, res) => {
    try {
      const { room, actor } = await resolveRoom(req, req.params.id, "suggestions:write");
      const body = SuggestionCreateSchema.parse(req.body);
      if ((body.kind === "insert" || body.kind === "replace") && !body.insertText) {
        throw new RealtimeError("INVALID_PAYLOAD", "insert/replace suggestions need insertText");
      }
      if ((body.kind === "delete" || body.kind === "replace") && !body.deleteText && !body.quote) {
        throw new RealtimeError("INVALID_PAYLOAD", "delete/replace suggestions need the original text");
      }
      const suggestion = await store.addSuggestion({
        id: newId(),
        roomId: room.id,
        kind: body.kind,
        status: "pending",
        insertText: body.insertText,
        deleteText: body.deleteText ?? body.quote,
        quote: body.quote,
        offset: body.offset,
        authorId: actor.id,
        authorName: actor.name,
        createdAt: new Date(),
      });
      const payload = serializeSuggestion(suggestion);
      io.to(roomChannel(room.applicationId, room.externalId)).emit("suggestion:created", payload);
      res.status(201).json({ suggestion: payload });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        sendError(res, new RealtimeError("INVALID_PAYLOAD", error.message));
        return;
      }
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/suggestions/:suggestionId", async (req, res) => {
    try {
      const { room, actor, claims } = await resolveRoom(req, req.params.id, "room:read");
      const suggestion = await store.getSuggestion(req.params.suggestionId);
      if (!suggestion || suggestion.roomId !== room.id) {
        throw new RealtimeError("ROOM_NOT_FOUND", "Suggestion not found", 404);
      }
      if (suggestion.status !== "pending") {
        throw new RealtimeError("CONFLICT", "Suggestion is no longer pending", 409);
      }
      const body = SuggestionDecideSchema.parse(req.body);
      const isAdmin = !claims || hasPermission(claims.perms, "room:admin");
      if (body.action === "withdraw") {
        if (suggestion.authorId !== actor.id && !isAdmin) {
          throw new RealtimeError("FORBIDDEN", "Only the author can withdraw this suggestion", 403);
        }
        if (claims && !hasPermission(claims.perms, "suggestions:write") && !isAdmin) {
          throw new RealtimeError("FORBIDDEN", "suggestions:write required", 403);
        }
      } else if (claims && !hasPermission(claims.perms, "suggestions:accept")) {
        throw new RealtimeError("FORBIDDEN", "suggestions:accept required", 403);
      }

      let applied:
        | { seq: number; update: Uint8Array; generation: number; text: string }
        | undefined;
      if (body.action === "accept") {
        applied = await documents.applyPlainText(room, {
          kind: suggestion.kind,
          offset: suggestion.offset,
          deleteText: suggestion.deleteText,
          quote: suggestion.quote,
          insertText: suggestion.insertText,
        });
        io.to(roomChannel(room.applicationId, room.externalId)).emit("yjs:update", {
          update: encodeUpdate(applied.update),
          generation: applied.generation,
          seq: applied.seq,
          userId: actor.id,
        });
      }
      suggestion.status =
        body.action === "withdraw" ? "withdrawn" : body.action === "accept" ? "accepted" : "rejected";
      suggestion.resolvedAt = new Date();
      suggestion.resolvedBy = actor.id;
      await store.updateSuggestion(suggestion);
      const payload = serializeSuggestion(suggestion);
      io.to(roomChannel(room.applicationId, room.externalId)).emit("suggestion:updated", payload);
      res.json({
        suggestion: payload,
        applied: applied
          ? { seq: applied.seq, generation: applied.generation, text: applied.text }
          : undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        sendError(res, new RealtimeError("INVALID_PAYLOAD", error.message));
        return;
      }
      sendError(res, error);
    }
  });

  app.get("/v1/rooms/:id/chat", async (req, res) => {
    try {
      const { room } = await resolveRoom(req, req.params.id, "room:read");
      const limit = Number(req.query.limit ?? 50);
      res.json({
        messages: (await store.listChat(room.id, Number.isFinite(limit) ? limit : 50)).map(serializeChat),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/chat", async (req, res) => {
    try {
      const { room, actor } = await resolveRoom(req, req.params.id, "chat:write");
      const body = ChatCreateSchema.parse(req.body);
      const stored = await store.addChat({
        id: newId(),
        roomId: room.id,
        body: body.body,
        authorId: actor.id,
        authorName: actor.name,
        createdAt: new Date(),
        clientId: body.clientId,
      });
      const payload = serializeChat(stored.message);
      if (!stored.duplicate) {
        io.to(roomChannel(room.applicationId, room.externalId)).emit("chat:message", payload);
      }
      res.status(stored.duplicate ? 200 : 201).json({ message: payload, duplicate: stored.duplicate });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        sendError(res, new RealtimeError("INVALID_PAYLOAD", error.message));
        return;
      }
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/reactions", async (req, res) => {
    try {
      const { room, actor } = await resolveRoom(req, req.params.id, "chat:write");
      const body = ReactionSchema.parse(req.body);
      const result = await store.toggleReaction({
        targetType: body.targetType,
        targetId: body.targetId,
        emoji: body.emoji,
        userId: actor.id,
        userName: actor.name,
      });
      const payload = {
        ...serializeReaction(result.reaction),
        removed: result.removed,
        reactions: (await store.listReactions(body.targetType, body.targetId)).map(serializeReaction),
      };
      io.to(roomChannel(room.applicationId, room.externalId)).emit("reaction:changed", payload);
      res.json(payload);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        sendError(res, new RealtimeError("INVALID_PAYLOAD", error.message));
        return;
      }
      sendError(res, error);
    }
  });

  app.get("/v1/rooms/:id/grants", async (req, res) => {
    try {
      const { room, claims } = await resolveRoom(req, req.params.id);
      if (claims && !hasPermission(claims.perms, "room:admin")) {
        throw new RealtimeError("FORBIDDEN", "room:admin required", 403);
      }
      res.json({
        grants: (await store.listGrants(room.id)).map(serializeGrant),
        precedence:
          "Delegated integrator permissions on POST /v1/tokens win. These records are optional metadata unless the integrator copies them into identify().",
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/grants", async (req, res) => {
    try {
      const { room, actor, claims } = await resolveRoom(req, req.params.id);
      if (claims && !hasPermission(claims.perms, "room:admin")) {
        throw new RealtimeError("FORBIDDEN", "room:admin required", 403);
      }
      const body = RoomGrantSchema.parse(req.body);
      const permissions = normalizePermissions(body.permissions);
      const grant = await store.upsertGrant({
        roomId: room.id,
        userId: body.userId,
        permissions,
        updatedAt: new Date(),
        updatedBy: actor.id,
      });
      res.status(201).json({ grant: serializeGrant(grant) });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        sendError(res, new RealtimeError("INVALID_PAYLOAD", error.message));
        return;
      }
      sendError(res, error);
    }
  });

  app.delete("/v1/rooms/:id/grants/:userId", async (req, res) => {
    try {
      const { room, claims } = await resolveRoom(req, req.params.id);
      if (claims && !hasPermission(claims.perms, "room:admin")) {
        throw new RealtimeError("FORBIDDEN", "room:admin required", 403);
      }
      await store.deleteGrant(room.id, req.params.userId);
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/v1/rooms/:id/media-token", async (req, res) => {
    try {
      const { room, actor, claims, applicationId } = await resolveRoom(
        req,
        req.params.id,
        "media:join",
      );
      if (!claims) {
        throw new RealtimeError("UNAUTHORIZED", "A room token is required to mint media credentials", 401);
      }
      const body = MediaTokenRequestSchema.parse(req.body ?? {});
      const sources = authorizeMediaSources(claims.perms, body.sources);
      const canPublish = sources.length > 0;
      const issued = await media.issueToken({
        applicationId,
        roomExternalId: room.externalId,
        userId: actor.id,
        userName: actor.name,
        canPublish,
        sources,
      });
      res.json({
        token: issued.token,
        url: issued.url,
        roomName: issued.roomName,
        identity: issued.identity,
        expiresAt: issued.expiresAt.toISOString(),
        expiresIn: issued.expiresIn,
        canPublish: issued.canPublish,
        allowedSources: issued.allowedSources,
        revocation: mediaRevocationPayload(),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        sendError(res, new RealtimeError("INVALID_PAYLOAD", error.message));
        return;
      }
      sendError(res, error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    sendError(res, error);
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string") {
        throw new RealtimeError("UNAUTHORIZED", "Room token required", 401);
      }
      const claims = await verifyRoomToken(token, (kid) => signers.get(kid ?? signer.kid));
      assertActiveSession(store, claims);
      (socket.data as { ctx: SocketCtx }).ctx = { ...claims, joined: false };
      next();
    } catch (error) {
      const message = error instanceof RealtimeError ? error.code : "UNAUTHORIZED";
      next(new Error(message));
    }
  });

  function requireCtx(socket: { data: { ctx?: SocketCtx } }): SocketCtx {
    const ctx = socket.data.ctx;
    if (!ctx) throw new RealtimeError("UNAUTHORIZED", "Missing session", 401);
    assertActiveSession(store, ctx);
    return ctx;
  }

  io.on("connection", (socket) => {
    socket.on("join-room", async (payload, ack) => {
      try {
        const ctx = requireCtx(socket);
        const body = JoinRoomSchema.parse(payload ?? {});
        if (body.protocol !== PROTOCOL_VERSION) {
          throw new RealtimeError("PROTOCOL_MISMATCH", "Unsupported protocol version");
        }
        if (body.roomId !== ctx.rid) {
          throw new RealtimeError("WRONG_ROOM", "Token is scoped to a different room", 403);
        }
        if (!hasPermission(ctx.perms, "room:join")) {
          throw new RealtimeError("FORBIDDEN", "room:join required", 403);
        }
        const channel = channelFor(ctx);
        socket.join(channel);
        ctx.joined = true;
        const participant: Participant = {
          id: ctx.sub,
          name: ctx.name,
          avatar: ctx.avatar,
          color: ctx.color,
          sessionId: ctx.jti,
          permissions: ctx.perms,
          status: "active",
        };
        await cluster.presenceAdd(channel, socket.id, participant);
        const users = await cluster.presenceList(channel);
        socket.emit("room-users", users);
        socket.to(channel).emit("user-joined", participant);
        ack?.({ ok: true, users, protocol: PROTOCOL_VERSION });
      } catch (error) {
        const err =
          error instanceof RealtimeError
            ? error
            : new RealtimeError("INVALID_PAYLOAD", error instanceof Error ? error.message : "join failed");
        socket.emit("room:error", err.toJSON().error);
        ack?.({ ok: false, error: err.toJSON().error });
      }
    });

    socket.on("leave-room", async (payload, ack) => {
      try {
        const ctx = requireCtx(socket);
        LeaveRoomSchema.parse(payload ?? { roomId: ctx.rid });
        await depart(socket.id, ctx);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false });
      }
    });

    socket.on("cursor-move", (payload) => {
      try {
        const ctx = requireCtx(socket);
        if (!ctx.joined) return;
        if (!hasPermission(ctx.perms, "presence:write")) {
          throw new RealtimeError("FORBIDDEN", "presence:write required", 403);
        }
        if (!rateLimit(socket, 40, 1000)) return;
        const point = CursorMoveSchema.parse(payload);
        socket.to(channelFor(ctx)).emit("cursor-update", {
          sessionId: ctx.jti,
          userId: ctx.sub,
          ...point,
        });
      } catch (error) {
        if (error instanceof RealtimeError) {
          socket.emit("room:error", error.toJSON().error);
        }
      }
    });

    socket.on("presence:update", (payload) => {
      try {
        const ctx = requireCtx(socket);
        if (!ctx.joined || !hasPermission(ctx.perms, "presence:write")) return;
        const update = PresenceUpdateSchema.parse(payload);
        socket.to(channelFor(ctx)).emit("presence:update", {
          sessionId: ctx.jti,
          userId: ctx.sub,
          ...update,
        });
      } catch {
        /* ephemeral */
      }
    });

    socket.on("typing:update", (payload) => {
      try {
        const ctx = requireCtx(socket);
        if (!ctx.joined || !hasPermission(ctx.perms, "presence:write")) return;
        const update = TypingUpdateSchema.parse(payload);
        socket.to(channelFor(ctx)).emit("typing:update", {
          sessionId: ctx.jti,
          userId: ctx.sub,
          ...update,
        });
      } catch {
        /* ephemeral */
      }
    });

    socket.on("yjs:sync", async (payload, ack) => {
      try {
        const ctx = requireCtx(socket);
        if (!ctx.joined) throw new RealtimeError("FORBIDDEN", "Join the room first", 403);
        if (!hasPermission(ctx.perms, "room:read")) {
          throw new RealtimeError("FORBIDDEN", "room:read required", 403);
        }
        const body = YjsSyncRequestSchema.parse(payload ?? {});
        const room = await store.getRoomByExternal(ctx.aid, ctx.rid);
        if (!room) throw new RealtimeError("ROOM_NOT_FOUND", "Room not found", 404);
        const vector = body.stateVector ? decodeUpdate(body.stateVector) : undefined;
        const result = await documents.sync(room, vector);
        ack?.({
          ok: true,
          update: encodeUpdate(result.update),
          serverStateVector: encodeUpdate(result.serverStateVector),
          generation: result.generation,
          seq: result.seq,
        });
      } catch (error) {
        const err =
          error instanceof RealtimeError
            ? error
            : new RealtimeError("INVALID_PAYLOAD", error instanceof Error ? error.message : "sync failed");
        ack?.({ ok: false, error: err.toJSON().error });
      }
    });

    socket.on("yjs:update", async (payload, ack) => {
      try {
        const ctx = requireCtx(socket);
        if (!ctx.joined) throw new RealtimeError("FORBIDDEN", "Join the room first", 403);
        if (!hasPermission(ctx.perms, "room:write")) {
          throw new RealtimeError("FORBIDDEN", "room:write required", 403);
        }
        const body = YjsUpdateRequestSchema.parse(payload);
        const room = await store.getRoomByExternal(ctx.aid, ctx.rid);
        if (!room) throw new RealtimeError("ROOM_NOT_FOUND", "Room not found", 404);
        const update = decodeUpdate(body.update);
        const result = await documents.apply(room, {
          update,
          requestId: body.requestId,
          generation: body.generation,
        });
        if (!result.duplicate) {
          socket.to(channelFor(ctx)).emit("yjs:update", {
            update: body.update,
            generation: result.generation,
            seq: result.seq,
            userId: ctx.sub,
          });
        }
        ack?.({
          ok: true,
          saved: true,
          duplicate: result.duplicate,
          seq: result.seq,
          generation: result.generation,
        });
      } catch (error) {
        const err =
          error instanceof RealtimeError
            ? error
            : new RealtimeError("INVALID_PAYLOAD", error instanceof Error ? error.message : "update failed");
        socket.emit("room:error", err.toJSON().error);
        ack?.({ ok: false, error: err.toJSON().error });
      }
    });

    socket.on("awareness:update", (payload) => {
      try {
        const ctx = requireCtx(socket);
        if (!ctx.joined || !hasPermission(ctx.perms, "presence:write")) return;
        if (!rateLimit({ socket, kind: "awareness" }, 30, 1000)) return;
        const body = AwarenessUpdateSchema.parse(payload);
        socket.to(channelFor(ctx)).emit("awareness:update", {
          update: body.update,
          sessionId: ctx.jti,
          userId: ctx.sub,
        });
      } catch {
        /* ephemeral */
      }
    });

    socket.on("disconnect", () => {
      const ctx = socket.data.ctx as SocketCtx | undefined;
      if (ctx?.joined) void depart(socket.id, ctx);
    });
  });

  async function depart(socketId: string, ctx: RoomTokenClaims): Promise<void> {
    const channel = channelFor(ctx);
    const participant = await cluster.presenceRemove(channel, socketId);
    if (participant) {
      io.to(channel).emit("user-left", { sessionId: participant.sessionId, userId: participant.id });
    }
  }

  const unsubscribe = store.onRevoke((revocation) => {
    for (const socket of io.sockets.sockets.values()) {
      const ctx = socket.data.ctx as SocketCtx | undefined;
      if (!ctx) continue;
      const matchJti = revocation.jti && revocation.jti === ctx.jti;
      const matchUser =
        revocation.userId &&
        revocation.applicationId === ctx.aid &&
        revocation.roomExternalId === ctx.rid &&
        revocation.userId === ctx.sub;
      if (matchJti || matchUser) {
        socket.emit("room:permissions-changed", { revoked: true, reason: revocation.reason });
        socket.disconnect(true);
      }
    }
  });

  const poll = setInterval(() => {
    void store.refreshRevocations();
    for (const socket of io.sockets.sockets.values()) {
      const ctx = socket.data.ctx as SocketCtx | undefined;
      if (!ctx) continue;
      try {
        assertActiveSession(store, ctx);
        if (ctx.exp * 1000 <= Date.now()) {
          throw new RealtimeError("TOKEN_EXPIRED", "Room token expired", 401);
        }
      } catch (error) {
        const code = error instanceof RealtimeError ? error.code : "TOKEN_REVOKED";
        socket.emit("room:permissions-changed", { revoked: true, reason: code });
        socket.disconnect(true);
      }
    }
  }, options.revocationPollMs ?? 2000);

  async function listen(port: number): Promise<number> {
    await new Promise<void>((resolve) => httpServer.listen(port, resolve));
    const address = httpServer.address();
    if (address && typeof address === "object") return address.port;
    return port;
  }

  async function close(): Promise<void> {
    clearInterval(poll);
    unsubscribe();
    io.disconnectSockets(true);
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
    await cluster.close();
    await store.close();
  }

  return { app, httpServer, io, store, signer, media, instance: cluster.mode, listen, close };
}

export { STATUS_BY_CODE };

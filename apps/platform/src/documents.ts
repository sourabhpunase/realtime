import { randomUUID } from "node:crypto";
import * as Y from "yjs";
import { MAX_YJS_UPDATE_BYTES, RealtimeError } from "@realtime/protocol";
import type {
  PlatformStore,
  RoomRecord,
  StoredChatMessage,
  StoredComment,
  StoredGrant,
  StoredReaction,
  StoredSuggestion,
  StoredThread,
} from "./store.js";
import { applyPlainTextEdit, resolveSuggestionEdit, yXmlPlainText } from "./plaintext.js";

const COMPACT_AFTER = 200;

export function decodeUpdate(value: string): Uint8Array {
  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.byteLength === 0) {
    throw new RealtimeError("INVALID_PAYLOAD", "Empty Yjs update");
  }
  if (bytes.byteLength > MAX_YJS_UPDATE_BYTES) {
    throw new RealtimeError("PAYLOAD_TOO_LARGE", "Yjs update exceeds 256KB", 413);
  }
  return bytes;
}

export function encodeUpdate(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export class DocumentEngine {
  private docs = new Map<string, Y.Doc>();
  private tails = new Map<string, Promise<void>>();
  private pendingInvalidate = new Set<string>();
  private onPersist?: (roomId: string) => void;

  constructor(private readonly store: PlatformStore) {}

  setOnPersist(handler: ((roomId: string) => void) | undefined): void {
    this.onPersist = handler;
  }

  private notifyPersist(roomId: string): void {
    this.onPersist?.(roomId);
  }

  private enqueue<T>(roomId: string, work: () => T | Promise<T>): Promise<T> {
    const previous = this.tails.get(roomId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(work);
    this.tails.set(
      roomId,
      current.then(
        () => undefined,
        () => undefined,
      ),
    );
    return current;
  }

  private async load(room: RoomRecord): Promise<Y.Doc> {
    if (this.pendingInvalidate.has(room.id)) {
      this.pendingInvalidate.delete(room.id);
      this.drop(room.id);
    }
    const cached = this.docs.get(room.id);
    if (cached) return cached;
    const doc = new Y.Doc();
    const snapshot = await this.store.getSnapshot(room.id);
    if (snapshot) Y.applyUpdate(doc, snapshot.snapshot);
    for (const item of await this.store.getUpdatesSince(room.id, snapshot?.seq ?? 0)) {
      Y.applyUpdate(doc, item.update);
    }
    this.docs.set(room.id, doc);
    return doc;
  }

  invalidate(roomId: string): void {
    this.pendingInvalidate.add(roomId);
    if (!this.tails.has(roomId)) {
      this.pendingInvalidate.delete(roomId);
      this.drop(roomId);
    }
  }

  private drop(roomId: string): void {
    const doc = this.docs.get(roomId);
    doc?.destroy();
    this.docs.delete(roomId);
  }

  sync(room: RoomRecord, stateVector?: Uint8Array) {
    return this.enqueue(room.id, async () => {
      const doc = await this.load(room);
      const update = stateVector
        ? Y.encodeStateAsUpdate(doc, stateVector)
        : Y.encodeStateAsUpdate(doc);
      const snapshot = await this.store.getSnapshot(room.id);
      const pending = await this.store.getUpdatesSince(room.id, snapshot?.seq ?? 0);
      const lastSeq = pending.at(-1)?.seq ?? snapshot?.seq ?? 0;
      return {
        update,
        serverStateVector: Y.encodeStateVector(doc),
        generation: room.generation,
        seq: lastSeq,
      };
    });
  }

  apply(
    room: RoomRecord,
    input: { update: Uint8Array; requestId?: string; generation: number },
  ) {
    return this.enqueue(room.id, async () => {
      if (input.generation !== room.generation) {
        throw new RealtimeError(
          "CONFLICT",
          "Document generation changed; resynchronize",
          409,
        );
      }
      const persisted = await this.store.appendUpdate(room.id, input.update, input.requestId);
      if (!persisted.duplicate) {
        const doc = await this.load(room);
        Y.applyUpdate(doc, input.update);
        const snapshot = await this.store.getSnapshot(room.id);
        const pending = await this.store.getUpdatesSince(room.id, snapshot?.seq ?? 0);
        if (pending.length >= COMPACT_AFTER) {
          await this.store.compact(room.id, persisted.seq, Y.encodeStateAsUpdate(doc));
        }
        this.notifyPersist(room.id);
      }
      return { ...persisted, generation: room.generation };
    });
  }

  async snapshotBytes(room: RoomRecord): Promise<Uint8Array> {
    return Y.encodeStateAsUpdate(await this.load(room));
  }

  async currentSeq(room: RoomRecord): Promise<number> {
    const snapshot = await this.store.getSnapshot(room.id);
    const pending = await this.store.getUpdatesSince(room.id, snapshot?.seq ?? 0);
    return pending.at(-1)?.seq ?? snapshot?.seq ?? 0;
  }

  async restore(room: RoomRecord, snapshot: Uint8Array): Promise<RoomRecord> {
    const updated = await this.store.resetDocument(room.id, snapshot);
    this.invalidate(room.id);
    await this.load(updated);
    this.notifyPersist(updated.id);
    return updated;
  }

  async textContent(room: RoomRecord): Promise<string> {
    return yXmlPlainText(await this.load(room));
  }

  applyPlainText(
    room: RoomRecord,
    input: {
      kind: string;
      offset?: number;
      deleteText?: string;
      quote?: string;
      insertText?: string;
    },
  ) {
    return this.enqueue(room.id, async () => {
      const doc = await this.load(room);
      const current = yXmlPlainText(doc);
      const edit = resolveSuggestionEdit(current, input);
      const before = Y.encodeStateVector(doc);
      applyPlainTextEdit(doc, edit);
      const update = Y.encodeStateAsUpdate(doc, before);
      const persisted = await this.store.appendUpdate(room.id, update);
      this.notifyPersist(room.id);
      return { ...persisted, update, generation: room.generation, text: yXmlPlainText(doc) };
    });
  }
}

export async function assembleThreads(store: PlatformStore, roomId: string) {
  const comments = await store.listComments(roomId);
  return (await store.listThreads(roomId)).map((thread) => ({
    id: thread.id,
    roomId: thread.roomId,
    status: thread.status,
    quote: thread.quote,
    anchor: thread.anchor,
    createdBy: thread.createdBy,
    createdByName: thread.createdByName,
    createdAt: thread.createdAt.toISOString(),
    comments: comments
      .filter((comment) => comment.threadId === thread.id)
      .map(serializeComment),
  }));
}

export function serializeComment(comment: StoredComment) {
  return {
    id: comment.id,
    threadId: comment.threadId,
    body: comment.body,
    authorId: comment.authorId,
    authorName: comment.authorName,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    deletedAt: comment.deletedAt?.toISOString(),
  };
}

export function serializeThread(thread: StoredThread, comments: StoredComment[]) {
  return {
    id: thread.id,
    roomId: thread.roomId,
    status: thread.status,
    quote: thread.quote,
    anchor: thread.anchor,
    createdBy: thread.createdBy,
    createdByName: thread.createdByName,
    createdAt: thread.createdAt.toISOString(),
    comments: comments.map(serializeComment),
  };
}

export function serializeSuggestion(suggestion: StoredSuggestion) {
  return {
    id: suggestion.id,
    roomId: suggestion.roomId,
    kind: suggestion.kind,
    status: suggestion.status,
    insertText: suggestion.insertText,
    deleteText: suggestion.deleteText,
    quote: suggestion.quote,
    offset: suggestion.offset,
    authorId: suggestion.authorId,
    authorName: suggestion.authorName,
    createdAt: suggestion.createdAt.toISOString(),
    resolvedAt: suggestion.resolvedAt?.toISOString(),
    resolvedBy: suggestion.resolvedBy,
  };
}

export function serializeChat(message: StoredChatMessage) {
  return {
    id: message.id,
    roomId: message.roomId,
    body: message.body,
    authorId: message.authorId,
    authorName: message.authorName,
    createdAt: message.createdAt.toISOString(),
  };
}

export function serializeReaction(reaction: StoredReaction) {
  return {
    targetType: reaction.targetType,
    targetId: reaction.targetId,
    emoji: reaction.emoji,
    userId: reaction.userId,
    userName: reaction.userName,
  };
}

export function serializeGrant(grant: StoredGrant) {
  return {
    userId: grant.userId,
    permissions: grant.permissions,
    updatedAt: grant.updatedAt.toISOString(),
    updatedBy: grant.updatedBy,
  };
}

export function newId(): string {
  return randomUUID();
}

import { randomUUID } from "node:crypto";
import type { Permission } from "@realtime/protocol";
import { hashApiSecret, secretPrefix } from "./lib.js";

export type Environment = "development" | "production";

export type Tenant = {
  id: string;
  name: string;
  createdAt: Date;
};

export type Application = {
  id: string;
  tenantId: string;
  name: string;
  environment: Environment;
  createdAt: Date;
};

export type ApiCredential = {
  id: string;
  applicationId: string;
  publicKey: string;
  secretHash: string;
  secretPrefix: string;
  scopes: string[];
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export type RoomRecord = {
  id: string;
  applicationId: string;
  externalId: string;
  title: string;
  generation: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Revocation = {
  jti?: string;
  applicationId: string;
  roomExternalId?: string;
  userId?: string;
  reason: string;
  createdAt: Date;
};

export type PersistedUpdate = {
  seq: number;
  update: Uint8Array;
  requestId?: string;
  createdAt: Date;
};

export type StoredThread = {
  id: string;
  roomId: string;
  status: "open" | "resolved";
  quote?: string;
  anchor?: { relStart: unknown; relEnd: unknown };
  createdBy: string;
  createdByName: string;
  createdAt: Date;
};

export type StoredComment = {
  id: string;
  threadId: string;
  roomId: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

export type StoredVersion = {
  id: string;
  roomId: string;
  name: string;
  seq: number;
  generation: number;
  snapshot: Uint8Array;
  createdBy: string;
  createdAt: Date;
};

export type StoredSuggestion = {
  id: string;
  roomId: string;
  kind: "insert" | "delete" | "replace";
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  insertText?: string;
  deleteText?: string;
  quote?: string;
  offset?: number;
  authorId: string;
  authorName: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
};

export type StoredChatMessage = {
  id: string;
  roomId: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  clientId?: string;
};

export type StoredReaction = {
  targetType: "chat" | "comment" | "suggestion";
  targetId: string;
  emoji: string;
  userId: string;
  userName: string;
};

export type StoredGrant = {
  roomId: string;
  userId: string;
  permissions: Permission[];
  updatedAt: Date;
  updatedBy: string;
};

export class MemoryStore implements PlatformStore {
  readonly driver = "memory" as const;
  tenants = new Map<string, Tenant>();
  applications = new Map<string, Application>();
  credentials = new Map<string, ApiCredential>();
  rooms = new Map<string, RoomRecord>();
  revokedJtis = new Set<string>();
  revokedUsers = new Set<string>();
  listeners = new Set<(revocation: Revocation) => void>();
  updates = new Map<string, PersistedUpdate[]>();
  requestIds = new Map<string, Set<string>>();
  snapshots = new Map<string, { seq: number; snapshot: Uint8Array }>();
  threads = new Map<string, StoredThread>();
  comments = new Map<string, StoredComment>();
  versions = new Map<string, StoredVersion>();
  suggestions = new Map<string, StoredSuggestion>();
  chat = new Map<string, StoredChatMessage[]>();
  chatRequestIds = new Map<string, Set<string>>();
  reactions = new Map<string, StoredReaction>();
  grants = new Map<string, StoredGrant>();

  async ready(): Promise<void> {}
  async health(): Promise<boolean> {
    return true;
  }
  async close(): Promise<void> {}
  refreshRevocations(): void {}

  createTenant(name: string): Tenant {
    const tenant = { id: randomUUID(), name, createdAt: new Date() };
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  createApplication(
    tenantId: string,
    name: string,
    environment: Environment,
  ): Application {
    if (!this.tenants.has(tenantId)) {
      throw new Error("Unknown tenant");
    }
    const application = {
      id: randomUUID(),
      tenantId,
      name,
      environment,
      createdAt: new Date(),
    };
    this.applications.set(application.id, application);
    return application;
  }

  addCredential(
    applicationId: string,
    publicKey: string,
    secretKey: string,
    scopes: string[] = ["*"],
  ): ApiCredential {
    const credential: ApiCredential = {
      id: randomUUID(),
      applicationId,
      publicKey,
      secretHash: hashApiSecret(secretKey),
      secretPrefix: secretPrefix(secretKey),
      scopes,
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    };
    this.credentials.set(credential.id, credential);
    return credential;
  }

  findCredentialByPublicKey(publicKey: string): ApiCredential | undefined {
    return [...this.credentials.values()].find((item) => item.publicKey === publicKey);
  }

  findCredentialBySecretHash(secretHash: string): ApiCredential | undefined {
    return [...this.credentials.values()].find((item) => item.secretHash === secretHash);
  }

  getApplication(id: string): Application | undefined {
    return this.applications.get(id);
  }

  getTenant(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  revokeCredential(id: string): void {
    const credential = this.credentials.get(id);
    if (credential) credential.revokedAt = new Date();
  }

  touchCredential(id: string): void {
    const credential = this.credentials.get(id);
    if (credential) credential.lastUsedAt = new Date();
  }

  ensureRoom(applicationId: string, externalId: string, title?: string): RoomRecord {
    const existing = [...this.rooms.values()].find(
      (room) => room.applicationId === applicationId && room.externalId === externalId,
    );
    if (existing) return existing;
    const room: RoomRecord = {
      id: randomUUID(),
      applicationId,
      externalId,
      title: title ?? externalId,
      generation: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rooms.set(room.id, room);
    return room;
  }

  getRoomByExternal(applicationId: string, externalId: string): RoomRecord | undefined {
    return [...this.rooms.values()].find(
      (room) => room.applicationId === applicationId && room.externalId === externalId,
    );
  }

  getRoom(id: string): RoomRecord | undefined {
    return this.rooms.get(id);
  }

  revokeSession(revocation: Omit<Revocation, "createdAt">): void {
    const record = { ...revocation, createdAt: new Date() };
    if (record.jti) this.revokedJtis.add(record.jti);
    if (record.userId && record.roomExternalId) {
      this.revokedUsers.add(
        `${record.applicationId}:${record.roomExternalId}:${record.userId}`,
      );
    }
    for (const listener of this.listeners) listener(record);
  }

  isJtiRevoked(jti: string): boolean {
    return this.revokedJtis.has(jti);
  }

  isUserRevoked(applicationId: string, roomExternalId: string, userId: string): boolean {
    return this.revokedUsers.has(`${applicationId}:${roomExternalId}:${userId}`);
  }

  onRevoke(listener: (revocation: Revocation) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  appendUpdate(
    roomId: string,
    update: Uint8Array,
    requestId?: string,
  ): { seq: number; duplicate: boolean } {
    if (requestId) {
      const seen = this.requestIds.get(roomId) ?? new Set<string>();
      if (seen.has(requestId)) {
        const existing = (this.updates.get(roomId) ?? []).find((item) => item.requestId === requestId);
        return { seq: existing?.seq ?? 0, duplicate: true };
      }
      seen.add(requestId);
      this.requestIds.set(roomId, seen);
    }
    const list = this.updates.get(roomId) ?? [];
    const seq = (list.at(-1)?.seq ?? this.snapshots.get(roomId)?.seq ?? 0) + 1;
    list.push({ seq, update, requestId, createdAt: new Date() });
    this.updates.set(roomId, list);
    const room = this.rooms.get(roomId);
    if (room) room.updatedAt = new Date();
    return { seq, duplicate: false };
  }

  getUpdatesSince(roomId: string, seq: number): PersistedUpdate[] {
    return (this.updates.get(roomId) ?? []).filter((item) => item.seq > seq);
  }

  getSnapshot(roomId: string): { seq: number; snapshot: Uint8Array } | undefined {
    return this.snapshots.get(roomId);
  }

  compact(roomId: string, seq: number, snapshot: Uint8Array): void {
    this.snapshots.set(roomId, { seq, snapshot });
    this.updates.set(
      roomId,
      (this.updates.get(roomId) ?? []).filter((item) => item.seq > seq),
    );
  }

  resetDocument(roomId: string, snapshot: Uint8Array): RoomRecord {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room missing");
    room.generation += 1;
    room.updatedAt = new Date();
    this.updates.set(roomId, []);
    this.requestIds.set(roomId, new Set());
    this.snapshots.set(roomId, { seq: 1, snapshot });
    return room;
  }

  createThread(thread: StoredThread): StoredThread {
    this.threads.set(thread.id, thread);
    return thread;
  }

  getThread(id: string): StoredThread | undefined {
    return this.threads.get(id);
  }

  listThreads(roomId: string): StoredThread[] {
    return [...this.threads.values()].filter((thread) => thread.roomId === roomId);
  }

  updateThread(thread: StoredThread): StoredThread {
    this.threads.set(thread.id, thread);
    return thread;
  }

  addComment(comment: StoredComment): StoredComment {
    this.comments.set(comment.id, comment);
    return comment;
  }

  getComment(id: string): StoredComment | undefined {
    return this.comments.get(id);
  }

  listComments(roomId: string): StoredComment[] {
    return [...this.comments.values()].filter((comment) => comment.roomId === roomId);
  }

  updateComment(comment: StoredComment): StoredComment {
    this.comments.set(comment.id, comment);
    return comment;
  }

  addVersion(version: StoredVersion): StoredVersion {
    this.versions.set(version.id, version);
    return version;
  }

  getVersion(id: string): StoredVersion | undefined {
    return this.versions.get(id);
  }

  listVersions(roomId: string): StoredVersion[] {
    return [...this.versions.values()]
      .filter((version) => version.roomId === roomId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  addSuggestion(suggestion: StoredSuggestion): StoredSuggestion {
    this.suggestions.set(suggestion.id, suggestion);
    return suggestion;
  }

  getSuggestion(id: string): StoredSuggestion | undefined {
    return this.suggestions.get(id);
  }

  listSuggestions(roomId: string): StoredSuggestion[] {
    return [...this.suggestions.values()]
      .filter((item) => item.roomId === roomId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateSuggestion(suggestion: StoredSuggestion): StoredSuggestion {
    this.suggestions.set(suggestion.id, suggestion);
    return suggestion;
  }

  addChat(message: StoredChatMessage): { message: StoredChatMessage; duplicate: boolean } {
    if (message.clientId) {
      const seen = this.chatRequestIds.get(message.roomId) ?? new Set<string>();
      if (seen.has(message.clientId)) {
        const existing = (this.chat.get(message.roomId) ?? []).find(
          (item) => item.clientId === message.clientId,
        );
        return { message: existing ?? message, duplicate: true };
      }
      seen.add(message.clientId);
      this.chatRequestIds.set(message.roomId, seen);
    }
    const list = this.chat.get(message.roomId) ?? [];
    list.push(message);
    this.chat.set(message.roomId, list.slice(-200));
    return { message, duplicate: false };
  }

  listChat(roomId: string, limit = 50): StoredChatMessage[] {
    return (this.chat.get(roomId) ?? []).slice(-Math.min(200, Math.max(1, limit)));
  }

  toggleReaction(reaction: StoredReaction): { reaction: StoredReaction; removed: boolean } {
    const key = `${reaction.targetType}:${reaction.targetId}:${reaction.emoji}:${reaction.userId}`;
    if (this.reactions.has(key)) {
      this.reactions.delete(key);
      return { reaction, removed: true };
    }
    this.reactions.set(key, reaction);
    return { reaction, removed: false };
  }

  listReactions(targetType: StoredReaction["targetType"], targetId: string): StoredReaction[] {
    return [...this.reactions.values()].filter(
      (item) => item.targetType === targetType && item.targetId === targetId,
    );
  }

  upsertGrant(grant: StoredGrant): StoredGrant {
    this.grants.set(`${grant.roomId}:${grant.userId}`, grant);
    return grant;
  }

  listGrants(roomId: string): StoredGrant[] {
    return [...this.grants.values()].filter((grant) => grant.roomId === roomId);
  }

  deleteGrant(roomId: string, userId: string): boolean {
    return this.grants.delete(`${roomId}:${userId}`);
  }
}

export function userRevokeKey(
  applicationId: string,
  roomExternalId: string,
  userId: string,
): string {
  return `${applicationId}:${roomExternalId}:${userId}`;
}

export type GrantSnapshot = StoredGrant;

export type MaybePromise<T> = T | Promise<T>;

export interface PlatformStore {
  readonly driver: "memory" | "postgres";
  ready(): Promise<void>;
  health(): Promise<boolean>;
  close(): Promise<void>;
  refreshRevocations(): MaybePromise<void>;
  createTenant(name: string): MaybePromise<Tenant>;
  createApplication(tenantId: string, name: string, environment: Environment): MaybePromise<Application>;
  addCredential(
    applicationId: string,
    publicKey: string,
    secretKey: string,
    scopes?: string[],
  ): MaybePromise<ApiCredential>;
  findCredentialByPublicKey(publicKey: string): MaybePromise<ApiCredential | undefined>;
  findCredentialBySecretHash(secretHash: string): MaybePromise<ApiCredential | undefined>;
  getApplication(id: string): MaybePromise<Application | undefined>;
  getTenant(id: string): MaybePromise<Tenant | undefined>;
  revokeCredential(id: string): MaybePromise<void>;
  touchCredential(id: string): MaybePromise<void>;
  ensureRoom(applicationId: string, externalId: string, title?: string): MaybePromise<RoomRecord>;
  getRoomByExternal(applicationId: string, externalId: string): MaybePromise<RoomRecord | undefined>;
  getRoom(id: string): MaybePromise<RoomRecord | undefined>;
  revokeSession(revocation: Omit<Revocation, "createdAt">): MaybePromise<void>;
  isJtiRevoked(jti: string): boolean;
  isUserRevoked(applicationId: string, roomExternalId: string, userId: string): boolean;
  onRevoke(listener: (revocation: Revocation) => void): () => void;
  appendUpdate(
    roomId: string,
    update: Uint8Array,
    requestId?: string,
  ): MaybePromise<{ seq: number; duplicate: boolean }>;
  getUpdatesSince(roomId: string, seq: number): MaybePromise<PersistedUpdate[]>;
  getSnapshot(roomId: string): MaybePromise<{ seq: number; snapshot: Uint8Array } | undefined>;
  compact(roomId: string, seq: number, snapshot: Uint8Array): MaybePromise<void>;
  resetDocument(roomId: string, snapshot: Uint8Array): MaybePromise<RoomRecord>;
  createThread(thread: StoredThread): MaybePromise<StoredThread>;
  getThread(id: string): MaybePromise<StoredThread | undefined>;
  listThreads(roomId: string): MaybePromise<StoredThread[]>;
  updateThread(thread: StoredThread): MaybePromise<StoredThread>;
  addComment(comment: StoredComment): MaybePromise<StoredComment>;
  getComment(id: string): MaybePromise<StoredComment | undefined>;
  listComments(roomId: string): MaybePromise<StoredComment[]>;
  updateComment(comment: StoredComment): MaybePromise<StoredComment>;
  addVersion(version: StoredVersion): MaybePromise<StoredVersion>;
  getVersion(id: string): MaybePromise<StoredVersion | undefined>;
  listVersions(roomId: string): MaybePromise<StoredVersion[]>;
  addSuggestion(suggestion: StoredSuggestion): MaybePromise<StoredSuggestion>;
  getSuggestion(id: string): MaybePromise<StoredSuggestion | undefined>;
  listSuggestions(roomId: string): MaybePromise<StoredSuggestion[]>;
  updateSuggestion(suggestion: StoredSuggestion): MaybePromise<StoredSuggestion>;
  addChat(message: StoredChatMessage): MaybePromise<{ message: StoredChatMessage; duplicate: boolean }>;
  listChat(roomId: string, limit?: number): MaybePromise<StoredChatMessage[]>;
  toggleReaction(reaction: StoredReaction): MaybePromise<{ reaction: StoredReaction; removed: boolean }>;
  listReactions(
    targetType: StoredReaction["targetType"],
    targetId: string,
  ): MaybePromise<StoredReaction[]>;
  upsertGrant(grant: StoredGrant): MaybePromise<StoredGrant>;
  listGrants(roomId: string): MaybePromise<StoredGrant[]>;
  deleteGrant(roomId: string, userId: string): MaybePromise<boolean>;
}

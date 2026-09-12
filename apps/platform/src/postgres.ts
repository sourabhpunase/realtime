import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Permission } from "@realtime/protocol";
import { hashApiSecret, secretPrefix } from "./lib.js";
import type {
  ApiCredential,
  Application,
  Environment,
  PersistedUpdate,
  PlatformStore,
  Revocation,
  RoomRecord,
  StoredChatMessage,
  StoredComment,
  StoredGrant,
  StoredReaction,
  StoredSuggestion,
  StoredThread,
  StoredVersion,
  Tenant,
} from "./store.js";

function asBytes(value: Buffer | Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

export class PostgresStore implements PlatformStore {
  readonly driver = "postgres" as const;
  private readonly pool: pg.Pool;
  private revokedJtis = new Set<string>();
  private revokedUsers = new Set<string>();
  private listeners = new Set<(revocation: Revocation) => void>();

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl, max: 8 });
  }

  async ready(): Promise<void> {
    await this.refreshRevocations();
  }

  async health(): Promise<boolean> {
    await this.pool.query("SELECT 1");
    return true;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async refreshRevocations(): Promise<void> {
    const jtis = await this.pool.query("SELECT jti FROM revoked_sessions WHERE jti IS NOT NULL");
    this.revokedJtis = new Set(jtis.rows.map((row) => String(row.jti)));
    const users = await this.pool.query(
      "SELECT application_id, room_external_id, user_id FROM revoked_sessions WHERE user_id IS NOT NULL AND room_external_id IS NOT NULL",
    );
    this.revokedUsers = new Set(
      users.rows.map((row) => `${row.application_id}:${row.room_external_id}:${row.user_id}`),
    );
  }

  async createTenant(name: string): Promise<Tenant> {
    const row = (
      await this.pool.query(
        "INSERT INTO tenants (id, name) VALUES ($1, $2) RETURNING id, name, created_at",
        [randomUUID(), name],
      )
    ).rows[0];
    return { id: row.id, name: row.name, createdAt: row.created_at };
  }

  async createApplication(
    tenantId: string,
    name: string,
    environment: Environment,
  ): Promise<Application> {
    const row = (
      await this.pool.query(
        "INSERT INTO applications (id, tenant_id, name, environment) VALUES ($1, $2, $3, $4) RETURNING *",
        [randomUUID(), tenantId, name, environment],
      )
    ).rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      environment: row.environment,
      createdAt: row.created_at,
    };
  }

  async addCredential(
    applicationId: string,
    publicKey: string,
    secretKey: string,
    scopes: string[] = ["*"],
  ): Promise<ApiCredential> {
    const row = (
      await this.pool.query(
        `INSERT INTO api_credentials
          (id, application_id, public_key, secret_hash, secret_prefix, scopes)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *`,
        [
          randomUUID(),
          applicationId,
          publicKey,
          hashApiSecret(secretKey),
          secretPrefix(secretKey),
          JSON.stringify(scopes),
        ],
      )
    ).rows[0];
    return mapCredential(row);
  }

  async findCredentialByPublicKey(publicKey: string): Promise<ApiCredential | undefined> {
    const row = (
      await this.pool.query("SELECT * FROM api_credentials WHERE public_key = $1", [publicKey])
    ).rows[0];
    return row ? mapCredential(row) : undefined;
  }

  async findCredentialBySecretHash(secretHash: string): Promise<ApiCredential | undefined> {
    const row = (
      await this.pool.query("SELECT * FROM api_credentials WHERE secret_hash = $1", [secretHash])
    ).rows[0];
    return row ? mapCredential(row) : undefined;
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const row = (await this.pool.query("SELECT * FROM applications WHERE id = $1", [id])).rows[0];
    return row
      ? {
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          environment: row.environment,
          createdAt: row.created_at,
        }
      : undefined;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const row = (await this.pool.query("SELECT * FROM tenants WHERE id = $1", [id])).rows[0];
    return row ? { id: row.id, name: row.name, createdAt: row.created_at } : undefined;
  }

  async revokeCredential(id: string): Promise<void> {
    await this.pool.query("UPDATE api_credentials SET revoked_at = now() WHERE id = $1", [id]);
  }

  async touchCredential(id: string): Promise<void> {
    await this.pool.query("UPDATE api_credentials SET last_used_at = now() WHERE id = $1", [id]);
  }

  async ensureRoom(applicationId: string, externalId: string, title?: string): Promise<RoomRecord> {
    const existing = await this.getRoomByExternal(applicationId, externalId);
    if (existing) return existing;
    const row = (
      await this.pool.query(
        `INSERT INTO rooms (id, application_id, external_id, title)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (application_id, external_id) DO UPDATE SET title = rooms.title
         RETURNING *`,
        [randomUUID(), applicationId, externalId, title ?? externalId],
      )
    ).rows[0];
    return mapRoom(row);
  }

  async getRoomByExternal(applicationId: string, externalId: string): Promise<RoomRecord | undefined> {
    const row = (
      await this.pool.query(
        "SELECT * FROM rooms WHERE application_id = $1 AND external_id = $2",
        [applicationId, externalId],
      )
    ).rows[0];
    return row ? mapRoom(row) : undefined;
  }

  async getRoom(id: string): Promise<RoomRecord | undefined> {
    const row = (await this.pool.query("SELECT * FROM rooms WHERE id = $1", [id])).rows[0];
    return row ? mapRoom(row) : undefined;
  }

  async revokeSession(revocation: Omit<Revocation, "createdAt">): Promise<void> {
    const record = { ...revocation, createdAt: new Date() };
    await this.pool.query(
      `INSERT INTO revoked_sessions (jti, application_id, room_external_id, user_id, reason, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, now(), now() + interval '24 hours')
       ON CONFLICT (jti) DO NOTHING`,
      [
        revocation.jti ?? randomUUID(),
        revocation.applicationId,
        revocation.roomExternalId ?? null,
        revocation.userId ?? null,
        revocation.reason,
      ],
    );
    if (record.jti) this.revokedJtis.add(record.jti);
    if (record.userId && record.roomExternalId) {
      this.revokedUsers.add(`${record.applicationId}:${record.roomExternalId}:${record.userId}`);
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

  async appendUpdate(
    roomId: string,
    update: Uint8Array,
    requestId?: string,
  ): Promise<{ seq: number; duplicate: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (requestId) {
        const existing = await client.query(
          "SELECT seq FROM document_updates WHERE room_id = $1 AND request_id = $2",
          [roomId, requestId],
        );
        if (existing.rows[0]) {
          await client.query("COMMIT");
          return { seq: Number(existing.rows[0].seq), duplicate: true };
        }
      }
      const last = await client.query(
        `SELECT GREATEST(
           COALESCE((SELECT MAX(seq) FROM document_updates WHERE room_id = $1), 0),
           COALESCE((SELECT MAX(seq) FROM document_snapshots WHERE room_id = $1), 0)
         ) AS seq`,
        [roomId],
      );
      const seq = Number(last.rows[0]?.seq ?? 0) + 1;
      await client.query(
        "INSERT INTO document_updates (room_id, seq, update, request_id) VALUES ($1, $2, $3, $4)",
        [roomId, seq, Buffer.from(update), requestId ?? null],
      );
      await client.query("UPDATE rooms SET updated_at = now() WHERE id = $1", [roomId]);
      await client.query("COMMIT");
      return { seq, duplicate: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getUpdatesSince(roomId: string, seq: number): Promise<PersistedUpdate[]> {
    const rows = (
      await this.pool.query(
        "SELECT seq, update, request_id, created_at FROM document_updates WHERE room_id = $1 AND seq > $2 ORDER BY seq",
        [roomId, seq],
      )
    ).rows;
    return rows.map((row) => ({
      seq: Number(row.seq),
      update: asBytes(row.update),
      requestId: row.request_id ?? undefined,
      createdAt: row.created_at,
    }));
  }

  async getSnapshot(roomId: string): Promise<{ seq: number; snapshot: Uint8Array } | undefined> {
    const row = (
      await this.pool.query(
        "SELECT seq, snapshot FROM document_snapshots WHERE room_id = $1 ORDER BY seq DESC LIMIT 1",
        [roomId],
      )
    ).rows[0];
    return row ? { seq: Number(row.seq), snapshot: asBytes(row.snapshot) } : undefined;
  }

  async compact(roomId: string, seq: number, snapshot: Uint8Array): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO document_snapshots (id, room_id, seq, snapshot) VALUES ($1, $2, $3, $4)",
        [randomUUID(), roomId, seq, Buffer.from(snapshot)],
      );
      await client.query("DELETE FROM document_updates WHERE room_id = $1 AND seq <= $2", [roomId, seq]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async resetDocument(roomId: string, snapshot: Uint8Array): Promise<RoomRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const row = (
        await client.query(
          "UPDATE rooms SET generation = generation + 1, updated_at = now() WHERE id = $1 RETURNING *",
          [roomId],
        )
      ).rows[0];
      if (!row) throw new Error("Room missing");
      await client.query("DELETE FROM document_updates WHERE room_id = $1", [roomId]);
      await client.query("DELETE FROM document_snapshots WHERE room_id = $1", [roomId]);
      await client.query(
        "INSERT INTO document_snapshots (id, room_id, seq, snapshot) VALUES ($1, $2, 1, $3)",
        [randomUUID(), roomId, Buffer.from(snapshot)],
      );
      await client.query("COMMIT");
      return mapRoom(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createThread(thread: StoredThread): Promise<StoredThread> {
    await this.pool.query(
      `INSERT INTO comment_threads (id, room_id, status, quote, created_by_external_id, created_by_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        thread.id,
        thread.roomId,
        thread.status,
        thread.quote ?? null,
        thread.createdBy,
        thread.createdByName,
        thread.createdAt,
      ],
    );
    return thread;
  }

  async getThread(id: string): Promise<StoredThread | undefined> {
    const row = (await this.pool.query("SELECT * FROM comment_threads WHERE id = $1", [id])).rows[0];
    return row ? mapThread(row) : undefined;
  }

  async listThreads(roomId: string): Promise<StoredThread[]> {
    const rows = (await this.pool.query("SELECT * FROM comment_threads WHERE room_id = $1", [roomId]))
      .rows;
    return rows.map(mapThread);
  }

  async updateThread(thread: StoredThread): Promise<StoredThread> {
    await this.pool.query("UPDATE comment_threads SET status = $2, quote = $3 WHERE id = $1", [
      thread.id,
      thread.status,
      thread.quote ?? null,
    ]);
    return thread;
  }

  async addComment(comment: StoredComment): Promise<StoredComment> {
    await this.pool.query(
      `INSERT INTO comments (id, thread_id, room_id, body, author_external_id, author_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        comment.id,
        comment.threadId,
        comment.roomId,
        comment.body,
        comment.authorId,
        comment.authorName,
        comment.createdAt,
        comment.updatedAt,
      ],
    );
    return comment;
  }

  async getComment(id: string): Promise<StoredComment | undefined> {
    const row = (await this.pool.query("SELECT * FROM comments WHERE id = $1", [id])).rows[0];
    return row ? mapComment(row) : undefined;
  }

  async listComments(roomId: string): Promise<StoredComment[]> {
    const rows = (await this.pool.query("SELECT * FROM comments WHERE room_id = $1", [roomId])).rows;
    return rows.map(mapComment);
  }

  async updateComment(comment: StoredComment): Promise<StoredComment> {
    await this.pool.query(
      "UPDATE comments SET body = $2, updated_at = $3, deleted_at = $4 WHERE id = $1",
      [comment.id, comment.body, comment.updatedAt, comment.deletedAt ?? null],
    );
    return comment;
  }

  async addVersion(version: StoredVersion): Promise<StoredVersion> {
    await this.pool.query(
      `INSERT INTO document_versions (id, room_id, name, snapshot, seq, generation, created_by_external_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        version.id,
        version.roomId,
        version.name,
        Buffer.from(version.snapshot),
        version.seq,
        version.generation,
        version.createdBy,
        version.createdAt,
      ],
    );
    return version;
  }

  async getVersion(id: string): Promise<StoredVersion | undefined> {
    const row = (await this.pool.query("SELECT * FROM document_versions WHERE id = $1", [id])).rows[0];
    return row ? mapVersion(row) : undefined;
  }

  async listVersions(roomId: string): Promise<StoredVersion[]> {
    const rows = (
      await this.pool.query(
        "SELECT * FROM document_versions WHERE room_id = $1 ORDER BY created_at DESC",
        [roomId],
      )
    ).rows;
    return rows.map(mapVersion);
  }

  async addSuggestion(suggestion: StoredSuggestion): Promise<StoredSuggestion> {
    await this.pool.query(
      `INSERT INTO suggestions
        (id, room_id, kind, status, insert_text, delete_text, quote, offset, author_external_id, author_name, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        suggestion.id,
        suggestion.roomId,
        suggestion.kind,
        suggestion.status,
        suggestion.insertText ?? null,
        suggestion.deleteText ?? null,
        suggestion.quote ?? null,
        suggestion.offset ?? null,
        suggestion.authorId,
        suggestion.authorName,
        suggestion.createdAt,
      ],
    );
    return suggestion;
  }

  async getSuggestion(id: string): Promise<StoredSuggestion | undefined> {
    const row = (await this.pool.query("SELECT * FROM suggestions WHERE id = $1", [id])).rows[0];
    return row ? mapSuggestion(row) : undefined;
  }

  async listSuggestions(roomId: string): Promise<StoredSuggestion[]> {
    const rows = (
      await this.pool.query("SELECT * FROM suggestions WHERE room_id = $1 ORDER BY created_at DESC", [
        roomId,
      ])
    ).rows;
    return rows.map(mapSuggestion);
  }

  async updateSuggestion(suggestion: StoredSuggestion): Promise<StoredSuggestion> {
    await this.pool.query(
      "UPDATE suggestions SET status = $2, resolved_at = $3, resolved_by_external_id = $4 WHERE id = $1",
      [suggestion.id, suggestion.status, suggestion.resolvedAt ?? null, suggestion.resolvedBy ?? null],
    );
    return suggestion;
  }

  async addChat(
    message: StoredChatMessage,
  ): Promise<{ message: StoredChatMessage; duplicate: boolean }> {
    if (message.clientId) {
      const existing = (
        await this.pool.query(
          "SELECT * FROM chat_messages WHERE room_id = $1 AND client_id = $2",
          [message.roomId, message.clientId],
        )
      ).rows[0];
      if (existing) return { message: mapChat(existing), duplicate: true };
    }
    await this.pool.query(
      `INSERT INTO chat_messages (id, room_id, body, author_external_id, author_name, client_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        message.id,
        message.roomId,
        message.body,
        message.authorId,
        message.authorName,
        message.clientId ?? null,
        message.createdAt,
      ],
    );
    return { message, duplicate: false };
  }

  async listChat(roomId: string, limit = 50): Promise<StoredChatMessage[]> {
    const rows = (
      await this.pool.query(
        "SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC",
        [roomId],
      )
    ).rows;
    return rows.map(mapChat).slice(-Math.min(200, Math.max(1, limit)));
  }

  async toggleReaction(
    reaction: StoredReaction,
  ): Promise<{ reaction: StoredReaction; removed: boolean }> {
    const room = (
      await this.pool.query(
        "SELECT room_id FROM chat_messages WHERE id = $1 UNION SELECT room_id FROM comments WHERE id = $1 UNION SELECT room_id FROM suggestions WHERE id = $1 LIMIT 1",
        [reaction.targetId],
      )
    ).rows[0];
    const roomId = room?.room_id;
    if (!roomId) return { reaction, removed: false };
    const existing = await this.pool.query(
      `DELETE FROM reactions
       WHERE room_id = $1 AND target_type = $2 AND target_id = $3 AND emoji = $4 AND user_external_id = $5
       RETURNING *`,
      [roomId, reaction.targetType, reaction.targetId, reaction.emoji, reaction.userId],
    );
    if (existing.rowCount) return { reaction, removed: true };
    await this.pool.query(
      `INSERT INTO reactions (room_id, target_type, target_id, emoji, user_external_id, user_name)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [roomId, reaction.targetType, reaction.targetId, reaction.emoji, reaction.userId, reaction.userName],
    );
    return { reaction, removed: false };
  }

  async listReactions(
    targetType: StoredReaction["targetType"],
    targetId: string,
  ): Promise<StoredReaction[]> {
    const rows = (
      await this.pool.query(
        "SELECT * FROM reactions WHERE target_type = $1 AND target_id = $2",
        [targetType, targetId],
      )
    ).rows;
    return rows.map((row) => ({
      targetType: row.target_type,
      targetId: row.target_id,
      emoji: row.emoji,
      userId: row.user_external_id,
      userName: row.user_name,
    }));
  }

  async upsertGrant(grant: StoredGrant): Promise<StoredGrant> {
    await this.pool.query(
      `INSERT INTO room_grants (room_id, user_external_id, permissions, updated_by, updated_at)
       VALUES ($1,$2,$3::jsonb,$4,$5)
       ON CONFLICT (room_id, user_external_id)
       DO UPDATE SET permissions = EXCLUDED.permissions, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at`,
      [
        grant.roomId,
        grant.userId,
        JSON.stringify(grant.permissions),
        grant.updatedBy,
        grant.updatedAt,
      ],
    );
    return grant;
  }

  async listGrants(roomId: string): Promise<StoredGrant[]> {
    const rows = (await this.pool.query("SELECT * FROM room_grants WHERE room_id = $1", [roomId])).rows;
    return rows.map((row) => ({
      roomId: row.room_id,
      userId: row.user_external_id,
      permissions: row.permissions as Permission[],
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    }));
  }

  async deleteGrant(roomId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM room_grants WHERE room_id = $1 AND user_external_id = $2",
      [roomId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function mapCredential(row: pg.QueryResultRow): ApiCredential {
  return {
    id: row.id,
    applicationId: row.application_id,
    publicKey: row.public_key,
    secretHash: row.secret_hash,
    secretPrefix: row.secret_prefix,
    scopes: row.scopes,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

function mapRoom(row: pg.QueryResultRow): RoomRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    externalId: row.external_id,
    title: row.title,
    generation: Number(row.generation),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapThread(row: pg.QueryResultRow): StoredThread {
  return {
    id: row.id,
    roomId: row.room_id,
    status: row.status,
    quote: row.quote ?? undefined,
    createdBy: row.created_by_external_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}

function mapComment(row: pg.QueryResultRow): StoredComment {
  return {
    id: row.id,
    threadId: row.thread_id,
    roomId: row.room_id,
    body: row.body,
    authorId: row.author_external_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function mapVersion(row: pg.QueryResultRow): StoredVersion {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    seq: Number(row.seq),
    generation: Number(row.generation ?? 1),
    snapshot: asBytes(row.snapshot),
    createdBy: row.created_by_external_id,
    createdAt: row.created_at,
  };
}

function mapSuggestion(row: pg.QueryResultRow): StoredSuggestion {
  return {
    id: row.id,
    roomId: row.room_id,
    kind: row.kind,
    status: row.status,
    insertText: row.insert_text ?? undefined,
    deleteText: row.delete_text ?? undefined,
    quote: row.quote ?? undefined,
    offset: row.offset ?? undefined,
    authorId: row.author_external_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    resolvedBy: row.resolved_by_external_id ?? undefined,
  };
}

function mapChat(row: pg.QueryResultRow): StoredChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    body: row.body,
    authorId: row.author_external_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    clientId: row.client_id ?? undefined,
  };
}

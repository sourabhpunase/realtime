import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  RoomSession,
  base64ToBytes,
  bytesToBase64,
  type DocumentSyncState,
} from "@realtime/core";

export type ProviderStatus = DocumentSyncState;

export class RealtimeYjsProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  private readonly origin = Symbol("realtime-yjs");
  private persistence: IndexeddbPersistence | null = null;
  private unsubs: Array<() => void> = [];
  private queued: Array<{ update: string; requestId: string }> = [];
  private flushed = false;

  constructor(
    readonly session: RoomSession,
    doc?: Y.Doc,
  ) {
    this.doc = doc ?? new Y.Doc();
    this.awareness = new Awareness(this.doc);
    if (session.user) {
      this.awareness.setLocalStateField("user", {
        id: session.user.id,
        name: session.user.name,
        color: session.user.color ?? "#2563eb",
      });
    }
  }

  storageKey(): string | null {
    const userId = this.session.user?.id;
    if (!userId) return null;
    return `rt:${this.session.publicKey}:${userId}:${this.session.roomId}:${this.session.generation}`;
  }

  async start(): Promise<void> {
    const key = this.storageKey();
    if (key && typeof indexedDB !== "undefined") {
      this.persistence = new IndexeddbPersistence(key, this.doc);
      await this.persistence.whenSynced.catch(() => undefined);
    }

    const onLocal = (update: Uint8Array, origin: unknown) => {
      if (origin === this.origin) return;
      const requestId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const payload = { update: bytesToBase64(update), requestId };
      if (this.session.connectionState !== "connected") {
        this.queued.push(payload);
        return;
      }
      void this.session.sendYjsUpdate(payload).catch(() => {
        this.queued.push(payload);
      });
    };
    this.doc.on("update", onLocal);
    this.unsubs.push(() => this.doc.off("update", onLocal));

    const offRemote = this.session.on("yjs", (event) => {
      Y.applyUpdate(this.doc, base64ToBytes(event.update), this.origin);
    });
    this.unsubs.push(offRemote);

    const onAwareness = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (origin === "remote") return;
      const changed = [...added, ...updated, ...removed];
      if (changed.length === 0) return;
      this.session.sendAwareness(bytesToBase64(encodeAwarenessUpdate(this.awareness, changed)));
    };
    this.awareness.on("update", onAwareness);
    this.unsubs.push(() => this.awareness.off("update", onAwareness));

    const offAwareness = this.session.on("awareness", (event) => {
      applyAwarenessUpdate(this.awareness, base64ToBytes(event.update), "remote");
    });
    this.unsubs.push(offAwareness);

    await this.synchronize();
  }

  async synchronize(): Promise<void> {
    const vector = bytesToBase64(Y.encodeStateVector(this.doc));
    const result = await this.session.syncYjs(vector);
    Y.applyUpdate(this.doc, base64ToBytes(result.update), this.origin);
    const missing = Y.encodeStateAsUpdate(this.doc, base64ToBytes(result.serverStateVector));
    if (missing.byteLength > 2 && this.session.permissions.includes("room:write")) {
      await this.session.sendYjsUpdate({ update: bytesToBase64(missing) });
    }
    await this.flushQueue();
    this.flushed = true;
  }

  private async flushQueue(): Promise<void> {
    const pending = this.queued.splice(0, this.queued.length);
    for (const item of pending) {
      try {
        await this.session.sendYjsUpdate(item);
      } catch {
        this.queued.push(item);
      }
    }
  }

  async destroy(options: { clearLocal?: boolean } = {}): Promise<void> {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.awareness.destroy();
    const key = this.storageKey();
    if (this.persistence) {
      await this.persistence.destroy();
      this.persistence = null;
    }
    if (options.clearLocal && key && typeof indexedDB !== "undefined") {
      indexedDB.deleteDatabase(key);
    }
    this.doc.destroy();
  }
}

export function xmlText(doc: Y.Doc): string {
  return doc.getXmlFragment("default").toString();
}

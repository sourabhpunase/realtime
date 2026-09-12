import { io, type Socket } from "socket.io-client";
import { PROTOCOL_VERSION, type Participant } from "@realtime/protocol";

export { base64ToBytes, bytesToBase64 } from "./bytes.js";

export type AuthCallback = (roomId: string) => Promise<{
  token: string;
  expiresAt?: string;
  expiresIn?: number;
  user?: { id: string; name: string; color?: string; avatar?: string };
  permissions?: string[];
}>;

export type RealtimeClientOptions = {
  publicKey: string;
  endpoint: string;
  authEndpoint?: string;
  auth?: AuthCallback;
  fetch?: typeof fetch;
};

export type RoomEvents = {
  users: (users: Participant[]) => void;
  joined: (user: Participant) => void;
  left: (user: { sessionId: string; userId: string }) => void;
  cursor: (cursor: { sessionId: string; userId: string; x: number; y: number }) => void;
  typing: (event: { sessionId: string; userId: string; typing: boolean }) => void;
  presence: (event: { sessionId: string; userId: string; status?: string }) => void;
  permissions: (event: { revoked?: boolean; reason?: string }) => void;
  error: (error: { code: string; message: string }) => void;
  connection: (state: ConnectionState) => void;
  document: (state: DocumentSyncState) => void;
  yjs: (event: {
    type: "update" | "reset";
    update: string;
    generation: number;
    seq?: number;
  }) => void;
  awareness: (event: { update: string; userId: string }) => void;
  comment: (event: { type: string; payload: unknown }) => void;
  suggestion: (event: { type: string; payload: unknown }) => void;
  chat: (event: { type: string; payload: unknown }) => void;
  reaction: (event: { type: string; payload: unknown }) => void;
};

export type DocumentSyncState =
  | "synchronizing"
  | "saving"
  | "saved"
  | "offline"
  | "recovery_required"
  | "permission_denied";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "permission_denied";

type Handler<T> = T extends (...args: infer A) => void ? (...args: A) => void : never;

export class RoomSession {
  private socket: Socket | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private aborted = false;
  private listeners: { [K in keyof RoomEvents]?: Set<RoomEvents[K]> } = {};
  private state: ConnectionState = "connecting";
  private documentState: DocumentSyncState = "synchronizing";
  private token: string | null = null;
  user: { id: string; name: string; color?: string; avatar?: string } | null = null;
  permissions: string[] = [];
  generation = 1;

  constructor(
    readonly roomId: string,
    private readonly options: RealtimeClientOptions,
  ) {}

  get connectionState(): ConnectionState {
    return this.state;
  }

  get documentSyncState(): DocumentSyncState {
    return this.documentState;
  }

  getAccessToken(): string | null {
    return this.token;
  }

  get endpoint(): string {
    return this.options.endpoint;
  }

  get publicKey(): string {
    return this.options.publicKey;
  }

  on<K extends keyof RoomEvents>(event: K, handler: RoomEvents[K]): () => void {
    const set = (this.listeners[event] ??= new Set() as never);
    (set as Set<RoomEvents[K]>).add(handler);
    return () => (set as Set<RoomEvents[K]>).delete(handler);
  }

  private emit<K extends keyof RoomEvents>(event: K, ...args: Parameters<Handler<RoomEvents[K]>>) {
    const set = this.listeners[event];
    if (!set) return;
    for (const handler of set) {
      (handler as (...next: typeof args) => void)(...args);
    }
  }

  private setState(state: ConnectionState) {
    this.state = state;
    this.emit("connection", state);
    if (state === "disconnected") this.setDocumentState("offline");
    if (state === "permission_denied") this.setDocumentState("permission_denied");
  }

  private setDocumentState(state: DocumentSyncState) {
    this.documentState = state;
    this.emit("document", state);
  }

  async connect(): Promise<void> {
    this.aborted = false;
    this.setState("connecting");
    await this.openSocket();
  }

  private async fetchToken(): Promise<{
    token: string;
    expiresAt?: string;
    expiresIn?: number;
    user?: { id: string; name: string; color?: string; avatar?: string };
    permissions?: string[];
  }> {
    if (this.options.auth) {
      return this.options.auth(this.roomId);
    }
    if (!this.options.authEndpoint) {
      throw new Error("Provide authEndpoint or an auth callback");
    }
    const fetchImpl = this.options.fetch ?? fetch;
    const response = await fetchImpl(this.options.authEndpoint, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        roomId: this.roomId,
        publicKey: this.options.publicKey,
      }),
    });
    if (!response.ok) {
      this.setState("permission_denied");
      throw new Error(`Token request failed (${response.status})`);
    }
    return (await response.json()) as {
      token: string;
      expiresAt?: string;
      expiresIn?: number;
      user?: { id: string; name: string; color?: string; avatar?: string };
      permissions?: string[];
    };
  }

  private scheduleRefresh(expiresAt?: string, expiresIn?: number) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const ms = expiresAt
      ? Date.parse(expiresAt) - Date.now()
      : (expiresIn ?? 900) * 1000;
    const delay = Math.max(5_000, ms - 60_000);
    this.refreshTimer = setTimeout(() => {
      void this.reconnect();
    }, delay);
  }

  private async openSocket() {
    const issued = await this.fetchToken();
    if (this.aborted) return;
    this.token = issued.token;
    if (issued.user) this.user = issued.user;
    if (issued.permissions) this.permissions = issued.permissions;
    this.socket = io(this.options.endpoint, {
      auth: { token: issued.token },
      transports: ["websocket", "polling"],
    });
    this.socket.on("connect", () => {
      this.socket?.emit(
        "join-room",
        { roomId: this.roomId, protocol: PROTOCOL_VERSION },
        (ack: { ok: boolean; users?: Participant[]; error?: { code: string; message: string } }) => {
          if (!ack?.ok) {
            this.setState("permission_denied");
            if (ack?.error) this.emit("error", ack.error);
            return;
          }
          this.setState("connected");
          if (ack.users) this.emit("users", ack.users);
        },
      );
    });
    this.socket.on("room-users", (users: Participant[]) => this.emit("users", users));
    this.socket.on("user-joined", (user: Participant) => this.emit("joined", user));
    this.socket.on("user-left", (user: { sessionId: string; userId: string }) => this.emit("left", user));
    this.socket.on("cursor-update", (cursor) => this.emit("cursor", cursor));
    this.socket.on("typing:update", (event) => this.emit("typing", event));
    this.socket.on("presence:update", (event) => this.emit("presence", event));
    this.socket.on("room:error", (error) => this.emit("error", error));
    this.socket.on("room:permissions-changed", (event) => {
      this.emit("permissions", event);
      if (event?.revoked) this.setState("permission_denied");
    });
    this.socket.on("yjs:update", (event) => {
      this.emit("yjs", { type: "update", ...event });
    });
    this.socket.on("yjs:reset", (event) => {
      this.generation = event.generation;
      this.setDocumentState("recovery_required");
      this.emit("yjs", { type: "reset", ...event });
    });
    this.socket.on("awareness:update", (event) => this.emit("awareness", event));
    this.socket.on("comment:created", (payload) => this.emit("comment", { type: "created", payload }));
    this.socket.on("comment:updated", (payload) => this.emit("comment", { type: "updated", payload }));
    this.socket.on("comment:deleted", (payload) => this.emit("comment", { type: "deleted", payload }));
    this.socket.on("thread:resolved", (payload) => this.emit("comment", { type: "resolved", payload }));
    this.socket.on("thread:reopened", (payload) => this.emit("comment", { type: "reopened", payload }));
    this.socket.on("suggestion:created", (payload) =>
      this.emit("suggestion", { type: "created", payload }),
    );
    this.socket.on("suggestion:updated", (payload) =>
      this.emit("suggestion", { type: "updated", payload }),
    );
    this.socket.on("chat:message", (payload) => this.emit("chat", { type: "message", payload }));
    this.socket.on("reaction:changed", (payload) => this.emit("reaction", { type: "changed", payload }));
    this.socket.on("disconnect", () => {
      if (!this.aborted && this.state !== "permission_denied") {
        this.setState("disconnected");
      }
    });
    this.scheduleRefresh(issued.expiresAt, issued.expiresIn);
  }

  private async reconnect() {
    this.socket?.disconnect();
    this.socket = null;
    if (!this.aborted) await this.openSocket();
  }

  updateCursor(point: { x: number; y: number }) {
    this.socket?.emit("cursor-move", {
      x: clamp01(point.x),
      y: clamp01(point.y),
      surface: "collaboration",
    });
  }

  updateTyping(typing: boolean) {
    this.socket?.emit("typing:update", { typing });
  }

  updatePresence(status: "active" | "idle") {
    this.socket?.emit("presence:update", { status });
  }

  sendAwareness(update: string) {
    this.socket?.emit("awareness:update", { update });
  }

  syncYjs(stateVector?: string): Promise<{
    update: string;
    serverStateVector: string;
    generation: number;
    seq: number;
  }> {
    this.setDocumentState("synchronizing");
    return new Promise((resolve, reject) => {
      this.socket?.emit(
        "yjs:sync",
        { stateVector, generation: this.generation },
        (ack: {
          ok: boolean;
          update?: string;
          serverStateVector?: string;
          generation?: number;
          seq?: number;
          error?: { message: string };
        }) => {
          if (!ack?.ok || !ack.update || !ack.serverStateVector || !ack.generation) {
            this.setDocumentState("recovery_required");
            reject(new Error(ack?.error?.message ?? "Yjs sync failed"));
            return;
          }
          this.generation = ack.generation;
          this.setDocumentState(this.state === "disconnected" ? "offline" : "saved");
          resolve({
            update: ack.update,
            serverStateVector: ack.serverStateVector,
            generation: ack.generation,
            seq: ack.seq ?? 0,
          });
        },
      );
    });
  }

  sendYjsUpdate(input: { update: string; requestId?: string }): Promise<{ seq: number; saved: boolean }> {
    this.setDocumentState("saving");
    return new Promise((resolve, reject) => {
      this.socket?.emit(
        "yjs:update",
        { ...input, generation: this.generation },
        (ack: {
          ok: boolean;
          saved?: boolean;
          seq?: number;
          generation?: number;
          error?: { code?: string; message: string };
        }) => {
          if (!ack?.ok) {
            if (ack?.error?.code === "CONFLICT") this.setDocumentState("recovery_required");
            else if (this.state === "disconnected") this.setDocumentState("offline");
            reject(new Error(ack?.error?.message ?? "Yjs update failed"));
            return;
          }
          if (ack.generation) this.generation = ack.generation;
          this.setDocumentState("saved");
          resolve({ seq: ack.seq ?? 0, saved: Boolean(ack.saved) });
        },
      );
    });
  }

  leave() {
    this.aborted = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.socket?.emit("leave-room", { roomId: this.roomId });
    this.socket?.disconnect();
    this.socket = null;
    this.setState("disconnected");
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export class RealtimeClient {
  constructor(private readonly options: RealtimeClientOptions) {
    if (!options.publicKey.startsWith("pk_")) {
      throw new Error("publicKey must start with pk_");
    }
  }

  enterRoom(roomId: string): RoomSession {
    return new RoomSession(roomId, this.options);
  }
}

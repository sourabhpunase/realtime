import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  RealtimeClient,
  type AuthCallback,
  type ConnectionState,
  type RoomSession,
} from "@realtime/core";
import type { Participant } from "@realtime/protocol";
import { ClientContext, RoomContext, useRoom, type RoomContextValue } from "./context.js";

export { useRoom } from "./context.js";

export type RealtimeProviderProps = {
  publicKey: string;
  endpoint: string;
  authEndpoint?: string;
  auth?: AuthCallback;
  children: ReactNode;
};

export function RealtimeProvider(props: RealtimeProviderProps) {
  const client = useMemo(
    () =>
      new RealtimeClient({
        publicKey: props.publicKey,
        endpoint: props.endpoint,
        authEndpoint: props.authEndpoint,
        auth: props.auth,
      }),
    [props.publicKey, props.endpoint, props.authEndpoint, props.auth],
  );
  return <ClientContext.Provider value={{ client }}>{props.children}</ClientContext.Provider>;
}

export function Room(props: { id: string; children: ReactNode }) {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("Room must be used inside <RealtimeProvider>");
  const [session, setSession] = useState<RoomSession | null>(null);
  const [users, setUsers] = useState<Participant[]>([]);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; userId: string }>>({});
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [followTarget, setFollowTarget] = useState<RoomContextValue["followTarget"]>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const next = ctx.client.enterRoom(props.id);
    setSession(next);
    const offUsers = next.on("users", setUsers);
    const offJoined = next.on("joined", (user) => {
      setUsers((current) => [...current.filter((item) => item.sessionId !== user.sessionId), user]);
    });
    const offLeft = next.on("left", (user) => {
      setUsers((current) => current.filter((item) => item.sessionId !== user.sessionId));
      setCursors((current) => {
        const copy = { ...current };
        delete copy[user.sessionId];
        return copy;
      });
      setFollowTarget((current) => (current?.sessionId === user.sessionId ? null : current));
    });
    const offCursor = next.on("cursor", (cursor) => {
      setCursors((current) => ({
        ...current,
        [cursor.sessionId]: { x: cursor.x, y: cursor.y, userId: cursor.userId },
      }));
    });
    const offConnection = next.on("connection", setConnection);
    void next.connect();
    return () => {
      offUsers();
      offJoined();
      offLeft();
      offCursor();
      offConnection();
      next.leave();
    };
  }, [ctx.client, props.id]);

  const value = useMemo(
    () => ({
      roomId: props.id,
      session,
      users,
      cursors,
      connection,
      surfaceRef,
      followTarget,
      setFollowTarget,
    }),
    [props.id, session, users, cursors, connection, followTarget],
  );

  return <RoomContext.Provider value={value}>{props.children}</RoomContext.Provider>;
}

export function PresenceBar() {
  const { users, connection, session, followTarget, setFollowTarget } = useRoom();
  return (
    <div
      data-realtime-presence
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "8px 0",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <span style={{ fontSize: 12, color: "#64748b" }}>{connection}</span>
      {users.map((user) => {
        const self = user.id === session?.user?.id;
        const following = followTarget?.sessionId === user.sessionId;
        return (
          <button
            key={user.sessionId}
            type="button"
            title={self ? `${user.name} (you)` : `Follow ${user.name}`}
            aria-pressed={following}
            disabled={self}
            onClick={() => {
              if (self) return;
              setFollowTarget(
                following ? null : { userId: user.id, sessionId: user.sessionId, name: user.name },
              );
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              border: following ? "1px solid #1c1916" : "1px solid transparent",
              background: "transparent",
              cursor: self ? "default" : "pointer",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: user.color ?? "#2563eb",
              }}
            />
            {user.name}
          </button>
        );
      })}
    </div>
  );
}

export function FollowBanner() {
  const { followTarget, setFollowTarget } = useRoom();
  if (!followTarget) return null;
  return (
    <div role="status" aria-live="polite" className="realtime-follow-banner">
      Following {followTarget.name}. Only you scroll; others are not moved.
      <button type="button" onClick={() => setFollowTarget(null)}>
        Stop following
      </button>
    </div>
  );
}

function toNormalized(event: PointerEvent, surface: HTMLElement) {
  const rect = surface.getBoundingClientRect();
  const x = (event.clientX - rect.left + surface.scrollLeft) / Math.max(surface.scrollWidth, 1);
  const y = (event.clientY - rect.top + surface.scrollTop) / Math.max(surface.scrollHeight, 1);
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

export function CursorOverlay() {
  const { session, cursors, users, surfaceRef } = useRoom();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const bindSurface = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return null;
    const surface = overlay.closest("[data-realtime-surface]") as HTMLElement | null;
    if (surface) surfaceRef.current = surface;
    return surface;
  }, [surfaceRef]);

  useEffect(() => {
    const surface = bindSurface();
    if (!surface || !session) return;

    const onMove = (event: PointerEvent) => {
      session.updateCursor(toNormalized(event, surface));
    };
    const onLeave = () => session.updatePresence("idle");
    const onEnter = () => session.updatePresence("active");

    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerleave", onLeave);
    surface.addEventListener("pointerenter", onEnter);

    const measure = () => {
      setSize({ width: surface.scrollWidth, height: surface.scrollHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);

    return () => {
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerleave", onLeave);
      surface.removeEventListener("pointerenter", onEnter);
      observer.disconnect();
    };
  }, [bindSurface, session]);

  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
  };

  return (
    <div ref={overlayRef} data-realtime-cursors style={style}>
      {Object.entries(cursors).map(([sessionId, cursor]) => {
        const user = users.find((item) => item.sessionId === sessionId);
        return (
          <div
            key={sessionId}
            style={{
              position: "absolute",
              left: cursor.x * size.width,
              top: cursor.y * size.height,
              transform: "translate(-2px, -2px)",
              color: user?.color ?? "#2563eb",
              fontSize: 11,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1 1 L1 12 L5 8 L9 13 L11 12 L7 7 L13 7 Z" fill="currentColor" />
            </svg>
            <span
              style={{
                marginLeft: 4,
                background: "currentColor",
                color: "#fff",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              {user?.name ?? "Collaborator"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { CommentsPanel } from "./comments.js";
export type { MentionUser, CommentThreadView } from "./comments.js";
export { SuggestionsPanel } from "./suggestions.js";
export { ChatPanel } from "./chat.js";
export { SharePanel } from "./share.js";
export { NotificationCenter } from "./notifications.js";
export type { FollowTarget } from "./context.js";

export function VersionBar() {
  const { roomId, session } = useRoom();
  const [versions, setVersions] = useState<Array<{ id: string; name: string; createdAt: string }>>(
    [],
  );

  async function refresh() {
    const token = session?.getAccessToken();
    if (!token || !session || !session.permissions.includes("history:read")) return;
    const response = await fetch(
      `${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/versions`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return;
    const body = (await response.json()) as { versions: Array<{ id: string; name: string; createdAt: string }> };
    setVersions(body.versions);
  }

  useEffect(() => {
    void refresh();
  }, [session, roomId]);

  if (!session?.permissions.includes("history:read")) return null;

  return (
    <div className="realtime-versions">
      <button
        type="button"
        onClick={async () => {
          const token = session.getAccessToken();
          if (!token) return;
          const name = window.prompt("Version name", `Snapshot ${new Date().toLocaleString()}`);
          if (!name) return;
          await fetch(`${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/versions`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ name }),
          });
          await refresh();
        }}
      >
        Save version
      </button>
      {versions.map((version) => (
        <button
          key={version.id}
          type="button"
          title={version.createdAt}
          onClick={async () => {
            if (!session.permissions.includes("history:restore")) return;
            const token = session.getAccessToken();
            if (!token) return;
            await fetch(
              `${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/versions/${version.id}/restore`,
              { method: "POST", headers: { authorization: `Bearer ${token}` } },
            );
          }}
        >
          Restore {version.name}
        </button>
      ))}
    </div>
  );
}

export function ConnectionBanner() {
  const { connection } = useRoom();
  if (connection === "connected") return null;
  return (
    <div role="status" style={{ fontSize: 13, color: "#b45309" }}>
      {connection === "permission_denied"
        ? "You do not have access to this room."
        : `Connection: ${connection}`}
    </div>
  );
}

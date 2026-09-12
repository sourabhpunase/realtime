import { useEffect, useState } from "react";
import {
  ChatPanel,
  CommentsPanel,
  ConnectionBanner,
  CursorOverlay,
  FollowBanner,
  NotificationCenter,
  PresenceBar,
  RealtimeProvider,
  Room,
  SharePanel,
  SuggestionsPanel,
  VersionBar,
} from "@realtime/react";
import { CollaborativeEditor, clearRealtimeOfflineData } from "@realtime/editor";
import { VoiceToolbar } from "@realtime/media/react";

type User = { id: string; email: string; name: string };
type Document = { id: string; title: string };
type Member = { id: string; name: string; email?: string; role: string };

const publicKey =
  import.meta.env.VITE_REALTIME_PUBLIC_KEY ?? "pk_test_sample_local_dev_only";
const endpoint =
  import.meta.env.VITE_REALTIME_URL ?? "http://localhost:3080";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed");
  return body as T;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [directory, setDirectory] = useState<User[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    api<{ documents: Document[] }>("/documents").then((data) => {
      setDocuments(data.documents);
      setActiveId((current) => current ?? data.documents[0]?.id ?? null);
    });
    api<{ users: User[] }>("/directory").then((data) => setDirectory(data.users));
  }, [user]);

  useEffect(() => {
    if (!user || !activeId) return;
    api<{ members: Member[]; role?: string }>(`/documents/${encodeURIComponent(activeId)}`).then(
      (data) => {
        setMembers(data.members);
        setRole(data.role ?? null);
      },
    );
  }, [user, activeId]);

  if (!user) {
    return <Login onLogin={setUser} error={error} onError={setError} />;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: 32 }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Northroom sample
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>Collaborative workspace</h1>
        </div>
        <div>
          <div>{user.name}</div>
          <button
            type="button"
            onClick={async () => {
              await clearRealtimeOfflineData(publicKey, user.id);
              await api("/auth/logout", { method: "POST" });
              setUser(null);
              setActiveId(null);
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <nav style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => setActiveId(doc.id)}
            style={{
              padding: "8px 12px",
              border: "1px solid #d6d0c6",
              background: activeId === doc.id ? "#1c1916" : "#fff",
              color: activeId === doc.id ? "#fff" : "#1c1916",
            }}
          >
            {doc.title}
          </button>
        ))}
      </nav>

      {activeId ? (
        <RealtimeProvider
          publicKey={publicKey}
          endpoint={endpoint}
          authEndpoint="/api/realtime/token"
        >
          <Room id={activeId}>
            <PresenceBar />
            <FollowBanner />
            <NotificationCenter />
            <ConnectionBanner />
            <VoiceToolbar />
            <VersionBar />
            <SharePanel
              members={members}
              directory={directory}
              canManage={role === "administrator"}
              onShare={async (email, nextRole) => {
                const data = await api<{ members: Member[] }>(
                  `/documents/${encodeURIComponent(activeId)}/share`,
                  { method: "POST", body: JSON.stringify({ email, role: nextRole }) },
                );
                setMembers(data.members);
                const docs = await api<{ documents: Document[] }>("/documents");
                setDocuments(docs.documents);
              }}
              onRevoke={async (userId) => {
                const data = await api<{ members: Member[] }>(
                  `/documents/${encodeURIComponent(activeId)}/members/${userId}`,
                  { method: "DELETE" },
                );
                setMembers(data.members);
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
              <main
                data-realtime-surface
                style={{
                  position: "relative",
                  minHeight: 360,
                  padding: 24,
                  background: "#fff",
                  border: "1px solid #d6d0c6",
                }}
              >
                <CollaborativeEditor />
                <CursorOverlay />
              </main>
              <div>
                <SuggestionsPanel />
                <CommentsPanel
                  resolveUsers={async (query) =>
                    directory.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
                  }
                />
                <ChatPanel />
              </div>
            </div>
          </Room>
        </RealtimeProvider>
      ) : null}
    </div>
  );
}

function Login({
  onLogin,
  error,
  onError,
}: {
  onLogin: (user: User) => void;
  error: string | null;
  onError: (value: string | null) => void;
}) {
  return (
    <form
      style={{ maxWidth: 360, margin: "80px auto", display: "grid", gap: 12 }}
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          const result = await api<{ user: User }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({
              email: data.get("email"),
              password: data.get("password"),
            }),
          });
          onError(null);
          onLogin(result.user);
        } catch (err) {
          onError(err instanceof Error ? err.message : "Login failed");
        }
      }}
    >
      <h1 style={{ marginBottom: 0 }}>Sign in to Northroom sample</h1>
      <p style={{ color: "#57534e" }}>
        These accounts live only in the integrator app. They are not platform users. Open{" "}
        <strong>Q3 review</strong> as Bob to propose changes Alice must accept.
      </p>
      <input name="email" type="email" placeholder="alice@example.com" required />
      <input name="password" type="password" placeholder="alice-pass-1" required />
      {error ? <div role="alert">{error}</div> : null}
      <button type="submit">Continue</button>
    </form>
  );
}

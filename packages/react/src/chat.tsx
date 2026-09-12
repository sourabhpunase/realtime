import { useEffect, useState } from "react";
import { useRoom } from "./context.js";

type ChatMessage = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

const EMOJIS = ["👍", "👀", "✅"];

export function ChatPanel() {
  const { roomId, session } = useRoom();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const canWrite = Boolean(session?.permissions.includes("chat:write"));

  async function load() {
    const token = session?.getAccessToken();
    if (!token || !session) return;
    const response = await fetch(`${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/chat`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const body = (await response.json()) as { messages: ChatMessage[] };
    setMessages(body.messages);
  }

  useEffect(() => {
    void load();
    if (!session) return;
    const offChat = session.on("chat", (event) => {
      const payload = event.payload as ChatMessage;
      setMessages((current) =>
        current.some((item) => item.id === payload.id) ? current : [...current, payload],
      );
    });
    const offReaction = session.on("reaction", (event) => {
      const payload = event.payload as {
        targetId: string;
        emoji: string;
        removed?: boolean;
        userId: string;
        reactions?: Array<{ emoji: string; userId: string }>;
      };
      if (payload.reactions) {
        setReactions((current) => ({
          ...current,
          [payload.targetId]: payload.reactions!.map((item) => `${item.emoji}:${item.userId}`),
        }));
      }
    });
    return () => {
      offChat();
      offReaction();
    };
  }, [session, roomId]);

  async function send() {
    const token = session?.getAccessToken();
    if (!token || !session || !draft.trim()) return;
    await fetch(`${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/chat`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        body: draft.trim(),
        clientId: crypto.randomUUID?.() ?? `${Date.now()}`,
      }),
    });
    setDraft("");
    await load();
  }

  async function react(targetId: string, emoji: string) {
    const token = session?.getAccessToken();
    if (!token || !session || !canWrite) return;
    await fetch(`${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/reactions`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ targetType: "chat", targetId, emoji }),
    });
  }

  return (
    <aside className="realtime-chat">
      <h3>Room chat</h3>
      <div role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((message) => (
          <article key={message.id}>
            <strong>{message.authorName}</strong> {message.body}
            {canWrite ? (
              <div>
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`React ${emoji}`}
                    onClick={() => void react(message.id, emoji)}
                  >
                    {emoji}
                    {reactions[message.id]?.filter((item) => item.startsWith(`${emoji}:`)).length
                      ? ` ${reactions[message.id].filter((item) => item.startsWith(`${emoji}:`)).length}`
                      : ""}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {canWrite ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label>
            Message
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
            />
          </label>
          <button type="submit">Send</button>
        </form>
      ) : null}
    </aside>
  );
}

import { useEffect, useState } from "react";
import { useRoom } from "./context.js";

type Notice = { id: string; text: string };

export function NotificationCenter() {
  const { session } = useRoom();
  const [items, setItems] = useState<Notice[]>([]);

  useEffect(() => {
    if (!session) return;
    const push = (text: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setItems((current) => [{ id, text }, ...current].slice(0, 8));
    };
    const offSuggestion = session.on("suggestion", (event) => {
      const payload = event.payload as { authorName?: string; status?: string; kind?: string };
      if (event.type === "created") {
        push(`${payload.authorName ?? "Someone"} proposed a ${payload.kind ?? "change"}`);
      } else {
        push(`Suggestion ${payload.status ?? "updated"}`);
      }
    });
    const offChat = session.on("chat", (event) => {
      const payload = event.payload as { authorName?: string; body?: string };
      push(`${payload.authorName ?? "Chat"}: ${payload.body ?? ""}`);
    });
    const offComment = session.on("comment", (event) => {
      if (event.type === "created") push("New comment");
    });
    return () => {
      offSuggestion();
      offChat();
      offComment();
    };
  }, [session]);

  if (items.length === 0) return null;
  return (
    <div className="realtime-notifications" role="status" aria-live="polite">
      {items.slice(0, 3).map((item) => (
        <div key={item.id}>{item.text}</div>
      ))}
    </div>
  );
}

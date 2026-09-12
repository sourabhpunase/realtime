import { useEffect, useState } from "react";
import { useRoom } from "./context.js";

export type SuggestionView = {
  id: string;
  kind: "insert" | "delete" | "replace";
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  insertText?: string;
  deleteText?: string;
  quote?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

export function SuggestionsPanel() {
  const { roomId, session } = useRoom();
  const [items, setItems] = useState<SuggestionView[]>([]);
  const [kind, setKind] = useState<SuggestionView["kind"]>("replace");
  const [insertText, setInsertText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canWrite = Boolean(session?.permissions.includes("suggestions:write"));
  const canAccept = Boolean(session?.permissions.includes("suggestions:accept"));

  async function load() {
    const token = session?.getAccessToken();
    if (!token || !session) return;
    const response = await fetch(
      `${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/suggestions`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return;
    const body = (await response.json()) as { suggestions: SuggestionView[] };
    setItems(body.suggestions);
  }

  useEffect(() => {
    void load();
    if (!session) return;
    const off = session.on("suggestion", () => {
      void load();
    });
    return off;
  }, [session, roomId]);

  async function submit() {
    const token = session?.getAccessToken();
    if (!token || !session) return;
    const selection = window.getSelection()?.toString() ?? "";
    const offset = Number(
      document.querySelector<HTMLElement>("[data-realtime-selection]")?.dataset.offset ?? "",
    );
    setError(null);
    const response = await fetch(
      `${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/suggestions`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          insertText: kind === "delete" ? undefined : insertText,
          deleteText: kind === "insert" ? undefined : selection || undefined,
          quote: selection || undefined,
          offset: Number.isFinite(offset) ? offset : undefined,
        }),
      },
    );
    const body = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      setError(body.error?.message ?? "Could not store suggestion");
      return;
    }
    setInsertText("");
    await load();
  }

  async function decide(id: string, action: "accept" | "reject" | "withdraw") {
    const token = session?.getAccessToken();
    if (!token || !session) return;
    setError(null);
    const response = await fetch(
      `${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/suggestions/${id}`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    const body = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      setError(body.error?.message ?? "Could not update suggestion");
      return;
    }
    await load();
  }

  return (
    <aside className="realtime-suggestions">
      <h3>Suggestions</h3>
      <p style={{ fontSize: 12, color: "#57534e" }}>
        Proposals are stored separately. They are not live recolored typing. Accept applies a
        server-side document edit.
      </p>
      {canWrite ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label>
            Kind
            <select value={kind} onChange={(event) => setKind(event.target.value as SuggestionView["kind"])}>
              <option value="insert">Insert at caret</option>
              <option value="replace">Replace selection</option>
              <option value="delete">Delete selection</option>
            </select>
          </label>
          {kind !== "delete" ? (
            <textarea
              value={insertText}
              placeholder={kind === "insert" ? "Text to insert" : "Replacement text"}
              onChange={(event) => setInsertText(event.target.value)}
            />
          ) : null}
          <button type="submit">Propose change</button>
        </form>
      ) : (
        <p>You can view proposals in this room.</p>
      )}
      {error ? <div role="alert">{error}</div> : null}
      {items.map((item) => (
        <article key={item.id} data-status={item.status}>
          <strong>{item.authorName}</strong> {item.kind} · {item.status}
          {item.deleteText || item.quote ? <blockquote>{item.deleteText || item.quote}</blockquote> : null}
          {item.insertText ? <p>{item.insertText}</p> : null}
          {item.status === "pending" ? (
            <div>
              {canAccept ? (
                <>
                  <button type="button" onClick={() => void decide(item.id, "accept")}>
                    Accept
                  </button>
                  <button type="button" onClick={() => void decide(item.id, "reject")}>
                    Reject
                  </button>
                </>
              ) : null}
              {item.authorId === session?.user?.id ? (
                <button type="button" onClick={() => void decide(item.id, "withdraw")}>
                  Withdraw
                </button>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </aside>
  );
}

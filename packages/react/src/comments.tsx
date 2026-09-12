import { useEffect, useState } from "react";
import { useRoom } from "./context.js";

export type MentionUser = { id: string; name: string };

export type CommentThreadView = {
  id: string;
  status: "open" | "resolved";
  quote?: string;
  createdByName: string;
  comments: Array<{
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
    deletedAt?: string;
  }>;
};

type ResolveUsers = (query: string) => Promise<MentionUser[]>;

export function CommentsPanel({ resolveUsers }: { resolveUsers?: ResolveUsers }) {
  const { roomId, session } = useRoom();
  const [threads, setThreads] = useState<CommentThreadView[]>([]);
  const [draft, setDraft] = useState("");
  const [mentions, setMentions] = useState<MentionUser[]>([]);

  async function load() {
    const token = session?.getAccessToken();
    if (!token || !session) return;
    const response = await fetch(
      `${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/comments`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return;
    const body = (await response.json()) as { threads: CommentThreadView[] };
    setThreads(body.threads);
  }

  useEffect(() => {
    void load();
    if (!session) return;
    return session.on("comment", () => {
      void load();
    });
  }, [session, roomId]);

  async function createThread() {
    const token = session?.getAccessToken();
    if (!token || !session || !draft.trim()) return;
    if (!session.permissions.includes("comments:write")) return;
    const quote = window.getSelection()?.toString() || undefined;
    await fetch(`${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/comments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ body: draft.trim(), quote }),
    });
    setDraft("");
    await load();
  }

  async function setStatus(thread: CommentThreadView, status: "open" | "resolved") {
    const token = session?.getAccessToken();
    const comment = thread.comments[0];
    if (!token || !session || !comment) return;
    await fetch(
      `${session.endpoint}/v1/rooms/${encodeURIComponent(roomId)}/comments/${comment.id}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status }),
      },
    );
    await load();
  }

  return (
    <aside className="realtime-comments">
      <h3>Comments</h3>
      {session?.permissions.includes("comments:write") ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void createThread();
          }}
        >
          <textarea
            value={draft}
            placeholder="Comment on the current selection"
            onChange={async (event) => {
              const value = event.target.value;
              setDraft(value);
              const query = value.split("@").at(-1) ?? "";
              if (resolveUsers && value.includes("@") && query.length > 0) {
                setMentions(await resolveUsers(query));
              } else {
                setMentions([]);
              }
            }}
          />
          {mentions.length > 0 ? (
            <ul>
              {mentions.map((user) => (
                <li key={user.id}>{user.name}</li>
              ))}
            </ul>
          ) : null}
          <button type="submit">Add comment</button>
        </form>
      ) : null}
      {threads.map((thread) => (
        <article key={thread.id} data-status={thread.status}>
          {thread.quote ? <blockquote>{thread.quote}</blockquote> : null}
          {thread.comments
            .filter((comment) => !comment.deletedAt)
            .map((comment) => (
              <p key={comment.id}>
                <strong>{comment.authorName}</strong> {comment.body}
              </p>
            ))}
          {thread.status === "open" ? (
            <button type="button" onClick={() => void setStatus(thread, "resolved")}>
              Resolve
            </button>
          ) : (
            <button type="button" onClick={() => void setStatus(thread, "open")}>
              Reopen
            </button>
          )}
        </article>
      ))}
    </aside>
  );
}

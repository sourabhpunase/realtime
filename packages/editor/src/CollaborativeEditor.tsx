import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useRoom } from "@realtime/react";
import type { DocumentSyncState } from "@realtime/core";
import { RealtimeYjsProvider } from "./provider.js";
import { DOCX_FIDELITY, documentToDocx, documentToMarkdown, documentToPlainText, sanitizeHtml } from "./export.js";

export function CollaborativeEditor() {
  const { session, connection } = useRoom();
  const [generation, setGeneration] = useState(1);
  const [status, setStatus] = useState<DocumentSyncState>("synchronizing");
  const [title, setTitle] = useState("Untitled");
  const [provider, setProvider] = useState<RealtimeYjsProvider | null>(null);

  useEffect(() => {
    if (!session || connection !== "connected") return;
    let cancelled = false;
    const next = new RealtimeYjsProvider(session);
    const offDoc = session.on("document", setStatus);
    const offYjs = session.on("yjs", (event) => {
      if (event.type === "reset") setGeneration(event.generation);
    });
    void next.start().then(() => {
      if (cancelled) {
        void next.destroy();
        return;
      }
      const meta = next.doc.getMap("meta");
      const current = meta.get("title");
      if (typeof current === "string") setTitle(current);
      meta.observe(() => {
        const value = meta.get("title");
        if (typeof value === "string") setTitle(value);
      });
      setProvider(next);
    });
    return () => {
      cancelled = true;
      offDoc();
      offYjs();
      setProvider(null);
      void next.destroy();
    };
  }, [session, connection, generation]);

  if (!session) {
    return <div role="status">Connecting editor…</div>;
  }
  if (connection === "permission_denied") {
    return <div role="alert">You do not have access to this document.</div>;
  }
  if (!provider) {
    return <div role="status">Synchronizing document…</div>;
  }

  return (
    <TiptapSurface
      provider={provider}
      status={status}
      title={title}
      onTitleChange={setTitle}
      editable={session.permissions.includes("room:write")}
      userId={session.user?.id ?? "anonymous"}
      userName={session.user?.name ?? "Guest"}
      userColor={session.user?.color ?? "#2563eb"}
    />
  );
}

function TiptapSurface({
  provider,
  status,
  title,
  onTitleChange,
  editable,
  userId,
  userName,
  userColor,
}: {
  provider: RealtimeYjsProvider;
  status: DocumentSyncState;
  title: string;
  onTitleChange: (value: string) => void;
  editable: boolean;
  userId: string;
  userName: string;
  userColor: string;
}) {
  const { followTarget, cursors, surfaceRef } = useRoom();
  const applyingFollow = useRef(false);
  const recognitionRef = useRef<SpeechLike | null>(null);
  const [query, setQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [listening, setListening] = useState(false);
  const extensions = useMemo(
    () => [
      StarterKit.configure({ history: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Start writing…" }),
      Collaboration.configure({ document: provider.doc }),
      CollaborationCursor.configure({
        provider,
        user: { id: userId, name: userName, color: userColor },
      }),
    ],
    [provider, userColor, userId, userName],
  );

  const editor = useEditor({
    extensions,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: "realtime-editor-surface",
        class: "realtime-editor-prose",
        spellcheck: "true",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Collaborative document",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const publish = () => {
      if (applyingFollow.current) return;
      const { from, to } = editor.state.selection;
      const offset = editor.state.doc.textBetween(0, from, "", "").length;
      provider.awareness.setLocalStateField("selection", { from, to, offset });
      const marker = document.querySelector<HTMLElement>("[data-realtime-selection]");
      if (marker) marker.dataset.offset = String(offset);
    };
    publish();
    editor.on("selectionUpdate", publish);
    return () => {
      editor.off("selectionUpdate", publish);
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [editor, provider]);

  useEffect(() => {
    if (!editor || !followTarget) return;
    const apply = () => {
      for (const state of provider.awareness.getStates().values()) {
        const user = state.user as { id?: string } | undefined;
        const selection = state.selection as { from?: number; to?: number } | undefined;
        if (user?.id !== followTarget.userId || !selection?.from) continue;
        applyingFollow.current = true;
        editor.commands.setTextSelection({ from: selection.from, to: selection.to ?? selection.from });
        editor.commands.scrollIntoView();
        applyingFollow.current = false;
        return;
      }
      const cursor = Object.values(cursors).find((item) => item.userId === followTarget.userId);
      const surface = surfaceRef.current;
      if (cursor && surface) {
        surface.scrollTo({ top: cursor.y * surface.scrollHeight, behavior: "smooth" });
      }
    };
    apply();
    const onChange = () => apply();
    provider.awareness.on("change", onChange);
    const timer = window.setInterval(apply, 800);
    return () => {
      provider.awareness.off("change", onChange);
      window.clearInterval(timer);
    };
  }, [cursors, editor, followTarget, provider, surfaceRef]);

  if (!editor) {
    return <div role="status">Opening editor…</div>;
  }

  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="realtime-editor" data-realtime-editor="" data-realtime-selection="" data-offset="0">
      <a className="realtime-skip" href="#realtime-editor-surface">
        Skip to document
      </a>
      <div className="realtime-editor-meta">
        <input
          value={title}
          disabled={!editable}
          aria-label="Document title"
          onChange={(event) => {
            const value = event.target.value;
            onTitleChange(value);
            provider.doc.getMap("meta").set("title", value);
          }}
        />
        <span data-sync-state={status}>{labelFor(status)}</span>
        <span>{words} words</span>
      </div>
      <div className="realtime-editor-find">
        <label>
          Find in document
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", "\n");
              const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
              if (!query.trim() || index < 0) {
                setSearchMessage("No match");
                return;
              }
              editor.chain().focus().setTextSelection(index + 1).scrollIntoView().run();
              setSearchMessage(`Moved to match at ${index}`);
            }}
          />
        </label>
        <span role="status">{searchMessage}</span>
      </div>
      {editable ? <Toolbar editor={editor} listening={listening} onToggleListen={() => {
        if (listening) {
          recognitionRef.current?.stop();
          recognitionRef.current = null;
          setListening(false);
          return;
        }
        const Speech = (
          window as unknown as {
            SpeechRecognition?: new () => SpeechLike;
            webkitSpeechRecognition?: new () => SpeechLike;
          }
        ).SpeechRecognition ??
          (window as unknown as { webkitSpeechRecognition?: new () => SpeechLike }).webkitSpeechRecognition;
        if (!Speech) {
          setSearchMessage("Voice typing is not available in this browser. Accepted text is inserted through the editor, not a document overwrite.");
          return;
        }
        const recognition = new Speech();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          const transcript = result?.[0]?.transcript?.trim();
          if (transcript) {
            editor.chain().focus().insertContent(`${transcript} `).run();
          }
        };
        recognition.onerror = () => {
          recognitionRef.current = null;
          setListening(false);
        };
        recognition.start();
        recognitionRef.current = recognition;
        setListening(true);
      }} /> : null}
      <EditorContent editor={editor} />
      <div className="realtime-editor-exports">
        <button
          type="button"
          onClick={() => download("document.txt", documentToPlainText(editor.getText()))}
        >
          Export text
        </button>
        <button
          type="button"
          onClick={() => download("document.md", documentToMarkdown(editor.getJSON()))}
        >
          Export Markdown
        </button>
        <button
          type="button"
          title={DOCX_FIDELITY}
          onClick={() => {
            const bytes = documentToDocx(editor.getJSON());
            const copy = new ArrayBuffer(bytes.byteLength);
            new Uint8Array(copy).set(bytes);
            const blob = new Blob([copy], {
              type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "document.docx";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export DOCX (limited)
        </button>
        <button
          type="button"
          onClick={() => {
            const html = sanitizeHtml(editor.getHTML());
            const popup = window.open("", "_blank");
            if (!popup) return;
            popup.document.write(
              `<html><head><title>${title}</title></head><body>${html}</body></html>`,
            );
            popup.document.close();
            popup.print();
          }}
        >
          Print view
        </button>
      </div>
    </div>
  );
}

type SpeechLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

function labelFor(status: DocumentSyncState): string {
  switch (status) {
    case "saved":
      return "Saved";
    case "saving":
      return "Saving…";
    case "synchronizing":
      return "Synchronizing…";
    case "offline":
      return "Offline — pending changes";
    case "recovery_required":
      return "Recovery required";
    case "permission_denied":
      return "Permission denied";
    default:
      return status;
  }
}

function download(name: string, body: string) {
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function Toolbar({
  editor,
  listening,
  onToggleListen,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  listening: boolean;
  onToggleListen: () => void;
}) {
  return (
    <div className="realtime-editor-toolbar" role="toolbar" aria-label="Formatting">
      <button type="button" aria-pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        Bold
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>
        Italic
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}>
        Underline
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        H1
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>
        List
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        Numbered
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()}>
        Tasks
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        Code
      </button>
      <button
        type="button"
        onClick={() => {
          const href = window.prompt("Link URL");
          if (href) editor.chain().focus().setLink({ href }).run();
        }}
      >
        Link
      </button>
      <button
        type="button"
        onClick={() => {
          const src = window.prompt("Image URL (https)");
          if (src?.startsWith("https:")) editor.chain().focus().setImage({ src }).run();
        }}
      >
        Image
      </button>
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        Table
      </button>
      <button type="button" onClick={() => editor.chain().focus().undo().run()}>
        Undo
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()}>
        Redo
      </button>
      <button type="button" aria-pressed={listening} onClick={onToggleListen}>
        {listening ? "Stop voice typing" : "Voice typing"}
      </button>
    </div>
  );
}

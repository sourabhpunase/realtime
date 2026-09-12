import { useEffect } from "react";
import { CollaborativeEditor as EditorInner } from "./CollaborativeEditor.js";
import { editorStyles } from "./styles.js";

export { CollaborativeEditor as CollaborativeEditorInner } from "./CollaborativeEditor.js";
export { RealtimeYjsProvider } from "./provider.js";
export { documentToMarkdown, documentToPlainText, documentToDocx, sanitizeHtml, DOCX_FIDELITY } from "./export.js";

export async function clearRealtimeOfflineData(publicKey: string, userId: string) {
  if (typeof indexedDB === "undefined" || !indexedDB.databases) return;
  const databases = await indexedDB.databases();
  const prefix = `rt:${publicKey}:${userId}:`;
  await Promise.all(
    databases
      .filter((database) => database.name?.startsWith(prefix))
      .map((database) => database.name && indexedDB.deleteDatabase(database.name)),
  );
}

export function CollaborativeEditor() {
  useEffect(() => {
    const id = "realtime-editor-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = editorStyles;
    document.head.appendChild(style);
  }, []);
  return <EditorInner />;
}

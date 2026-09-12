import * as Y from "yjs";
import { RealtimeError } from "@realtime/protocol";

type TextSpan = { node: Y.XmlText; start: number };

export function collectTextSpans(doc: Y.Doc): { spans: TextSpan[]; text: string } {
  const spans: TextSpan[] = [];
  let offset = 0;
  const walk = (item: unknown) => {
    if (item instanceof Y.XmlText) {
      spans.push({ node: item, start: offset });
      offset += item.length;
      return;
    }
    if (item instanceof Y.XmlElement || item instanceof Y.XmlFragment) {
      for (let index = 0; index < item.length; index += 1) {
        walk(item.get(index));
      }
    }
  };
  walk(doc.getXmlFragment("default"));
  return { spans, text: spans.map((span) => span.node.toString()).join("") };
}

export function yXmlPlainText(doc: Y.Doc): string {
  return collectTextSpans(doc).text;
}

function ensureTextNode(doc: Y.Doc): Y.XmlText {
  const fragment = doc.getXmlFragment("default");
  if (fragment.length === 0) {
    const paragraph = new Y.XmlElement("paragraph");
    const text = new Y.XmlText();
    paragraph.insert(0, [text]);
    fragment.insert(0, [paragraph]);
    return text;
  }
  const { spans } = collectTextSpans(doc);
  if (spans[0]) return spans[0].node;
  const paragraph = new Y.XmlElement("paragraph");
  const text = new Y.XmlText();
  paragraph.insert(0, [text]);
  fragment.insert(0, [paragraph]);
  return text;
}

function locate(doc: Y.Doc, offset: number): { node: Y.XmlText; local: number } {
  const { spans, text } = collectTextSpans(doc);
  if (spans.length === 0) {
    const node = ensureTextNode(doc);
    return { node, local: 0 };
  }
  const clamped = Math.max(0, Math.min(offset, text.length));
  for (const span of spans) {
    const end = span.start + span.node.length;
    if (clamped <= end) {
      return { node: span.node, local: clamped - span.start };
    }
  }
  const last = spans[spans.length - 1];
  return { node: last.node, local: last.node.length };
}

export function applyPlainTextEdit(
  doc: Y.Doc,
  edit: { offset: number; deleteLen: number; insertText: string },
): void {
  if (edit.deleteLen < 0 || edit.offset < 0) {
    throw new RealtimeError("INVALID_PAYLOAD", "Invalid suggestion range");
  }
  ensureTextNode(doc);
  let remaining = edit.deleteLen;
  while (remaining > 0) {
    const { node, local } = locate(doc, edit.offset);
    const available = node.length - local;
    if (available <= 0) break;
    const take = Math.min(remaining, available);
    node.delete(local, take);
    remaining -= take;
  }
  if (edit.insertText) {
    const { node, local } = locate(doc, edit.offset);
    node.insert(local, edit.insertText);
  }
}

export function resolveSuggestionEdit(
  currentText: string,
  input: { offset?: number; deleteText?: string; quote?: string; insertText?: string; kind: string },
): { offset: number; deleteLen: number; insertText: string } {
  const needle = input.deleteText || input.quote || "";
  let offset = input.offset ?? 0;
  if (needle) {
    if (input.offset !== undefined && currentText.slice(input.offset, input.offset + needle.length) === needle) {
      offset = input.offset;
    } else {
      const found = currentText.indexOf(needle);
      if (found < 0) {
        throw new RealtimeError(
          "CONFLICT",
          "The proposed range no longer matches the document",
          409,
        );
      }
      offset = found;
    }
  } else if (input.kind !== "insert") {
    throw new RealtimeError("INVALID_PAYLOAD", "delete/replace suggestions need the original text");
  } else if (input.offset === undefined) {
    offset = currentText.length;
  }
  const deleteLen = input.kind === "insert" ? 0 : needle.length;
  const insertText = input.kind === "delete" ? "" : (input.insertText ?? "");
  if (input.kind !== "delete" && !insertText) {
    throw new RealtimeError("INVALID_PAYLOAD", "insert/replace suggestions need insertText");
  }
  return { offset, deleteLen, insertText };
}

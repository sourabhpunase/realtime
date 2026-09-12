import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as Y from "yjs";
import { applyPlainTextEdit, resolveSuggestionEdit, yXmlPlainText } from "../src/plaintext.js";

describe("plain-text suggestion apply", () => {
  it("inserts, deletes, and replaces across an empty then filled document", () => {
    const doc = new Y.Doc();
    applyPlainTextEdit(doc, { offset: 0, deleteLen: 0, insertText: "Hello" });
    assert.equal(yXmlPlainText(doc), "Hello");
    applyPlainTextEdit(doc, { offset: 5, deleteLen: 0, insertText: " world" });
    assert.equal(yXmlPlainText(doc), "Hello world");
    applyPlainTextEdit(doc, { offset: 6, deleteLen: 5, insertText: "there" });
    assert.equal(yXmlPlainText(doc), "Hello there");
  });

  it("resolves a moved quote and rejects a missing one", () => {
    const resolved = resolveSuggestionEdit("alpha beta gamma", {
      kind: "replace",
      deleteText: "beta",
      insertText: "BETA",
      offset: 99,
    });
    assert.equal(resolved.offset, 6);
    assert.equal(resolved.deleteLen, 4);
    assert.throws(
      () =>
        resolveSuggestionEdit("alpha", {
          kind: "delete",
          deleteText: "missing",
        }),
      /no longer matches/,
    );
  });
});

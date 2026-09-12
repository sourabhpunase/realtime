import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentToDocx, documentToMarkdown, sanitizeHtml } from "./export.js";

describe("document export", () => {
  it("renders headings and emphasis", () => {
    const markdown = documentToMarkdown({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Hello" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "world", marks: [{ type: "bold" }] }],
        },
      ],
    });
    assert.match(markdown, /## Hello/);
    assert.match(markdown, /\*\*world\*\*/);
  });

  it("builds a limited DOCX container with heading text", () => {
    const bytes = documentToDocx({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    });
    assert.equal(bytes[0], 0x50);
    assert.equal(bytes[1], 0x4b);
    const asText = new TextDecoder().decode(bytes);
    assert.match(asText, /word\/document\.xml/);
    assert.match(asText, /Hello/);
  });

  it("keeps marks, lists, and tables in DOCX XML", () => {
    const bytes = documentToDocx({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "loud", marks: [{ type: "bold" }] }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Milk" }] }],
            },
          ],
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "CellA" }] }],
                },
              ],
            },
          ],
        },
      ],
    });
    const asText = new TextDecoder().decode(bytes);
    assert.match(asText, /<w:b\/>/);
    assert.match(asText, /Milk/);
    assert.match(asText, /w:numId w:val="1"/);
    assert.match(asText, /<w:tbl>/);
    assert.match(asText, /CellA/);
    assert.match(asText, /word\/numbering\.xml/);
  });

  it("strips script tags from HTML export", () => {
    const clean = sanitizeHtml('<p>ok</p><script>alert(1)</script><div onclick="x">x</div>');
    assert.equal(clean.includes("script"), false);
    assert.equal(clean.includes("onclick"), false);
  });
});

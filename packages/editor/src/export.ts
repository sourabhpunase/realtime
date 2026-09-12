type JsonNode = {
  type?: string;
  text?: string;
  content?: JsonNode[];
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
  attrs?: Record<string, unknown>;
};

export function documentToPlainText(text: string): string {
  return text;
}

export function documentToMarkdown(node: JsonNode): string {
  return render(node).trim() + "\n";
}

function render(node: JsonNode): string {
  if (node.text) {
    let value = node.text;
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") value = `**${value}**`;
      if (mark.type === "italic") value = `_${value}_`;
      if (mark.type === "code") value = `\`${value}\``;
      if (mark.type === "link" && mark.attrs?.href) value = `[${value}](${mark.attrs.href})`;
    }
    return value;
  }
  const inner = (node.content ?? []).map(render).join("");
  switch (node.type) {
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level ?? 1))} ${inner}\n\n`;
    case "paragraph":
      return `${inner}\n\n`;
    case "blockquote":
      return `> ${inner}\n\n`;
    case "codeBlock":
      return `\`\`\`\n${inner}\n\`\`\`\n\n`;
    case "bulletList":
    case "orderedList":
    case "taskList":
      return `${inner}\n`;
    case "listItem":
    case "taskItem":
      return `- ${inner}\n`;
    case "doc":
      return inner;
    default:
      return inner;
  }
}

export { documentToDocx, DOCX_FIDELITY } from "./docx.js";

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

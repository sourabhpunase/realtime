type JsonNode = {
  type?: string;
  text?: string;
  content?: JsonNode[];
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
  attrs?: Record<string, unknown>;
};

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  const buffer = new Uint8Array(2);
  new DataView(buffer.buffer).setUint16(0, value, true);
  return buffer;
}

function u32(value: number): Uint8Array {
  const buffer = new Uint8Array(4);
  new DataView(buffer.buffer).setUint32(0, value, true);
  return buffer;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function zipStore(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const checksum = crc32(file.data);
    const local = concat([
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    locals.push(local);
    centrals.push(
      concat([
        new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(checksum),
        u32(file.data.length),
        u32(file.data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const central = concat(centrals);
  const end = concat([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, central, end]);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function runProperties(marks: JsonNode["marks"]): string {
  const props: string[] = [];
  for (const mark of marks ?? []) {
    if (mark.type === "bold") props.push("<w:b/>");
    if (mark.type === "italic") props.push("<w:i/>");
    if (mark.type === "underline") props.push('<w:u w:val="single"/>');
    if (mark.type === "strike") props.push("<w:strike/>");
    if (mark.type === "code") props.push('<w:rStyle w:val="VerbatimChar"/>');
  }
  return props.length ? `<w:rPr>${props.join("")}</w:rPr>` : "";
}

function runsFrom(node: JsonNode): string {
  if (node.type === "hardBreak") return "<w:r><w:br/></w:r>";
  if (node.text) {
    return `<w:r>${runProperties(node.marks)}<w:t xml:space="preserve">${escapeXml(node.text)}</w:t></w:r>`;
  }
  if (node.type === "image") {
    const alt = typeof node.attrs?.alt === "string" && node.attrs.alt ? node.attrs.alt : "image omitted";
    return `<w:r><w:t xml:space="preserve">[${escapeXml(alt)}]</w:t></w:r>`;
  }
  return (node.content ?? []).map(runsFrom).join("");
}

function paragraphXml(node: JsonNode, extraPr = ""): string {
  const style =
    node.type === "heading" ? `<w:pStyle w:val="Heading${Number(node.attrs?.level ?? 1)}"/>` : "";
  return `<w:p><w:pPr>${style}${extraPr}</w:pPr>${runsFrom(node) || "<w:r><w:t/></w:r>"}</w:p>`;
}

function listItemParagraphs(item: JsonNode, numId: 1 | 2): string[] {
  const extra = `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr>`;
  const blocks = item.content ?? [];
  if (blocks.length === 0) return [paragraphXml({ type: "paragraph" }, extra)];
  return blocks.flatMap((block, index) => {
    if (block.type === "paragraph" || block.type === "heading") {
      return [paragraphXml(block, index === 0 ? extra : "")];
    }
    return blocksToDocx(block);
  });
}

function tableXml(node: JsonNode): string {
  const rows = (node.content ?? [])
    .filter((row) => row.type === "tableRow")
    .map((row) => {
      const cells = (row.content ?? [])
        .filter((cell) => cell.type === "tableCell" || cell.type === "tableHeader")
        .map((cell) => {
          const inner = (cell.content ?? []).flatMap(blocksToDocx).join("") || "<w:p/>";
          return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
</w:tblBorders></w:tblPr>${rows}</w:tbl>`;
}

function blocksToDocx(node: JsonNode): string[] {
  switch (node.type) {
    case "heading":
    case "paragraph":
    case "blockquote":
      return [paragraphXml(node)];
    case "bulletList":
    case "taskList":
      return (node.content ?? []).flatMap((item) => listItemParagraphs(item, 1));
    case "orderedList":
      return (node.content ?? []).flatMap((item) => listItemParagraphs(item, 2));
    case "table":
      return [tableXml(node)];
    case "codeBlock":
      return [paragraphXml({ ...node, type: "paragraph" })];
    case "horizontalRule":
      return ["<w:p><w:pPr><w:pBdr><w:bottom w:val=\"single\" w:sz=\"6\" w:space=\"1\" w:color=\"auto\"/></w:pBdr></w:pPr></w:p>"];
    case "comment":
    case "suggestion":
      return [];
    default:
      if (node.text) return [paragraphXml({ type: "paragraph", content: [node] })];
      return (node.content ?? []).flatMap(blocksToDocx);
  }
}

export const DOCX_FIDELITY =
  "DOCX export includes headings, paragraphs, bold/italic/underline/strike, bullet and numbered lists, and tables. Images are replaced with a placeholder. Comments and suggestions are dropped. It is not a round-trip format.";

const NUMBERING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

export function documentToDocx(node: JsonNode): Uint8Array {
  const body = blocksToDocx(node).join("") || "<w:p/>";
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const encode = (value: string) => new TextEncoder().encode(value);
  return zipStore([
    { name: "[Content_Types].xml", data: encode(types) },
    { name: "_rels/.rels", data: encode(rels) },
    { name: "word/_rels/document.xml.rels", data: encode(DOCUMENT_RELS) },
    { name: "word/numbering.xml", data: encode(NUMBERING_XML) },
    { name: "word/document.xml", data: encode(documentXml) },
  ]);
}

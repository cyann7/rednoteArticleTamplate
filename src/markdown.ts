import type { ImageOptions, ImageSize, MarkdownBlock } from "./types";

const imageSizes = new Set<ImageSize>(["large", "medium", "small"]);

function parseImageOptions(raw?: string): ImageOptions {
  const options: ImageOptions = {
    size: "medium"
  };

  if (!raw) return options;

  for (const part of raw.trim().split(/\s+/)) {
    const [key, value] = part.split("=");
    if (key !== "size") continue;
    if (value === "full") options.size = "large";
    else if (value === "wide") options.size = "medium";
    else if (imageSizes.has(value as ImageSize)) options.size = value as ImageSize;
  }

  return options;
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;
  let blockIndex = 0;

  const push = (block: Omit<MarkdownBlock, "id">) => {
    blocks.push({ ...block, id: `block-${blockIndex++}` });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      push({
        type: "spacer",
        text: "",
        raw: line,
        startLine: i,
        endLine: i
      });
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\w+)?/);
    if (fence) {
      const start = i;
      const content: string[] = [line];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        content.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        content.push(lines[i]);
        i += 1;
      }
      push({
        type: "code",
        text: content.slice(1, -1).join("\n"),
        raw: content.join("\n"),
        lang: fence[1],
        startLine: start,
        endLine: i - 1,
        variant: fence[1] === "html" ? "infographic" : undefined
      });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      push({
        type: "heading",
        text: heading[2],
        raw: line,
        level: heading[1].length,
        startLine: i,
        endLine: i
      });
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      push({ type: "divider", text: "", raw: line, startLine: i, endLine: i });
      i += 1;
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{([^}]*)\})?$/);
    if (image) {
      push({
        type: "image",
        text: image[1] || "图片",
        raw: line,
        alt: image[1] || "图片",
        url: image[2],
        imageOptions: parseImageOptions(image[3]),
        startLine: i,
        endLine: i
      });
      i += 1;
      continue;
    }

    if (/^\s*(?:[-*]|\d+\.)\s+/.test(line)) {
      const start = i;
      const items: string[] = [];
      const ordered = /^\s*\d+\.\s+/.test(line);
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*[-*]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
        i += 1;
      }
      push({
        type: "list",
        text: items.join("\n"),
        raw: lines.slice(start, i).join("\n"),
        items,
        ordered,
        startLine: start,
        endLine: i - 1
      });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const start = i;
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      push({
        type: "quote",
        text: quote.join("\n"),
        raw: lines.slice(start, i).join("\n"),
        startLine: start,
        endLine: i - 1,
        variant: "quote-card"
      });
      continue;
    }

    const start = i;
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*(?:[-*]|\d+\.)\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    push({
      type: "paragraph",
      text: paragraph.join("\n"),
      raw: paragraph.join("\n"),
      startLine: start,
      endLine: i - 1
    });
  }

  return blocks;
}

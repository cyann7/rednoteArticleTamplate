export const TEMPLATE_IDS = ["xiaohongshu-general", "tech-share-light", "apple-modern", "prose-notes", "ios-notes"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type RatioId = "9:16" | "3:4" | "1:1" | "full";

export type PageNumberPosition = "top-left" | "top-right" | "middle-right" | "bottom-left" | "bottom-right";

export type PageNumberFormat = "current" | "current-total";

export type PageNumberStyle = "classic" | "watermark";

export type PageNumberConfig = {
  enabled: boolean;
  position: PageNumberPosition;
  format: PageNumberFormat;
  style: PageNumberStyle;
};

export type ImageSize = "large" | "medium" | "small";

export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export type HeadingLevel = (typeof HEADING_LEVELS)[number];

export const INLINE_FORMAT_KINDS = ["bold", "highlight", "italic", "strike", "underline", "code", "link"] as const;

export type InlineFormatKind = (typeof INLINE_FORMAT_KINDS)[number];

export type ImageOptions = {
  size: ImageSize;
};

export const MARKDOWN_BLOCK_TYPES = ["heading", "paragraph", "list", "quote", "code", "divider", "image", "spacer"] as const;

export type MarkdownBlockType = (typeof MARKDOWN_BLOCK_TYPES)[number];

export type MarkdownBlock = {
  id: string;
  type: MarkdownBlockType;
  text: string;
  raw: string;
  level?: number;
  lang?: string;
  url?: string;
  alt?: string;
  imageOptions?: ImageOptions;
  items?: string[];
  ordered?: boolean;
  startLine: number;
  endLine: number;
  variant?: string;
};

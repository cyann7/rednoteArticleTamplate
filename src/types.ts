export type TemplateId = "xiaohongshu-general" | "tech-share-light" | "apple-modern" | "prose-notes";

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

export type MarkdownBlockType = "heading" | "paragraph" | "list" | "quote" | "code" | "divider" | "image" | "spacer";

export type MarkdownBlock = {
  id: string;
  type: MarkdownBlockType;
  text: string;
  raw: string;
  level?: number;
  lang?: string;
  url?: string;
  alt?: string;
  items?: string[];
  ordered?: boolean;
  startLine: number;
  endLine: number;
  variant?: string;
};

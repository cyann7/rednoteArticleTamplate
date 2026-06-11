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

export type ImageRatio = "auto" | "1:1" | "4:3" | "16:9" | "3:4";

export type ImageSize = "full" | "wide" | "medium" | "small";

export type ImageFit = "cover" | "contain";

export type ImageOptions = {
  ratio: ImageRatio;
  size: ImageSize;
  fit: ImageFit;
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
  imageOptions?: ImageOptions;
  items?: string[];
  ordered?: boolean;
  startLine: number;
  endLine: number;
  variant?: string;
};

import type { ReactNode } from "react";
import {
  HEADING_LEVELS,
  INLINE_FORMAT_KINDS,
  MARKDOWN_BLOCK_TYPES,
  type HeadingLevel,
  type InlineFormatKind,
  type MarkdownBlock,
  type MarkdownBlockType,
  type PageNumberConfig,
  type TemplateId
} from "../types";

export type TemplateMarkdownSupport = {
  headingLevels: readonly HeadingLevel[];
  blockTypes: readonly MarkdownBlockType[];
  inlineFormats: readonly InlineFormatKind[];
};

export type TemplatePageChromeProps = {
  isFullRatio: boolean;
  pageIndex: number;
  totalPages: number;
};

export type TemplateRenderUnit = {
  id: string;
  block: MarkdownBlock;
  text: string;
  continuedFromPrevious?: boolean;
  continuesOnNext?: boolean;
  itemIndex?: number;
  listContinuation?: boolean;
};

export type TemplateRenderSelection = {
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
};

export type TemplateUnitRendererProps = TemplateRenderSelection & {
  unit: TemplateRenderUnit;
};

export type TemplateListRendererProps = TemplateRenderSelection & {
  units: TemplateRenderUnit[];
};

export type TemplateRenderers = {
  unit?: Partial<Record<Exclude<MarkdownBlockType, "list">, (props: TemplateUnitRendererProps) => ReactNode>>;
  listGroup?: (props: TemplateListRendererProps) => ReactNode;
};

export type TemplateDefinition = {
  id: TemplateId;
  order: number;
  name: string;
  description: string;
  contentTemplate: string;
  canvasClassName: string;
  pageNumber: PageNumberConfig;
  markdown: TemplateMarkdownSupport;
  renderPageChrome?: (props: TemplatePageChromeProps) => ReactNode;
  renderers?: TemplateRenderers;
};

export function defineTemplate(template: TemplateDefinition) {
  return template;
}

export function fullMarkdownSupport(): TemplateMarkdownSupport {
  return {
    headingLevels: [...HEADING_LEVELS],
    blockTypes: [...MARKDOWN_BLOCK_TYPES],
    inlineFormats: [...INLINE_FORMAT_KINDS]
  };
}

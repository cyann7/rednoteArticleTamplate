import type { HeadingLevel, InlineFormatKind, MarkdownBlockType, TemplateId } from "../types";
import { appleModernTemplate } from "./appleModern";
import { iosNotesTemplate } from "./iosNotes";
import { proseNotesTemplate } from "./proseNotes";
import { techShareLightTemplate } from "./techShareLight";
import type { TemplateDefinition } from "./base";
import { xiaohongshuGeneralTemplate } from "./xiaohongshuGeneral";

const templateDefinitions = [
  xiaohongshuGeneralTemplate,
  techShareLightTemplate,
  appleModernTemplate,
  proseNotesTemplate,
  iosNotesTemplate
] as const satisfies readonly TemplateDefinition[];

export const templateList = [...templateDefinitions].sort((left, right) => left.order - right.order);

export const templates = Object.fromEntries(
  templateList.map((template) => [template.id, template])
) as Record<TemplateId, TemplateDefinition>;

export function getTemplateContentTemplate(templateOrId: TemplateDefinition | TemplateId) {
  const template = typeof templateOrId === "string" ? templates[templateOrId] : templateOrId;
  return template.contentTemplate;
}

export function templateSupportsHeadingLevel(template: TemplateDefinition, level: HeadingLevel) {
  return template.markdown.headingLevels.includes(level);
}

export function templateSupportsBlock(template: TemplateDefinition, blockType: MarkdownBlockType) {
  return template.markdown.blockTypes.includes(blockType);
}

export function templateSupportsInlineFormat(template: TemplateDefinition, format: InlineFormatKind) {
  return template.markdown.inlineFormats.includes(format);
}

export type { TemplateDefinition, TemplateListRendererProps, TemplatePageChromeProps, TemplateRenderSelection, TemplateRenderUnit, TemplateUnitRendererProps } from "./base";

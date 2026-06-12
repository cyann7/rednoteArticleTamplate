import { defineTemplate, fullMarkdownSupport } from "../base";
import { contentTemplate } from "./contentTemplate";

export const techShareLightTemplate = defineTemplate({
  id: "tech-share-light",
  order: 20,
  name: "柔和科技风",
  description: "银白产品叙事、柔和玻璃层次与 Apple Store 式留白。",
  contentTemplate,
  canvasClassName: "template-soft-tech",
  pageNumber: {
    enabled: true,
    position: "bottom-right",
    format: "current",
    style: "watermark"
  },
  markdown: fullMarkdownSupport()
});

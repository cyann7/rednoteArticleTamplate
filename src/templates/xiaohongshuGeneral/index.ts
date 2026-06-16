import { defineTemplate, fullMarkdownSupport } from "../base";
import { contentTemplate } from "./contentTemplate";

export const template = defineTemplate({
  id: "xiaohongshu-general",
  order: 10,
  name: "小红书通用长文",
  description: "私人博客式排版，优雅克制，适合多数长文内容。",
  contentTemplate,
  canvasClassName: "template-xiaohongshu",
  pageNumber: {
    enabled: true,
    position: "bottom-right",
    format: "current",
    style: "watermark"
  },
  markdown: fullMarkdownSupport()
});

export const xiaohongshuGeneralTemplate = template;

import { defineTemplate, fullMarkdownSupport } from "../base";
import { contentTemplate } from "./contentTemplate";

export const template = defineTemplate({
  id: "apple-modern",
  order: 30,
  name: "极简风格",
  description: "纯白画布、SF 字体层级、克制留白与圆角图片模块。",
  contentTemplate,
  canvasClassName: "template-apple-modern",
  pageNumber: {
    enabled: true,
    position: "bottom-right",
    format: "current-total",
    style: "classic"
  },
  markdown: fullMarkdownSupport()
});

export const appleModernTemplate = template;

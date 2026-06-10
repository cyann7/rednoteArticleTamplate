import type { PageNumberConfig, TemplateId } from "./types";

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  description: string;
  canvasClassName: string;
  pageNumber: PageNumberConfig;
};

export const templates: Record<TemplateId, TemplateDefinition> = {
  "xiaohongshu-general": {
    id: "xiaohongshu-general",
    name: "小红书通用长文",
    description: "私人博客式排版，优雅克制，适合多数长文内容。",
    canvasClassName: "template-xiaohongshu",
    pageNumber: {
      enabled: true,
      position: "bottom-right",
      format: "current",
      style: "watermark"
    }
  },
  "tech-share-light": {
    id: "tech-share-light",
    name: "柔和科技风",
    description: "银白产品叙事、柔和玻璃层次与 Apple Store 式留白。",
    canvasClassName: "template-soft-tech",
    pageNumber: {
      enabled: true,
      position: "bottom-right",
      format: "current",
      style: "watermark"
    }
  },
  "apple-modern": {
    id: "apple-modern",
    name: "极简风格",
    description: "纯白画布、SF 字体层级、克制留白与圆角图片模块。",
    canvasClassName: "template-apple-modern",
    pageNumber: {
      enabled: true,
      position: "bottom-right",
      format: "current-total",
      style: "classic"
    }
  },
  "prose-notes": {
    id: "prose-notes",
    name: "散文札记",
    description: "书页式留白、柔和墨色与首行缩进，适合散文、随笔和旅行札记。",
    canvasClassName: "template-prose-notes",
    pageNumber: {
      enabled: true,
      position: "bottom-right",
      format: "current-total",
      style: "classic"
    }
  }
};

export const templateList = Object.values(templates);

import { defineTemplate, fullMarkdownSupport } from "../base";
import { contentTemplate } from "./contentTemplate";

export const template = defineTemplate({
  id: "prose-notes",
  order: 40,
  name: "散文札记",
  description: "旧书页纸色、淡墨正文与章标题留白，适合散文、随笔和旅行札记。",
  contentTemplate,
  canvasClassName: "template-prose-notes",
  pageNumber: {
    enabled: true,
    position: "bottom-right",
    format: "current",
    style: "classic"
  },
  markdown: fullMarkdownSupport(),
  renderPageChrome: () => (
    <>
      <div className="page-paper-texture" aria-hidden="true" />
      <div className="page-paper-tone" aria-hidden="true" />
    </>
  )
});

export const proseNotesTemplate = template;

import { defineTemplate, fullMarkdownSupport } from "../base";
import { contentTemplate } from "./contentTemplate";

export const template = defineTemplate({
  id: "ios-notes",
  order: 50,
  name: "iOS 备忘录",
  description: "贴近原生截图的 iPhone 备忘录样式，白底正文、金色工具栏与纯文本笔记节奏。",
  contentTemplate,
  canvasClassName: "template-ios-notes",
  pageNumber: {
    enabled: false,
    position: "bottom-right",
    format: "current",
    style: "classic"
  },
  markdown: fullMarkdownSupport(),
  renderPageChrome: () => (
    <>
      <div className="ios-notes-navbar" aria-hidden="true">
        <span className="ios-notes-back">本地备忘录</span>
        <span className="ios-notes-actions">
          <span className="ios-notes-action">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9.1" />
              <circle cx="8.2" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="15.8" cy="12" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
        </span>
      </div>
      <div className="ios-notes-toolbar" aria-hidden="true">
        <span className="ios-notes-tool">
          <img className="ios-notes-tool-image" src="/ios-notes-icons/check-circle.svg" alt="" />
        </span>
        <span className="ios-notes-tool">
          <img className="ios-notes-tool-image" src="/ios-notes-icons/camera.svg" alt="" />
        </span>
        <span className="ios-notes-tool">
          <img className="ios-notes-tool-image" src="/ios-notes-icons/pen-nib-circle.svg" alt="" />
        </span>
        <span className="ios-notes-tool">
          <img className="ios-notes-tool-image" src="/ios-notes-icons/edit-square.svg" alt="" />
        </span>
      </div>
    </>
  )
});

export const iosNotesTemplate = template;

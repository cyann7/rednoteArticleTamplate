import { defineTemplate, fullMarkdownSupport } from "../base";
import { contentTemplate } from "./contentTemplate";

export const iosNotesTemplate = defineTemplate({
  id: "ios-notes",
  order: 50,
  name: "iOS 备忘录",
  description: "模仿 iPhone 备忘录截图，浅黄纸面、系统导航栏与紧凑正文。",
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
      <div className="ios-notes-statusbar" aria-hidden="true">
        <span>9:41</span>
        <span className="ios-notes-indicators">
          <span className="ios-notes-cellular" />
          <span className="ios-notes-wifi" />
          <span className="ios-notes-battery" />
        </span>
      </div>
      <div className="ios-notes-navbar" aria-hidden="true">
        <span className="ios-notes-back">备忘录</span>
        <span className="ios-notes-title">今天</span>
        <span className="ios-notes-done">完成</span>
      </div>
      <div className="ios-notes-home-indicator" aria-hidden="true" />
    </>
  )
});

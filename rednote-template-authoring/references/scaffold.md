# Template Scaffold

Use this reference when creating a new template in this repo.

## Folder contract

```text
src/templates/<folderName>/
├── index.ts or index.tsx
├── contentTemplate.ts
└── styles.css
```

## `index.ts` starter

```ts
import { defineTemplate, fullMarkdownSupport } from "../base";
import { contentTemplate } from "./contentTemplate";

export const template = defineTemplate({
  id: "quiet-editorial",
  order: 60,
  name: "安静编辑部",
  description: "米白纸感、细标题和克制分隔，适合长文与观点表达。",
  contentTemplate,
  canvasClassName: "template-quiet-editorial",
  pageNumber: {
    enabled: true,
    position: "bottom-right",
    format: "current-total",
    style: "classic"
  },
  markdown: fullMarkdownSupport()
});
```

## `index.tsx` starter

Use this only when the template needs custom chrome or renderers.

```tsx
import { defineTemplate, fullMarkdownSupport } from "../base";
import { contentTemplate } from "./contentTemplate";

export const template = defineTemplate({
  id: "note-device",
  order: 70,
  name: "设备笔记",
  description: "带设备外壳和顶部状态栏的笔记展示风格。",
  contentTemplate,
  canvasClassName: "template-note-device",
  pageNumber: {
    enabled: false,
    position: "bottom-right",
    format: "current",
    style: "classic"
  },
  markdown: fullMarkdownSupport(),
  renderPageChrome: () => (
    <>
      <div className="note-device-status" aria-hidden="true">9:41</div>
      <div className="note-device-footer" aria-hidden="true" />
    </>
  )
});
```

## `contentTemplate.ts` starter

```ts
export const contentTemplate = `# [写一句清晰的标题]

[用两三句话交代背景、对象和核心结论。]

![配图说明](/your-asset.jpg){size=large}

## 一、先讲清问题场景

- [场景一]
- [场景二]
- [场景三]

> [用一句话收住这一段。]

## 二、再给出方法或判断

1. [第一步]
2. [第二步]
3. [第三步]

\`\`\`text
[输入] -> [处理] -> [输出]
\`\`\`

## 三、最后提醒限制条件

[结尾直接给用户一个行动起点。]`;
```

## `styles.css` starter

```css
.template-quiet-editorial,
.preview-page-card.template-quiet-editorial {
  background: #f6f1e8;
  color: #2f261f;
}

.template-quiet-editorial .rendered-document {
  font-family: "Georgia", "Times New Roman", serif;
}

.template-quiet-editorial .block-heading.heading-level-1 {
  font-size: 42px;
  line-height: 1.16;
  letter-spacing: -0.03em;
}

.template-quiet-editorial .block-paragraph,
.template-quiet-editorial .block-list,
.template-quiet-editorial .block-quote {
  font-size: 17px;
  line-height: 1.75;
}
```

## Required follow-up

Add this line to `src/styles.css`:

```css
@import "./templates/<folderName>/styles.css";
```

## Sanity checks

- `template` named export exists
- `id` and `canvasClassName` are unique
- no global CSS leakage
- local assets live under `public/`
- `npm run build` passes

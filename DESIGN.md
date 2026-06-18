---
name: Rednote Markdown Studio
description: A lightweight Markdown workspace for making Rednote-ready image posts.
colors:
  app-ink: "#171717"
  app-ink-soft: "#303030"
  app-muted: "#6b6b6b"
  app-bg: "#ffffff"
  app-surface: "#fafafa"
  app-border: "#d8d8d8"
  app-border-soft: "#ececec"
  app-focus: "#1111111f"
  preview-paper: "#fffaf0"
  preview-ink: "#241f1b"
  template-red: "#b9473b"
  template-red-strong: "#c84537"
  template-gold: "#d39a1a"
  template-note-gold: "#ddb02a"
  template-brown: "#8b5e34"
  template-tech-blue: "#0071e3"
  error-bg: "#fff1ed"
  error-border: "#c94d40"
  error-text: "#8f2f25"
typography:
  app-body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0"
  app-label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif"
    fontSize: "13px"
    fontWeight: 720
    lineHeight: 1
    letterSpacing: "0"
  preview-heading:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif"
    fontSize: "calc(34px * var(--preview-font-scale, 1))"
    fontWeight: 850
    lineHeight: 1.22
    letterSpacing: "0"
  preview-body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif"
    fontSize: "calc(18px * var(--preview-font-scale, 1))"
    fontWeight: 400
    lineHeight: 1.72
    letterSpacing: "0"
  mono:
    fontFamily: "SFMono-Regular, Cascadia Code, Consolas, Liberation Mono, monospace"
    fontSize: "calc(13px * var(--preview-font-scale, 1))"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  xs: "5px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  menu: "14px"
  canvas: "18px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  panel: "28px"
  canvas-x: "42px"
components:
  button-default:
    backgroundColor: "{colors.app-bg}"
    textColor: "{colors.app-ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-primary:
    backgroundColor: "{colors.app-ink}"
    textColor: "{colors.app-bg}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  toolbar-button:
    backgroundColor: "{colors.app-bg}"
    textColor: "{colors.app-ink-soft}"
    rounded: "{rounded.sm}"
    height: "30px"
    width: "30px"
  editor-field:
    backgroundColor: "{colors.app-bg}"
    textColor: "{colors.app-ink-soft}"
    typography: "{typography.app-body}"
    rounded: "{rounded.md}"
    padding: "18px 19px"
  template-picker:
    backgroundColor: "{colors.app-bg}"
    textColor: "{colors.app-ink-soft}"
    rounded: "{rounded.lg}"
    height: "42px"
    padding: "0 12px 0 13px"
  preview-page:
    backgroundColor: "{colors.preview-paper}"
    textColor: "{colors.preview-ink}"
    rounded: "{rounded.canvas}"
---

# Design System: Rednote Markdown Studio

## 1. Overview

**Creative North Star: "The Calm Drafting Desk"**

Rednote Markdown Studio is a lightweight creation surface, not a design suite. The application chrome should stay quiet, familiar, and readable so the user can keep writing, checking the preview, and exporting without negotiating the interface. The system earns quality through precision: stable controls, clear states, enough spacing to breathe, and no ornament that competes with the post being authored.

The product has two visual layers. The app shell is restrained and mostly neutral: white surfaces, dark ink, thin borders, compact toolbars, and direct icon controls. The preview canvas is where personality lives: each template may use its own typography, paper treatment, image rhythm, and accent color as long as the exported result remains predictable.

It explicitly rejects complex design-software chrome, dense admin dashboards, flashy marketing-site treatment, and overly decorative template-gallery behavior.

**Key Characteristics:**
- Split-pane creation flow with preview and Markdown editor kept side by side on desktop.
- Restrained app chrome using white surfaces, dark text, thin borders, and compact controls.
- Template-specific visual systems scoped under their own canvas class.
- Preview accuracy is treated as part of the interface, not a secondary output.
- State changes are fast and practical, with transitions around 120 to 180 ms.

## 2. Colors

The palette is neutral-first in the app shell, with template accents reserved for preview identity and active template selection.

### Primary
- **Studio Ink** (`app-ink`): The primary action, brand text, and high-emphasis UI color. It is deliberately near-black instead of colorful because the workspace should not fight the content.
- **Template Red** (`template-red`, `template-red-strong`): The default Rednote-like editorial accent for sync outlines, quote treatment, emphasis, and the general long-form template.

### Secondary
- **Template Gold** (`template-gold`, `template-note-gold`): Used for iOS Notes and warm template accents. It should stay inside template surfaces or template selection affordances.
- **Template Tech Blue** (`template-tech-blue`): Used by the soft tech template for links, rules, code emphasis, and selection outlines.
- **Prose Brown** (`template-brown`): Used to identify the prose notes template and support paper-like reading surfaces.

### Neutral
- **Clean Canvas** (`app-bg`): The main app background and default control background.
- **Panel Surface** (`app-surface`): Secondary panel tone for subtle separation.
- **Studio Border** (`app-border`): Default divider, field, select, and button border.
- **Soft Border** (`app-border-soft`): Low-emphasis separators.
- **Muted Ink** (`app-muted`): Secondary labels and inactive helper text.
- **Preview Paper** (`preview-paper`): The fallback preview page background for template canvases.

### Named Rules

**The Chrome Stays Neutral Rule.** The application shell uses dark ink, white surfaces, and thin borders by default. Template colors enter the shell only for template identity, selection, sync feedback, and export-specific context.

**The Accent Rarity Rule.** Saturated template colors should remain below 10 percent of the app shell. If the editor starts reading as red, blue, or gold, the content has lost priority.

## 3. Typography

**Display Font:** System sans through ui-sans-serif, system UI, and Apple system fallbacks for app chrome; template-specific display faces live inside template styles.
**Body Font:** ui-sans-serif, system UI, Apple system fonts, and Chinese system sans fallbacks.
**Label/Mono Font:** SFMono-Regular, Cascadia Code, Consolas for code blocks.

**Character:** The app typography is utilitarian and compact. Templates are allowed to diverge with SF Pro, Songti, Georgia, Huiwen-mincho, or mono treatment, but UI labels, controls, and data should stay in a familiar sans.

### Hierarchy
- **Display** (700 to 850, template-scoped sizes): Used only inside exported preview templates. The app shell does not use hero-scale type.
- **Headline** (650 to 760, 20px to 34px in preview): Used for rendered Markdown headings and template-specific content structure.
- **Title** (700, 13px to 14px in app chrome): Used for brand text, picker labels, and compact panel labels.
- **Body** (400, 15px app editor, 18px preview fallback): Used for editor text, rendered paragraphs, and readable template body copy.
- **Label** (650 to 750, 10px to 13px): Used for toolbar labels, badges, page numbers, and compact controls.
- **Mono** (400 to 700, 11.5px to 13px): Used for code cards and inline code only.

### Named Rules

**The Tool Has No Hero Rule.** Product UI labels and panel titles stay compact. Large type belongs inside the generated post, not the surrounding app.

**The Template Owns Voice Rule.** A template may bring serif, paper, SF Pro, or code aesthetics, but those choices must stay scoped to the template class and never leak into the editor chrome.

## 4. Elevation

The app shell is mostly flat and uses borders for structure. Elevation appears in overlays, menus, floating image controls, error banners, and preview page cards. Templates may use stronger shadows when they are part of the exported visual language, but the editor surface should remain calm.

### Shadow Vocabulary
- **Menu Lift** (`0 12px 30px rgba(0, 0, 0, 0.12)`): Used by template menus and transient popovers.
- **Warm Menu Lift** (`0 18px 36px rgba(42, 33, 17, 0.12)`): Used by the template picker menu with warm template accents.
- **Preview Page Lift** (`0 18px 45px rgba(49, 43, 35, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.42)`): Used by the fallback preview page card.
- **Floating Control Lift** (`0 12px 28px rgba(0, 0, 0, 0.14)`): Used by image options panels that float over preview content.
- **Error Lift** (`0 12px 30px rgba(45, 39, 31, 0.16)`): Used for bottom error banners.

### Named Rules

**The Flat-Until-Floating Rule.** Resting panels and editor controls are flat. Shadows are reserved for content that physically floats above the workspace or for template canvases that export with depth.

## 5. Components

### Buttons
- **Shape:** Gently rounded controls (`8px`) with pill shape only for icon-only export buttons and badges.
- **Primary:** Studio Ink background with white text (`app-ink` on `app-bg`), used for direct primary actions.
- **Hover / Focus:** Hover shifts border to `#9d9d9d` and background to `#f7f7f7`. Focus uses a 3px `app-focus` ring where implemented.
- **Icon Buttons:** Toolbar buttons are compact (`27px` to `30px`) and use lucide icons. They need explicit accessible names when icon-only.

### Chips
- **Style:** Template menu badges use pill shape, a light tint of `--template-accent`, and strong accent text.
- **State:** The current template badge says "当前" and should remain compact. It is a status marker, not a CTA.

### Cards / Containers
- **Corner Style:** App cards and fields use `8px` to `14px`. Preview page cards use `18px` by default, while individual templates may override to square or softer shapes.
- **Background:** App containers stay white or near-white. Preview pages may use paper, glass, native-note, or tech surfaces when scoped to templates.
- **Shadow Strategy:** Borders define app structure. Shadows define overlays and preview pages.
- **Border:** Default app border is `app-border`; template canvases can use their own border systems.
- **Internal Padding:** Editor fields use `18px 19px`; preview documents generally use `32px` to `42px` horizontal rhythm, adjusted per template.

### Inputs / Fields
- **Style:** The Markdown editor is a white bordered textarea with `8px` radius, `15px` text, and `1.7` line-height.
- **Focus:** Focus should visibly move the border darker and add the `app-focus` ring.
- **Error / Disabled:** Disabled controls reduce opacity to `0.45`. Error state uses a bottom fixed banner with `error-bg`, `error-border`, and `error-text`.

### Navigation
- **Style:** The topbar is a 60px fixed-height command strip with brand on the left and output controls on the right.
- **Default / Hover / Active:** Selects and buttons share the same border and hover vocabulary. Template picker open state uses a warmer border to connect with template choice.
- **Mobile Treatment:** Mobile uses adjacent Edit and Preview pages with a narrow edge peek for context and swipe switching. Edit is the default mode, with the Markdown toolbar hidden until the software keyboard opens; then it fixes below the topbar in the space normally reserved for mobile navigation. Preview shows the page canvas without the desktop sync rail and owns a small floating export menu. Template choice is a separate topbar control beside Settings. Settings uses one flat menu with direct controls for ratio, font size, page padding, and content reset.

### Preview Workspace

The preview pane centers a phone-like frame and stacks generated pages vertically. Preview layout is based on a fixed 500px logical canvas, then visually scaled to fit narrower screens; viewport changes must not alter text wrapping, pagination, or export composition. On desktop it owns template choice, typography scale, page padding, and export. Export opens a menu with image downloads and ZIP download. On mobile, export stays with Preview as a floating round icon button so it does not consume preview layout space. The editor pane owns Markdown authoring and formatting commands. The thin sync rail connects the two on desktop and disappears on mobile, where editor cursor movement continuously syncs the corresponding preview card before the user swipes between pages.

### Template Canvases

Each template is isolated by `canvasClassName`. Styles must be scoped under that class and imported through `src/styles.css`. Template additions should never change global app chrome unless the editor contract itself changes.

## 6. Do's and Don'ts

### Do:
- **Do** keep the app shell neutral: `app-bg`, `app-ink`, `app-border`, and compact spacing are the default.
- **Do** keep template personality inside the preview canvas and exported page.
- **Do** use lucide icons for toolbar actions and give icon-only buttons accessible names.
- **Do** keep controls stable in size so toolbar hover, disabled, and loading states do not shift layout.
- **Do** verify that preview and export match before changing template chrome.
- **Do** preserve the existing static-only architecture: local browser storage, no backend upload dependency.

### Don't:
- **Don't** create complex design-software chrome.
- **Don't** turn the app into a dense admin dashboard.
- **Don't** use flashy marketing-site treatment in the working interface.
- **Don't** make the template picker behave like an overly decorative gallery.
- **Don't** use colored side-stripe borders greater than 1px on cards or callouts.
- **Don't** add broad global template selectors. Template CSS must stay scoped to its template class.
- **Don't** rely on desktop `min-width` as a responsive strategy. Narrow screens need structural adaptation.

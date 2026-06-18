import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  Bold,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Code2,
  Download,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Highlighter,
  Image,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  RotateCcw,
  SlidersHorizontal,
  Strikethrough,
  Underline,
} from "lucide-react";
import domtoimage from "dom-to-image-more";
import { parseMarkdown } from "./markdown";
import { getTemplateContentTemplate, templateList, templateSupportsBlock, templateSupportsHeadingLevel, templateSupportsInlineFormat, templates } from "./templates";
import type { TemplateDefinition, TemplateRenderUnit } from "./templates";
import { DEFAULT_TEMPLATE_ID, type HeadingLevel, type ImageOptions, type ImageSize, type InlineFormatKind, type MarkdownBlock, type PageNumberConfig, type RatioId, type TemplateId } from "./types";
import "./styles.css";

const ratioMap: Record<RatioId, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "3:4": { width: 1080, height: 1440 },
  "1:1": { width: 1080, height: 1080 },
  full: { width: 1080, height: 0 }
};

const previewDesignWidthPx = 500;
const previewPageGapPx = 14;
const textClipBuffer = 2;
const markdownContentVersion = "v4";
const localImageUrlPrefix = "rednote-image:";
const localImageStoreKey = "rednote.images.v1";
const imageSizeOptions: ImageSize[] = ["small", "medium", "large"];
const templateAccentMap: Record<TemplateId, string> = {
  "apple-modern": "#4b5563",
  "ios-notes": "#d39a1a",
  "prose-notes": "#8b5e34",
  "tech-share-light": "#6b7ff2",
  "xiaohongshu-general": "#e85f73"
};

type FlowUnit = {
  id: string;
  block: MarkdownBlock;
  text: string;
  splittable: boolean;
  itemIndex?: number;
  listContinuation?: boolean;
  continuedFromPrevious?: boolean;
  continuesOnNext?: boolean;
};

type PageUnit = FlowUnit;

type InlineFormat = {
  kind: InlineFormatKind | "custom";
  before: string;
  after: string;
};

type ExistingInlineFormat = {
  kind: InlineFormatKind | "custom";
  rangeStart: number;
  rangeEnd: number;
  inner: string;
};

type LocalImageRecord = {
  name: string;
  dataUrl: string;
  createdAt: number;
};

type LocalImageStore = Record<string, LocalImageRecord>;

type MobileMode = "editor" | "preview";

const exclusiveInlineFormats: InlineFormat[] = [
  { kind: "bold", before: "**", after: "**" },
  { kind: "highlight", before: "==", after: "==" },
  { kind: "strike", before: "~~", after: "~~" },
  { kind: "underline", before: "<u>", after: "</u>" },
  { kind: "italic", before: "*", after: "*" },
  { kind: "code", before: "`", after: "`" }
];

function loadInitialMarkdown() {
  const savedVersion = localStorage.getItem("rednote.markdown.version");
  const savedMarkdown = localStorage.getItem("rednote.markdown");
  const savedTemplateId = getSavedTemplateId();

  if (savedVersion !== markdownContentVersion) {
    if (savedMarkdown) localStorage.setItem("rednote.markdown.backup", savedMarkdown);
    localStorage.setItem("rednote.markdown.version", markdownContentVersion);
    return getTemplateContentTemplate(savedTemplateId);
  }

  return compactEmbeddedMarkdownImages(savedMarkdown || getTemplateContentTemplate(savedTemplateId));
}

function getSavedTemplateId() {
  const saved = localStorage.getItem("rednote.template.v2") as TemplateId | null;

  return saved && templates[saved] ? saved : DEFAULT_TEMPLATE_ID;
}

function getSavedRatio() {
  const saved = localStorage.getItem("rednote.ratio.v2") as RatioId | null;

  return saved && saved in ratioMap ? saved : "3:4";
}

function getInlineFormat(before: string, after: string): InlineFormat {
  if (before === "[" && after.startsWith("](")) return { kind: "link", before, after };
  return exclusiveInlineFormats.find((format) => format.before === before && format.after === after) ?? { kind: "custom", before, after };
}

function findExistingInlineFormat(source: string, start: number, end: number): ExistingInlineFormat | null {
  const selected = source.slice(start, end);
  const exactLink = selected.match(/^\[([\s\S]+?)\]\(https?:\/\/[^)\s]+\)$/);
  if (exactLink) {
    return { kind: "link", rangeStart: start, rangeEnd: end, inner: exactLink[1] };
  }

  for (const format of exclusiveInlineFormats) {
    if (selected.startsWith(format.before) && selected.endsWith(format.after) && selected.length >= format.before.length + format.after.length) {
      return {
        kind: format.kind,
        rangeStart: start,
        rangeEnd: end,
        inner: selected.slice(format.before.length, selected.length - format.after.length)
      };
    }
  }

  if (source[start - 1] === "[") {
    const linkClose = source.slice(end).match(/^\]\(https?:\/\/[^)\s]+\)/);
    if (linkClose) {
      return { kind: "link", rangeStart: start - 1, rangeEnd: end + linkClose[0].length, inner: selected };
    }
  }

  for (const format of exclusiveInlineFormats) {
    const beforeStart = start - format.before.length;
    const afterEnd = end + format.after.length;
    if (
      beforeStart >= 0 &&
      source.slice(beforeStart, start) === format.before &&
      source.slice(end, afterEnd) === format.after
    ) {
      return { kind: format.kind, rangeStart: beforeStart, rangeEnd: afterEnd, inner: selected };
    }
  }

  return null;
}

function stripInlineFormatting(text: string) {
  let next = text;
  let previous = "";

  while (next !== previous) {
    previous = next;
    next = next
      .replace(/\[([\s\S]+?)\]\(https?:\/\/[^)\s]+\)/g, "$1")
      .replace(/<u>([\s\S]*?)<\/u>/g, "$1")
      .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
      .replace(/==([\s\S]*?)==/g, "$1")
      .replace(/~~([\s\S]*?)~~/g, "$1")
      .replace(/`([^`\n]+)`/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1");
  }

  return next;
}

function wrapInlineText(text: string, format: InlineFormat) {
  if (text.includes("\n") && format.kind !== "underline" && format.kind !== "link") {
    return text
      .split("\n")
      .map((line) => (line.trim() ? `${format.before}${line}${format.after}` : line))
      .join("\n");
  }

  return `${format.before}${text}${format.after}`;
}

function sanitizeMarkdownImageAlt(text: string) {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/[\[\]]/g, "")
    .trim() || "图片";
}

function normalizeImageOptions(options?: Partial<ImageOptions>): ImageOptions {
  return {
    size: options?.size ?? "medium"
  };
}

function formatImageOptions(options: ImageOptions) {
  return `size=${options.size}`;
}

function setImageOptionsInRawImage(raw: string, options: ImageOptions) {
  const normalized = normalizeImageOptions(options);
  const nextOptions = `{${formatImageOptions(normalized)}}`;
  if (/\{[^}]*\}\s*$/.test(raw)) {
    return raw.replace(/\{[^}]*\}\s*$/, nextOptions);
  }
  return `${raw}${nextOptions}`;
}

function createLocalImageId() {
  const random = Math.random().toString(36).slice(2, 9);
  return `${Date.now().toString(36)}-${random}`;
}

function readLocalImageStore(): LocalImageStore {
  try {
    const raw = localStorage.getItem(localImageStoreKey);
    return raw ? JSON.parse(raw) as LocalImageStore : {};
  } catch {
    return {};
  }
}

function writeLocalImageStore(store: LocalImageStore) {
  localStorage.setItem(localImageStoreKey, JSON.stringify(store));
}

function saveLocalImage(dataUrl: string, name: string) {
  const id = createLocalImageId();
  const store = readLocalImageStore();
  store[id] = {
    name,
    dataUrl,
    createdAt: Date.now()
  };
  writeLocalImageStore(store);
  return id;
}

function resolveImageUrl(url?: string) {
  if (!url?.startsWith(localImageUrlPrefix)) return url;
  const id = url.slice(localImageUrlPrefix.length);
  return readLocalImageStore()[id]?.dataUrl;
}

function compactEmbeddedMarkdownImages(markdown: string) {
  if (!markdown.includes("](data:image/")) return markdown;

  return markdown.replace(/!\[([^\]]*)\]\((data:image\/[^)\s]+)\)/g, (_match, alt: string, dataUrl: string) => {
    try {
      const id = saveLocalImage(dataUrl, sanitizeMarkdownImageAlt(alt));
      return `![${sanitizeMarkdownImageAlt(alt)}](${localImageUrlPrefix}${id})`;
    } catch {
      return _match;
    }
  });
}

function App() {
  const [markdown, setMarkdown] = useState(loadInitialMarkdown);
  const [templateId, setTemplateId] = useState<TemplateId>(getSavedTemplateId);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [ratio, setRatio] = useState<RatioId>(getSavedRatio);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState<MobileMode>("editor");
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMobileEditorFocused, setIsMobileEditorFocused] = useState(false);
  const [isMobileEditorToolbarVisible, setIsMobileEditorToolbarVisible] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const phoneFrameRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLElement>(null);
  const templatePickerRef = useRef<HTMLDivElement>(null);
  const mobileTemplatePickerRef = useRef<HTMLDivElement>(null);
  const mobileSettingsRef = useRef<HTMLDivElement>(null);
  const desktopExportRef = useRef<HTMLDivElement>(null);
  const mobileExportRef = useRef<HTMLDivElement>(null);
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const workspaceGestureRef = useRef<{ x: number; y: number; mode: MobileMode } | null>(null);
  const suppressNextWorkspaceClickRef = useRef(false);
  const previewSyncFrameRef = useRef<number | null>(null);
  const mobilePreviewScrollTopRef = useRef(0);
  const mobileEditorScrollTopRef = useRef(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const preserveActiveBlockOnEditorFocusRef = useRef(false);
  const previousTemplateIdRef = useRef<TemplateId>(getSavedTemplateId());
  const [pages, setPages] = useState<PageUnit[][]>([]);
  const [previewScale, setPreviewScale] = useState(1);
  const [fullPreviewNaturalHeight, setFullPreviewNaturalHeight] = useState(0);
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem("rednote.fontScale") || 1));
  const [pagePadding, setPagePadding] = useState(() => Number(localStorage.getItem("rednote.pagePadding") || 16));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  const dimensions = ratioMap[ratio];
  const isFullRatio = ratio === "full";
  const pageHeightPx = isFullRatio ? 0 : previewDesignWidthPx * (dimensions.height / dimensions.width);
  const template = templates[templateId];
  const pageNumber = template.pageNumber;
  const canUseHeading = (level: HeadingLevel) => templateSupportsHeadingLevel(template, level);
  const canUseInline = (format: InlineFormatKind) => templateSupportsInlineFormat(template, format);
  const canUseBlock = (blockType: MarkdownBlock["type"]) => templateSupportsBlock(template, blockType);
  const flowUnits = useMemo(() => makeFlowUnits(blocks), [blocks]);
  const previewNaturalHeight = isFullRatio
    ? fullPreviewNaturalHeight
    : pages.length * pageHeightPx + Math.max(0, pages.length - 1) * previewPageGapPx;
  const previewFrameHeight = previewNaturalHeight > 0 ? previewNaturalHeight * previewScale : 0;
  const activeImageBlock = useMemo(() => {
    const block = blocks.find((item) => item.id === activeBlockId);
    return block?.type === "image" ? block : null;
  }, [activeBlockId, blocks]);
  const [floatingImageControls, setFloatingImageControls] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("rednote.markdown", markdown);
      setError((current) => (current === "图片内容太大，浏览器本地存储空间不足。" ? null : current));
    } catch {
      setError("图片内容太大，浏览器本地存储空间不足。");
    }
  }, [markdown]);

  useEffect(() => {
    localStorage.setItem("rednote.ratio.v2", ratio);
  }, [ratio]);

  useEffect(() => {
    localStorage.setItem("rednote.template.v2", templateId);
  }, [templateId]);

  useEffect(() => {
    const previousTemplateId = previousTemplateIdRef.current;
    if (previousTemplateId === templateId) return;

    const previousTemplateContent = getTemplateContentTemplate(previousTemplateId);
    const nextTemplateContent = getTemplateContentTemplate(templateId);
    previousTemplateIdRef.current = templateId;

    if (!markdown.trim() || markdown === previousTemplateContent) {
      setMarkdown(nextTemplateContent);
      setUndoStack([]);
      setRedoStack([]);
      setActiveBlockId(null);
      requestAnimationFrame(() => {
        if (markdownTextareaRef.current) markdownTextareaRef.current.scrollTop = 0;
        if (previewPaneRef.current) previewPaneRef.current.scrollTop = 0;
      });
    }
  }, [markdown, templateId]);

  useEffect(() => {
    localStorage.setItem("rednote.fontScale", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    localStorage.setItem("rednote.pagePadding", String(pagePadding));
  }, [pagePadding]);

  const [layoutRevision, setLayoutRevision] = useState(0);

  useEffect(() => {
    const handleLayoutChange = () => setLayoutRevision((value) => value + 1);
    window.addEventListener("rednote:layout-change", handleLayoutChange);
    return () => window.removeEventListener("rednote:layout-change", handleLayoutChange);
  }, []);

  useLayoutEffect(() => {
    const frame = phoneFrameRef.current;
    if (!frame) return;

    const updateScale = () => {
      const width = frame.getBoundingClientRect().width;
      const nextScale = Math.min(1, width / previewDesignWidthPx);
      setPreviewScale((current) => (Math.abs(current - nextScale) < 0.001 ? current : nextScale));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure) return;

    const updatePages = () => {
      if (isFullRatio) {
        setPages((current) => (arePagesEqual(current, [flowUnits]) ? current : [flowUnits]));
        return;
      }
      const next = paginateByProbe(flowUnits, measure, pageHeightPx, pagePadding, template, fontScale);
      setPages((current) => (arePagesEqual(current, next) ? current : next));
    };

    updatePages();
    const frame = requestAnimationFrame(updatePages);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [flowUnits, template.canvasClassName, fontScale, pageHeightPx, pagePadding, layoutRevision, isFullRatio, mobileMode]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateNaturalHeight = () => {
      setFullPreviewNaturalHeight(canvas.scrollHeight);
    };

    updateNaturalHeight();
    const frame = requestAnimationFrame(updateNaturalHeight);
    const observer = new ResizeObserver(updateNaturalHeight);
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pages, pageHeightPx, fontScale, pagePadding, templateId, layoutRevision]);

  useLayoutEffect(() => {
    const pane = previewPaneRef.current;
    const frame = phoneFrameRef.current;
    if (!pane || !frame || !activeImageBlock || busy === "export") {
      setFloatingImageControls(null);
      return;
    }

    const panelWidth = 178;
    const visualPanelWidth = panelWidth * previewScale;

    const updatePosition = () => {
      const target = pane.querySelector<HTMLElement>(`[data-source-block-id="${activeImageBlock.id}"] .image-card`);
      if (!target) {
        setFloatingImageControls(null);
        return;
      }

      const paneRect = pane.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const frameOffsetLeft = frameRect.left - paneRect.left;
      const preferredRight = targetRect.right - frameRect.left + 12;
      const preferredLeft = targetRect.left - frameRect.left - visualPanelWidth - 12;
      const maxLeft = pane.clientWidth - frameOffsetLeft - visualPanelWidth - 16;
      const fitsRight = frameOffsetLeft + preferredRight + visualPanelWidth <= pane.clientWidth - 16;
      const left = fitsRight
        ? preferredRight
        : preferredLeft >= 0
          ? preferredLeft
          : Math.max(0, Math.min(preferredRight, maxLeft));
      const top = Math.max(0, targetRect.top - frameRect.top);

      setFloatingImageControls({
        top: top / previewScale,
        left: left / previewScale
      });
    };

    updatePosition();

    const observer = new ResizeObserver(updatePosition);
    observer.observe(frame);
    observer.observe(pane);
    pane.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    window.addEventListener("rednote:layout-change", updatePosition);

    return () => {
      observer.disconnect();
      pane.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("rednote:layout-change", updatePosition);
    };
  }, [activeImageBlock, busy, fontScale, pagePadding, pages, previewScale, templateId]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current != null) window.clearTimeout(highlightTimerRef.current);
      if (previewSyncFrameRef.current != null) window.cancelAnimationFrame(previewSyncFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isMobileEditorFocused || mobileMode !== "editor") {
      setIsMobileEditorToolbarVisible(false);
      return;
    }

    const editor = markdownTextareaRef.current;
    if (!editor || !isMobileViewport()) {
      setIsMobileEditorToolbarVisible(false);
      return;
    }

    let disposed = false;
    let stableTimer: number | null = null;
    let maxWaitTimer: number | null = null;
    const root = document.documentElement;
    const toolbarInset = 12;
    const earliestRevealAt = window.performance.now() + 650;

    const updateToolbarPosition = () => {
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const right = Math.max(toolbarInset, Math.round(window.innerWidth - viewportLeft - viewportWidth + toolbarInset));

      root.style.setProperty("--mobile-toolbar-top", `${Math.round(viewportTop + 8)}px`);
      root.style.setProperty("--mobile-toolbar-left", `${Math.round(viewportLeft + toolbarInset)}px`);
      root.style.setProperty("--mobile-toolbar-right", `${right}px`);
    };

    const revealToolbar = () => {
      if (disposed || document.activeElement !== editor || !isMobileViewport()) return;
      const waitMs = earliestRevealAt - window.performance.now();
      if (waitMs > 0) {
        if (stableTimer != null) window.clearTimeout(stableTimer);
        stableTimer = window.setTimeout(revealToolbar, waitMs);
        return;
      }
      updateToolbarPosition();
      setIsMobileEditorToolbarVisible(true);
    };

    const scheduleStableReveal = () => {
      updateToolbarPosition();
      if (stableTimer != null) window.clearTimeout(stableTimer);
      stableTimer = window.setTimeout(revealToolbar, 180);
    };

    setIsMobileEditorToolbarVisible(false);
    scheduleStableReveal();
    maxWaitTimer = window.setTimeout(revealToolbar, 1000);

    window.visualViewport?.addEventListener("resize", scheduleStableReveal);
    window.visualViewport?.addEventListener("scroll", scheduleStableReveal);
    window.addEventListener("resize", scheduleStableReveal);

    return () => {
      disposed = true;
      if (stableTimer != null) window.clearTimeout(stableTimer);
      if (maxWaitTimer != null) window.clearTimeout(maxWaitTimer);
      window.visualViewport?.removeEventListener("resize", scheduleStableReveal);
      window.visualViewport?.removeEventListener("scroll", scheduleStableReveal);
      window.removeEventListener("resize", scheduleStableReveal);
      root.style.removeProperty("--mobile-toolbar-top");
      root.style.removeProperty("--mobile-toolbar-left");
      root.style.removeProperty("--mobile-toolbar-right");
    };
  }, [isMobileEditorFocused, mobileMode]);

  useEffect(() => {
    if (!isTemplatePickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const picker = templatePickerRef.current;
      const mobilePicker = mobileTemplatePickerRef.current;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (picker?.contains(target) || mobilePicker?.contains(target)) return;
      setIsTemplatePickerOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isTemplatePickerOpen, templateId]);

  useEffect(() => {
    if (!isMobileSettingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const settings = mobileSettingsRef.current;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (settings?.contains(target)) return;
      if (target instanceof Element && target.closest(".mobile-settings-button")) return;
      setIsMobileSettingsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobileSettingsOpen]);

  useEffect(() => {
    if (!isExportMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (desktopExportRef.current?.contains(target) || mobileExportRef.current?.contains(target)) return;
      setIsExportMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isExportMenuOpen]);

  function pushUndoSnapshot(current: string) {
    setUndoStack((items) => [current, ...items].slice(0, 50));
    setRedoStack([]);
  }

  function handleMarkdownChange(value: string, selectionStart?: number) {
    pushUndoSnapshot(markdown);
    const block = typeof selectionStart === "number" ? findBlockAtOffset(blocks, selectionStart, markdown) : null;
    if (block) {
      setActiveBlockId(block.id);
      schedulePreviewSync(block.id);
    } else {
      setActiveBlockId(null);
    }
    setMarkdown(value);
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 960px)").matches;
  }

  function schedulePreviewSync(blockId: string) {
    if (!isMobileViewport()) return;
    if (mobileMode !== "preview") return;
    if (previewSyncFrameRef.current != null) window.cancelAnimationFrame(previewSyncFrameRef.current);
    previewSyncFrameRef.current = window.requestAnimationFrame(() => {
      previewSyncFrameRef.current = null;
      scrollPreviewBlockIntoView(blockId, { behavior: "auto", flash: false });
    });
  }

  function updateActiveBlockFromEditorSelection({ scroll = true } = {}) {
    const textarea = markdownTextareaRef.current;
    if (!textarea) return activeBlockId;
    const block = findBlockAtOffset(blocks, textarea.selectionStart, markdown);
    if (!block) return null;
    setActiveBlockId(block.id);
    if (scroll) {
      schedulePreviewSync(block.id);
    }
    return block.id;
  }

  function saveMobileScrollPosition(mode: MobileMode = mobileMode) {
    if (!isMobileViewport()) return;
    if (mode === "preview") {
      mobilePreviewScrollTopRef.current = previewPaneRef.current?.scrollTop ?? mobilePreviewScrollTopRef.current;
      return;
    }
    mobileEditorScrollTopRef.current = markdownTextareaRef.current?.scrollTop ?? mobileEditorScrollTopRef.current;
  }

  function restoreMobileScrollPosition(mode: MobileMode) {
    if (!isMobileViewport()) return;
    requestAnimationFrame(() => {
      if (mode === "preview") {
        if (previewPaneRef.current) previewPaneRef.current.scrollTop = mobilePreviewScrollTopRef.current;
        return;
      }
      if (markdownTextareaRef.current) markdownTextareaRef.current.scrollTop = mobileEditorScrollTopRef.current;
    });
  }

  function switchMobileMode(nextMode: MobileMode) {
    if (nextMode === mobileMode) return;
    saveMobileScrollPosition();
    setIsTemplatePickerOpen(false);
    setIsMobileSettingsOpen(false);
    setIsExportMenuOpen(false);

    if (nextMode === "preview") {
      updateActiveBlockFromEditorSelection({ scroll: false });
      setIsMobileEditorFocused(false);
      setIsMobileEditorToolbarVisible(false);
      markdownTextareaRef.current?.blur();
      setMobileMode("preview");
      restoreMobileScrollPosition("preview");
      return;
    }

    setMobileMode("editor");
    restoreMobileScrollPosition("editor");
  }

  function handleEditorSelectionChange() {
    updateActiveBlockFromEditorSelection();
  }

  function handlePreviewPaneScroll() {
    if (!isMobileViewport()) return;
    mobilePreviewScrollTopRef.current = previewPaneRef.current?.scrollTop ?? 0;
  }

  function handleEditorTextareaScroll() {
    if (!isMobileViewport()) return;
    mobileEditorScrollTopRef.current = markdownTextareaRef.current?.scrollTop ?? 0;
  }

  function handleMobileWorkspacePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!isMobileViewport() || event.pointerType === "mouse") return;
    workspaceGestureRef.current = {
      x: event.clientX,
      y: event.clientY,
      mode: mobileMode
    };
  }

  function handleMobileWorkspacePointerUp(event: React.PointerEvent<HTMLElement>) {
    const start = workspaceGestureRef.current;
    workspaceGestureRef.current = null;
    if (!start || !isMobileViewport()) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy) * 0.75) return;

    suppressNextWorkspaceClickRef.current = true;
    switchMobileMode(start.mode === "editor" ? "preview" : "editor");
  }

  function handleMobileWorkspacePointerCancel() {
    workspaceGestureRef.current = null;
  }

  function handleWorkspaceClickCapture(event: React.MouseEvent<HTMLElement>) {
    if (!suppressNextWorkspaceClickRef.current) return;
    suppressNextWorkspaceClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePreviewPaneClickCapture(event: React.MouseEvent<HTMLElement>) {
    if (!isMobileViewport() || mobileMode !== "editor") return;
    event.preventDefault();
    event.stopPropagation();
    switchMobileMode("preview");
  }

  function handleEditorPaneClickCapture(event: React.MouseEvent<HTMLElement>) {
    if (!isMobileViewport() || mobileMode !== "preview") return;
    event.preventDefault();
    event.stopPropagation();
    switchMobileMode("editor");
  }

  function syncPreviewToEditorBlock() {
    const textarea = markdownTextareaRef.current;
    if (!textarea) return;
    const block = findBlockAtOffset(blocks, textarea.selectionStart, markdown);
    if (!block) return;
    setActiveBlockId(null);
    scrollPreviewBlockIntoView(block.id);
  }

  function syncEditorToPreviewBlock() {
    if (!activeBlockId) return;
    focusEditorBlock(activeBlockId);
  }

  function handlePreviewBlockClick(blockId: string) {
    setActiveBlockId(blockId);
    if (isMobileViewport()) {
      flashPreviewBlock(blockId);
      return;
    }
    preserveActiveBlockOnEditorFocusRef.current = true;
    focusEditorBlock(blockId);
    flashPreviewBlock(blockId);
    setMobileMode("editor");
    setIsMobileSettingsOpen(false);
  }

  function handleEditorFocus() {
    if (isMobileViewport() && mobileMode === "editor") {
      setIsMobileEditorFocused(true);
    }
    if (preserveActiveBlockOnEditorFocusRef.current) {
      preserveActiveBlockOnEditorFocusRef.current = false;
      return;
    }
    updateActiveBlockFromEditorSelection();
  }

  function handleEditorBlur() {
    if (!isMobileViewport()) return;
    window.setTimeout(() => {
      if (document.activeElement !== markdownTextareaRef.current) {
        setIsMobileEditorFocused(false);
        setIsMobileEditorToolbarVisible(false);
      }
    }, 80);
  }

  function handleMarkdownToolbarPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!isMobileViewport()) return;
    event.preventDefault();
    markdownTextareaRef.current?.focus({ preventScroll: true });
  }

  function updateImageOptions(blockId: string, patch: Partial<ImageOptions>) {
    const block = blocks.find((item) => item.id === blockId);
    if (!block || block.type !== "image") return;
    const currentOptions = normalizeImageOptions(block.imageOptions);
    const nextOptions = normalizeImageOptions({ ...currentOptions, ...patch });
    const range = getBlockSourceRange(markdown, block);
    const replacement = setImageOptionsInRawImage(block.raw, nextOptions);
    pushUndoSnapshot(markdown);
    setMarkdown(`${markdown.slice(0, range.start)}${replacement}${markdown.slice(range.end)}`);
    setActiveBlockId(blockId);
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("rednote:layout-change"));
    });
  }

  function focusEditorBlock(blockId: string) {
    const textarea = markdownTextareaRef.current;
    const block = blocks.find((item) => item.id === blockId);
    if (!textarea || !block) return;
    const range = getBlockSourceRange(markdown, block);
    textarea.focus();
    textarea.setSelectionRange(range.start, range.end);
    textarea.scrollTop = getTextareaScrollTopForOffset(textarea, markdown, range.start);
  }

  function scrollPreviewBlockIntoView(blockId: string, options: { behavior?: ScrollBehavior; flash?: boolean } = {}) {
    const pane = previewPaneRef.current;
    if (!pane) return;
    const element = pane.querySelector<HTMLElement>(`[data-source-block-id="${blockId}"]`);
    if (!element) return;
    const paneRect = pane.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    pane.scrollTo({
      top: pane.scrollTop + elementRect.top - paneRect.top - pane.clientHeight * 0.28,
      behavior: options.behavior ?? "smooth"
    });
    if (options.flash ?? true) flashPreviewBlock(blockId);
  }

  function flashPreviewBlock(blockId: string) {
    const pane = previewPaneRef.current;
    if (!pane) return;
    pane.querySelectorAll(".is-sync-highlight").forEach((node) => node.classList.remove("is-sync-highlight"));
    pane.querySelectorAll<HTMLElement>(`[data-source-block-id="${blockId}"]`).forEach((node) => node.classList.add("is-sync-highlight"));
    if (highlightTimerRef.current != null) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      pane.querySelectorAll(".is-sync-highlight").forEach((node) => node.classList.remove("is-sync-highlight"));
      highlightTimerRef.current = null;
    }, 1200);
  }

  function replaceMarkdownSelection(next: string, selectionStart: number, selectionEnd: number) {
    pushUndoSnapshot(markdown);
    setMarkdown(next);
    requestAnimationFrame(() => {
      const textarea = markdownTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function applyInlineFormat(before: string, after = before, placeholder = "重点内容") {
    const textarea = markdownTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const format = getInlineFormat(before, after);
    const existing = findExistingInlineFormat(markdown, start, end);
    const hasSelection = end > start;
    const selected = hasSelection ? markdown.slice(start, end) : placeholder;
    const rangeStart = existing?.rangeStart ?? start;
    const rangeEnd = existing?.rangeEnd ?? end;
    const innerText = existing?.inner ?? selected;
    const cleanText = stripInlineFormatting(innerText) || placeholder;
    const isToggleOff = Boolean(existing && existing.kind === format.kind);
    const replacement = isToggleOff ? cleanText : wrapInlineText(cleanText, format);
    const next = `${markdown.slice(0, rangeStart)}${replacement}${markdown.slice(rangeEnd)}`;
    const nextStart = isToggleOff || replacement.includes("\n") ? rangeStart : rangeStart + format.before.length;
    const nextEnd = isToggleOff || replacement.includes("\n") ? rangeStart + replacement.length : rangeStart + format.before.length + cleanText.length;
    replaceMarkdownSelection(next, nextStart, nextEnd);
  }

  function applyLineFormat(formatter: (line: string, index: number) => string) {
    const textarea = markdownTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = markdown.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const effectiveEnd = end > start && markdown[end - 1] === "\n" ? end - 1 : end;
    const nextBreak = markdown.indexOf("\n", effectiveEnd);
    const lineEnd = nextBreak === -1 ? markdown.length : nextBreak;
    const selectedBlock = markdown.slice(lineStart, lineEnd);
    const formatted = selectedBlock
      .split("\n")
      .map((line, index) => formatter(line, index))
      .join("\n");
    const next = `${markdown.slice(0, lineStart)}${formatted}${markdown.slice(lineEnd)}`;
    replaceMarkdownSelection(next, lineStart, lineStart + formatted.length);
  }

  function applyHeading(level: HeadingLevel) {
    applyLineFormat((line) => {
      const content = line.replace(/^#{1,6}\s+/, "").trim() || "标题";
      return `${"#".repeat(level)} ${content}`;
    });
  }

  function applyQuote() {
    applyLineFormat((line) => `> ${line.replace(/^>\s?/, "") || "引用内容"}`);
  }

  function applyUnorderedList() {
    applyLineFormat((line) => `- ${line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "") || "列表项"}`);
  }

  function applyOrderedList() {
    applyLineFormat((line, index) => `${index + 1}. ${line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "") || "列表项"}`);
  }

  function applyCodeBlock() {
    const textarea = markdownTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.slice(start, end) || "const example = true;";
    const replacement = `\`\`\`text\n${selected}\n\`\`\``;
    replaceMarkdownSelection(
      `${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`,
      start + 8,
      start + 8 + selected.length
    );
  }

  function insertDivider() {
    const textarea = markdownTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prefix = start > 0 && markdown[start - 1] !== "\n" ? "\n\n" : "";
    const suffix = end < markdown.length && markdown[end] !== "\n" ? "\n\n" : "\n";
    const replacement = `${prefix}---${suffix}`;
    replaceMarkdownSelection(
      `${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`,
      start + replacement.length,
      start + replacement.length
    );
  }

  function openImagePicker() {
    const textarea = markdownTextareaRef.current;
    pendingImageSelectionRef.current = textarea
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : null;
    imageInputRef.current?.click();
  }

  function insertImageDataUrl(dataUrl: string, fileName: string) {
    const selection = pendingImageSelectionRef.current;
    const textarea = markdownTextareaRef.current;
    const start = selection?.start ?? textarea?.selectionStart ?? markdown.length;
    const end = selection?.end ?? textarea?.selectionEnd ?? start;
    const selectedAlt = markdown.slice(start, end).trim();
    const fallbackAlt = fileName.replace(/\.[^.]+$/, "").trim() || "图片";
    const alt = sanitizeMarkdownImageAlt(selectedAlt || fallbackAlt);
    let imageId: string;
    try {
      imageId = saveLocalImage(dataUrl, alt);
      setError((current) => (current === "图片内容太大，浏览器本地存储空间不足。" ? null : current));
    } catch {
      setError("图片内容太大，浏览器本地存储空间不足。");
      return;
    }
    const prefix = start > 0 && markdown[start - 1] !== "\n" ? "\n\n" : "";
    const suffix = end < markdown.length && markdown[end] !== "\n" ? "\n\n" : "\n";
    const replacement = `${prefix}![${alt}](${localImageUrlPrefix}${imageId}){${formatImageOptions({ size: "medium" })}}${suffix}`;
    const nextCursor = start + replacement.length;

    replaceMarkdownSelection(
      `${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`,
      nextCursor,
      nextCursor
    );
    pendingImageSelectionRef.current = null;
  }

  function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("图片读取失败。");
        return;
      }
      insertImageDataUrl(reader.result, file.name);
    };
    reader.onerror = () => setError("图片读取失败。");
    reader.readAsDataURL(file);
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;

    const key = event.key.toLowerCase();
    const code = event.code;
    const isKey = (value: string, physicalCode?: string) => key === value || Boolean(physicalCode && code === physicalCode);
    const run = (action: () => void) => {
      event.preventDefault();
      action();
    };

    if (key === "z" && event.shiftKey) run(redo);
    else if (key === "z") run(undo);
    else if (!event.shiftKey) return;
    else if (isKey("1", "Digit1") && canUseHeading(1)) run(() => applyHeading(1));
    else if (isKey("2", "Digit2") && canUseHeading(2)) run(() => applyHeading(2));
    else if (isKey("3", "Digit3") && canUseHeading(3)) run(() => applyHeading(3));
    else if (isKey("4", "Digit4") && canUseHeading(4)) run(() => applyHeading(4));
    else if (isKey("5", "Digit5") && canUseHeading(5)) run(() => applyHeading(5));
    else if (isKey("6", "Digit6") && canUseHeading(6)) run(() => applyHeading(6));
    else if (key === "b" && canUseInline("bold")) run(() => applyInlineFormat("**", "**", "加粗内容"));
    else if (key === "i" && canUseInline("italic")) run(() => applyInlineFormat("*", "*", "斜体内容"));
    else if (key === "u" && canUseInline("underline")) run(() => applyInlineFormat("<u>", "</u>", "下划线内容"));
    else if (key === "h" && canUseInline("highlight")) run(() => applyInlineFormat("==", "==", "高亮内容"));
    else if (key === "x" && canUseInline("strike")) run(() => applyInlineFormat("~~", "~~", "删除内容"));
    else if (key === "e" && canUseInline("code")) run(() => applyInlineFormat("`", "`", "inlineCode"));
    else if (key === "k" && canUseInline("link")) run(() => applyInlineFormat("[", "](https://example.com)", "链接文字"));
    else if (isKey(".", "Period") && canUseBlock("quote")) run(applyQuote);
    else if (isKey("7", "Digit7") && canUseBlock("list")) run(applyOrderedList);
    else if (isKey("8", "Digit8") && canUseBlock("list")) run(applyUnorderedList);
    else if (key === "c" && canUseBlock("code")) run(applyCodeBlock);
    else if (isKey("-", "Minus") && canUseBlock("divider")) run(insertDivider);
    else if (key === "p" && canUseBlock("image")) run(openImagePicker);
  }

  function undo() {
    const [previous, ...rest] = undoStack;
    if (!previous) return;
    setRedoStack((items) => [markdown, ...items].slice(0, 50));
    setMarkdown(previous);
    setUndoStack(rest);
  }

  function redo() {
    const [next, ...rest] = redoStack;
    if (!next) return;
    setUndoStack((items) => [markdown, ...items].slice(0, 50));
    setMarkdown(next);
    setRedoStack(rest);
  }

  function resetToTemplateContent() {
    const contentTemplate = getTemplateContentTemplate(template);
    if (markdown === contentTemplate) return;
    if (!window.confirm("将当前内容恢复为当前模板的默认内容模板？此操作可以撤销。")) return;

    pushUndoSnapshot(markdown);
    setMarkdown(contentTemplate);
    setActiveBlockId(null);
    setError(null);
    pendingImageSelectionRef.current = null;

    requestAnimationFrame(() => {
      markdownTextareaRef.current?.focus();
      markdownTextareaRef.current?.setSelectionRange(0, 0);
      if (markdownTextareaRef.current) markdownTextareaRef.current.scrollTop = 0;
      if (previewPaneRef.current) previewPaneRef.current.scrollTop = 0;
    });
  }

  async function renderExportFiles() {
    if (!canvasRef.current) return [];
    await document.fonts.ready;
    const cards = Array.from(canvasRef.current.querySelectorAll<HTMLElement>(".preview-page-card"));
    const files: ZipFile[] = [];
    for (let page = 0; page < cards.length; page += 1) {
      const card = cards[page];
      const sourceWidth = card.offsetWidth || previewDesignWidthPx;
      const sourceHeight = card.offsetHeight || pageHeightPx || card.scrollHeight;
      const scale = dimensions.width / sourceWidth;
      const exportHeight = isFullRatio ? Math.ceil(sourceHeight * scale) : dimensions.height;
      const exportCornerRadii = getExportCornerRadii(card, scale);
      const cardStyle = getComputedStyle(card);
      card.classList.add("is-exporting");
      let dataUrl: string;
      try {
        dataUrl = await domtoimage.toPng(card, {
          width: dimensions.width,
          height: exportHeight,
          bgcolor: "transparent",
          style: {
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${sourceWidth}px`,
            height: `${sourceHeight}px`,
            background: cardStyle.background,
            backgroundColor: cardStyle.backgroundColor,
            backgroundImage: cardStyle.backgroundImage,
            backgroundPosition: cardStyle.backgroundPosition,
            backgroundRepeat: cardStyle.backgroundRepeat,
            backgroundSize: cardStyle.backgroundSize,
            borderColor: cardStyle.borderColor,
            borderRadius: cardStyle.borderRadius,
            borderStyle: cardStyle.borderStyle,
            borderWidth: cardStyle.borderWidth,
            overflow: "hidden",
            boxShadow: "none"
          }
        });
        dataUrl = await maskPngCorners(dataUrl, dimensions.width, exportHeight, exportCornerRadii);
      } finally {
        card.classList.remove("is-exporting");
      }
      files.push({
        name: `rednote-page-${String(page + 1).padStart(2, "0")}.png`,
        data: dataUrlToBytes(dataUrl)
      });
    }
    return files;
  }

  async function exportImages(mode: "images" | "zip") {
    setBusy("export");
    setError(null);
    setIsExportMenuOpen(false);
    try {
      const files = await renderExportFiles();
      if (!files.length) return;
      if (mode === "images") {
        for (const file of files) {
          downloadBlob(new Blob([file.data], { type: "image/png" }), file.name);
        }
        return;
      }
      downloadBlob(createZipBlob(files), `rednote-${templateId}-${ratio.replace(":", "x")}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={isMobileEditorToolbarVisible ? "app-shell is-mobile-editor-toolbar-visible" : "app-shell"}>
      <header className="topbar">
        <div className="brand" aria-label="Rednote Markdown Studio">
          <FileText size={20} aria-hidden="true" />
          <span>Rednote Markdown Studio</span>
        </div>
        <div className="topbar-actions">
          <select className="desktop-topbar-control" value={ratio} onChange={(event) => setRatio(event.target.value as RatioId)} aria-label="选择导出画布比例">
            <option value="9:16">9:16 · 1080×1920</option>
            <option value="3:4">3:4 · 1080×1440</option>
            <option value="1:1">1:1 · 1080×1080</option>
            <option value="full">全文长图 · 1080×自适应</option>
          </select>
          <button className="desktop-topbar-control" type="button" onClick={resetToTemplateContent} title="恢复当前模板的默认内容模板">
            <RotateCcw size={15} />
            恢复模板内容
          </button>
          <div className="mobile-template-picker" ref={mobileTemplatePickerRef}>
            <button
              type="button"
              className={isTemplatePickerOpen ? "mobile-template-button is-open" : "mobile-template-button"}
              onClick={() => {
                setIsTemplatePickerOpen((open) => !open);
                setIsMobileSettingsOpen(false);
                setIsExportMenuOpen(false);
              }}
              aria-haspopup="dialog"
              aria-expanded={isTemplatePickerOpen}
              aria-label="选择模板"
              title="模板"
            >
              模板
              <ChevronDown size={15} />
            </button>
            {isTemplatePickerOpen && (
              <div className="template-menu mobile-template-menu" role="dialog" aria-label="选择模板">
                <div className="mobile-template-list">
                  {templateList.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={item.id === templateId ? "is-active" : ""}
                      style={{ "--template-accent": templateAccentMap[item.id] || "#d39a1a" } as React.CSSProperties}
                      aria-pressed={item.id === templateId}
                      onClick={() => {
                        setTemplateId(item.id);
                        setMobileMode("preview");
                        setIsTemplatePickerOpen(false);
                      }}
                    >
                      <span className="template-menu-accent" aria-hidden="true" />
                      <strong>{item.name}</strong>
                      {item.id === templateId && <em>当前</em>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="mobile-settings-button"
            onClick={() => {
              setIsMobileSettingsOpen((open) => !open);
              setIsTemplatePickerOpen(false);
              setIsExportMenuOpen(false);
            }}
            aria-expanded={isMobileSettingsOpen}
            aria-haspopup="dialog"
            aria-label="打开设置菜单"
            title="设置"
          >
            <SlidersHorizontal size={16} />
            设置
          </button>
          {isMobileSettingsOpen && (
            <div className="mobile-settings-menu" ref={mobileSettingsRef} role="dialog" aria-label="移动端设置菜单">
              <div className="mobile-settings-field">
                <span>导出比例</span>
                <div className="mobile-ratio-options" role="group" aria-label="导出比例">
                  {([
                    ["9:16", "9:16"],
                    ["3:4", "3:4"],
                    ["1:1", "1:1"],
                    ["full", "长图"]
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={ratio === value ? "is-active" : ""}
                      aria-pressed={ratio === value}
                      onClick={() => setRatio(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mobile-setting-stepper" role="group" aria-label="预览字号">
                <span>字号</span>
                <button type="button" onClick={() => setFontScale((value) => Math.max(0.82, Number((value - 0.06).toFixed(2))))} aria-label="减小预览字体">-</button>
                <strong>{Math.round(fontScale * 100)}%</strong>
                <button type="button" onClick={() => setFontScale((value) => Math.min(1.28, Number((value + 0.06).toFixed(2))))} aria-label="增大预览字体">+</button>
              </div>

              <div className="mobile-setting-stepper" role="group" aria-label="页边距">
                <span>边距</span>
                <button type="button" onClick={() => setPagePadding((value) => Math.max(0, value - 4))} aria-label="减小页边距">-</button>
                <strong>{pagePadding}px</strong>
                <button type="button" onClick={() => setPagePadding((value) => Math.min(80, value + 4))} aria-label="增大页边距">+</button>
              </div>

              <button type="button" className="mobile-menu-action" onClick={resetToTemplateContent}>
                <RotateCcw size={15} />
                恢复模板内容
              </button>
            </div>
          )}
        </div>
      </header>

      <div
        ref={measureRef}
        className={`pagination-measurer ${template.canvasClassName}`}
        style={{
          "--preview-design-width": `${previewDesignWidthPx}px`,
          "--preview-font-scale": fontScale,
          "--page-padding": `${pagePadding}px`
        } as React.CSSProperties}
      />

      <main
        className={`workspace mobile-mode-${mobileMode}`}
        onPointerDown={handleMobileWorkspacePointerDown}
        onPointerUp={handleMobileWorkspacePointerUp}
        onPointerCancel={handleMobileWorkspacePointerCancel}
        onClickCapture={handleWorkspaceClickCapture}
      >
        <section
          className="preview-pane"
          ref={previewPaneRef}
          aria-label="图片预览"
          onClickCapture={handlePreviewPaneClickCapture}
          onScroll={handlePreviewPaneScroll}
        >
          <div className="preview-toolbar">
            <div className="template-picker preview-template-picker" ref={templatePickerRef}>
              <button
                type="button"
                className={isTemplatePickerOpen ? "is-open" : ""}
                onClick={() => {
                  setIsTemplatePickerOpen((open) => !open);
                  setIsExportMenuOpen(false);
                }}
                aria-haspopup="dialog"
                aria-expanded={isTemplatePickerOpen}
                aria-label="选择模板"
                title="选择模板"
              >
                <span className="template-picker-label">
                  <strong>模板</strong>
                </span>
                <ChevronDown size={16} />
              </button>
              {isTemplatePickerOpen && (
                <div className="template-menu template-simple-menu" role="dialog" aria-label="选择模板">
                  <div className="template-menu-list">
                    {templateList.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={item.id === templateId ? "is-active" : ""}
                        style={{ "--template-accent": templateAccentMap[item.id] || "#d39a1a" } as React.CSSProperties}
                        aria-current={item.id === templateId ? "true" : undefined}
                        onClick={() => {
                          setTemplateId(item.id);
                          setIsTemplatePickerOpen(false);
                        }}
                      >
                        <span className="template-menu-accent" aria-hidden="true" />
                        <span className="template-menu-copy">
                          <strong>{item.name}</strong>
                        </span>
                        {item.id === templateId && <em>当前</em>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <PanelBar
              title="预览调整"
              fontScale={fontScale}
              pagePadding={pagePadding}
              onDecreaseFont={() => setFontScale((value) => Math.max(0.82, Number((value - 0.06).toFixed(2))))}
              onIncreaseFont={() => setFontScale((value) => Math.min(1.28, Number((value + 0.06).toFixed(2))))}
              onDecreasePadding={() => setPagePadding((value) => Math.max(0, value - 4))}
              onIncreasePadding={() => setPagePadding((value) => Math.min(80, value + 4))}
            />
            <div className="export-control" ref={desktopExportRef}>
              <button
                type="button"
                className="preview-export-button"
                onClick={() => {
                  setIsExportMenuOpen((open) => !open);
                  setIsTemplatePickerOpen(false);
                  setIsMobileSettingsOpen(false);
                }}
                disabled={busy === "export"}
                title="导出"
                aria-label={busy === "export" ? "导出中" : "打开导出菜单"}
                aria-haspopup="menu"
                aria-expanded={isExportMenuOpen}
              >
                <Download size={16} />
              </button>
              {isExportMenuOpen && (
                <ExportMenu
                  onDownloadImages={() => exportImages("images")}
                  onDownloadZip={() => exportImages("zip")}
                />
              )}
            </div>
          </div>
          <div className="mobile-preview-actions" ref={mobileExportRef}>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setIsExportMenuOpen((open) => !open);
                setIsTemplatePickerOpen(false);
                setIsMobileSettingsOpen(false);
              }}
              disabled={busy === "export"}
              title={busy === "export" ? "导出中" : "导出"}
              aria-label={busy === "export" ? "导出中" : "打开导出菜单"}
              aria-haspopup="menu"
              aria-expanded={isExportMenuOpen}
            >
              <Download size={16} />
            </button>
            {isExportMenuOpen && (
              <ExportMenu
                onDownloadImages={() => exportImages("images")}
                onDownloadZip={() => exportImages("zip")}
              />
            )}
          </div>
          <div
            className="phone-frame"
            ref={phoneFrameRef}
            style={{
              "--preview-design-width": `${previewDesignWidthPx}px`,
              "--preview-scale": previewScale,
              "--preview-frame-height": previewFrameHeight > 0 ? `${previewFrameHeight}px` : undefined
            } as React.CSSProperties}
          >
            <div
              ref={canvasRef}
              className={isFullRatio ? "phone-canvas phone-canvas-full" : "phone-canvas"}
            >
              <div className="preview-pages">
                {pages.map((page, pageIndex) => (
                  <div
                    className={`preview-page-card ${isFullRatio ? "preview-page-card-full" : ""} ${template.canvasClassName}`}
                    data-page-index={pageIndex}
                    key={pageIndex}
                    style={{
                      height: !isFullRatio && pageHeightPx > 0 ? `${pageHeightPx}px` : undefined,
                      "--preview-font-scale": fontScale,
                      "--page-padding": `${pagePadding}px`
                    } as React.CSSProperties}
                  >
                    {template.renderPageChrome?.({ pageIndex, totalPages: pages.length, isFullRatio })}
                    <div className="preview-page-content">
                      <RenderedPage template={template} units={page} activeBlockId={activeBlockId} onSelectBlock={handlePreviewBlockClick} />
                    </div>
                    {pageNumber.enabled && !isFullRatio && (
                      <PageNumberOverlay config={pageNumber} pageIndex={pageIndex} totalPages={pages.length} />
                    )}
                  </div>
                ))}
              </div>
              {activeImageBlock && floatingImageControls && busy !== "export" && (
                <div
                  className="preview-image-controls"
                  style={{ top: floatingImageControls.top, left: floatingImageControls.left }}
                >
                  <ImageOptionsPanel
                    options={normalizeImageOptions(activeImageBlock.imageOptions)}
                    onChange={(patch) => updateImageOptions(activeImageBlock.id, patch)}
                  />
                </div>
              )}
            </div>
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}
        </section>

        <div className="sync-rail" aria-label="内容映射">
          <button type="button" onClick={syncPreviewToEditorBlock} title="定位预览到当前编辑内容" aria-label="定位预览到当前编辑内容">↤</button>
          <span>{activeBlockId ? "已定位" : "同步"}</span>
          <button type="button" onClick={syncEditorToPreviewBlock} disabled={!activeBlockId} title="定位编辑器到当前预览内容" aria-label="定位编辑器到当前预览内容">↦</button>
        </div>

        <button
          type="button"
          className="mobile-page-switch mobile-page-switch-to-preview"
          onClick={() => switchMobileMode("preview")}
          aria-label="切换到预览页"
          title="预览"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="mobile-page-switch mobile-page-switch-to-editor"
          onClick={() => switchMobileMode("editor")}
          aria-label="切换到编辑页"
          title="编辑"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <section className="editor-pane" aria-label="Markdown 编辑器" onClickCapture={handleEditorPaneClickCapture}>
          <MarkdownToolbar
            template={template}
            undo={undo}
            redo={redo}
            canUndo={Boolean(undoStack.length)}
            canRedo={Boolean(redoStack.length)}
            onHeading1={() => applyHeading(1)}
            onHeading2={() => applyHeading(2)}
            onHeading3={() => applyHeading(3)}
            onHeading4={() => applyHeading(4)}
            onHeading5={() => applyHeading(5)}
            onHeading6={() => applyHeading(6)}
            onBold={() => applyInlineFormat("**", "**", "加粗内容")}
            onHighlight={() => applyInlineFormat("==", "==", "高亮内容")}
            onItalic={() => applyInlineFormat("*", "*", "斜体内容")}
            onStrike={() => applyInlineFormat("~~", "~~", "删除内容")}
            onUnderline={() => applyInlineFormat("<u>", "</u>", "下划线内容")}
            onInlineCode={() => applyInlineFormat("`", "`", "inlineCode")}
            onLink={() => applyInlineFormat("[", "](https://example.com)", "链接文字")}
            onQuote={applyQuote}
            onOrderedList={applyOrderedList}
            onUnorderedList={applyUnorderedList}
            onCodeBlock={applyCodeBlock}
            onDivider={insertDivider}
            onImage={openImagePicker}
            onPointerDown={handleMarkdownToolbarPointerDown}
          />
          <input
            ref={imageInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            tabIndex={-1}
            aria-hidden="true"
          />
          <textarea
            ref={markdownTextareaRef}
            value={markdown}
            onChange={(event) => handleMarkdownChange(event.target.value, event.target.selectionStart)}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={handleEditorSelectionChange}
            onClick={handleEditorSelectionChange}
            onSelect={handleEditorSelectionChange}
            onFocus={handleEditorFocus}
            onBlur={handleEditorBlur}
            onScroll={handleEditorTextareaScroll}
            spellCheck={false}
            aria-label="Markdown 内容"
          />
        </section>

      </main>
    </div>
  );
}

function PageNumberOverlay({
  config,
  pageIndex,
  totalPages
}: {
  config: PageNumberConfig;
  pageIndex: number;
  totalPages: number;
}) {
  const current = pageIndex + 1;
  const text = config.format === "current-total" ? `${current}/${totalPages}` : String(current);
  const className = [
    "page-number",
    `page-number-${config.position}`,
    `page-number-${config.style}`
  ].join(" ");

  return (
    <div className={className} aria-label={`第 ${current} 页，共 ${totalPages} 页`}>
      {text}
    </div>
  );
}

function makeFlowUnits(blocks: MarkdownBlock[]): FlowUnit[] {
  return blocks.flatMap((block) => {
    if (block.type === "list") {
      return (block.items?.length ? block.items : [block.text]).map((item, index) => ({
        id: `${block.id}-item-${index}`,
        block,
        text: item,
        itemIndex: index,
        splittable: true
      }));
    }

    return [{
      id: block.id,
      block,
      text: block.type === "spacer" ? "" : block.text,
      splittable: block.type === "paragraph" || block.type === "quote"
    }];
  });
}

function findBlockAtOffset(blocks: MarkdownBlock[], offset: number, source: string) {
  return blocks.find((block) => {
    const range = getBlockSourceRange(source, block);
    return offset >= range.start && offset <= range.end;
  }) || blocks[blocks.length - 1] || null;
}

function getBlockSourceRange(source: string, block: MarkdownBlock) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let start = 0;
  for (let index = 0; index < block.startLine; index += 1) {
    start += (lines[index]?.length || 0) + 1;
  }
  let end = start;
  for (let index = block.startLine; index <= block.endLine; index += 1) {
    end += lines[index]?.length || 0;
    if (index < block.endLine) end += 1;
  }
  return { start, end };
}

function getTextareaScrollTopForOffset(textarea: HTMLTextAreaElement, source: string, offset: number) {
  const style = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");
  const mirrorStyleProps = [
    "boxSizing",
    "width",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "fontVariant",
    "fontStretch",
    "lineHeight",
    "letterSpacing",
    "textTransform",
    "textIndent",
    "tabSize"
  ] as const;

  mirrorStyleProps.forEach((prop) => {
    mirror.style[prop] = style[prop];
  });

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.wordBreak = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.height = "auto";
  mirror.style.minHeight = "0";
  mirror.style.maxHeight = "none";
  mirror.style.overflow = "hidden";

  mirror.textContent = source.slice(0, offset);
  marker.textContent = source[offset] || "\u200b";
  mirror.append(marker);
  document.body.append(mirror);

  const markerTop = marker.offsetTop;
  const markerHeight = marker.offsetHeight || Number.parseFloat(style.lineHeight) || 24;
  mirror.remove();

  const target = markerTop + markerHeight * 0.5 - textarea.clientHeight * 0.35;
  const maxScrollTop = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
  return Math.max(0, Math.min(target, maxScrollTop));
}

function paginateByProbe(
  units: FlowUnit[],
  probeRoot: HTMLElement,
  pageHeight: number,
  pagePadding: number,
  template: TemplateDefinition,
  fontScale: number
): PageUnit[][] {
  if (!units.length) return [[]];
  if (!pageHeight) return [units];

  const host = prepareProbeHost(probeRoot, pageHeight, pagePadding, template.canvasClassName, fontScale);
  const root = createRoot(host);
  const pages: PageUnit[][] = [];
  let current: PageUnit[] = [];
  const queue = [...units];

  const renderFits = (candidate: PageUnit[]) => {
    flushSync(() => root.render(<RenderedPage template={template} units={candidate} />));
    return pageContentFits(host, pagePadding);
  };

  while (queue.length) {
    const unit = queue.shift()!;
    const candidate = [...current, unit];
    if (renderFits(candidate)) {
      current = candidate;
      continue;
    }

    if (unit.splittable) {
      const split = splitTextToFit(unit, current, renderFits);
      if (split.prefix) {
        current = [...current, split.prefix];
        if (split.remainder) queue.unshift(split.remainder);
        continue;
      }
    }

    if (current.length) {
      pages.push(current);
      current = [];
      queue.unshift(unit);
      continue;
    }

    pages.push([unit]);
  }

  if (current.length || !pages.length) pages.push(current);
  flushSync(() => root.unmount());
  probeRoot.replaceChildren();
  return pages;
}

function prepareProbeHost(probeRoot: HTMLElement, pageHeight: number, pagePadding: number, canvasClassName: string, fontScale: number) {
  probeRoot.replaceChildren();
  probeRoot.className = `pagination-measurer ${canvasClassName}`;
  probeRoot.style.setProperty("--preview-font-scale", String(fontScale));
  probeRoot.style.setProperty("--page-padding", `${pagePadding}px`);

  const card = document.createElement("div");
  card.className = `preview-page-card ${canvasClassName}`;
  card.style.height = `${pageHeight}px`;
  const content = document.createElement("div");
  content.className = "preview-page-content";
  card.appendChild(content);
  probeRoot.appendChild(card);
  return content;
}

function splitTextToFit(unit: FlowUnit, current: PageUnit[], fits: (candidate: PageUnit[]) => boolean) {
  const plainLength = countPlainText(unit.text);
  let low = 0;
  let high = plainLength;
  let best = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (middle <= 0) {
      low = middle + 1;
      continue;
    }

    const prefix = makeTextSlice(unit, 0, middle);
    if (fits([...current, prefix])) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  if (best <= 0 && plainLength > 0) {
    for (let index = 1; index <= plainLength; index += 1) {
      const prefix = makeTextSlice(unit, 0, index);
      if (!fits([...current, prefix])) break;
      best = index;
    }
  }

  if (best <= 0) return { prefix: null, remainder: unit };

  const prefix = {
    ...makeTextSlice(unit, 0, best),
    continuesOnNext: true
  };
  const remainderText = sliceInlineMarkdown(unit.text, best, plainLength).trimStart();
  const remainder = remainderText
    ? {
        ...unit,
        id: `${unit.id}-rest-${best}`,
        text: remainderText,
        continuedFromPrevious: true,
        continuesOnNext: false,
        listContinuation: unit.block.type === "list" || unit.listContinuation
      }
    : null;
  return { prefix, remainder };
}

function makeTextSlice(unit: FlowUnit, start: number, end: number): FlowUnit {
  return {
    ...unit,
    id: `${unit.id}-slice-${start}-${end}`,
    continuedFromPrevious: start > 0 || unit.continuedFromPrevious,
    continuesOnNext: end < countPlainText(unit.text),
    text: sliceInlineMarkdown(unit.text, start, end).trimEnd()
  };
}

function pageContentFits(host: HTMLElement, pagePadding: number) {
  const last = getLastMeasuredContent(host);
  if (!last) return true;

  const hostRect = host.getBoundingClientRect();
  const bottomLimit = hostRect.bottom - pagePadding - textClipBuffer;
  return last.getBoundingClientRect().bottom <= bottomLimit;
}

function getLastMeasuredContent(host: HTMLElement) {
  const units = Array.from(host.querySelectorAll<HTMLElement>("[data-flow-unit-id]"));
  const lastUnit = units[units.length - 1];
  if (!lastUnit) return null;
  const isTextContinuation = lastUnit.classList.contains("continues-on-next") || lastUnit.classList.contains("continued-from-previous");
  if (isTextContinuation || lastUnit.classList.contains("block-paragraph")) {
    return lastUnit.querySelector<HTMLElement>(".markdown-text") || lastUnit;
  }
  return lastUnit;
}

function countPlainText(markdown: string) {
  return stripInlineMarkers(markdown).length;
}

function stripInlineMarkers(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/g, "$1")
    .replace(/<\/?u>|(\*\*|==|~~|`|\*)/g, "");
}

function sliceInlineMarkdown(markdown: string, start: number, end: number) {
  const tokens = ["</u>", "<u>", "**", "==", "~~", "*"];
  const closeToken: Record<string, string> = {
    "**": "**",
    "==": "==",
    "~~": "~~",
    "<u>": "</u>",
    "*": "*"
  };
  const active: string[] = [];
  let plainIndex = 0;
  let output = "";
  let started = false;

  const startOutput = () => {
    if (started) return;
    output += active.join("");
    started = true;
  };

  for (let index = 0; index < markdown.length && plainIndex < end; ) {
    const token = tokens.find((candidate) => markdown.startsWith(candidate, index));
    if (token) {
      if (plainIndex >= start && plainIndex < end) {
        startOutput();
        output += token;
      }
      if (token === "</u>") {
        const activeIndex = active.lastIndexOf("<u>");
        if (activeIndex !== -1) active.splice(activeIndex, 1);
      } else if (active.includes(token)) {
        active.splice(active.lastIndexOf(token), 1);
      } else {
        active.push(token);
      }
      index += token.length;
      continue;
    }

    if (plainIndex >= start && plainIndex < end) {
      startOutput();
      output += markdown[index];
    }
    plainIndex += 1;
    index += 1;
  }

  if (!started) return "";
  output += active.slice().reverse().map((token) => closeToken[token]).join("");
  return output;
}

function arePagesEqual(a: PageUnit[][], b: PageUnit[][]) {
  if (a.length !== b.length) return false;
  for (let pageIndex = 0; pageIndex < a.length; pageIndex += 1) {
    if (a[pageIndex].length !== b[pageIndex].length) return false;
    for (let unitIndex = 0; unitIndex < a[pageIndex].length; unitIndex += 1) {
      if (getPageUnitKey(a[pageIndex][unitIndex]) !== getPageUnitKey(b[pageIndex][unitIndex])) return false;
    }
  }
  return true;
}

function getPageUnitKey(unit: PageUnit) {
  return `${unit.id}:${unit.text}`;
}

function toTemplateRenderUnit(unit: PageUnit): TemplateRenderUnit {
  return {
    id: unit.id,
    block: unit.block,
    text: unit.text,
    continuedFromPrevious: unit.continuedFromPrevious,
    continuesOnNext: unit.continuesOnNext,
    itemIndex: unit.itemIndex,
    listContinuation: unit.listContinuation
  };
}

function getBlockTypeLabel(type: MarkdownBlock["type"]) {
  switch (type) {
    case "heading":
      return "标题";
    case "paragraph":
      return "段落";
    case "list":
      return "列表";
    case "quote":
      return "引用";
    case "code":
      return "代码块";
    case "divider":
      return "分隔线";
    case "image":
      return "图片";
    case "spacer":
      return "空行";
    default:
      return "内容块";
  }
}

function getSelectableBlockProps(block: MarkdownBlock, onSelectBlock?: (blockId: string) => void): React.HTMLAttributes<HTMLElement> {
  if (!onSelectBlock) return {};

  return {
    role: "button",
    tabIndex: 0,
    "aria-label": `选择${getBlockTypeLabel(block.type)}对应的 Markdown 内容`,
    onKeyDown: (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelectBlock(block.id);
    }
  };
}

function RenderedPage({
  template,
  units,
  activeBlockId,
  onSelectBlock
}: {
  template: TemplateDefinition;
  units: PageUnit[];
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
}) {
  const rendered = groupListUnits(units);

  function handlePageClickCapture(event: React.MouseEvent<HTMLElement>) {
    if (!onSelectBlock) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const blockElement = target.closest<HTMLElement>("[data-source-block-id]");
    if (!blockElement || !event.currentTarget.contains(blockElement)) return;

    const blockId = blockElement.dataset.sourceBlockId;
    if (!blockId) return;

    // In preview mode, clicking inline links should still select the source block
    // instead of navigating away and skipping editor sync.
    if (target.closest("a")) {
      event.preventDefault();
    }

    event.stopPropagation();
    onSelectBlock(blockId);
  }

  return (
    <article className="rendered-document" onClickCapture={handlePageClickCapture}>
      {rendered.map((item) => (
        item.kind === "listGroup"
          ? <RenderedListGroup key={item.units.map((unit) => unit.id).join("|")} template={template} units={item.units} activeBlockId={activeBlockId} onSelectBlock={onSelectBlock} />
          : <RenderedUnit key={item.unit.id} template={template} unit={item.unit} activeBlockId={activeBlockId} onSelectBlock={onSelectBlock} />
      ))}
    </article>
  );
}

function groupListUnits(units: PageUnit[]) {
  const result: Array<{ kind: "unit"; unit: PageUnit } | { kind: "listGroup"; units: PageUnit[] }> = [];

  for (const unit of units) {
    if (unit.block.type !== "list") {
      result.push({ kind: "unit", unit });
      continue;
    }

    const last = result[result.length - 1];
    if (last?.kind === "listGroup" && last.units[0]?.block.id === unit.block.id) {
      last.units.push(unit);
    } else {
      result.push({ kind: "listGroup", units: [unit] });
    }
  }

  return result;
}

function RenderedUnit({
  template,
  unit,
  activeBlockId,
  onSelectBlock
}: {
  template: TemplateDefinition;
  unit: PageUnit;
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
}) {
  const { block } = unit;
  if (block.type !== "list") {
    const customRenderer = template.renderers?.unit?.[block.type];
    if (customRenderer) return <>{customRenderer({ unit: toTemplateRenderUnit(unit), activeBlockId, onSelectBlock })}</>;
  }
  if (block.type === "code" && block.lang === "html") return <HtmlBlock block={block} activeBlockId={activeBlockId} onSelectBlock={onSelectBlock} />;
  if (block.type === "code") return <CodeBlock block={block} activeBlockId={activeBlockId} onSelectBlock={onSelectBlock} />;
  if (block.type === "image") return <ImageBlock block={block} activeBlockId={activeBlockId} onSelectBlock={onSelectBlock} />;
  if (block.type === "divider") return <hr className={block.id === activeBlockId ? "section-divider is-sync-active" : "section-divider"} data-flow-unit-id={unit.id} data-source-block-id={block.id} onClick={() => onSelectBlock?.(block.id)} {...getSelectableBlockProps(block, onSelectBlock)} />;
  if (block.type === "spacer") return <div className={block.id === activeBlockId ? "block block-spacer is-sync-active" : "block block-spacer"} data-flow-unit-id={unit.id} data-source-block-id={block.id} onClick={() => onSelectBlock?.(block.id)} {...getSelectableBlockProps(block, onSelectBlock)} />;

  const className = [
    "block",
    `block-${block.type}`,
    block.type === "heading" ? `heading-level-${Math.min(block.level || 2, 6)}` : "",
    block.type === "list" && block.ordered ? "ordered-list" : "",
    unit.continuedFromPrevious ? "continued-from-previous" : "",
    unit.continuesOnNext ? "continues-on-next" : "",
    block.id === activeBlockId ? "is-sync-active" : "",
    onSelectBlock ? "is-sync-target" : "",
    block.variant || ""
  ].filter(Boolean).join(" ");

  return (
    <div className={className} data-flow-unit-id={unit.id} data-source-block-id={block.id} onClick={() => onSelectBlock?.(block.id)} {...getSelectableBlockProps(block, onSelectBlock)}>
      <div className={`markdown-text ${unit.text.trim() ? "" : "spacer-line"}`}>
        {unit.text.trim() ? <InlineText text={unit.text} /> : "\u00a0"}
      </div>
    </div>
  );
}

function RenderedListGroup({
  template,
  units,
  activeBlockId,
  onSelectBlock
}: {
  template: TemplateDefinition;
  units: PageUnit[];
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
}) {
  const customRenderer = template.renderers?.listGroup;
  if (customRenderer) return <>{customRenderer({ units: units.map(toTemplateRenderUnit), activeBlockId, onSelectBlock })}</>;
  const block = units[0].block;
  const first = units[0];
  const last = units[units.length - 1];
  const className = [
    "block",
    "block-list",
    block.ordered ? "ordered-list" : "",
    first.continuedFromPrevious ? "continued-from-previous" : "",
    last.continuesOnNext ? "continues-on-next" : "",
    block.id === activeBlockId ? "is-sync-active" : "",
    onSelectBlock ? "is-sync-target" : "",
    block.variant || ""
  ].filter(Boolean).join(" ");

  return (
    <div className={className} data-source-block-id={block.id} onClick={() => onSelectBlock?.(block.id)} {...getSelectableBlockProps(block, onSelectBlock)}>
      {units.map((unit) => (
        <div
          key={unit.id}
          className={`list-row ${block.ordered ? "ordered" : "unordered"} ${unit.listContinuation ? "list-continuation" : ""} ${unit.continuedFromPrevious ? "continued-from-previous" : ""} ${unit.continuesOnNext ? "continues-on-next" : ""}`}
          data-flow-unit-id={unit.id}
        >
          <span className="list-marker" data-list-index={String((unit.itemIndex ?? 0) + 1)}>
            {block.ordered ? `${(unit.itemIndex ?? 0) + 1}` : ""}
          </span>
          <div className="markdown-text">
            <InlineText text={unit.text} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InlineText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const pattern = /(`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|==([^=]+)==|~~([^~]+)~~|<u>([\s\S]*?)<\/u>|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const key = `${match.index}-${match[0]}`;
    if (match[2]) {
      parts.push(<code key={key}>{match[2]}</code>);
    } else if (match[3] && match[4]) {
      parts.push(<a key={key} href={match[4]} target="_blank" rel="noreferrer">{match[3]}</a>);
    } else if (match[5]) {
      parts.push(<strong key={key}>{match[5]}</strong>);
    } else if (match[6]) {
      parts.push(<mark key={key}>{match[6]}</mark>);
    } else if (match[7]) {
      parts.push(<s key={key}>{match[7]}</s>);
    } else if (match[8]) {
      parts.push(<u key={key}>{match[8]}</u>);
    } else if (match[9]) {
      parts.push(<em key={key}>{match[9]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length ? parts : text}</>;
}

function MarkdownToolbar({
  template,
  undo,
  redo,
  canUndo,
  canRedo,
  onHeading1,
  onHeading2,
  onHeading3,
  onHeading4,
  onHeading5,
  onHeading6,
  onBold,
  onHighlight,
  onItalic,
  onStrike,
  onUnderline,
  onInlineCode,
  onLink,
  onQuote,
  onOrderedList,
  onUnorderedList,
  onCodeBlock,
  onDivider,
  onImage,
  onPointerDown
}: {
  template: TemplateDefinition;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onHeading1: () => void;
  onHeading2: () => void;
  onHeading3: () => void;
  onHeading4: () => void;
  onHeading5: () => void;
  onHeading6: () => void;
  onBold: () => void;
  onHighlight: () => void;
  onItalic: () => void;
  onStrike: () => void;
  onUnderline: () => void;
  onInlineCode: () => void;
  onLink: () => void;
  onQuote: () => void;
  onOrderedList: () => void;
  onUnorderedList: () => void;
  onCodeBlock: () => void;
  onDivider: () => void;
  onImage: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const hasHeadingTools = [1, 2, 3, 4, 5, 6].some((level) => templateSupportsHeadingLevel(template, level as HeadingLevel));
  const hasInlineTools = ["bold", "highlight", "italic", "strike", "underline", "code", "link"].some((format) => (
    templateSupportsInlineFormat(template, format as InlineFormatKind)
  ));
  const hasBlockTools = ["quote", "list", "code", "divider", "image"].some((blockType) => (
    templateSupportsBlock(template, blockType as MarkdownBlock["type"])
  ));

  return (
    <div className="markdown-toolbar" aria-label="Markdown 格式工具栏" onPointerDown={onPointerDown}>
      {templateSupportsHeadingLevel(template, 1) && (
        <button type="button" onClick={onHeading1} title="一级标题 Cmd/Ctrl+Shift+1" aria-label="设置一级标题">
          <Heading1 size={16} />
        </button>
      )}
      {templateSupportsHeadingLevel(template, 2) && (
        <button type="button" onClick={onHeading2} title="二级标题 Cmd/Ctrl+Shift+2" aria-label="设置二级标题">
          <Heading2 size={16} />
        </button>
      )}
      {templateSupportsHeadingLevel(template, 3) && (
        <button type="button" onClick={onHeading3} title="三级标题 Cmd/Ctrl+Shift+3" aria-label="设置三级标题">
          <Heading3 size={16} />
        </button>
      )}
      {templateSupportsHeadingLevel(template, 4) && (
        <button type="button" onClick={onHeading4} title="四级标题 Cmd/Ctrl+Shift+4" aria-label="设置四级标题">
          <Heading4 size={16} />
        </button>
      )}
      {templateSupportsHeadingLevel(template, 5) && (
        <button type="button" onClick={onHeading5} title="五级标题 Cmd/Ctrl+Shift+5" aria-label="设置五级标题">
          <Heading5 size={16} />
        </button>
      )}
      {templateSupportsHeadingLevel(template, 6) && (
        <button type="button" onClick={onHeading6} title="六级标题 Cmd/Ctrl+Shift+6" aria-label="设置六级标题">
          <Heading6 size={16} />
        </button>
      )}
      {hasHeadingTools && hasInlineTools && <span className="toolbar-separator" />}
      {templateSupportsInlineFormat(template, "bold") && (
        <button type="button" onClick={onBold} title="加粗 Cmd/Ctrl+Shift+B" aria-label="加粗选中文本">
          <Bold size={16} />
        </button>
      )}
      {templateSupportsInlineFormat(template, "highlight") && (
        <button type="button" onClick={onHighlight} title="高亮 Cmd/Ctrl+Shift+H" aria-label="高亮选中文本">
          <Highlighter size={16} />
        </button>
      )}
      {templateSupportsInlineFormat(template, "italic") && (
        <button type="button" onClick={onItalic} title="斜体 Cmd/Ctrl+Shift+I" aria-label="设置选中文本为斜体">
          <Italic size={16} />
        </button>
      )}
      {templateSupportsInlineFormat(template, "strike") && (
        <button type="button" onClick={onStrike} title="删除线 Cmd/Ctrl+Shift+X" aria-label="给选中文本添加删除线">
          <Strikethrough size={16} />
        </button>
      )}
      {templateSupportsInlineFormat(template, "underline") && (
        <button type="button" onClick={onUnderline} title="下划线 Cmd/Ctrl+Shift+U" aria-label="给选中文本添加下划线">
          <Underline size={16} />
        </button>
      )}
      {templateSupportsInlineFormat(template, "code") && (
        <button type="button" onClick={onInlineCode} title="行内代码 Cmd/Ctrl+Shift+E" aria-label="设置选中文本为行内代码">
          <Code2 size={16} />
        </button>
      )}
      {templateSupportsInlineFormat(template, "link") && (
        <button type="button" onClick={onLink} title="链接 Cmd/Ctrl+Shift+K" aria-label="给选中文本添加链接">
          <Link size={16} />
        </button>
      )}
      {hasInlineTools && hasBlockTools && <span className="toolbar-separator" />}
      {templateSupportsBlock(template, "quote") && (
        <button type="button" onClick={onQuote} title="引用 Cmd/Ctrl+Shift+." aria-label="插入引用">
          <Quote size={16} />
        </button>
      )}
      {templateSupportsBlock(template, "list") && (
        <button type="button" onClick={onOrderedList} title="有编号列表 Cmd/Ctrl+Shift+7" aria-label="插入有编号列表">
          <ListOrdered size={16} />
        </button>
      )}
      {templateSupportsBlock(template, "list") && (
        <button type="button" onClick={onUnorderedList} title="无编号列表 Cmd/Ctrl+Shift+8" aria-label="插入无编号列表">
          <List size={16} />
        </button>
      )}
      {templateSupportsBlock(template, "code") && (
        <button type="button" onClick={onCodeBlock} title="代码块 Cmd/Ctrl+Shift+C" aria-label="插入代码块">
          <Code2 size={16} />
        </button>
      )}
      {templateSupportsBlock(template, "divider") && (
        <button type="button" onClick={onDivider} title="分隔线 Cmd/Ctrl+Shift+-" aria-label="插入分隔线">
          <Minus size={16} />
        </button>
      )}
      {templateSupportsBlock(template, "image") && (
        <button type="button" onClick={onImage} title="图片 Cmd/Ctrl+Shift+P" aria-label="插入图片">
          <ImagePlus size={16} />
        </button>
      )}
      <span className="toolbar-spacer" />
      <div className="toolbar-history" aria-label="编辑历史">
        <button type="button" onClick={undo} disabled={!canUndo} title="撤销" aria-label="撤销上一次编辑">
          <ChevronLeft size={15} />
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="重做" aria-label="重做上一次编辑">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function CodeBlock({
  block,
  activeBlockId,
  onSelectBlock
}: {
  block: MarkdownBlock;
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
}) {
  return (
    <div
      className={`block block-code ${block.id === activeBlockId ? "is-sync-active" : ""} ${onSelectBlock ? "is-sync-target" : ""}`}
      data-flow-unit-id={block.id}
      data-source-block-id={block.id}
      onClick={() => onSelectBlock?.(block.id)}
      {...getSelectableBlockProps(block, onSelectBlock)}
    >
      <pre className="code-card">
        {block.lang && <span className="code-language">{block.lang}</span>}
        <code>{block.text}</code>
      </pre>
    </div>
  );
}

function HtmlBlock({
  block,
  activeBlockId,
  onSelectBlock
}: {
  block: MarkdownBlock;
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
}) {
  return (
    <div
      className={`block block-code ${block.id === activeBlockId ? "is-sync-active" : ""} ${onSelectBlock ? "is-sync-target" : ""}`}
      data-flow-unit-id={block.id}
      data-source-block-id={block.id}
      onClick={() => onSelectBlock?.(block.id)}
      {...getSelectableBlockProps(block, onSelectBlock)}
    >
      <div className="infographic-card" dangerouslySetInnerHTML={{ __html: block.text }} />
    </div>
  );
}

function ImageBlock({
  block,
  activeBlockId,
  onSelectBlock
}: {
  block: MarkdownBlock;
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveImageUrl(block.url);
  const isActive = block.id === activeBlockId;
  const imageOptions = normalizeImageOptions(block.imageOptions);
  const imageClassName = [
    "image-card",
    `image-size-${imageOptions.size}`
  ].join(" ");
  const blockClassName = [
    "block",
    "block-image",
    `image-block-size-${imageOptions.size}`,
    isActive ? "is-sync-active" : "",
    onSelectBlock ? "is-sync-target" : ""
  ].filter(Boolean).join(" ");

  return (
    <div
      className={blockClassName}
      data-flow-unit-id={block.id}
      data-source-block-id={block.id}
      onClick={() => onSelectBlock?.(block.id)}
      {...getSelectableBlockProps(block, onSelectBlock)}
    >
      <figure className={imageClassName}>
        {imageUrl && !failed ? (
          <img src={imageUrl} alt={block.alt || "图片"} onError={() => setFailed(true)} draggable={false} />
        ) : (
          <div className="image-placeholder">
            <Image size={22} />
            <span>图片无法加载</span>
          </div>
        )}
        {block.alt && <figcaption>{block.alt}</figcaption>}
      </figure>
    </div>
  );
}

function ImageOptionsPanel({
  options,
  onChange
}: {
  options: ImageOptions;
  onChange: (patch: Partial<ImageOptions>) => void;
}) {
  return (
    <div className="image-options-panel" onClick={(event) => event.stopPropagation()}>
      <SegmentedOption
        label="尺寸"
        options={imageSizeOptions}
        value={options.size}
        labels={{ small: "小", medium: "中", large: "大" }}
        onChange={(size) => onChange({ size })}
      />
    </div>
  );
}

function SegmentedOption<T extends string>({
  label,
  options,
  value,
  labels,
  onChange
}: {
  label: string;
  options: T[];
  value: T;
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="image-option-group">
      <span>{label}</span>
      <div className="image-option-buttons">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={option === value ? "is-active" : ""}
            aria-pressed={option === value}
            aria-label={`${label}：${labels[option]}`}
            onClick={() => onChange(option)}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelBar({
  title,
  fontScale,
  pagePadding,
  onDecreaseFont,
  onIncreaseFont,
  onDecreasePadding,
  onIncreasePadding
}: {
  title: string;
  fontScale?: number;
  pagePadding?: number;
  onDecreaseFont?: () => void;
  onIncreaseFont?: () => void;
  onDecreasePadding?: () => void;
  onIncreasePadding?: () => void;
}) {
  return (
    <div className="panel-bar">
      <span>{title}</span>
      <div className="panel-actions">
        {fontScale && onDecreaseFont && onIncreaseFont && (
          <div className="font-controls">
            <span>字号</span>
            <button type="button" onClick={onDecreaseFont} title="减小预览字体" aria-label="减小预览字体">-</button>
            <strong>{Math.round(fontScale * 100)}%</strong>
            <button type="button" onClick={onIncreaseFont} title="增大预览字体" aria-label="增大预览字体">+</button>
          </div>
        )}
        {pagePadding != null && onDecreasePadding && onIncreasePadding && (
          <div className="font-controls">
            <span>边距</span>
            <button type="button" onClick={onDecreasePadding} title="减小页边距" aria-label="减小页边距">-</button>
            <strong>{pagePadding}px</strong>
            <button type="button" onClick={onIncreasePadding} title="增大页边距" aria-label="增大页边距">+</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportMenu({
  onDownloadImages,
  onDownloadZip
}: {
  onDownloadImages: () => void;
  onDownloadZip: () => void;
}) {
  return (
    <div className="export-menu" role="menu" aria-label="导出选项">
      <button type="button" role="menuitem" onClick={onDownloadImages}>
        <Image size={15} />
        下载图片
      </button>
      <button type="button" role="menuitem" onClick={onDownloadZip}>
        <Download size={15} />
        下载压缩包
      </button>
    </div>
  );
}

type ZipFile = {
  name: string;
  data: Uint8Array<ArrayBuffer>;
};

function dataUrlToBytes(dataUrl: string): Uint8Array<ArrayBuffer> {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

type CornerRadii = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

function getExportCornerRadii(element: HTMLElement, scale: number): CornerRadii {
  const style = getComputedStyle(element);
  return {
    topLeft: readRadius(style.borderTopLeftRadius) * scale,
    topRight: readRadius(style.borderTopRightRadius) * scale,
    bottomRight: readRadius(style.borderBottomRightRadius) * scale,
    bottomLeft: readRadius(style.borderBottomLeftRadius) * scale
  };
}

function readRadius(value: string) {
  return Number.parseFloat(value.split(/\s+/)[0] || "0") || 0;
}

async function maskPngCorners(dataUrl: string, width: number, height: number, radii: CornerRadii) {
  if (!radii.topLeft && !radii.topRight && !radii.bottomRight && !radii.bottomLeft) return dataUrl;

  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return dataUrl;

  context.clearRect(0, 0, width, height);
  drawRoundedRect(context, width, height, radii);
  context.clip();
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片导出后处理失败"));
    image.src = src;
  });
}

function drawRoundedRect(context: CanvasRenderingContext2D, width: number, height: number, radii: CornerRadii) {
  const topLeft = Math.min(radii.topLeft, width / 2, height / 2);
  const topRight = Math.min(radii.topRight, width / 2, height / 2);
  const bottomRight = Math.min(radii.bottomRight, width / 2, height / 2);
  const bottomLeft = Math.min(radii.bottomLeft, width / 2, height / 2);

  context.beginPath();
  context.moveTo(topLeft, 0);
  context.lineTo(width - topRight, 0);
  context.quadraticCurveTo(width, 0, width, topRight);
  context.lineTo(width, height - bottomRight);
  context.quadraticCurveTo(width, height, width - bottomRight, height);
  context.lineTo(bottomLeft, height);
  context.quadraticCurveTo(0, height, 0, height - bottomLeft);
  context.lineTo(0, topLeft);
  context.quadraticCurveTo(0, 0, topLeft, 0);
  context.closePath();
}

function createZipBlob(files: ZipFile[]) {
  const encoder = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const centralDirectory: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((Math.floor(now.getSeconds() / 2)) & 0x1f);
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const localHeader = makeZipHeader(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, dosTime);
    writeUint16(localHeader, 12, dosDate);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, file.data.length);
    writeUint32(localHeader, 22, file.data.length);
    writeUint16(localHeader, 26, nameBytes.length);
    localHeader.set(nameBytes, 30);

    parts.push(localHeader, file.data);

    const centralHeader = makeZipHeader(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, dosTime);
    writeUint16(centralHeader, 14, dosDate);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, file.data.length);
    writeUint32(centralHeader, 24, file.data.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralDirectory.push(centralHeader);

    offset += localHeader.length + file.data.length;
  }

  const centralDirectorySize = centralDirectory.reduce((total, item) => total + item.length, 0);
  const endRecord = makeZipHeader(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralDirectorySize);
  writeUint32(endRecord, 16, offset);

  return new Blob([concatBytes([...parts, ...centralDirectory, endRecord]).buffer], { type: "application/zip" });
}

function concatBytes(parts: Uint8Array<ArrayBuffer>[]) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function makeZipHeader(length: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(length);
}

function writeUint16(target: Uint8Array<ArrayBuffer>, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array<ArrayBuffer>, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function crc32(data: Uint8Array<ArrayBuffer>) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

createRoot(document.getElementById("root")!).render(<App />);

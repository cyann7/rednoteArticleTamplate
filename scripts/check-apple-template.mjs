import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const templatesIndex = readFileSync(join(root, "src/templates/index.ts"), "utf8");
const appleTemplate = readFileSync(join(root, "src/templates/appleModern/index.ts"), "utf8");
const appleContentTemplate = readFileSync(join(root, "src/templates/appleModern/contentTemplate.ts"), "utf8");
const techShareContentTemplate = readFileSync(join(root, "src/templates/techShareLight/contentTemplate.ts"), "utf8");
const markdown = readFileSync(join(root, "src/markdown.ts"), "utf8");

const failures = [];

function loadCssBundle(relativePath, seen = new Set()) {
  const absolutePath = join(root, relativePath);
  if (seen.has(absolutePath)) {
    return "";
  }

  seen.add(absolutePath);
  const source = readFileSync(absolutePath, "utf8");

  return source.replace(/@import\s+"([^"]+)";/g, (_, importPath) => {
    const resolved = join(relativePath.slice(0, relativePath.lastIndexOf("/") + 1), importPath);
    return loadCssBundle(resolved, seen);
  });
}

const styles = loadCssBundle("src/styles.css");

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function cssBlock(selector) {
  const start = styles.lastIndexOf(`${selector} {`);
  if (start === -1) {
    return "";
  }

  const openBrace = styles.indexOf("{", start);
  const closeBrace = styles.indexOf("\n}", openBrace);
  if (openBrace === -1 || closeBrace === -1) {
    return "";
  }

  return styles.slice(openBrace + 1, closeBrace);
}

expect(templatesIndex.includes('import.meta.glob("./*/index.{ts,tsx}"'), "template discovery glob is missing");
expect(templatesIndex.includes('import: "template"'), 'template discovery should load each module\'s "template" export');
expect(appleTemplate.includes('id: "apple-modern"'), "apple-modern template definition is missing");
expect(!templatesIndex.includes('"template-apple"') && !appleTemplate.includes('"template-apple"'), "legacy template-apple key should not return");
expect(styles.includes(".template-apple-modern"), "template-apple-modern CSS is missing");
expect(!/[—–]/.test(styles + templatesIndex + appleTemplate + appleContentTemplate + techShareContentTemplate + markdown), "visible template copy must not use em or en dashes");

const pageBlock = cssBlock(".template-apple-modern,\n.preview-page-card.template-apple-modern");
expect(pageBlock.includes("background: #ffffff;"), "Apple page canvas should use a bright white background");

const h1Block = cssBlock(".template-apple-modern .block-heading.heading-level-1");
const h2Block = cssBlock(".template-apple-modern .block-heading.heading-level-2");
expect(!/background:\s*#fff(?:fff)?/i.test(h1Block), "H1 must not introduce a white background band");
expect(!/background:\s*#fbfbfd/i.test(h1Block), "H1 must stay on the continuous gray canvas");
expect(!/background:\s*#fff(?:fff)?/i.test(h2Block), "H2 must not introduce a white background band");

const pageNumberBlock = cssBlock(".template-apple-modern .page-number-classic");
expect(pageNumberBlock.includes("background: transparent;"), "Apple page number should be transparent");
expect(pageNumberBlock.includes("border-radius: 0;"), "Apple page number should not look like a pill");

const listBlock = cssBlock(".template-apple-modern .block-list,\n.template-apple-modern .block-list.ordered-list");
const quoteBlock = cssBlock(".template-apple-modern .block-quote");
const imageBlock = cssBlock(".template-apple-modern .infographic-card,\n.template-apple-modern .image-card");
expect(listBlock.includes("background: transparent;"), "Lists should not use card backgrounds");
expect(listBlock.includes("border-radius: 0;"), "Lists should not use rounded card shape");
expect(listBlock.includes("box-shadow: none;"), "Lists should not use card shadows");
expect(quoteBlock.includes("background: transparent;"), "Quotes should not use card backgrounds");
expect(/border-radius:\s*2[468]px/.test(imageBlock), "Image cards should use Apple Store style rounded cards");
expect(!/!\[/.test(appleContentTemplate), "Apple template content template should not include default images");
expect(!/!\[/.test(techShareContentTemplate), "Tech share content template should not include default images");
expect(!appleContentTemplate.includes("/apple-writing-studio.svg"), "Apple template content template should not reference the sample image");
expect(!techShareContentTemplate.includes("/apple-writing-studio.svg"), "Tech share content template should not reference the sample image");

if (failures.length > 0) {
  console.error("Apple template checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Apple template checks passed.");

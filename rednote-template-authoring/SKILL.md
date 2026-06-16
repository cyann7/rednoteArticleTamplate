---
name: rednote-template-authoring
description: Add, clone, restyle, or refactor a Rednote template in this repo. Use this whenever the user asks for a new template, a new visual style, a template variant, template page chrome, template-specific renderers, or wants a repeatable way to scaffold templates under src/templates.
---

# Rednote Template Authoring

This skill is specific to this repository. Use it when working on templates under `src/templates/`.

## Goal

Ship a new template that:

- appears automatically in the template picker
- renders correctly in preview and export
- keeps styles isolated to that template
- works with the repo's Markdown block model
- passes `npm run build`

## First checks

Before editing, inspect these files:

- `src/templates/base.tsx`
- `src/templates/index.ts`
- `src/styles.css`
- one existing simple template such as `src/templates/techShareLight/index.ts`
- one existing TSX template such as `src/templates/iosNotes/index.tsx`
- `src/markdown.ts`

Read `references/scaffold.md` before writing files. It contains the folder contract and starter snippets.

## Output format

When doing template work, structure the work in this order:

1. Summarize the requested visual direction in 2-4 concrete style traits.
2. State whether the template needs plain `index.ts` or JSX-capable `index.tsx`.
3. Create or update the template files.
4. Run `npm run build`.
5. Tell the user exactly what was added and any manual follow-up.

## Template workflow

### 1. Pick the right template shape

Use `index.ts` when the template only needs a `TemplateDefinition`.

Use `index.tsx` when the template needs either of these:

- `renderPageChrome`
- custom `renderers`

Default to `fullMarkdownSupport()` unless the user explicitly wants a more constrained authoring experience.

### 2. Create the directory

Create a new folder under `src/templates/<folderName>/`.

Expected files:

- `index.ts` or `index.tsx`
- `contentTemplate.ts`
- `styles.css`

Optional extras are allowed only when justified by the design, for example helper components local to the template.

### 3. Define the template

Every new template module must export a named export called `template`.

Required `TemplateDefinition` fields:

- `id`: stable string id used in localStorage and template switching
- `order`: numeric sort key in the picker
- `name`: short user-facing name
- `description`: one-line summary shown to humans and future maintainers
- `contentTemplate`: default Markdown content
- `canvasClassName`: unique CSS namespace such as `template-quiet-editorial`
- `pageNumber`: full config object even if disabled
- `markdown`: usually `fullMarkdownSupport()`

You may also export a second alias like `quietEditorialTemplate`, but discovery relies on the named export `template`.

### 4. Register styles

Template discovery is automatic in `src/templates/index.ts`. Do not hand-register the template there.

CSS is not auto-discovered. You must add an `@import` line to `src/styles.css` for the new template's `styles.css`.

If you forget the import, the template will appear in the picker but render unstyled.

### 5. Keep CSS isolated

All selectors must be scoped with the template class.

At minimum, style both:

- `.template-your-class`
- `.preview-page-card.template-your-class`

Then scope internals under `.template-your-class ...`.

Do not introduce broad global selectors that can leak into other templates.

### 6. Match the repo's Markdown model

Supported block types come from `src/markdown.ts`:

- headings `#` through `######`
- paragraphs
- unordered and ordered lists
- blockquotes
- fenced code blocks
- horizontal dividers written as `---`
- images written as `![alt](url){size=small|medium|large}`
- blank lines, which become spacer blocks

Important parser behaviors:

- image sizes normalize to `small`, `medium`, `large`
- `size=full` maps to `large`
- `size=wide` maps to `medium`
- fenced code blocks with language `html` become infographic-like blocks via `variant: "infographic"`

Do not invent new Markdown syntax inside a template unless you are also intentionally extending the parser and the editor behavior.

### 7. Content template rules

The default `contentTemplate` should demonstrate the template well.

Include a realistic mix of:

- title and intro
- at least one section heading
- list or quote if the template supports them
- image block if the design benefits from visual rhythm

Keep placeholder copy readable. Favor Chinese copy, consistent with the existing templates.

### 8. Asset rules

If the template needs local images, textures, or SVGs:

- place them under `public/`
- reference them with absolute paths like `/textures/paper.jpg`

Do not introduce backend uploads, remote font dependencies, or runtime network fetches just for a template.

### 9. When to touch shared infrastructure

Do not edit shared files unless the new design truly needs it.

Usually safe to edit:

- `src/styles.css` for the template stylesheet import

Only edit these when necessary:

- `src/markdown.ts`
- `src/templates/base.tsx`
- `src/main.tsx`

If you change shared infrastructure, explain why the template could not be implemented within the existing contract.

## Constraints

- Keep the repo static-only. No server or API dependency.
- Prefer local assets and existing browser capabilities.
- Keep naming ASCII for file and folder names.
- Keep `canvasClassName` unique.
- Keep `id` stable after shipping; changing it breaks saved template selection.
- Do not remove or rewrite unrelated templates.
- Do not add a new template by copying styles globally into `src/styles/base.css`.

## Acceptance checklist

Before finishing, verify all of these:

- the template folder exists under `src/templates/`
- the module exports `template`
- `src/styles.css` imports the template stylesheet
- `canvasClassName` is unique
- the template appears in discovery without editing `src/templates/index.ts`
- `npm run build` passes

If the task touched template-specific logic heavily, also suggest a quick manual smoke test in `npm run dev`.

## Decision rules

If the user gives only a vague style prompt, infer a coherent direction and proceed.

If the user names a specific product or visual source, preserve the recognizable layout cues without copying logos or trademarked locked-up UI assets verbatim unless those assets already exist locally in the repo.

If the requested design needs custom chrome, use `renderPageChrome`.

If the design only differs in typography, spacing, surfaces, borders, or media treatment, stay inside CSS first.

## Common mistakes

- forgetting the `template` named export
- forgetting the stylesheet import in `src/styles.css`
- reusing another template's `canvasClassName`
- creating a template that looks correct in preview but not in exported pages because the top-level page selector was incomplete
- adding new Markdown syntax without parser support
- putting remote asset URLs in the default content template

## Examples

Example request: "做一个像杂志内页一样的模板，偏米白纸张和细衬线标题。"

Expected approach:

1. Create `src/templates/<new-folder>/`
2. Export `template` from `index.ts` or `index.tsx`
3. Add a paper-like scoped stylesheet
4. Add a content template with headings, body copy, and one image
5. Import the stylesheet in `src/styles.css`
6. Run `npm run build`

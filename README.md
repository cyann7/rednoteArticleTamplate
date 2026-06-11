# Rednote Markdown Studio

Pure frontend Vite + React app for editing and exporting Rednote-style image templates.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The static output is generated in `dist/`.

## Images

Use the image button in the editor toolbar to choose a local image. The file is stored in the browser and the Markdown keeps a short local reference such as `rednote-image:...`, so no backend upload service is required and the editor stays readable.

Image layout can be adjusted from the preview after selecting an image. The editor stores those choices as readable Markdown parameters:

```md
![Cover](rednote-image:abc123){ratio=4:3 size=wide fit=cover}
```

Supported values:

- `ratio`: `auto`, `1:1`, `4:3`, `16:9`, `3:4`
- `size`: `full`, `wide`, `medium`, `small`
- `fit`: `cover`, `contain`

## Cloudflare Pages

Use these settings when connecting the repository to Cloudflare Pages:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `20` or newer

This project does not require a backend, Pages Functions, Workers, API routes, or server-side environment variables.

For manual deployment with Wrangler:

```bash
npm run deploy:pages
```

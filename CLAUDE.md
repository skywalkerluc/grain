# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # development server
npm run build        # production build (also used for static export)
npm run lint         # ESLint via Next.js
npm run typecheck    # tsc --noEmit (strict)
npm test             # vitest run (single pass)
npm run test:watch   # vitest (watch mode)

# Run a single test file
npm test -- --reporter=verbose core/pipeline/pipeline.test.ts
```

## Architecture

Grain is a **client-only offline-first PWA photo editor**. No backend, no API routes. All processing happens in the browser.

### Layers

**`core/`** — Pure TypeScript, zero React. The processing engine.
- `pipeline/` — Operation-based editing: all edits are serializable `PipelineOperation` objects (adjustments, crop, rotate, flip, lut, overlay, text). `applyPipelineToCanvas()` orchestrates them sequentially.
- `luts/` — LUT renderer with Canvas 2D and WebGL paths, intensity blending.
- `presets/` — 5 packs × 12+ styles with strength parameterization (0–100). Adjustment values are scaled before applying.
- `overlays/` — Film grain/light leak catalog; async image loading.

**`store/`** — Zustand state + IndexedDB persistence.
- `editorStore` — Single source of truth: `originalImage`, `pipeline`, `history[]`/`future[]` (max 20), `mode`, preset/pack/strength, crop aspect ratio. Pipeline is never mutated — always deep-cloned via `clonePipeline()`.
- `projectRepository` — IndexedDB CRUD (`idb`). Stores original blob + thumbnail blob + serialized pipeline. Hard limit: 20 projects (throws `ProjectLimitError`).

**`components/`** — React UI panels only (Adjustments, Crop, Presets, Overlays, Text).

**`app/`** — Next.js 14 pages: home upload, editor, projects list.

### Data flow

User loads image → `editorStore.originalImage` → user edits → operations appended to `editorStore.pipeline` → canvas re-renders via `applyPipelineToCanvas()` → export triggers final `toBlob()`.

### Key constraints

- `EditorCanvasClient` uses dynamic import with `ssr: false` (Konva can't run server-side). `webpack: { alias: { canvas: false } }` prevents server canvas errors.
- No `any` — `@typescript-eslint/no-explicit-any: error` is enforced.
- Pipeline operations are fully serializable; undo/redo and project save depend on this.
- Preset pack is persisted to localStorage on change.

## Tests

Tests live in `core/` alongside the code they test. All use Vitest + jsdom. Coverage is focused on pipeline serialization/deserialization, LUT math, overlay catalog validation, and preset strength blending.

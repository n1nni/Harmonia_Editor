# Harmonia

> Vector overlay reconstruction and correction for optically recognised sheet music.

## Abstract

Optical Music Recognition (OMR) pipelines transform images of musical scores into symbolic music representations, but their output is inherently imperfect: pitch estimates drift, symbols are omitted or spuriously inserted, and staff systems are recovered with geometric distortion. **Harmonia** (`harmony`, version 0.1.0) is an interactive, human-in-the-loop correction layer that operates over recognised output. It renders a vector overlay aligned to the source raster image, exposes editing affordances at the level of individual notes and whole staff systems, and serialises the corrected result as MusicXML, the de facto interchange format for symbolic music. The system treats the recognition result as immutable and represents every user correction as a reversible delta, enabling a complete edit history and reproducible export.

## Overview

The accuracy of OMR remains a limiting factor in the digitisation of musical scores. Even state-of-the-art recognition produces transcriptions that require manual verification before they are usable for analysis, performance, or archival purposes. Harmonia addresses this gap by providing a dedicated correction environment rather than a recognition engine: recognition is delegated to an external service, and the application concentrates on the orchestration, visualisation, and editing of its output.

The intended workflow proceeds in three stages. A score image is uploaded and submitted to a remote OMR service, which returns detected musical symbols together with a MusicXML transcription. The application reconstructs the notation as an editable vector overlay registered to the original image, allowing the user to inspect each detection and to correct pitch, position, and presence at the level of single notes, as well as to apply affine transforms to entire staff systems. The corrected score is then exported as MusicXML for downstream use.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture — How It Works](#architecture--how-it-works)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [npm Scripts](#npm-scripts)
- [Usage Walkthrough](#usage-walkthrough)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Output Files](#output-files)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Status](#status)
- [License](#license)

---

## Features

**Canvas and navigation.** The editing surface is an interactive SVG canvas supporting pan and zoom across a range of 5% to 6400%. The Zoom tool provides several fit modes — Fit Selection, Fit Drawing, Fit Page, and Fit Width — together with a viewport history (previous/next view) that is maintained independently of the edit history. The original raster image is displayed as a backdrop with adjustable overlay opacity and a toggle for source-image visibility. Interface scale (70%–200%) and rendering DPI (used for pixel-to-millimetre conversion in the staff inspector) are both adjustable.

**Editing tools.** Four mutually exclusive tools structure the interaction model:

- **Select (V)** — choose a note for inspection and editing.
- **Staff (S)** — select and transform a complete staff system.
- **Add note (N)** — insert new notes at a chosen duration (whole, half, quarter, or eighth).
- **Zoom (Z)** — click to magnify, Shift-click to reduce, or drag a marquee to zoom to a region.

**Note-level correction.** A selected note may be transposed by a single diatonic step, aligned to the nearest staff line or space (using intersection-over-union (IoU) pixel overlap where the source image is available, with a geometric staff-line snap as fallback), or deleted via an inline confirmation. New notes are inserted through an octave-selection dialog, with the diatonic step inferred from the click position relative to the prevailing clef.

**Staff-level correction.** Whole staff systems may be repositioned and rescaled through affine transforms with an optional aspect-ratio constraint. A snap-to-other-staves mode supports magnetic alignment during dragging, and the staff inspector exposes directly editable X, Y, W, and H fields with a pixel/millimetre unit toggle.

**Inspection and analysis.** An inspector card reports the identifier, class, confidence, coordinates, inferred or transcribed pitch (the former marked with `≈`), duration, measure, and voice of the hovered or selected detection. Debug overlays render bounding boxes, centres, staff baselines, class labels, and a coordinate grid. A classification panel presents cluster-similarity and pattern-analysis visualisations together with the three most probable candidate clusters.

**History and interchange.** Undo and redo span five categories of edit — deletion, pitch shift, staff transform, note insertion, and note alignment — and are tracked separately from the viewport history. MusicXML embedded in the recognition response is imported on load, and the corrected score is exported to the `edited_score/` directory.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | [Next.js](https://nextjs.org/) (App Router) | `14.2.5` |
| UI library | React / React DOM | `18.3.1` |
| Language | TypeScript | `5.5.4` |
| State management | [Zustand](https://github.com/pmndrs/zustand) | `4.5.4` |
| Animation | [Framer Motion](https://www.framer.com/motion/) | `11.3.19` |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | `3.4.7` |
| Class utilities | clsx · tailwind-merge | `2.1.1` · `2.5.2` |
| Music notation font | Bravura (SMuFL) — `public/fonts/Bravura.woff2` | — |

The API routes execute on the Node.js runtime (`runtime: 'nodejs'`). Development tooling comprises ESLint `8.57.0` with `eslint-config-next`, PostCSS `8.4.40`, and Autoprefixer `10.4.19`.

---

## Architecture — How It Works

Harmonia is a client-side editor layered over a remote, cloud-based OMR service. Recognition is performed entirely upstream; the application is responsible for upload, rendering, editing, and export.

```
                  ┌─────────────────── browser ───────────────────┐
   Sheet-music    │  useImageUpload → uploadImage (Zustand store)  │
   image  ───────►│         │                                      │
                  │         ▼  POST multipart `image`              │
                  └─────────┼──────────────────────────────────────┘
                            ▼  (same origin)
            POST /api/omr/process  ── src/app/api/omr/process/route.ts
                            │
                            │  1) POST  ${OMR_API_BASE}/process   (runs pipeline, caches)
                            │  2) GET   ${OMR_API_BASE}/full      (fetches full result)
                            ▼
                     OmrResponse JSON  { detections, job_id, rectified_image_b64, xml }
                            │
                            ▼  parseScore (src/lib/omr/parse.ts) + parseMusicXml
                     Semantic score model  (pitch from MusicXML, geometry fallback)
                            │
                            ▼  user edits → delta maps over the immutable response
            (deletedNoteIds · pitchShifts · staffTransforms · addedNotes · alignOffsets)
                            │
                            ▼  serialize on save
            POST /api/save-xml  ── src/app/api/save-xml/route.ts
                            │
                            ▼
              edited_score/score-<jobId>-<timestamp>.musicxml
```

**Rationale for the proxy.** The browser cannot address the plain-HTTP OMR service directly. Two restrictions apply: *mixed content*, under which a page served over HTTPS is prevented from issuing plain-HTTP requests, and *cross-origin resource sharing (CORS)*, since the upstream service sets no `Access-Control-Allow-Origin` header. The same-origin route `/api/omr/process` resolves both by forwarding the request server-side. The route performs a two-step exchange: `POST /process` runs the recognition pipeline and caches the result, after which `GET /full` retrieves the complete record (rectified image, MusicXML, detections, and job identifier). Inbound uploads are bounded at 32 MB.

**Editing model.** The recognition response is treated as immutable. Each correction is recorded as a delta within the Zustand store — deleted identifiers, pitch shifts, staff transforms, inserted notes, and alignment offsets. Undo and redo traverse these deltas, and saving applies them to produce a freshly serialised MusicXML document.

**Persistence.** `POST /api/save-xml` writes the exported MusicXML to `edited_score/`, subject to an 8 MB cap and filename sanitisation.

**Offline development.** A `FixtureOmrClient` may load a fixed response from `public/fixtures/omrResponse.json` in place of a network call, which is useful when the recognition service is unavailable.

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx · page.tsx   # Root layout + home page (renders HarmonyApp)
│   ├── globals.css
│   └── api/
│       ├── omr/process/        # POST proxy to the OMR service (process → full)
│       └── save-xml/           # POST endpoint that writes edited MusicXML
│
├── components/
│   ├── HarmonyApp.tsx          # Top-level application shell
│   ├── canvas/                 # Interactive canvas, hit-testing, zoom, staff handles
│   │   └── useKeyboardShortcuts.ts
│   ├── chrome/                 # Menu bar, toolbars, left palette, status bar, icons
│   ├── analysis/               # Classification and pattern/cluster charts
│   └── debug/                  # Debug visualisation overlays
│
├── hooks/
│   ├── canvas/                 # Pan/zoom and canvas interaction hooks
│   └── data/useImageUpload.tsx # File picker and upload trigger
│
├── lib/
│   ├── store/                  # Zustand store, selectors, slices
│   ├── omr/                    # OMR client, remote client, response parsing
│   ├── music/                  # Music model, pitch, clefs, note sequence, edits
│   ├── musicxml/               # MusicXML parse / serialize / types
│   ├── render/svg/             # SVG note/glyph/beam/slur/staff rendering
│   ├── geometry/               # Bounding boxes, transforms, staff extent
│   ├── staff/ · viewport/ · edits/ · smufl/ · utils/
│
└── types/                      # omr.ts · classification.ts · smufl.ts

public/   fonts/ (Bravura) · fixtures/ · branding/
edited_score/                   # Exported MusicXML is written here
```

---

## Prerequisites

- **Node.js** — an LTS release is recommended (v18 or v20 and above).
- **npm** — distributed with Node.js.
- **An accessible OMR service.** The default endpoint is `http://5.83.153.81:25576`. The service must expose `POST /process` and `GET /full`. If it is unreachable, uploads fail; see [Troubleshooting](#troubleshooting--faq).

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Open the application
#    http://localhost:3000
```

To produce and serve a production build:

```bash
npm run build
npm run start
```

---

## Configuration

The application requires a single environment variable, and it is optional.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OMR_API_BASE` | No | `http://5.83.153.81:25576` | Base URL of the upstream OMR service. Override to target an alternative deployment. |

To override the default, create a `.env.local` file in the project root:

```dotenv
# .env.local
OMR_API_BASE=http://your-omr-host:port
```

---

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start the development server with hot reload. |
| `build` | `next build` | Produce an optimised production build. |
| `start` | `next start` | Serve the production build (after `build`). |
| `typecheck` | `tsc --noEmit` | Type-check the project without emitting output. |
| `lint` | `next lint` | Run ESLint with the Next.js configuration. |

---

## Usage Walkthrough

1. **Upload a score** — select `File ▸ Upload score` or press `Ctrl/Cmd + O`, then choose a sheet-music image (JPEG or PNG). Recognition runs, and the canvas displays the image together with a reconstructed overlay. Loading a new score clears any previous edits, selection, and history.
2. **Inspect** — hover over notes and glyphs to highlight them; the inspector card reports class, confidence, coordinates, pitch, duration, measure, and voice.
3. **Select and edit a note** — with the **Select (V)** tool, click a note, then:
   - press `↑` / `↓` to transpose by one diatonic step;
   - press `A` to align it to the nearest staff line or space;
   - press `Del` / `Backspace` to delete it, confirming in the inline dialog.
4. **Add notes** — activate **Add note (N)**, choose a duration (`1` whole, `2` half, `4` quarter, `8` eighth), click on the staff, and select the octave in the dialog.
5. **Realign staves** — activate **Staff (S)**, click a staff, then drag it or enter exact X, Y, W, and H values in the staff inspector (with a pixel/millimetre toggle and an optional aspect-ratio lock). Enable *Snap to other staves* for magnetic alignment.
6. **Undo and redo** — press `Ctrl/Cmd + Z` and `Ctrl/Cmd + Y` (or `Ctrl/Cmd + Shift + Z`).
7. **Analyse (optional)** — select `Analysis ▸ Classification…` to open the cluster-similarity and pattern-analysis charts.
8. **Save** — select `File ▸ Save edited MusicXML` or press `Ctrl/Cmd + S`. The corrected MusicXML is written to `edited_score/`.

---

## Keyboard Shortcuts

> Shortcuts are inactive while a text input is focused. The bindings below correspond to `src/components/canvas/useKeyboardShortcuts.ts`.

**Global**

| Key | Action |
|-----|--------|
| `F` | Fit to screen |
| `+` / `=` | Zoom in (×1.2) |
| `-` / `_` | Zoom out (÷1.2) |
| `0` | Reset zoom to 100% and pan to the origin |
| `Esc` | Cancel a pending deletion · clear the selection · or leave an empty Staff mode |
| `Del` / `Backspace` | Request deletion of the selected note |
| `Enter` | Confirm a pending deletion (respecting the focused dialog button) |
| `←` / `→` | Step to the previous / next note (or select the first note if none is selected) |
| `↑` / `↓` | Transpose the selected note up / down by one diatonic step |
| `A` | Align the selected note |
| `Ctrl/Cmd + S` | Save edited MusicXML (when a score is loaded) |
| `Ctrl/Cmd + O` | Open the file picker to upload a score |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + Shift + Z` | Redo (alternate) |

**Tool selection**

| Key | Tool |
|-----|------|
| `V` | Select |
| `S` | Staff |
| `N` | Add note |
| `Z` | Zoom |

**Add-note durations** (only while the Add-note tool is active)

| Key | Duration |
|-----|----------|
| `1` | Whole |
| `2` | Half |
| `4` | Quarter |
| `8` | Eighth |

**While the delete-confirmation dialog is open**

| Key | Action |
|-----|--------|
| `←` | Focus the **Confirm** button |
| `→` | Focus the **Cancel** button |
| `Enter` | Act on the focused button |
| `Esc` | Cancel the deletion |

**Zoom-tool gestures**

| Gesture | Action |
|---------|--------|
| Click | Zoom in (×1.2) at the cursor |
| Shift + Click | Zoom out (÷1.2) at the cursor |
| Click + Drag | Marquee selection → zoom to fit the region |

---

## Output Files

Exported scores are written to the `edited_score/` directory at the project root, following the pattern:

```
edited_score/score-<jobId>-<isoTimestamp>.musicxml
```

The `jobId` segment is omitted when the recognition response carries no job identifier. Filenames are sanitised to alphanumeric characters, dashes, underscores, and dots, and the exported document is bounded at 8 MB.

---

## Troubleshooting & FAQ

**Upload fails with "Upstream unreachable" or HTTP 502.**
The OMR service at `OMR_API_BASE` is unavailable or misconfigured. Verify that the service is running and reachable and that `OMR_API_BASE` is correct. The proxy returns 502 when it cannot reach `/process` or `/full`.

**Why is the OMR request proxied rather than issued directly?**
Two browser restrictions apply: mixed content, under which an HTTPS page cannot issue plain-HTTP requests, and CORS, since the upstream service sets no `Access-Control-Allow-Origin` header. The same-origin route `/api/omr/process` forwards the request server-side, where neither restriction applies.

**Upload is rejected with "Image too large" / HTTP 413.**
Inbound images are bounded at 32 MB. Re-export or compress the image below this limit.

**Nothing renders after upload, and the status indicates an error.**
The recognition response may be malformed, empty, or non-JSON. Consult the development-server console; the proxy includes upstream error details in its JSON response.

**Saving fails.**
`POST /api/save-xml` rejects a missing or non-string `xml` field and payloads exceeding 8 MB (HTTP 413). Ensure a score is loaded and the status is `ready` before saving. The server creates `edited_score/` automatically.

**Can the application run without the OMR service?**
For development, yes — a `FixtureOmrClient` can load `public/fixtures/omrResponse.json` instead of issuing a network request.

---

## Status

Harmonia is a pre-release at version 0.1.0. It supports the complete upload–correction–export cycle. The recognition backend and feature set remain subject to change.

---

## License

This is a private project (`"private": true` in `package.json`). All rights reserved; no open-source license is granted.

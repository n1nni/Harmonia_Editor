# Harmonia 🎼

> **Vector overlay reconstruction and correction for optically recognised sheet music.**

Harmonia (`harmony`, v0.1.0 · **βeta**) is an interactive web app for **post-processing and correcting Optical Music Recognition (OMR) output**. You upload a photo or scan of sheet music, a recognition service detects the staves and notes and returns MusicXML, and Harmonia draws an editable vector overlay on top of the original image so you can fix what the machine got wrong — then export clean MusicXML.

OMR is never perfect: pitches drift, notes get dropped or hallucinated, and staves come out skewed. Harmonia is the human-in-the-loop layer that turns "almost right" recognition into a correct score.

**In a nutshell:**

- 📤 Upload a sheet-music image → recognition runs on a remote OMR service.
- ✏️ Inspect and correct notes (pitch, position, add, delete) and realign staves on an interactive canvas.
- 💾 Export the corrected result as MusicXML.

---

## Table of Contents

- [Screenshots](#screenshots)
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
- [Status & Roadmap](#status--roadmap)
- [License](#license)
- [ქართული (Georgian)](#ქართული-georgian)

---

## Screenshots

> _No screenshots are bundled yet. Drop images into `public/branding/` or a `docs/` folder and reference them here._

<!--
![Harmonia — main editor](docs/screenshot-editor.png)
![Harmonia — staff inspector](docs/screenshot-staff-inspector.png)
![Harmonia — classification panel](docs/screenshot-classification.png)
-->

---

## Features

**Canvas & navigation**

- Interactive SVG canvas with pan and zoom (zoom range **5% – 6400%**).
- Multiple fit modes via the Zoom tool: **Fit Selection, Fit Drawing, Fit Page, Fit Width**, plus viewport history (previous/next zoom — separate from edit undo/redo).
- Original image backdrop with adjustable **overlay opacity** and a **show/hide source image** toggle.
- Adjustable **UI scale** (70% – 200%) and **DPI** (for px ↔ mm conversion in the staff inspector).

**Four editing tools** (mutually exclusive)

- **Select (V)** — pick a note to inspect and edit.
- **Staff (S)** — select and transform a whole staff system.
- **Add note (N)** — place new notes, choosing duration (whole / half / quarter / eighth).
- **Zoom (Z)** — click to zoom in, Shift-click to zoom out, drag a rubber-band box to zoom-to-fit.

**Note-level editing**

- **Pitch shift** up/down by one diatonic step.
- **Auto-align** a note to the nearest staff line/space (pixel-overlap IoU when the image is available, with a staff-line snap fallback).
- **Delete** with an inline confirm popup (keyboard-navigable).
- **Add note** with an octave-picker popup; pitch is inferred from the click position relative to the clef.

**Staff-level editing**

- Affine **staff transforms** (translate / scale, with optional aspect-ratio lock).
- **Snap to other staves** for magnetic alignment while dragging.
- **Staff inspector** with live-editable X / Y / W / H fields and a **px ↔ mm** unit toggle (DPI-aware).

**Inspection & analysis**

- **Inspector card** showing detection id, class, confidence, coordinates, pitch (marked `≈` when inferred rather than read from MusicXML), duration, measure, and voice.
- **Debug overlays:** bounding boxes, centers, staff baselines, class labels, and a coordinate grid.
- **Classification panel** — cluster-similarity and pattern-analysis charts with the top-3 candidate clusters.

**History & I/O**

- **Undo / Redo** across five edit types: delete, pitch-shift, staff-transform, add-note, note-align — tracked independently from viewport history.
- **MusicXML import** (embedded in the OMR response) and **export** to `edited_score/`.

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

API routes run on the Node.js runtime (`runtime: 'nodejs'`). Dev tooling: ESLint `8.57.0` + `eslint-config-next`, PostCSS `8.4.40`, Autoprefixer `10.4.19`.

---

## Architecture — How It Works

Harmonia is a thin, interactive editor on top of a **remote, cloud-based OMR service** — all recognition happens upstream; the Next.js app orchestrates upload, rendering, editing, and export.

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

**Why the proxy?** The browser cannot call the plain-HTTP OMR service directly — it would be blocked by **mixed-content** rules (when Harmonia is served over HTTPS) and **CORS** (the upstream sets no `Access-Control-Allow-Origin`). Routing through the same-origin `/api/omr/process` route sidesteps both. The route does a **two-step call**: `POST /process` runs the pipeline and caches the result server-side, then `GET /full` retrieves the complete record (rectified image, MusicXML, detections, job id). Inbound uploads are capped at **32 MB**.

**Editing model.** The original OMR response is treated as immutable. Every edit is stored as a **delta** in the Zustand store (deleted ids, pitch shifts, staff transforms, added notes, align offsets). Undo/redo walk these deltas; saving applies them and serializes fresh MusicXML.

**Saving.** `POST /api/save-xml` writes the edited MusicXML to `edited_score/` (8 MB cap, sanitized filename).

**Offline development.** A `FixtureOmrClient` can load a canned response from `public/fixtures/omrResponse.json` instead of hitting the network — useful when the OMR service is unavailable.

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
│   ├── HarmonyApp.tsx          # Top-level Inkscape-style app shell
│   ├── canvas/                 # Interactive canvas, hit-testing, zoom, staff handles
│   │   └── useKeyboardShortcuts.ts
│   ├── chrome/                 # Menu bar, toolbars, left palette, status bar, icons
│   ├── analysis/               # Classification & pattern/cluster charts
│   └── debug/                  # Debug visualisation overlays
│
├── hooks/
│   ├── canvas/                 # Pan/zoom and canvas interaction hooks
│   └── data/useImageUpload.tsx # File picker + upload trigger
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
edited_score/                   # Exported MusicXML lands here
```

---

## Prerequisites

- **Node.js** — LTS recommended (v18+ or v20+).
- **npm** (ships with Node).
- **Access to an OMR service.** Defaults to `http://5.83.153.81:25576`. The service must expose `POST /process` and `GET /full`. If it is unreachable, uploads fail (see [Troubleshooting](#troubleshooting--faq)).

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open the app
#    http://localhost:3000
```

For a production build:

```bash
npm run build
npm run start
```

---

## Configuration

Harmonia needs exactly **one** environment variable, and it is optional.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OMR_API_BASE` | No | `http://5.83.153.81:25576` | Base URL of the upstream OMR service. Override to point at your own deployment. |

Create a `.env.local` in the project root to override it:

```dotenv
# .env.local
OMR_API_BASE=http://your-omr-host:port
```

---

## npm Scripts

| Script | Command | What it does |
|--------|---------|--------------|
| `dev` | `next dev` | Start the development server with hot reload. |
| `build` | `next build` | Create an optimised production build. |
| `start` | `next start` | Serve the production build (run after `build`). |
| `typecheck` | `tsc --noEmit` | Type-check the project without emitting files. |
| `lint` | `next lint` | Run ESLint (Next.js config). |

---

## Usage Walkthrough

1. **Upload a score** — `File ▸ Upload score` or `Ctrl/Cmd + O`. Pick a sheet-music image (JPEG/PNG). Recognition runs and the canvas shows the image plus a reconstructed overlay. Uploading a new score clears any previous edits, selection, and history.
2. **Inspect** — hover notes/glyphs to highlight them; the inspector card shows class, confidence, coordinates, pitch, duration, measure, and voice.
3. **Select & edit a note** — with the **Select (V)** tool, click a note. Then:
   - **↑ / ↓** to shift pitch up/down one diatonic step.
   - **A** to auto-align it to the nearest staff line/space.
   - **Del / Backspace** to delete (confirm in the popup).
4. **Add notes** — switch to **Add note (N)**, choose a duration (`1` whole, `2` half, `4` quarter, `8` eighth), click on the staff, then pick the octave in the popup.
5. **Realign staves** — switch to **Staff (S)**, click a staff, then drag it or type exact X / Y / W / H values in the staff inspector (toggle px ↔ mm; lock aspect ratio if needed). Enable _Snap to other staves_ for magnetic alignment.
6. **Undo / Redo** — `Ctrl/Cmd + Z` and `Ctrl/Cmd + Y` (or `Ctrl/Cmd + Shift + Z`).
7. **Analyse (optional)** — `Analysis ▸ Classification…` opens cluster-similarity and pattern charts.
8. **Save** — `File ▸ Save edited MusicXML` or `Ctrl/Cmd + S`. The corrected MusicXML is written to `edited_score/`.

---

## Keyboard Shortcuts

> Shortcuts are ignored while a text input is focused. Verified against `src/components/canvas/useKeyboardShortcuts.ts`.

**Global**

| Key | Action |
|-----|--------|
| `F` | Fit to screen |
| `+` / `=` | Zoom in (×1.2) |
| `-` / `_` | Zoom out (÷1.2) |
| `0` | Reset zoom to 100% and pan to origin |
| `Esc` | Cancel pending delete · clear selection · or leave empty Staff mode |
| `Del` / `Backspace` | Request delete on the selected note |
| `Enter` | Confirm pending delete (respects the popup's focused button) |
| `←` / `→` | Step to previous / next note (or select the first note if none selected) |
| `↑` / `↓` | Shift selected note's pitch up / down by one diatonic step |
| `A` | Auto-align the selected note |
| `Ctrl/Cmd + S` | Save edited MusicXML (when a score is loaded) |
| `Ctrl/Cmd + O` | Open file picker to upload a score |
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

**While the delete-confirm popup is open**

| Key | Action |
|-----|--------|
| `←` | Focus the **Confirm** button |
| `→` | Focus the **Cancel** button |
| `Enter` | Act on the focused button |
| `Esc` | Cancel the deletion |

**Zoom tool gestures**

| Gesture | Action |
|---------|--------|
| Click | Zoom in (×1.2) at the cursor |
| Shift + Click | Zoom out (÷1.2) at the cursor |
| Click + Drag | Rubber-band box → zoom to fit that region |

---

## Output Files

Saved scores are written to the `edited_score/` directory at the project root, using the pattern:

```
edited_score/score-<jobId>-<isoTimestamp>.musicxml
```

The `jobId` segment is omitted if the OMR response had no job id. Filenames are sanitized to alphanumerics, dashes, underscores, and dots, and the saved XML is capped at 8 MB.

---

## Troubleshooting & FAQ

**Upload fails with "Upstream unreachable" or a 502.**
The OMR service at `OMR_API_BASE` is down or wrong. Confirm the service is running and reachable, and that `OMR_API_BASE` points to it. The proxy returns 502 when it cannot reach `/process` or `/full`.

**Why does the app proxy the OMR call instead of fetching it directly?**
Two browser restrictions: **mixed content** (HTTPS pages can't make plain-HTTP requests) and **CORS** (the upstream service sets no `Access-Control-Allow-Origin`). The same-origin `/api/omr/process` route forwards the request server-side, where neither restriction applies.

**"Image too large" / 413 on upload.**
Inbound images are capped at **32 MB**. Re-export or compress the image below that limit.

**Nothing renders after upload (status shows an error).**
The OMR response may be malformed or empty, or the service returned non-JSON. Check the dev-server console; the proxy includes upstream error details in its JSON response.

**Save fails.**
`POST /api/save-xml` rejects non-string or missing `xml`, and payloads over **8 MB** (413). Ensure a score is loaded and `status` is `ready` before saving. The server creates `edited_score/` automatically.

**Can I run it without the OMR service?**
Yes, for development — a `FixtureOmrClient` can load `public/fixtures/omrResponse.json` instead of calling the network.

---

## Status & Roadmap

Harmonia is **βeta** (v0.1.0). It is functional for the full upload → correct → export loop. Expect rough edges; the OMR service host and feature set may change.

---

## License

This is a **private** project (`"private": true` in `package.json`). All rights reserved. No open-source license is granted.

---

## ქართული (Georgian)

### მიმოხილვა

**Harmonia** არის ვებ-აპლიკაცია ოპტიკურად ამოცნობილი (OMR) ნოტების **შესწორებისა და დამუშავებისთვის**. ატვირთავთ ნოტების ფოტოს ან სკანს, დისტანციური OMR სერვისი ამოიცნობს სტავებსა და ნოტებს და აბრუნებს MusicXML-ს, ხოლო Harmonia ხატავს ინტერაქტიულ ვექტორულ overlay-ს თავად სურათზე — რათა ხელით გაასწოროთ შეცდომები და შემდეგ დააექსპორტოთ სუფთა MusicXML.

OMR არასდროსაა იდეალური: სიმაღლეები (pitch) იცვლება, ნოტები იკარგება ან ცრუ ნოტები ჩნდება, სტავები კი ხშირად დახრილია. Harmonia არის ადამიანის ჩართულობის ფენა, რომელიც „თითქმის სწორ" ამოცნობას სწორ პარტიტურად აქცევს.

**მოკლედ:**

- 📤 ატვირთეთ ნოტების სურათი → ამოცნობა ხდება დისტანციურ OMR სერვისზე.
- ✏️ შეასწორეთ ნოტები (სიმაღლე, პოზიცია, დამატება, წაშლა) და გაასწორეთ სტავები ინტერაქტიულ canvas-ზე.
- 💾 დააექსპორტეთ შესწორებული შედეგი MusicXML ფორმატში.

### სწრაფი დაწყება

```bash
npm install     # დამოკიდებულებების ინსტალაცია
npm run dev     # სერვერის გაშვება
# გახსენით http://localhost:3000
```

საჭიროა **Node.js** (v18+ ან v20+) და **npm**. ასევე საჭიროა მისაწვდომი OMR სერვისი (ნაგულისხმევად `http://5.83.153.81:25576`). მისი შესაცვლელად შექმენით `.env.local` და მიუთითეთ `OMR_API_BASE`.

### ძირითადი შესაძლებლობები

- ინტერაქტიული SVG canvas, pan/zoom (5%–6400%), რამდენიმე fit-რეჟიმი.
- ოთხი ხელსაწყო: **Select (V)**, **Staff (S)**, **Add note (N)**, **Zoom (Z)**.
- ნოტის რედაქტირება: სიმაღლის ცვლა (↑/↓), ავტო-სწორება (A), წაშლა (Del), ახალი ნოტის დამატება ოქტავის არჩევით.
- სტავის ტრანსფორმაცია (გადატანა/მასშტაბი), სხვა სტავებზე „მიკვრა", px ↔ mm ინსპექტორი.
- Undo/Redo ხუთი ტიპის რედაქტირებისთვის, ცალკე viewport-ის ისტორიისგან.
- კლასიფიკაციის პანელი, debug overlay-ები, MusicXML იმპორტი/ექსპორტი (`edited_score/`-ში).

### ლიცენზია

ეს **კერძო** პროექტია (`"private": true`). ყველა უფლება დაცულია.

> სრული ტექნიკური დეტალები, არქიტექტურა, კლავიატურის მალსახმობები და ხარვეზების მოგვარება იხილეთ ზემოთ მოცემულ ინგლისურ სექციებში.

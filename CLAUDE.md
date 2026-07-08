# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server (default http://localhost:5173)
npm run build     # tsc -b (typecheck) then vite build — always run this before considering a change done
npm run lint      # oxlint (rules in .oxlintrc.json)
npm run preview   # serve the production build locally
```

There is no test suite/framework installed (no Jest/Vitest, no `test` script). Verification during development has been done with throwaway `tsx` scripts (feeding synthetic MediaPipe landmark arrays into `analyzeFace`/`recommendGlasses` to check classification math) and Playwright-driven screenshots of the running dev server — write and delete similar scratch scripts for verification rather than assuming a test runner exists.

## Architecture

This is a **client-side-only** app (no backend, no API calls except loading the MediaPipe model/wasm from CDN). It analyzes a face photo and recommends eyeglass frames. Everything — face landmark detection, geometry, scoring — runs in the browser.

### Pipeline

```
PhotoInput (webcam capture or file upload)
  → HTMLImageElement
  → lib/faceLandmarker.ts   — MediaPipe FaceLandmarker (WASM), returns raw landmarks
  → lib/faceAnalysis.ts     — geometry → FaceAnalysis (shape + measurements)
  → lib/recommend.ts        — scores data/glasses.ts catalog against the analysis
  → App.tsx                 — orchestrates state, renders results
  → components/GlassesCard.tsx + GlassesIcon.tsx — render each recommendation
```

`types.ts` is the single source of truth for domain types (`FaceShape`, `FrameStyle`, `FaceAnalysis`, `GlassesItem`, `ScoredGlassesItem`); nearly every module imports from it.

### Face detection (`lib/faceLandmarker.ts`)

Loads `@mediapipe/tasks-vision`'s `FaceLandmarker` lazily (singleton promise, `IMAGE` running mode, GPU delegate). The WASM runtime and the model file are fetched from CDNs at runtime:
- WASM: `jsdelivr` at a version pinned to match the installed `@mediapipe/tasks-vision` package — **keep `MEDIAPIPE_VERSION` in this file in sync with `package.json`'s version** when upgrading the package.
- Model: `storage.googleapis.com/mediapipe-models/face_landmarker/...`

Returns up to 478 landmarks per face (468 face mesh points + 10 iris points, indices 468–477). Iris points are what make mm-based measurement possible downstream — see below.

### Face geometry (`lib/faceAnalysis.ts`)

This is the core "domain logic" file and the one most likely to need care on future edits:

- **Pixel-space conversion is mandatory.** MediaPipe landmarks are normalized independently per axis (`x` relative to image width, `y` relative to image height). Computing Euclidean distances directly on normalized coordinates silently distorts every ratio on non-square photos (i.e. almost all real phone photos). Every distance/angle calculation first multiplies each landmark by the actual `imageWidth`/`imageHeight`.
- **Real-world mm calibration** uses the horizontal iris diameter (~11.7mm, an anthropometric near-constant, more stable than interpupillary distance which is itself being measured) as a pixel-to-mm ruler. This only works when iris landmarks are present (`landmarks.length >= 478`); otherwise `measurementsMm` and `recommendedFrameWidthMm` are `null` and the function falls back to ratio-only classification (no calibrated scale needed for shape classification itself).
- **Face-shape classification uses smooth fuzzy scoring (`scoreShapes`), not nested if/else with hard cutoffs.** An earlier hard-threshold version caused the same person's two different photos to flip between shapes (e.g. heart ↔ oval) whenever a ratio landed a hair on either side of a cutoff. `gate()` produces a continuous 0→1 ramp around each threshold instead of a boolean, so small photo-to-photo measurement noise changes scores gradually rather than flipping the label outright. All 7 shapes (`oval`, `round`, `square`, `heart`, `oblong`, `diamond`, `triangle`) get a score; the top one wins, `oval` is the residual (`1 - max(others)`).
- **Gate transition widths must stay narrower than the spacing between adjacent thresholds**, or a single measurement ends up "borderline" against unrelated shapes it shouldn't be anywhere near (this happened during tuning: `lengthToCheek` thresholds are only 0.10 apart, and initial 0.15–0.2-wide gates made a clearly-oval face register partial "oblong" score). If you touch `scoreShapes`, re-run a jitter-stability check (perturb a canonical fixture's landmarks by ±2–5% many times and confirm the classification only ever lands on that fixture's true neighboring shapes) rather than only checking the 7 unperturbed canonical fixtures.
- **`alternateFaceShape`** is set when the runner-up score comes within `BORDERLINE_MARGIN` of the winner. This is the direct fix for the flip-between-photos complaint: the UI surfaces it as a "your face is near the boundary between X and Y" note, and `recommend.ts` gives the alternate shape partial credit — so even when the *primary* label flips between two photos of the same borderline face, the recommended glasses list stays largely stable instead of swinging with it.
- Distances are computed in **3D** (`x`, `y`, and `z` all converted to pixel scale) rather than 2D. MediaPipe's `z` is roughly on the same scale as `x`; including it reduces sensitivity to head yaw/pitch (a turned or tilted head foreshortens 2D-only projected widths, which was the other major source of the photo-to-photo flip). Head *roll* (in-plane tilt) was never an issue — Euclidean point-to-point distance is already rotation-invariant.
- Landmark index constants (the `LM` object) are tied to MediaPipe's specific face mesh topology — they are not arbitrary and shouldn't be renumbered without re-deriving which physical point each index represents.

### Recommendation engine (`lib/recommend.ts`)

Not a simple tag filter — a weighted scoring system. Each catalog item accumulates points for: matching face shape (highest weight), frame width fitting the measured face width range, eye-spacing-appropriate bridge styling (wide vs. close-set eyes), and low-bridge-fit for narrow nose bridges. Items scoring at/above `RECOMMENDED_THRESHOLD` land in `recommended`, the rest in `others`; both lists are sorted descending by score. Each `ScoredGlassesItem` carries its `reasons` (Vietnamese strings) for why it scored, which the UI renders directly as tags — don't discard `reasons` when touching this file, it's user-facing.

### Glasses catalog (`data/glasses.ts`)

Demo data, not real product data — 16 items across 8 `FrameStyle`s (round, square, rectangle, cat-eye, aviator, browline, rimless, oversized). Each entry carries styling metadata (`frameWidthMm`, `bridgeMm`, `goodForWideSetEyes`, `goodForCloseSetEyes`, `lowBridgeFit`) that `recommend.ts` scores against — if you add a catalog item, all of these fields matter for it to be reachable by the scoring logic, not just `suitableFaceShapes`.

### Rendering without product photos (`components/GlassesIcon.tsx`)

There are no real product images. Each `FrameStyle` maps to a parametric SVG lens shape (`SHAPES` config: width/height/corner-radius, plus special-cased path generation for `cat-eye` and `aviator`). If real product photography is ever introduced, this is the component to replace/bypass.

### UI language

All user-facing strings (labels, descriptions, error messages, button text) are Vietnamese. Keep new user-facing text consistent with this — labels live in `data/faceShapeInfo.ts` and `data/analysisLabels.ts`, not hardcoded ad hoc in components, so add new labels there.

### Styling

Tailwind CSS v4 via the `@tailwindcss/vite` plugin (registered in `vite.config.ts`) — there is **no `tailwind.config.js` and no PostCSS config**; that's expected for v4's Vite-plugin setup, not a missing file. `src/index.css` is just `@import "tailwindcss";` plus a couple of global resets.

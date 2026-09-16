# pixel picnic

a browser-based dithering tool, styled after maison margiela's raw,
unbranded, construction-exposed visual language. dithering as a kind
of digital overpaint — degrading a photo down to the pixel seams
instead of smoothing them away.

the name's doing double duty: "pic" for picture, "picnic" for the
casual, poke-around-and-see playground this is meant to be, against
a look that's otherwise pretty severe.

## running it

```
npm install
npm run dev
```

then open http://localhost:3000

## structure

- `lib/dither.ts` — the actual dithering math (threshold, bayer 4×4,
  floyd–steinberg, atkinson), framework-agnostic, works on raw
  `ImageData`. this is the shared core everything else builds on.
  binary only (2-level) — no gray-level quantization; that lived here
  briefly for e-ink export, now removed along with that feature.
- `components/DitherTool.tsx` — the client-side canvas UI: upload,
  algorithm/grain/exposure/palette controls, before/after slider,
  presets, shareable-settings URL, download.
- `components/RepeatHero.tsx` — the homepage's repetition-as-hero
  section, styled white-on-white.
- `components/FabricationExport.tsx` + `app/fabrication/` — a hub for
  physical fabrication techniques driven off the same binary grid.
  currently: dots (laser engraving halftone) and stitch-path
  (embroidery fill digitizing reference), both real millimeter-sized
  SVG. more techniques land here over time.
- `app/og/route.tsx` — settings-seeded OG image for shared links.
  shows the settings, not the photo, since nothing is ever uploaded
  to a server.
- `lib/segmentation.ts` — wraps mediapipe's on-device selfie
  segmentation model (`@mediapipe/tasks-vision`). runs entirely
  client-side via wasm/GPU; the model file loads once from google's
  CDN, then every frame after that stays local.
- `components/LiveRegionDither.tsx` + `app/live/` — real-time,
  region-aware dithering over your camera. the segmentation model
  finds the subject; subject and background each get their own
  algorithm/exposure instead of one setting applied to the whole
  frame. `ditherRegionAware()` in `lib/dither.ts` runs each region as
  a full independent pass and composites by mask afterward, rather
  than mixing algorithms mid-diffusion — letting error-diffusion
  noise cross a region boundary produces arbitrary artifacts right at
  the seam, where two clean passes composited afterward don't.
- `app/` — next.js app router pages, layout, global tokens.

## removed / spun off

- **e-ink export** — built, then removed. lived at `app/eink/` and
  `components/EinkExport.tsx`, targeting the waveshare 10.3"/7.5"
  panels with real bit-depth quantization. cut for scope, not because
  it didn't work.
- **punch card export** — built, then pulled out into its own
  separate project, since a punch card pattern generator for the
  KH-930 is its own practice, not just an export mode of an image
  tool. see that project for anything punch-card related going
  forward.

## roadmap (not yet built)

- **more fabrication techniques** — the fabrication hub is designed
  to grow; whatever's next goes here.
- **link into tinytinker.tools** — this fits that collection of
  browser-based maker tools; could move in as a route there instead
  of staying standalone.

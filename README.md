# pixel picnic

a browser-based dithering tool, styled after maison margiela's raw,
unbranded, construction-exposed visual language. dithering as a kind
of digital bianchetto — degrading a photo down to the pixel seams
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
- `components/DitherTool.tsx` — the client-side canvas UI: upload,
  algorithm/grain/exposure/palette controls, download.
- `app/` — next.js app router pages, layout, global tokens.

## roadmap (not yet built)

- **fix aspect ratio** — currently squashes every image into a
  640×640 square. preserve aspect ratio, cap by longest side. do
  this first, it's the one thing that reads as unfinished.
- **before/after slider** — drag to reveal original vs dithered.
- **named presets** — bundle algorithm + grain + palette into named
  looks, maybe mapped to margiela/folders' four codes (artisanal /
  anonymity / tabi / bianchetto).
- **e-ink export** — proper bit-depth/palette quantization matched to
  real panel specs (waveshare 4-gray, 7-color) and direct export in
  the exact format those displays expect. relevant to the soft
  computer's waveshare display.
- **vector / fabrication export** — SVG or stitch-path output instead
  of raster PNG, for laser engraving halftones or embroidery
  fill patterns on felt/fabric.
- **link into tinytinker.tools** — this fits that collection of
  browser-based maker tools; could move in as a route there instead
  of staying standalone.

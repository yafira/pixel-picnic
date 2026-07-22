"use client";

import { useEffect, useRef } from "react";
import { dither, Algorithm } from "@/lib/dither";
import { makePlaceholder } from "@/lib/placeholder";

// each tile re-dithers the same source at a different algorithm/grain/exposure,
// so the repetition is genuinely different renders, not the same image copy-pasted
const VARIATIONS: { algorithm: Algorithm; grain: number; exposure: number }[] =
  [
    { algorithm: "bayer", grain: 4, exposure: 0 },
    { algorithm: "floyd", grain: 3, exposure: -10 },
    { algorithm: "atkinson", grain: 5, exposure: 10 },
    { algorithm: "threshold", grain: 6, exposure: 20 },
    { algorithm: "bayer", grain: 6, exposure: -15 },
    { algorithm: "floyd", grain: 4, exposure: 15 },
    { algorithm: "atkinson", grain: 3, exposure: -5 },
    { algorithm: "threshold", grain: 8, exposure: 0 },
  ];

const GRID_SIZE = 90; // cells along the longer axis, per tile, before dividing by grain

// low-contrast "white on white" pair: texture and tonal drift carry the
// repetition instead of strong black-on-cream contrast
const LIGHT: [number, number, number] = [237, 232, 220];
const DARK: [number, number, number] = [214, 208, 191];

export default function RepeatHero() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;

    makePlaceholder().then((img) => {
      if (cancelled) return;

      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      const fitScale = GRID_SIZE / Math.max(naturalW, naturalH);
      const baseW = Math.round(naturalW * fitScale);
      const baseH = Math.round(naturalH * fitScale);

      VARIATIONS.forEach((variation, i) => {
        const canvas = canvasRefs.current[i];
        if (!canvas) return;

        const gw = Math.max(6, Math.round(baseW / variation.grain));
        const gh = Math.max(6, Math.round(baseH / variation.grain));

        const small = document.createElement("canvas");
        small.width = gw;
        small.height = gh;
        const sctx = small.getContext("2d")!;
        sctx.drawImage(img, 0, 0, gw, gh);
        const imageData = sctx.getImageData(0, 0, gw, gh);

        const result = dither(imageData, {
          algorithm: variation.algorithm,
          exposure: variation.exposure,
        });

        const ctx = canvas.getContext("2d")!;
        canvas.width = gw;
        canvas.height = gh;
        const out = ctx.createImageData(gw, gh);
        for (let p = 0; p < gw * gh; p++) {
          const col = result.cells[p] ? LIGHT : DARK;
          out.data[p * 4] = col[0];
          out.data[p * 4 + 1] = col[1];
          out.data[p * 4 + 2] = col[2];
          out.data[p * 4 + 3] = 255;
        }
        ctx.putImageData(out, 0, 0);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{ position: "relative", background: "var(--line)", padding: 2 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
          background: "var(--line)",
        }}
      >
        {VARIATIONS.map((_, i) => (
          <canvas
            key={i}
            ref={(el) => {
              canvasRefs.current[i] = el;
            }}
            style={{
              width: "100%",
              aspectRatio: "3 / 4",
              display: "block",
              imageRendering: "pixelated",
              background: "var(--paper)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 24,
          bottom: 20,
          fontFamily: "var(--font-archivo), sans-serif",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 15,
          color: "var(--ink)",
          opacity: 0.55,
          mixBlendMode: "multiply",
        }}
      >
        pixel picnic / repeat
      </div>
    </div>
  );
}

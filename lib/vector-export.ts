export type DotShape = "circle" | "square";
export type ExportMode = "dots" | "stitch-path";

export interface VectorExportOptions {
  /** physical size of one grid cell, in millimeters */
  cellSizeMM: number;
  shape: DotShape;
  /** 0-1, how much of each cell a dot fills */
  dotScale: number;
  mode: ExportMode;
}

interface SVGSize {
  widthMM: number;
  heightMM: number;
  inner: string;
}

/**
 * Builds the inner SVG markup (shapes or a stitch path) from binary dither
 * cells. `cells` follows the existing convention from lib/dither.ts:
 * 1 = light, 0 = dark. Dark cells are the ones marked/engraved/stitched.
 */
function buildInner(
  cells: Uint8Array,
  width: number,
  height: number,
  options: VectorExportOptions,
): SVGSize {
  const { cellSizeMM, shape, dotScale, mode } = options;
  const widthMM = width * cellSizeMM;
  const heightMM = height * cellSizeMM;

  if (mode === "dots") {
    const shapes: string[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (cells[y * width + x] !== 0) continue; // only dark cells are marked
        const cx = (x + 0.5) * cellSizeMM;
        const cy = (y + 0.5) * cellSizeMM;
        if (shape === "circle") {
          const r = (cellSizeMM * dotScale) / 2;
          shapes.push(
            `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${r.toFixed(3)}" />`,
          );
        } else {
          const s = cellSizeMM * dotScale;
          shapes.push(
            `<rect x="${(cx - s / 2).toFixed(3)}" y="${(cy - s / 2).toFixed(3)}" width="${s.toFixed(
              3,
            )}" height="${s.toFixed(3)}" />`,
          );
        }
      }
    }
    return {
      widthMM,
      heightMM,
      inner: `<g fill="#000" stroke="none">${shapes.join("")}</g>`,
    };
  }

  // stitch-path mode: a single serpentine polyline through dark cell centers,
  // row by row, reversing direction on alternate rows — the same boustrophedon
  // traversal a fill-stitch pattern follows, so it reads as a plausible
  // running-stitch path rather than an arbitrary point order.
  const points: string[] = [];
  for (let y = 0; y < height; y++) {
    const xsInRow: number[] = [];
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x] === 0) xsInRow.push(x);
    }
    if (xsInRow.length === 0) continue;
    const ordered = y % 2 === 0 ? xsInRow : xsInRow.slice().reverse();
    for (const x of ordered) {
      const cx = (x + 0.5) * cellSizeMM;
      const cy = (y + 0.5) * cellSizeMM;
      points.push(`${cx.toFixed(3)},${cy.toFixed(3)}`);
    }
  }
  const strokeWidth = (cellSizeMM * 0.15).toFixed(3);
  const inner =
    points.length > 0
      ? `<polyline points="${points.join(
          " ",
        )}" fill="none" stroke="#000" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`
      : "";
  return { widthMM, heightMM, inner };
}

/** Full SVG document sized in real millimeters, for download / import into laser or embroidery software. */
export function generatePhysicalSVG(
  cells: Uint8Array,
  width: number,
  height: number,
  options: VectorExportOptions,
): string {
  const { widthMM, heightMM, inner } = buildInner(
    cells,
    width,
    height,
    options,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${widthMM.toFixed(
    2,
  )}mm" height="${heightMM.toFixed(2)}mm" viewBox="0 0 ${widthMM.toFixed(2)} ${heightMM.toFixed(
    2,
  )}">${inner}</svg>`;
}

/** Same markup, scaled to fill its container for on-screen preview instead of carrying real mm dimensions. */
export function generatePreviewSVG(
  cells: Uint8Array,
  width: number,
  height: number,
  options: VectorExportOptions,
): string {
  const { widthMM, heightMM, inner } = buildInner(
    cells,
    width,
    height,
    options,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 ${widthMM.toFixed(
    2,
  )} ${heightMM.toFixed(2)}" style="background:#fff">${inner}</svg>`;
}

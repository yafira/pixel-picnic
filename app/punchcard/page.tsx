// Real constraints of the Brother 24-stitch punch card system (used by the
// KH-930 and the whole Brother/KnitKing punch-card line): every card repeats
// every 24 stitches horizontally, a card needs at least 36 punched rows to
// roll continuously, and the reading mechanism actually reads 7 rows below
// whatever row is visible at the front of the machine.
export const PUNCHCARD_COLUMNS = 24;
export const MIN_ROWS_TO_ROLL = 36;
export const READER_ROW_OFFSET = 7;

const PAPER = "#F3F1E9";
const INK = "#14130F";
const THREAD = "#9C9686";
const LINE = "#CFC9B8";

/**
 * Builds a punch guide — not a to-scale, laser-cuttable template (real hole
 * pitch/diameter for a given machine isn't something to guess at), but an
 * accurate row-by-row punching reference: which of the 24 columns to punch
 * on each row, with row numbers and the reader offset called out.
 *
 * `cells` follows the existing binary dither convention: 1 = light, 0 = dark.
 * Dark cells are the ones to punch, matching the "dark = marked" convention
 * used in the laser/embroidery export.
 */
export function generatePunchCardSVG(cells: Uint8Array, rows: number): string {
  const cols = PUNCHCARD_COLUMNS;
  const cellSize = 20;
  const marginLeft = 56;
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 20;
  const width = marginLeft + cols * cellSize + marginRight;
  const height = marginTop + rows * cellSize + marginBottom;

  const holes: string[] = [];
  const gridLines: string[] = [];

  for (let c = 0; c <= cols; c++) {
    const x = marginLeft + c * cellSize;
    gridLines.push(
      `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + rows * cellSize}" stroke="${LINE}" stroke-width="0.5" />`,
    );
  }
  for (let r = 0; r <= rows; r++) {
    const y = marginTop + r * cellSize;
    gridLines.push(
      `<line x1="${marginLeft}" y1="${y}" x2="${marginLeft + cols * cellSize}" y2="${y}" stroke="${LINE}" stroke-width="0.5" />`,
    );
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const punched = cells[i] === 0;
      const cx = marginLeft + (c + 0.5) * cellSize;
      const cy = marginTop + (r + 0.5) * cellSize;
      const radius = cellSize * 0.34;
      holes.push(
        punched
          ? `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="${INK}" />`
          : `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="none" stroke="${LINE}" stroke-width="1" />`,
      );
    }
  }

  const rowLabels: string[] = [];
  for (let r = 0; r < rows; r++) {
    const cy = marginTop + (r + 0.5) * cellSize + 3;
    rowLabels.push(
      `<text x="${marginLeft - 8}" y="${cy.toFixed(1)}" font-family="monospace" font-size="9" fill="${THREAD}" text-anchor="end">${
        r + 1
      }</text>`,
    );
  }

  const colLabels: string[] = [];
  for (let c = 0; c < cols; c += 4) {
    const cx = marginLeft + (c + 0.5) * cellSize;
    colLabels.push(
      `<text x="${cx.toFixed(1)}" y="${marginTop - 8}" font-family="monospace" font-size="9" fill="${THREAD}" text-anchor="middle">${
        c + 1
      }</text>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="${PAPER}" />
${colLabels.join("")}
${rowLabels.join("")}
${gridLines.join("")}
${holes.join("")}
</svg>`;
}

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const PAPER = "#F3F1E9";
const RAW = "#E4E0D3";
const INK = "#14130F";
const THREAD = "#9C9686";

const ALGO_LABELS: Record<string, string> = {
  threshold: "threshold",
  bayer: "bayer 4×4",
  floyd: "floyd–steinberg",
  atkinson: "atkinson",
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nothing is ever uploaded to a server in this tool, so the OG image can't
// show the actual photo behind a shared link — only the settings that made
// it. The background pattern is a deterministic, settings-seeded texture,
// not a rendering of anyone's private image.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const algorithm = searchParams.get("algo") ?? "bayer";
  const grain = searchParams.get("grain") ?? "4";
  const exposure = searchParams.get("exposure") ?? "0";
  const palette = searchParams.get("palette") ?? "ink";
  const preset = searchParams.get("preset");

  const rand = mulberry32(
    hashString(`${algorithm}-${grain}-${exposure}-${palette}`),
  );
  const cols = 48;
  const rows = 24;
  const cells: boolean[] = [];
  for (let i = 0; i < cols * rows; i++) cells.push(rand() > 0.45);

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        background: PAPER,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          inset: 0,
        }}
      >
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: "flex", flex: 1 }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  flex: 1,
                  background: cells[r * cols + c] ? RAW : PAPER,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          left: 60,
          top: 60,
          background: PAPER,
          border: `2px solid ${INK}`,
          padding: "28px 36px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: THREAD,
            marginBottom: 16,
          }}
        >
          ° 00 — pixel picnic
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            color: INK,
            fontWeight: 700,
            marginBottom: 22,
          }}
        >
          {preset ?? "dither / exposure"}
        </div>
        <div style={{ display: "flex", fontSize: 20, color: INK }}>
          {ALGO_LABELS[algorithm] ?? algorithm} · grain {grain}px · exposure{" "}
          {exposure} · {palette === "ink" ? "ink on paper" : "black on white"}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dither, Algorithm } from "@/lib/dither";

const DISPLAY_SIZE = 640;

const ALGO_LABELS: Record<Algorithm, string> = {
  threshold: "threshold",
  bayer: "bayer 4×4",
  floyd: "floyd–steinberg",
  atkinson: "atkinson",
};

type Palette = "ink" | "bw";

const PAPER: [number, number, number] = [243, 241, 233];
const INK: [number, number, number] = [20, 19, 15];
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

function makePlaceholder(): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const off = document.createElement("canvas");
    off.width = DISPLAY_SIZE;
    off.height = DISPLAY_SIZE;
    const octx = off.getContext("2d")!;
    const grad = octx.createLinearGradient(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    grad.addColorStop(0, "#050505");
    grad.addColorStop(1, "#e8e8e8");
    octx.fillStyle = grad;
    octx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    octx.fillStyle = "#000";
    octx.beginPath();
    octx.arc(DISPLAY_SIZE * 0.35, DISPLAY_SIZE * 0.45, 150, 0, Math.PI * 2);
    octx.fill();
    octx.fillStyle = "#fff";
    octx.beginPath();
    octx.arc(DISPLAY_SIZE * 0.68, DISPLAY_SIZE * 0.62, 90, 0, Math.PI * 2);
    octx.fill();
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = off.toDataURL();
  });
}

export default function DitherTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [algorithm, setAlgorithm] = useState<Algorithm>("bayer");
  const [grain, setGrain] = useState(4);
  const [exposure, setExposure] = useState(0);
  const [palette, setPalette] = useState<Palette>("ink");
  const [dragging, setDragging] = useState(false);
  const [dims, setDims] = useState({ w: DISPLAY_SIZE, h: DISPLAY_SIZE });

  const regenPlaceholder = useCallback(() => {
    makePlaceholder().then((img) => {
      setUploaded(false);
      setSourceImg(img);
    });
  }, []);

  useEffect(() => {
    regenPlaceholder();
  }, [regenPlaceholder]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dw = Math.max(8, Math.floor(DISPLAY_SIZE / grain));
    const dh = Math.max(8, Math.floor(DISPLAY_SIZE / grain));

    const small = document.createElement("canvas");
    small.width = dw;
    small.height = dh;
    const sctx = small.getContext("2d")!;
    sctx.drawImage(sourceImg, 0, 0, dw, dh);
    const imageData = sctx.getImageData(0, 0, dw, dh);

    const result = dither(imageData, { algorithm, exposure });

    const light = palette === "ink" ? PAPER : WHITE;
    const dark = palette === "ink" ? INK : BLACK;

    const out = ctx.createImageData(dw, dh);
    for (let i = 0; i < dw * dh; i++) {
      const col = result.cells[i] ? light : dark;
      out.data[i * 4] = col[0];
      out.data[i * 4 + 1] = col[1];
      out.data[i * 4 + 2] = col[2];
      out.data[i * 4 + 3] = 255;
    }

    canvas.width = dw;
    canvas.height = dh;
    ctx.putImageData(out, 0, 0);
    setDims({ w: dw, h: dh });
  }, [sourceImg, algorithm, grain, exposure, palette]);

  useEffect(() => {
    render();
  }, [render]);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setUploaded(true);
        setSourceImg(img);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "pixel-picnic.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const specLine = `${uploaded ? "uploaded" : "generated"} · ${ALGO_LABELS[algorithm]} · grain ${grain}px · ${
    palette === "ink" ? "ink on paper" : "black on white"
  }`;

  return (
    <main
      style={{
        padding: "0 28px 80px",
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 0,
        maxWidth: 1200,
        margin: "0 auto",
      }}
      className="stage-grid"
    >
      <div style={{ borderRight: "1px solid var(--line)", paddingRight: 28 }}>
        <Step tag="01 — algorithm">
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
            style={selectStyle}
          >
            <option value="threshold">threshold</option>
            <option value="bayer">ordered (bayer 4×4)</option>
            <option value="floyd">floyd–steinberg</option>
            <option value="atkinson">atkinson</option>
          </select>
        </Step>

        <Step tag="02 — grain">
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={grain}
            onChange={(e) => setGrain(parseInt(e.target.value, 10))}
            style={rangeStyle}
          />
          <div className="mono" style={readoutStyle}>
            grain {grain}px
          </div>
        </Step>

        <Step tag="03 — exposure">
          <input
            type="range"
            min={-80}
            max={80}
            step={1}
            value={exposure}
            onChange={(e) => setExposure(parseInt(e.target.value, 10))}
            style={rangeStyle}
          />
          <div className="mono" style={readoutStyle}>
            exposure {exposure > 0 ? "+" : ""}
            {exposure}
          </div>
        </Step>

        <Step tag="04 — palette">
          <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
            <PaletteButton
              active={palette === "ink"}
              onClick={() => setPalette("ink")}
              label="ink / paper"
            />
            <PaletteButton
              active={palette === "bw"}
              onClick={() => setPalette("bw")}
              label="black / white"
              last
            />
          </div>
        </Step>

        <label
          className="mono"
          style={{
            display: "block",
            border: `1px dashed ${dragging ? "var(--ink)" : "var(--thread)"}`,
            padding: 18,
            textAlign: "center",
            fontSize: 11,
            color: dragging ? "var(--ink)" : "var(--thread)",
            cursor: "pointer",
            marginTop: 20,
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
          }}
        >
          drop an image here
          <br />
          or click to browse
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) loadFile(e.target.files[0]);
            }}
          />
        </label>
      </div>

      <div style={{ paddingLeft: 36 }}>
        <div
          style={{
            position: "relative",
            border: "1px solid var(--ink)",
            background: "var(--raw)",
            padding: 20,
          }}
        >
          <canvas
            ref={canvasRef}
            width={DISPLAY_SIZE}
            height={DISPLAY_SIZE}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              imageRendering: "pixelated",
              background: "var(--paper)",
            }}
          />
        </div>
        <div
          className="mono"
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: 11,
            color: "var(--thread)",
            borderTop: "1px solid var(--line)",
            paddingTop: 10,
          }}
        >
          <span>{specLine}</span>
          <span style={{ color: "var(--ink)" }}>
            {dims.w} × {dims.h}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button className="mono" style={primaryBtn} onClick={handleDownload}>
            download png
          </button>
          <button className="mono" style={secondaryBtn} onClick={regenPlaceholder}>
            new placeholder
          </button>
        </div>
      </div>
    </main>
  );
}

function Step({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "20px 0", borderBottom: "1px solid var(--line)" }}>
      <span className="mono" style={{ fontSize: 11, color: "var(--thread)", marginBottom: 10, display: "block" }}>
        {tag}
      </span>
      {children}
    </div>
  );
}

function PaletteButton({
  active,
  onClick,
  label,
  last,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  last?: boolean;
}) {
  return (
    <button
      className="mono"
      onClick={onClick}
      style={{
        flex: 1,
        padding: 8,
        fontSize: 11,
        background: active ? "var(--ink)" : "var(--paper)",
        color: active ? "var(--paper)" : "var(--ink)",
        border: "none",
        borderRight: last ? "none" : "1px solid var(--ink)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  background: "var(--paper)",
  border: "1px solid var(--ink)",
  padding: 8,
  appearance: "none",
};

const rangeStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
};

const readoutStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--thread)",
  marginTop: 8,
};

const primaryBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "12px 22px",
  background: "var(--ink)",
  color: "var(--paper)",
  border: "1px solid var(--ink)",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "12px 22px",
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--ink)",
  cursor: "pointer",
};

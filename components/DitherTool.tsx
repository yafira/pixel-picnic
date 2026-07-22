"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dither, Algorithm } from "@/lib/dither";
import { makePlaceholder } from "@/lib/placeholder";

const MAX_DISPLAY = 640;

const ALGO_LABELS: Record<Algorithm, string> = {
  threshold: "threshold",
  bayer: "bayer 4×4",
  floyd: "floyd–steinberg",
  atkinson: "atkinson",
};

type Palette = "ink" | "bw";

type PresetKey = "handwork" | "veiled" | "graphic" | "overpaint";

interface Preset {
  label: string;
  note: string;
  algorithm: Algorithm;
  grain: number;
  exposure: number;
  palette: Palette;
}

const PRESETS: Record<PresetKey, Preset> = {
  handwork: {
    label: "handwork",
    note: "handcraft — floyd–steinberg, fine grain",
    algorithm: "floyd",
    grain: 3,
    exposure: -10,
    palette: "ink",
  },
  veiled: {
    label: "veiled",
    note: "concealment — atkinson, coarse grain",
    algorithm: "atkinson",
    grain: 7,
    exposure: 20,
    palette: "bw",
  },
  graphic: {
    label: "graphic",
    note: "crisp — bayer 4×4, precise",
    algorithm: "bayer",
    grain: 2,
    exposure: 0,
    palette: "bw",
  },
  overpaint: {
    label: "overpaint",
    note: "whiteout — threshold, blown out",
    algorithm: "threshold",
    grain: 6,
    exposure: 40,
    palette: "ink",
  },
};

const PRESET_KEYS: PresetKey[] = ["handwork", "veiled", "graphic", "overpaint"];

const PAPER: [number, number, number] = [243, 241, 233];
const INK: [number, number, number] = [20, 19, 15];
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

export default function DitherTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [algorithm, setAlgorithm] = useState<Algorithm>("bayer");
  const [grain, setGrain] = useState(4);
  const [exposure, setExposure] = useState(0);
  const [palette, setPalette] = useState<Palette>("ink");
  const [dragging, setDragging] = useState(false);
  const [dims, setDims] = useState({ w: MAX_DISPLAY, h: MAX_DISPLAY });
  const [comparePos, setComparePos] = useState(50);
  const [linkCopied, setLinkCopied] = useState(false);

  const regenPlaceholder = useCallback(() => {
    makePlaceholder().then((img) => {
      setUploaded(false);
      setSourceImg(img);
    });
  }, []);

  function applyPreset(key: PresetKey) {
    const preset = PRESETS[key];
    setAlgorithm(preset.algorithm);
    setGrain(preset.grain);
    setExposure(preset.exposure);
    setPalette(preset.palette);
  }

  const activePresetKey = PRESET_KEYS.find((key) => {
    const p = PRESETS[key];
    return (
      p.algorithm === algorithm &&
      p.grain === grain &&
      p.exposure === exposure &&
      p.palette === palette
    );
  });

  useEffect(() => {
    regenPlaceholder();

    const params = new URLSearchParams(window.location.search);
    const algoParam = params.get("algo");
    const grainParam = params.get("grain");
    const exposureParam = params.get("exposure");
    const paletteParam = params.get("palette");

    if (
      algoParam &&
      ["threshold", "bayer", "floyd", "atkinson"].includes(algoParam)
    ) {
      setAlgorithm(algoParam as Algorithm);
    }
    if (grainParam) {
      const g = parseInt(grainParam, 10);
      if (!isNaN(g)) setGrain(Math.max(1, Math.min(12, g)));
    }
    if (exposureParam) {
      const e = parseInt(exposureParam, 10);
      if (!isNaN(e)) setExposure(Math.max(-80, Math.min(80, e)));
    }
    if (paletteParam === "ink" || paletteParam === "bw") {
      setPalette(paletteParam);
    }
  }, [regenPlaceholder]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const naturalW = sourceImg.naturalWidth || sourceImg.width;
    const naturalH = sourceImg.naturalHeight || sourceImg.height;
    const fitScale = MAX_DISPLAY / Math.max(naturalW, naturalH);
    const displayW = Math.round(naturalW * fitScale);
    const displayH = Math.round(naturalH * fitScale);

    const originalCanvas = originalCanvasRef.current;
    if (originalCanvas) {
      originalCanvas.width = displayW;
      originalCanvas.height = displayH;
      const octx = originalCanvas.getContext("2d");
      octx?.drawImage(sourceImg, 0, 0, displayW, displayH);
    }

    const dw = Math.max(8, Math.round(displayW / grain));
    const dh = Math.max(8, Math.round(displayH / grain));

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

  function handleCopyLink() {
    const params = new URLSearchParams();
    params.set("algo", algorithm);
    params.set("grain", String(grain));
    params.set("exposure", String(exposure));
    params.set("palette", palette);
    if (activePresetKey) params.set("preset", activePresetKey);

    const query = `?${params.toString()}`;
    const url = `${window.location.origin}${window.location.pathname}${query}`;
    window.history.replaceState(null, "", query);

    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  }

  const specLine = `${activePresetKey ? PRESETS[activePresetKey].label + " · " : ""}${
    uploaded ? "uploaded" : "generated"
  } · ${ALGO_LABELS[algorithm]} · grain ${grain}px · ${
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
        <Step tag="00 — preset">
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {PRESET_KEYS.map((key) => {
              const preset = PRESETS[key];
              const active = activePresetKey === key;
              return (
                <button
                  key={key}
                  className="mono"
                  onClick={() => applyPreset(key)}
                  title={preset.note}
                  style={{
                    padding: "10px 8px",
                    fontSize: 11,
                    textAlign: "left",
                    background: active ? "var(--ink)" : "var(--paper)",
                    color: active ? "var(--paper)" : "var(--ink)",
                    border: "1px solid var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </Step>

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
          <div style={{ position: "relative" }}>
            <canvas
              ref={originalCanvasRef}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                background: "var(--paper)",
              }}
            />
            <canvas
              ref={canvasRef}
              width={MAX_DISPLAY}
              height={MAX_DISPLAY}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                display: "block",
                imageRendering: "pixelated",
                background: "var(--paper)",
                clipPath: `inset(0 ${100 - comparePos}% 0 0)`,
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${comparePos}%`,
                width: 1,
                background: "var(--ink)",
                transform: "translateX(-0.5px)",
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden="true"
              className="mono"
              style={{
                position: "absolute",
                top: "50%",
                left: `${comparePos}%`,
                transform: "translate(-50%, -50%)",
                width: 28,
                height: 28,
                border: "1px solid var(--ink)",
                background: "var(--paper)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                pointerEvents: "none",
              }}
            >
              ↔
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--thread)", marginBottom: 6 }}
          >
            compare — drag to reveal original
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={comparePos}
            onChange={(e) => setComparePos(parseInt(e.target.value, 10))}
            style={rangeStyle}
            aria-label="Comparison position between dithered and original image"
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
          <button
            className="mono"
            style={secondaryBtn}
            onClick={handleCopyLink}
          >
            {linkCopied ? "link copied" : "copy link"}
          </button>
          <button
            className="mono"
            style={secondaryBtn}
            onClick={regenPlaceholder}
          >
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
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--thread)",
          marginBottom: 10,
          display: "block",
        }}
      >
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

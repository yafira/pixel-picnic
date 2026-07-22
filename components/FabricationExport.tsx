"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dither, Algorithm } from "@/lib/dither";
import {
  generatePhysicalSVG,
  generatePreviewSVG,
  DotShape,
  ExportMode,
} from "@/lib/vector-export";

const MAX_GRID = 200; // cap on cells per axis, keeps stitch-path point counts and SVG size sane

export default function FabricationExport() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [algorithm, setAlgorithm] = useState<Algorithm>("bayer");
  const [gridSize, setGridSize] = useState(60); // cells along the longer axis
  const [exposure, setExposure] = useState(0);
  const [cellSizeMM, setCellSizeMM] = useState(4);
  const [shape, setShape] = useState<DotShape>("circle");
  const [dotScale, setDotScale] = useState(0.8);
  const [mode, setMode] = useState<ExportMode>("dots");
  const [physicalSVG, setPhysicalSVG] = useState<string>("");
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const render = useCallback(() => {
    if (!sourceImg || !previewRef.current) return;

    const naturalW = sourceImg.naturalWidth || sourceImg.width;
    const naturalH = sourceImg.naturalHeight || sourceImg.height;
    const fitScale = gridSize / Math.max(naturalW, naturalH);
    const gw = Math.max(4, Math.min(MAX_GRID, Math.round(naturalW * fitScale)));
    const gh = Math.max(4, Math.min(MAX_GRID, Math.round(naturalH * fitScale)));

    const small = document.createElement("canvas");
    small.width = gw;
    small.height = gh;
    const sctx = small.getContext("2d")!;
    sctx.drawImage(sourceImg, 0, 0, gw, gh);
    const imageData = sctx.getImageData(0, 0, gw, gh);

    const result = dither(imageData, { algorithm, exposure });
    const options = { cellSizeMM, shape, dotScale, mode };

    const preview = generatePreviewSVG(result.cells, gw, gh, options);
    previewRef.current.innerHTML = preview;

    setPhysicalSVG(generatePhysicalSVG(result.cells, gw, gh, options));
    setDims({ w: gw, h: gh });
  }, [
    sourceImg,
    algorithm,
    gridSize,
    exposure,
    cellSizeMM,
    shape,
    dotScale,
    mode,
  ]);

  useEffect(() => {
    render();
  }, [render]);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => setSourceImg(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleDownload() {
    if (!physicalSVG) return;
    const blob = new Blob([physicalSVG], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "pixel-picnic-fabrication.svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  const outputWidthMM = (dims.w * cellSizeMM).toFixed(1);
  const outputHeightMM = (dims.h * cellSizeMM).toFixed(1);

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
    >
      <div style={{ borderRight: "1px solid var(--line)", paddingRight: 28 }}>
        <Step tag="01 — output">
          <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
            <ModeButton
              active={mode === "dots"}
              onClick={() => setMode("dots")}
              label="dots (laser)"
            />
            <ModeButton
              active={mode === "stitch-path"}
              onClick={() => setMode("stitch-path")}
              label="stitch path"
              last
            />
          </div>
        </Step>

        <Step tag="02 — algorithm">
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

        <Step tag="03 — grid resolution">
          <input
            type="range"
            min={16}
            max={MAX_GRID}
            step={2}
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value, 10))}
            style={{ width: "100%", marginTop: 14 }}
          />
          <div className="mono" style={readout}>
            {gridSize} cells, longer axis
          </div>
        </Step>

        <Step tag="04 — exposure">
          <input
            type="range"
            min={-80}
            max={80}
            step={1}
            value={exposure}
            onChange={(e) => setExposure(parseInt(e.target.value, 10))}
            style={{ width: "100%", marginTop: 14 }}
          />
          <div className="mono" style={readout}>
            exposure {exposure > 0 ? "+" : ""}
            {exposure}
          </div>
        </Step>

        <Step tag="05 — cell size">
          <input
            type="number"
            min={0.5}
            max={30}
            step={0.5}
            value={cellSizeMM}
            onChange={(e) => setCellSizeMM(parseFloat(e.target.value) || 1)}
            style={selectStyle}
          />
          <div className="mono" style={readout}>
            mm per cell — sets real output size
          </div>
        </Step>

        {mode === "dots" && (
          <Step tag="06 — dot shape">
            <div
              style={{
                display: "flex",
                border: "1px solid var(--ink)",
                marginBottom: 12,
              }}
            >
              <ModeButton
                active={shape === "circle"}
                onClick={() => setShape("circle")}
                label="circle"
              />
              <ModeButton
                active={shape === "square"}
                onClick={() => setShape("square")}
                label="square"
                last
              />
            </div>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={dotScale}
              onChange={(e) => setDotScale(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
            <div className="mono" style={readout}>
              dot fills {Math.round(dotScale * 100)}% of cell
            </div>
          </Step>
        )}

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
            border: "1px solid var(--ink)",
            background: "var(--raw)",
            padding: 20,
            minHeight: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div ref={previewRef} style={{ width: "100%" }} />
          {!sourceImg && (
            <span
              className="mono"
              style={{ fontSize: 12, color: "var(--thread)" }}
            >
              drop an image to begin
            </span>
          )}
        </div>

        <div
          className="mono"
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--thread)",
            borderTop: "1px solid var(--line)",
            paddingTop: 10,
          }}
        >
          <span>
            {mode === "dots" ? `${shape} dots` : "stitch path"} · {dims.w} ×{" "}
            {dims.h} cells
          </span>
          <span style={{ color: "var(--ink)" }}>
            {outputWidthMM} × {outputHeightMM} mm
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button
            className="mono"
            style={primaryBtn}
            onClick={handleDownload}
            disabled={!physicalSVG}
          >
            download svg
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

function ModeButton({
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

const readout: React.CSSProperties = {
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

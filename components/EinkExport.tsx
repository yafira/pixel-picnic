"use client";

import { useRef, useState } from "react";
import { ditherLevels, levelToGray, Algorithm } from "@/lib/dither";
import { encodeGrayscaleBMP } from "@/lib/bmp";
import { EINK_PANELS } from "@/lib/eink-panels";

const ALGO_LABELS: Record<Algorithm, string> = {
  threshold: "threshold",
  bayer: "bayer 4×4",
  floyd: "floyd–steinberg",
  atkinson: "atkinson",
};

export default function EinkExport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [algorithm, setAlgorithm] = useState<Algorithm>("floyd");
  const [exposure, setExposure] = useState(0);
  const [panelIndex, setPanelIndex] = useState(0);
  const [bppIndex, setBppIndex] = useState(3); // default to 4bpp / 16 levels
  const [rendered, setRendered] = useState(false);
  const [pending, setPending] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);

  const panel = EINK_PANELS[panelIndex];
  const bppMode = panel.bppModes[bppIndex];

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setSourceImg(img);
        setRendered(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function generate() {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImg) return;
    setPending(true);

    // Let the UI paint the "rendering" state before the heavy synchronous work.
    requestAnimationFrame(() => {
      const { width: panelW, height: panelH } = panel;

      const naturalW = sourceImg.naturalWidth || sourceImg.width;
      const naturalH = sourceImg.naturalHeight || sourceImg.height;
      const fitScale = Math.min(panelW / naturalW, panelH / naturalH);
      const drawW = Math.round(naturalW * fitScale);
      const drawH = Math.round(naturalH * fitScale);
      const offsetX = Math.round((panelW - drawW) / 2);
      const offsetY = Math.round((panelH - drawH) / 2);

      const full = document.createElement("canvas");
      full.width = panelW;
      full.height = panelH;
      const fctx = full.getContext("2d")!;
      fctx.fillStyle = "#ffffff";
      fctx.fillRect(0, 0, panelW, panelH);
      fctx.drawImage(sourceImg, offsetX, offsetY, drawW, drawH);
      const imageData = fctx.getImageData(0, 0, panelW, panelH);

      const result = ditherLevels(imageData, {
        algorithm,
        exposure,
        levels: bppMode.levels,
      });

      const grayBytes = new Uint8Array(panelW * panelH);
      for (let i = 0; i < grayBytes.length; i++) {
        grayBytes[i] = levelToGray(result.cells[i], bppMode.levels);
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = panelW;
      canvas.height = panelH;
      const out = ctx.createImageData(panelW, panelH);
      for (let i = 0; i < grayBytes.length; i++) {
        out.data[i * 4] = grayBytes[i];
        out.data[i * 4 + 1] = grayBytes[i];
        out.data[i * 4 + 2] = grayBytes[i];
        out.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);

      const blob = encodeGrayscaleBMP(panelW, panelH, grayBytes);
      setLastBlob(blob);
      setRendered(true);
      setPending(false);
    });
  }

  function handleDownload() {
    if (!lastBlob) return;
    const url = URL.createObjectURL(lastBlob);
    const link = document.createElement("a");
    link.download = `pixel-picnic-eink-${bppMode.bpp}bpp.bmp`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

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
        <Step tag="01 — panel">
          <select
            value={panelIndex}
            onChange={(e) => {
              const nextIndex = parseInt(e.target.value, 10);
              setPanelIndex(nextIndex);
              setBppIndex((prev) =>
                Math.min(prev, EINK_PANELS[nextIndex].bppModes.length - 1),
              );
              setRendered(false);
            }}
            style={selectStyle}
          >
            {EINK_PANELS.map((p, i) => (
              <option key={p.id} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--thread)", marginTop: 8 }}
          >
            {panel.width} × {panel.height}px, native
          </div>
        </Step>

        <Step tag="02 — bit depth">
          <select
            value={bppIndex}
            onChange={(e) => {
              setBppIndex(parseInt(e.target.value, 10));
              setRendered(false);
            }}
            style={selectStyle}
          >
            {panel.bppModes.map((mode, i) => (
              <option key={mode.bpp} value={i}>
                {mode.label}
              </option>
            ))}
          </select>
        </Step>

        <Step tag="03 — algorithm">
          <select
            value={algorithm}
            onChange={(e) => {
              setAlgorithm(e.target.value as Algorithm);
              setRendered(false);
            }}
            style={selectStyle}
          >
            <option value="threshold">threshold</option>
            <option value="bayer">ordered (bayer 4×4)</option>
            <option value="floyd">floyd–steinberg</option>
            <option value="atkinson">atkinson</option>
          </select>
        </Step>

        <Step tag="04 — exposure">
          <input
            type="range"
            min={-80}
            max={80}
            step={1}
            value={exposure}
            onChange={(e) => {
              setExposure(parseInt(e.target.value, 10));
              setRendered(false);
            }}
            style={{ width: "100%", marginTop: 14 }}
          />
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--thread)", marginTop: 8 }}
          >
            exposure {exposure > 0 ? "+" : ""}
            {exposure}
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
            border: "1px solid var(--ink)",
            background: "var(--raw)",
            padding: 20,
            minHeight: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {sourceImg ? (
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "auto",
                display: rendered ? "block" : "none",
                imageRendering: "pixelated",
                background: "#fff",
              }}
            />
          ) : null}
          {!sourceImg && (
            <span
              className="mono"
              style={{ fontSize: 12, color: "var(--thread)" }}
            >
              drop an image to begin
            </span>
          )}
          {sourceImg && !rendered && (
            <span
              className="mono"
              style={{ fontSize: 12, color: "var(--thread)" }}
            >
              {pending
                ? "rendering at full resolution…"
                : "settings changed — regenerate to preview"}
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
            {ALGO_LABELS[algorithm]} · {bppMode.levels} levels ({bppMode.bpp}
            bpp) · exposure {exposure > 0 ? "+" : ""}
            {exposure}
          </span>
          <span style={{ color: "var(--ink)" }}>
            {panel.width} × {panel.height}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button
            className="mono"
            style={secondaryBtn}
            onClick={generate}
            disabled={!sourceImg || pending}
          >
            {pending ? "rendering…" : "generate at full resolution"}
          </button>
          <button
            className="mono"
            style={primaryBtn}
            onClick={handleDownload}
            disabled={!rendered}
          >
            download bmp
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

const selectStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  background: "var(--paper)",
  border: "1px solid var(--ink)",
  padding: 8,
  appearance: "none",
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

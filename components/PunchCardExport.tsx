"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dither, Algorithm } from "@/lib/dither";
import {
  generatePunchCardSVG,
  PUNCHCARD_COLUMNS,
  MIN_ROWS_TO_ROLL,
  READER_ROW_OFFSET,
} from "@/lib/punchcard";

export default function PunchCardExport() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [algorithm, setAlgorithm] = useState<Algorithm>("threshold");
  const [exposure, setExposure] = useState(0);
  const [rows, setRows] = useState(48);
  const [svgString, setSvgString] = useState("");

  const render = useCallback(() => {
    if (!sourceImg || !previewRef.current) return;

    const naturalW = sourceImg.naturalWidth || sourceImg.width;
    const naturalH = sourceImg.naturalHeight || sourceImg.height;
    // stretch/fit the source to exactly 24 columns x `rows` — the punch card
    // grid is a fixed hardware constraint, not something to derive from the
    // image's own aspect ratio
    const small = document.createElement("canvas");
    small.width = PUNCHCARD_COLUMNS;
    small.height = rows;
    const sctx = small.getContext("2d")!;
    sctx.drawImage(
      sourceImg,
      0,
      0,
      naturalW,
      naturalH,
      0,
      0,
      PUNCHCARD_COLUMNS,
      rows,
    );
    const imageData = sctx.getImageData(0, 0, PUNCHCARD_COLUMNS, rows);

    const result = dither(imageData, { algorithm, exposure });
    const svg = generatePunchCardSVG(result.cells, rows);
    setSvgString(svg);
    previewRef.current.innerHTML = svg.replace(
      "<svg ",
      '<svg style="width:100%;height:auto" ',
    );
  }, [sourceImg, algorithm, exposure, rows]);

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
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "pixel-picnic-punchcard.svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  const belowMinRows = rows < MIN_ROWS_TO_ROLL;

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
        <Step tag="01 — columns">
          <div
            className="mono"
            style={{ fontSize: 13, border: "1px solid var(--ink)", padding: 8 }}
          >
            {PUNCHCARD_COLUMNS} — fixed
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--thread)", marginTop: 8 }}
          >
            every brother punch card repeats every 24 stitches — not adjustable
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

        <Step tag="03 — exposure">
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

        <Step tag="04 — rows">
          <input
            type="range"
            min={12}
            max={96}
            step={1}
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value, 10))}
            style={{ width: "100%" }}
          />
          <div
            className="mono"
            style={{
              ...readout,
              color: belowMinRows ? "var(--ink)" : "var(--thread)",
            }}
          >
            {rows} rows
            {belowMinRows
              ? ` — below the ${MIN_ROWS_TO_ROLL}-row minimum to roll continuously`
              : ""}
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

        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--thread)",
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          reader offset: the brother mechanism reads {READER_ROW_OFFSET} rows
          below the row visible at the front of the machine — line up row 1
          accordingly when you punch.
        </div>
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
          <div
            ref={previewRef}
            style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}
          />
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
            {algorithm} · {PUNCHCARD_COLUMNS} × {rows} stitches
          </span>
          <span style={{ color: "var(--ink)" }}>
            {rows >= MIN_ROWS_TO_ROLL
              ? "rolls continuously"
              : "single card only"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button
            className="mono"
            style={primaryBtn}
            onClick={handleDownload}
            disabled={!svgString}
          >
            download punch guide svg
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

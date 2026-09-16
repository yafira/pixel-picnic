"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Algorithm, ditherRegionAware, resampleMask } from "@/lib/dither";
import {
  disposeSegmenter,
  getSegmenter,
  segmentVideoFrame,
} from "@/lib/segmentation";

const ALGO_LABELS: Record<Algorithm, string> = {
  threshold: "threshold",
  bayer: "bayer 4×4",
  floyd: "floyd–steinberg",
  atkinson: "atkinson",
};

const ALGORITHMS: Algorithm[] = ["threshold", "bayer", "floyd", "atkinson"];

type Palette = "ink" | "bw";

const PAPER: [number, number, number] = [243, 241, 233];
const INK: [number, number, number] = [20, 19, 15];
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

type Status =
  | "idle"
  | "loading-model"
  | "requesting-camera"
  | "running"
  | "error";

export default function LiveRegionDither() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [subjectAlgorithm, setSubjectAlgorithm] =
    useState<Algorithm>("atkinson");
  const [backgroundAlgorithm, setBackgroundAlgorithm] =
    useState<Algorithm>("bayer");
  const [subjectExposure, setSubjectExposure] = useState(0);
  const [backgroundExposure, setBackgroundExposure] = useState(0);
  const [grain, setGrain] = useState(4);
  const [maskThreshold, setMaskThreshold] = useState(0.5);
  const [palette, setPalette] = useState<Palette>("ink");
  const [uniformCompare, setUniformCompare] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // latest control values, read inside the render loop without having
  // to restart the loop every time a slider moves.
  const controlsRef = useRef({
    subjectAlgorithm,
    backgroundAlgorithm,
    subjectExposure,
    backgroundExposure,
    grain,
    maskThreshold,
    palette,
    uniformCompare,
  });
  useEffect(() => {
    controlsRef.current = {
      subjectAlgorithm,
      backgroundAlgorithm,
      subjectExposure,
      backgroundExposure,
      grain,
      maskThreshold,
      palette,
      uniformCompare,
    };
  }, [
    subjectAlgorithm,
    backgroundAlgorithm,
    subjectExposure,
    backgroundExposure,
    grain,
    maskThreshold,
    palette,
    uniformCompare,
  ]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      stop();
      disposeSegmenter();
    };
  }, [stop]);

  const start = useCallback(async () => {
    setErrorMsg("");
    try {
      setStatus("loading-model");
      const segmenter = await getSegmenter();

      setStatus("requesting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      if (!workCanvasRef.current) {
        workCanvasRef.current = document.createElement("canvas");
      }

      setStatus("running");
      runningRef.current = true;

      const loop = async () => {
        if (!runningRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const work = workCanvasRef.current;
        if (!video || !canvas || !work || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const c = controlsRef.current;
        const nativeW = video.videoWidth;
        const nativeH = video.videoHeight;
        const dw = Math.max(8, Math.round(nativeW / c.grain / 3));
        const dh = Math.max(8, Math.round(nativeH / c.grain / 3));

        work.width = dw;
        work.height = dh;
        const workCtx = work.getContext("2d", { willReadFrequently: true });
        if (!workCtx) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        // selfie camera feed reads mirrored otherwise
        workCtx.save();
        workCtx.translate(dw, 0);
        workCtx.scale(-1, 1);
        workCtx.drawImage(video, 0, 0, dw, dh);
        workCtx.restore();
        const imageData = workCtx.getImageData(0, 0, dw, dh);

        const seg = await segmentVideoFrame(
          segmenter,
          video,
          performance.now(),
        );

        let cells: Uint8Array;
        if (seg && !c.uniformCompare) {
          const resampled = resampleMask(
            // the mask also needs mirroring to match the mirrored frame
            mirrorMask(seg.data, seg.width, seg.height),
            seg.width,
            seg.height,
            dw,
            dh,
          );
          const result = ditherRegionAware(imageData, {
            subject: {
              algorithm: c.subjectAlgorithm,
              exposure: c.subjectExposure,
            },
            background: {
              algorithm: c.backgroundAlgorithm,
              exposure: c.backgroundExposure,
            },
            mask: resampled,
            maskThreshold: c.maskThreshold,
          });
          cells = result.cells;
        } else {
          // uniform compare mode -- whole frame gets the subject settings,
          // so toggling this shows what region-aware is actually adding
          const { dither } = await import("@/lib/dither");
          const result = dither(imageData, {
            algorithm: c.subjectAlgorithm,
            exposure: c.subjectExposure,
          });
          cells = result.cells;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          const light = c.palette === "ink" ? PAPER : WHITE;
          const dark = c.palette === "ink" ? INK : BLACK;
          const out = ctx.createImageData(dw, dh);
          for (let i = 0; i < dw * dh; i++) {
            const col = cells[i] ? light : dark;
            out.data[i * 4] = col[0];
            out.data[i * 4 + 1] = col[1];
            out.data[i * 4 + 2] = col[2];
            out.data[i * 4 + 3] = 255;
          }
          canvas.width = dw;
          canvas.height = dh;
          ctx.putImageData(out, 0, 0);
          setDims({ w: dw, h: dh });
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "pixel-picnic-live.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
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
        <Step tag="00 — camera">
          {status === "idle" && (
            <button className="mono" style={primaryBtn} onClick={start}>
              start camera
            </button>
          )}
          {status === "loading-model" && (
            <div className="mono" style={readoutStyle}>
              loading segmentation model…
            </div>
          )}
          {status === "requesting-camera" && (
            <div className="mono" style={readoutStyle}>
              requesting camera access…
            </div>
          )}
          {status === "running" && (
            <button className="mono" style={secondaryBtn} onClick={stop}>
              stop camera
            </button>
          )}
          {status === "error" && (
            <div>
              <div
                className="mono"
                style={{ ...readoutStyle, color: "var(--ink)" }}
              >
                {errorMsg || "something went wrong."}
              </div>
              <button
                className="mono"
                style={{ ...secondaryBtn, marginTop: 10 }}
                onClick={start}
              >
                try again
              </button>
            </div>
          )}
          <div
            className="mono"
            style={{ ...readoutStyle, marginTop: 10, fontSize: 10 }}
          >
            runs entirely on-device. no frame is ever sent anywhere.
          </div>
        </Step>

        <Step tag="01 — subject region">
          <select
            value={subjectAlgorithm}
            onChange={(e) =>
              setSubjectAlgorithm(e.target.value as Algorithm)
            }
            style={selectStyle}
          >
            {ALGORITHMS.map((a) => (
              <option key={a} value={a}>
                {ALGO_LABELS[a]}
              </option>
            ))}
          </select>
          <input
            type="range"
            min={-80}
            max={80}
            step={1}
            value={subjectExposure}
            onChange={(e) =>
              setSubjectExposure(parseInt(e.target.value, 10))
            }
            style={rangeStyle}
          />
          <div className="mono" style={readoutStyle}>
            exposure {subjectExposure > 0 ? "+" : ""}
            {subjectExposure}
          </div>
        </Step>

        <Step tag="02 — background region">
          <select
            value={backgroundAlgorithm}
            onChange={(e) =>
              setBackgroundAlgorithm(e.target.value as Algorithm)
            }
            style={selectStyle}
          >
            {ALGORITHMS.map((a) => (
              <option key={a} value={a}>
                {ALGO_LABELS[a]}
              </option>
            ))}
          </select>
          <input
            type="range"
            min={-80}
            max={80}
            step={1}
            value={backgroundExposure}
            onChange={(e) =>
              setBackgroundExposure(parseInt(e.target.value, 10))
            }
            style={rangeStyle}
          />
          <div className="mono" style={readoutStyle}>
            exposure {backgroundExposure > 0 ? "+" : ""}
            {backgroundExposure}
          </div>
        </Step>

        <Step tag="03 — mask sensitivity">
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={maskThreshold}
            onChange={(e) =>
              setMaskThreshold(parseFloat(e.target.value))
            }
            style={rangeStyle}
          />
          <div className="mono" style={readoutStyle}>
            threshold {maskThreshold.toFixed(2)} — lower catches more as
            &quot;subject&quot;
          </div>
        </Step>

        <Step tag="04 — grain">
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

        <Step tag="05 — palette">
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

        <Step tag="06 — compare">
          <label
            className="mono"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={uniformCompare}
              onChange={(e) => setUniformCompare(e.target.checked)}
            />
            show uniform dither (subject settings, whole frame)
          </label>
        </Step>
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
          <video ref={videoRef} style={{ display: "none" }} muted playsInline />
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              imageRendering: "pixelated",
              background: "var(--paper)",
              aspectRatio: "4 / 3",
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
          <span>
            {uniformCompare
              ? `uniform · ${ALGO_LABELS[subjectAlgorithm]}`
              : `${ALGO_LABELS[subjectAlgorithm]} subject / ${ALGO_LABELS[backgroundAlgorithm]} background`}{" "}
            · grain {grain}px
          </span>
          <span style={{ color: "var(--ink)" }}>
            {dims.w} × {dims.h}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button
            className="mono"
            style={primaryBtn}
            onClick={handleDownload}
            disabled={status !== "running"}
          >
            download frame
          </button>
        </div>
      </div>
    </main>
  );
}

/** the frame is mirrored for a natural selfie view, so the mask needs
 * the same horizontal flip to stay aligned with it. */
function mirrorMask(
  mask: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + (width - 1 - x)] = mask[y * width + x];
    }
  }
  return out;
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

export type Algorithm = "threshold" | "bayer" | "floyd" | "atkinson";

export interface DitherOptions {
  algorithm: Algorithm;
  /** downsample factor in source pixels per output cell; higher = coarser grain */
  grain: number;
  /** shifts the gray value before thresholding, -128..128 */
  exposure: number;
}

export interface DitherResult {
  width: number;
  height: number;
  /** 1 = light cell, 0 = dark cell, row-major */
  cells: Uint8Array;
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Reduces RGBA image data to a grayscale buffer at (width x height) with
 * exposure applied. width/height should already be the downsampled target size.
 */
export function toGrayscale(
  imageData: ImageData,
  exposure: number,
): Float32Array {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const v = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = clamp(v + exposure, 0, 255);
  }
  return gray;
}

export function ditherThreshold(
  gray: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) out[i] = gray[i] > 128 ? 1 : 0;
  return out;
}

export function ditherBayer(
  gray: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const threshold = ((BAYER_4X4[y % 4][x % 4] + 0.5) / 16) * 255;
      out[i] = gray[i] > threshold ? 1 : 0;
    }
  }
  return out;
}

function errorDiffusion(
  gray: Float32Array,
  width: number,
  height: number,
  distribute: (buf: Float32Array, x: number, y: number, err: number) => void,
): Uint8Array {
  const buf = Float32Array.from(gray);
  const out = new Uint8Array(width * height);
  const idx = (x: number, y: number) => y * width + x;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y);
      const old = buf[i];
      const nv = old > 128 ? 1 : 0;
      out[i] = nv;
      const err = old - (nv ? 255 : 0);
      distribute(buf, x, y, err);
    }
  }
  return out;
}

export function ditherFloydSteinberg(
  gray: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  const idx = (x: number, y: number) => y * width + x;
  return errorDiffusion(gray, width, height, (buf, x, y, err) => {
    if (x + 1 < width) buf[idx(x + 1, y)] += (err * 7) / 16;
    if (x - 1 >= 0 && y + 1 < height) buf[idx(x - 1, y + 1)] += (err * 3) / 16;
    if (y + 1 < height) buf[idx(x, y + 1)] += (err * 5) / 16;
    if (x + 1 < width && y + 1 < height)
      buf[idx(x + 1, y + 1)] += (err * 1) / 16;
  });
}

export function ditherAtkinson(
  gray: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  const idx = (x: number, y: number) => y * width + x;
  return errorDiffusion(gray, width, height, (buf, x, y, err) => {
    const e = err / 8;
    if (x + 1 < width) buf[idx(x + 1, y)] += e;
    if (x + 2 < width) buf[idx(x + 2, y)] += e;
    if (x - 1 >= 0 && y + 1 < height) buf[idx(x - 1, y + 1)] += e;
    if (y + 1 < height) buf[idx(x, y + 1)] += e;
    if (x + 1 < width && y + 1 < height) buf[idx(x + 1, y + 1)] += e;
    if (y + 2 < height) buf[idx(x, y + 2)] += e;
  });
}

/**
 * Runs the full dither pipeline on already-downsampled ImageData.
 * The caller is responsible for downsampling to (width / grain, height / grain)
 * before calling this, since grain is a resampling decision, not a per-pixel one.
 */
export function dither(
  imageData: ImageData,
  options: Omit<DitherOptions, "grain">,
): DitherResult {
  const { width, height } = imageData;
  const gray = toGrayscale(imageData, options.exposure);
  let cells: Uint8Array;
  switch (options.algorithm) {
    case "threshold":
      cells = ditherThreshold(gray, width, height);
      break;
    case "bayer":
      cells = ditherBayer(gray, width, height);
      break;
    case "floyd":
      cells = ditherFloydSteinberg(gray, width, height);
      break;
    case "atkinson":
      cells = ditherAtkinson(gray, width, height);
      break;
  }
  return { width, height, cells };
}

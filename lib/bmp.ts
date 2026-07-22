/**
 * Encodes an 8-bit grayscale image as an uncompressed BMP file (BITMAPINFOHEADER,
 * 256-entry grayscale palette). This format is what browsers can't produce
 * natively (canvas.toBlob only supports png/jpeg/webp), and it's the format
 * the IT8951 reference driver code expects to read for e-ink panels.
 *
 * `gray` must contain one 0-255 byte per pixel, row-major, top-to-bottom.
 */
export function encodeGrayscaleBMP(
  width: number,
  height: number,
  gray: Uint8Array,
): Blob {
  const rowSize = Math.ceil(width / 4) * 4; // rows are padded to 4-byte boundaries
  const paletteSize = 256 * 4; // BGRA per entry
  const pixelDataSize = rowSize * height;
  const headerSize = 14 + 40; // file header + BITMAPINFOHEADER
  const fileSize = headerSize + paletteSize + pixelDataSize;

  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  let o = 0;

  // BITMAPFILEHEADER
  view.setUint8(o++, 0x42); // 'B'
  view.setUint8(o++, 0x4d); // 'M'
  view.setUint32(o, fileSize, true);
  o += 4;
  view.setUint32(o, 0, true);
  o += 4; // reserved
  view.setUint32(o, headerSize + paletteSize, true);
  o += 4; // pixel data offset

  // BITMAPINFOHEADER
  view.setUint32(o, 40, true);
  o += 4; // header size
  view.setInt32(o, width, true);
  o += 4;
  view.setInt32(o, height, true);
  o += 4; // positive = bottom-up row order
  view.setUint16(o, 1, true);
  o += 2; // planes
  view.setUint16(o, 8, true);
  o += 2; // bits per pixel
  view.setUint32(o, 0, true);
  o += 4; // no compression
  view.setUint32(o, pixelDataSize, true);
  o += 4;
  view.setInt32(o, 2835, true);
  o += 4; // ~72 DPI
  view.setInt32(o, 2835, true);
  o += 4;
  view.setUint32(o, 256, true);
  o += 4; // palette colors used
  view.setUint32(o, 0, true);
  o += 4; // important colors (0 = all)

  // Grayscale palette: 256 entries of B, G, R, reserved
  for (let i = 0; i < 256; i++) {
    view.setUint8(o++, i); // B
    view.setUint8(o++, i); // G
    view.setUint8(o++, i); // R
    view.setUint8(o++, 0); // reserved
  }

  // Pixel data, bottom-up, each row padded to a 4-byte boundary
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = o;
    for (let x = 0; x < width; x++) {
      view.setUint8(o++, gray[y * width + x]);
    }
    o = rowStart + rowSize; // skip over row padding bytes (left as 0)
  }

  return new Blob([buf], { type: "image/bmp" });
}

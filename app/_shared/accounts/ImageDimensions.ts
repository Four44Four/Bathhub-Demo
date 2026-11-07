/** Raster and SVG edge lengths (see specifications/swipe_up_menu/account_page.md). */

export type ImageEdgeLengths = {
  width: number;
  height: number;
};

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let text = "";
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(bytes[offset + index] ?? 0);
  }
  return text;
}

function readU16BE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readU16LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readU24LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16)
  );
}

function readU32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) * 0x1000000 +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  );
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) +
    ((bytes[offset + 1] ?? 0) << 8) +
    ((bytes[offset + 2] ?? 0) << 16) +
    (bytes[offset + 3] ?? 0) * 0x1000000
  );
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  const value = readU32LE(bytes, offset);
  return value >= 0x80000000 ? value - 0x100000000 : value;
}

function positiveEdges(
  width: number,
  height: number,
): ImageEdgeLengths | null {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return null;
  }
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function readPngDimensions(bytes: Uint8Array): ImageEdgeLengths | null {
  if (bytes.length < 24) {
    return null;
  }
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[index] !== signature[index]) {
      return null;
    }
  }
  if (ascii(bytes, 12, 4) !== "IHDR") {
    return null;
  }
  return positiveEdges(readU32BE(bytes, 16), readU32BE(bytes, 20));
}

function readGifDimensions(bytes: Uint8Array): ImageEdgeLengths | null {
  if (bytes.length < 10) {
    return null;
  }
  const version = ascii(bytes, 0, 6);
  if (version !== "GIF87a" && version !== "GIF89a") {
    return null;
  }
  return positiveEdges(readU16LE(bytes, 6), readU16LE(bytes, 8));
}

function readBmpDimensions(bytes: Uint8Array): ImageEdgeLengths | null {
  if (bytes.length < 26 || ascii(bytes, 0, 2) !== "BM") {
    return null;
  }
  return positiveEdges(readI32LE(bytes, 18), Math.abs(readI32LE(bytes, 22)));
}

/** JPEG SOF markers that carry frame width and height. DHT, JPG, and DAC are excluded. */
function isJpegStartOfFrame(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function readJpegDimensions(bytes: Uint8Array): ImageEdgeLengths | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) {
      return null;
    }
    const marker = bytes[offset] ?? 0;
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }
    if (offset + 1 >= bytes.length) {
      return null;
    }
    const segmentLength = readU16BE(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }
    if (isJpegStartOfFrame(marker)) {
      if (offset + 7 >= bytes.length) {
        return null;
      }
      return positiveEdges(readU16BE(bytes, offset + 5), readU16BE(bytes, offset + 3));
    }
    offset += segmentLength;
  }
  return null;
}

function readWebpDimensions(bytes: Uint8Array): ImageEdgeLengths | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") {
    return positiveEdges(1 + readU24LE(bytes, 24), 1 + readU24LE(bytes, 27));
  }
  if (chunk === "VP8 ") {
    const startCode = 23;
    if (
      bytes.length < startCode + 7 ||
      bytes[startCode] !== 0x9d ||
      bytes[startCode + 1] !== 0x01 ||
      bytes[startCode + 2] !== 0x2a
    ) {
      return null;
    }
    return positiveEdges(
      readU16LE(bytes, startCode + 3) & 0x3fff,
      readU16LE(bytes, startCode + 5) & 0x3fff,
    );
  }
  if (chunk === "VP8L") {
    if (bytes.length < 25 || bytes[20] !== 0x2f) {
      return null;
    }
    const bits = readU32LE(bytes, 21);
    return positiveEdges((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  return null;
}

function readSvgAttributeLength(markup: string, name: string): number | null {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*(["'])\\s*([0-9]+)(?:px)?\\s*\\1`,
    "i",
  );
  const match = pattern.exec(markup);
  if (match == null) {
    return null;
  }
  const value = Number(match[2]);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function readSvgDimensions(bytes: Uint8Array): ImageEdgeLengths | null {
  let markup: string;
  try {
    markup = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  if (!/<svg[\s>]/i.test(markup)) {
    return null;
  }
  const width = readSvgAttributeLength(markup, "width");
  const height = readSvgAttributeLength(markup, "height");
  if (width == null || height == null) {
    return null;
  }
  return positiveEdges(width, height);
}

/**
 * Pixel edges for an image MIME type.
 * Returns null when the bytes are not that format or have no positive pixel size.
 * SVG is accepted only when both width and height are unitless or `px` integers.
 */
export function readImageDimensions(
  mimeType: string,
  bytes: Uint8Array,
): ImageEdgeLengths | null {
  switch (mimeType) {
    case "image/png":
      return readPngDimensions(bytes);
    case "image/jpeg":
      return readJpegDimensions(bytes);
    case "image/gif":
      return readGifDimensions(bytes);
    case "image/webp":
      return readWebpDimensions(bytes);
    case "image/bmp":
      return readBmpDimensions(bytes);
    case "image/svg+xml":
      return readSvgDimensions(bytes);
    default:
      return null;
  }
}

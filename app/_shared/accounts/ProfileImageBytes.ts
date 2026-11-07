/** Byte layouts accepted by the profile-image dimension reader and database check. */

function writeU32BE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function writeU32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function writeU24LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
}

export function pngImageBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes[11] = 13;
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  writeU32BE(bytes, 16, width);
  writeU32BE(bytes, 20, height);
  return bytes;
}

export function pngImageBytesWithLength(
  width: number,
  height: number,
  length: number,
): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set(pngImageBytes(width, height));
  return bytes;
}

/** JPEG with an APP0 segment before SOF0, so dimension readers must skip segments. */
export function jpegImageBytes(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
  ]);
}

export function gifImageBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(10);
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0);
  bytes[6] = width & 0xff;
  bytes[7] = (width >>> 8) & 0xff;
  bytes[8] = height & 0xff;
  bytes[9] = (height >>> 8) & 0xff;
  return bytes;
}

export function webpVp8xImageBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  writeU32LE(bytes, 4, bytes.length - 8);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12);
  writeU32LE(bytes, 16, 10);
  writeU24LE(bytes, 24, width - 1);
  writeU24LE(bytes, 27, height - 1);
  return bytes;
}

export function bmpImageBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(26);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  writeU32LE(bytes, 18, width);
  writeU32LE(bytes, 22, height);
  return bytes;
}

export function svgImageBytes(width: number, height: number): Uint8Array {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}px"></svg>`;
  return new TextEncoder().encode(markup);
}

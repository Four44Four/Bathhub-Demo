export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "").trim();
  const full =
    normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (x: number) =>
    Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpHex(fromHex: string, toHex: string, t: number): string {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  const u = clamp01(t);
  return rgbToHex(
    lerp(a.r, b.r, u),
    lerp(a.g, b.g, u),
    lerp(a.b, b.b, u),
  );
}

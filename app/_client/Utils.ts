"use client";

import { Shared as SharedConsts } from "./ComponentConstants";

export type Vec3 = { x: number; y: number; z: number };

export type Hsl = { h: number; s: number; l: number };

export const TextWeight = {
  REGULAR: SharedConsts.FONT_REGULAR_CLASS, 
  BOLD: SharedConsts.FONT_BOLD_CLASS, 
  LIGHT: SharedConsts.FONT_LIGHT_CLASS
} as const;
export type TextWeight = (typeof TextWeight)[keyof typeof TextWeight];

// metrics in CSS pixels
export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// metrics in CSS pixels
export type RectBorderWidths = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace("#", "").trim();
    const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
    const num = parseInt(full, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
}
  
export function rgbToHsl(r255: number, g255: number, b255: number): { h: number; s: number; l: number } {
    const r = r255 / 255;
    const g = g255 / 255;
    const b = b255 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
  
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
  
    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r:
          h = ((g - b) / delta) % 6;
          break;
        case g:
          h = (b - r) / delta + 2;
          break;
        default:
          h = (r - g) / delta + 4;
          break;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
  
    return { h, s, l };
}
  
export function hslToRgb(h: number, s: number, l: number) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (h % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
  
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
  
    if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
    else if (hp >= 1 && hp < 2) [r1, g1, b1] = [x, c, 0];
    else if (hp >= 2 && hp < 3) [r1, g1, b1] = [0, c, x];
    else if (hp >= 3 && hp < 4) [r1, g1, b1] = [0, x, c];
    else if (hp >= 4 && hp < 5) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
  
    const m = l - c / 2;
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (x: number) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
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
  
export function clamp01(n: number) {
    return Math.min(1, Math.max(0, n));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function wrapAngleRad(a: number) {
  // Normalize to [-pi, pi)
  const twoPi = Math.PI * 2;
  let x = ((a + Math.PI) % twoPi + twoPi) % twoPi;
  x -= Math.PI;
  return x;
};

export function lerpAngleRad(a: number, b: number, t: number) {
  // Lerp the shortest way around the circle.
  const da = wrapAngleRad(b - a);
  return a + da * t;
};

/**
 * Linear progress 0→1 over `durationMs`, or 1 immediately if duration is non-positive.
 */
export function linearProgress01(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return Math.min(1, elapsedMs / durationMs);
}

/**
 * Linear crossfade 0→1 as `value` moves from `fadeStart` toward `fullyAt`.
 * (Used with camera height: farther = 0, closer = 1 when fadeStart > fullyAt.)
 */
export function linearCrossfade01(
  value: number,
  fadeStart: number,
  fullyAt: number,
): number {
  const t = (fadeStart - value) / (fadeStart - fullyAt);
  return clamp01(t);
}

/** Outer width/height of a circular viewport `Button` (`border-box`, symmetric padding). */
export function viewportCircularButtonOuterSidePx(
  imageSizePx: number,
  circularPaddingPx: number,
  outlineThicknessPx: number,
): number {
  return imageSizePx + 2 * circularPaddingPx + 2 * outlineThicknessPx;
}
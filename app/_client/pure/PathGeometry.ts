import type { Point } from "../../_shared/Utils";
import * as Utils from "../Utils";

export type PathColorMode = "static" | "static-gradient" | "rolling-gradient";

export function pathColorModeToUniform(mode: PathColorMode): number {
  return mode === "rolling-gradient" ? 2 : mode === "static-gradient" ? 1 : 0;
}

export function pathGeometryWidthPixels(
  widthPixels: number,
  strokeEdgeSoftPixels: number,
): number {
  return widthPixels + 2 * Math.max(0, strokeEdgeSoftPixels);
}

/**
 * In `dCenter = abs(st.t - 0.5) * 2` space (0 = centerline, 1 = edge), alpha begins
 * to fall off at this threshold toward the antialiased outer edge.
 */
export function pathEdgeStart01(
  widthPixels: number,
  geometryWidthPixels: number,
): number {
  return Math.min(
    1,
    Math.max(0, widthPixels / Math.max(1e-6, geometryWidthPixels)),
  );
}

export function dedupeConsecutiveLngLat(points: Point[]): Point[] {
  if (points.length < 2) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = out[out.length - 1];
    if (p.latitude !== prev.latitude || p.longitude !== prev.longitude) out.push(p);
  }
  return out;
}

export function quadraticBezierVector3(p0: Utils.Vec3, p1: Utils.Vec3, p2: Utils.Vec3, t: number): Vec3 {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x,
    y: a * p0.y + b * p1.y + c * p2.y,
    z: a * p0.z + b * p1.z + c * p2.z,
  };
}

/** Dot product of unit directions A→B and B→C in screen space (see Path.ts merge pass). */
export function pathScreenSegmentCollinearityDot(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const bcx = cx - bx;
  const bcy = cy - by;
  const al = Math.hypot(abx, aby);
  const bl = Math.hypot(bcx, bcy);
  if (al <= 0 || bl <= 0) return -1;
  return (abx * bcx + aby * bcy) / (al * bl);
}

export function shouldKeepPathLodVertexAfterMerge(
  dotCollinearity: number,
  straightThreshold = 0.999,
): boolean {
  return dotCollinearity < straightThreshold;
}

export function resamplePolylineUniformIndices(
  maxSamples: number,
  vertexCount: number,
): number[] {
  if (vertexCount < 1) return [];
  if (vertexCount === 1) return [0];
  const cap = Math.max(2, maxSamples);
  const out: number[] = [];
  const denom = Math.max(1, cap - 1);
  for (let k = 0; k < cap; k++) {
    const t = k / denom;
    out.push(Math.round(t * (vertexCount - 1)));
  }
  return out;
}

export function filletBezierStepCount(
  cornerAngleRad: number,
  radiansPerStep: number,
  minSteps = 2,
  maxSteps = 8,
): number {
  return Math.min(maxSteps, Math.max(minSteps, Math.ceil(cornerAngleRad / radiansPerStep)));
}

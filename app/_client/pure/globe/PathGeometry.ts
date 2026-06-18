import type { Point } from "../../../_shared/Utils";
import * as Utils from "../../Utils";

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

export function quadraticBezierVector3(p0: Utils.Vec3, p1: Utils.Vec3, p2: Utils.Vec3, t: number): Utils.Vec3 {
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

export type ScreenPoint2 = { x: number; y: number };

function perpendicularDistanceSqPx(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) {
    const ex = px - ax;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

/** Douglas–Peucker simplification in screen space; returns indices into `points`. */
export function douglasPeuckerScreenIndices(
  points: ReadonlyArray<ScreenPoint2>,
  epsilonPx: number,
): number[] {
  if (points.length < 3) return points.map((_, i) => i);
  const epsSq = epsilonPx * epsilonPx;
  const stack: [number, number][] = [[0, points.length - 1]];
  const keep = new Set<number>([0, points.length - 1]);
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDistSq = 0;
    let maxIdx = -1;
    const ax = points[start].x;
    const ay = points[start].y;
    const bx = points[end].x;
    const by = points[end].y;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistanceSqPx(points[i].x, points[i].y, ax, ay, bx, by);
      if (d > maxDistSq) {
        maxDistSq = d;
        maxIdx = i;
      }
    }
    if (maxIdx >= 0 && maxDistSq > epsSq) {
      keep.add(maxIdx);
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }
  return [...keep].sort((a, b) => a - b);
}

/**
 * Screen-space decimation capped at `maxSamples`. Uses Douglas–Peucker with a
 * pixel error tied to `baseEpsilonPx`, increasing tolerance until within budget.
 */
export function decimatePolylineScreenSpace(
  points: ReadonlyArray<ScreenPoint2>,
  maxSamples: number,
  baseEpsilonPx: number,
): number[] {
  if (points.length <= maxSamples) return points.map((_, i) => i);
  let eps = Math.max(1e-6, baseEpsilonPx);
  let indices = douglasPeuckerScreenIndices(points, eps);
  for (let guard = 0; indices.length > maxSamples && guard < 32; guard++) {
    eps *= 1.5;
    indices = douglasPeuckerScreenIndices(points, eps);
  }
  if (indices.length > maxSamples) {
    const sub = resamplePolylineUniformIndices(maxSamples, indices.length);
    return sub.map((k) => indices[k]!);
  }
  return indices;
}

/** Screen-space vertex decimation: keep vertices at least `minSeparationPx` apart. */
export function pathLodSeparationIndices(
  projected: ReadonlyArray<ScreenPoint2 | null>,
  minSeparationPx: number,
): number[] {
  if (projected.length === 0) return [];
  if (projected.length === 1) return [0];
  const out: number[] = [0];
  let lastKept = 0;
  for (let i = 1; i < projected.length - 1; i++) {
    const a = projected[lastKept];
    const b = projected[i];
    if (!a || !b) {
      out.push(i);
      lastKept = i;
      continue;
    }
    if (Math.hypot(b.x - a.x, b.y - a.y) >= minSeparationPx) {
      out.push(i);
      lastKept = i;
    }
  }
  out.push(projected.length - 1);
  return out;
}

/** Drop near-collinear interior vertices using pre-projected screen coordinates. */
export function pathLodCollinearityIndices(
  lodIndices: ReadonlyArray<number>,
  projected: ReadonlyArray<ScreenPoint2 | null>,
  straightThreshold = 0.999,
): number[] {
  if (lodIndices.length < 3) return [...lodIndices];
  const out: number[] = [lodIndices[0]!];
  for (let i = 1; i < lodIndices.length - 1; i++) {
    const ia = lodIndices[i - 1]!;
    const ib = lodIndices[i]!;
    const ic = lodIndices[i + 1]!;
    const a = projected[ia];
    const b = projected[ib];
    const c = projected[ic];
    if (!a || !b || !c) {
      out.push(ib);
      continue;
    }
    const dot = pathScreenSegmentCollinearityDot(a.x, a.y, b.x, b.y, c.x, c.y);
    if (shouldKeepPathLodVertexAfterMerge(dot, straightThreshold)) out.push(ib);
  }
  out.push(lodIndices[lodIndices.length - 1]!);
  return out;
}

/** Compact signature of world-space path samples for LOD dirty-checking. */
export function pathWorldSamplesSignature(
  samples: ReadonlyArray<{ x: number; y: number; z: number }>,
  precision = 3,
): string {
  const f = (n: number) => n.toFixed(precision);
  return `${samples.length}:${samples.map((s) => `${f(s.x)},${f(s.y)},${f(s.z)}`).join(";")}`;
}

/**
 * Geodesic subdivision granularity (radians) for PolylineGeometry. Coarser at
 * street zoom where arc deviation is sub-pixel; finer when zoomed out.
 */
export function pathGeodesicGranularityRadians(cameraHeightM: number): number {
  const h = Math.max(0, cameraHeightM);
  if (h < 5_000) return (2 * Math.PI) / 180;
  if (h < 50_000) return (1 * Math.PI) / 180;
  return (0.5 * Math.PI) / 180;
}

export function filletBezierStepCount(
  cornerAngleRad: number,
  radiansPerStep: number,
  minSteps = 2,
  maxSteps = 8,
): number {
  return Math.min(maxSteps, Math.max(minSteps, Math.ceil(cornerAngleRad / radiansPerStep)));
}

/**
 * Ellipsoid height (m) for path vertices. Grows with camera altitude so the geodesic ribbon
 * stays in front of the globe mesh when depth precision is coarse at far zoom.
 */
export function pathSurfaceClearanceMeters(
  cameraHeightM: number,
  baseClearanceM: number,
  raiseFactor: number,
): number {
  const h = Math.max(0, cameraHeightM);
  return baseClearanceM + h * raiseFactor;
}

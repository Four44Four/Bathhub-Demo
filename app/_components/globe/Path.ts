import type * as CesiumTypes from "cesium";

import { Path as PathConsts } from "../ComponentConstants";
import { Point } from "../../_shared/Utils";

export type PathColorMode = "static" | "static-gradient" | "rolling-gradient";
export type PathHandle = {
  setPath: (points: Point[]) => void;
  clearPath: () => void;
  rebuildActivePath: () => void;
  destroy: () => void;
};

export const PATH_RIBBON_FABRIC_TYPE = "PathCapsuleChainFabric1";

const PATH_RIBBON_CZM_GET_MATERIAL = [
  "czm_material czm_getMaterial(czm_materialInput materialInput) {",
  "  czm_material material = czm_getDefaultMaterial(materialInput);",
  "  vec2 cssPx = gl_FragCoord.xy / czm_pixelRatio;",
  "  vec3 pathColor = baseColor.rgb;",
  "  if (colorMode > 0.5) {",
  "    float along = dot(cssPx, gradientAxis);",
  "    float u = fract(along / wavelengthPixels + phase);",
  "    float blend = 0.5 + 0.5 * sin(u * czm_twoPi);",
  "    pathColor = mix(secondaryColor.rgb, baseColor.rgb, blend);",
  "  }",
  "  material.diffuse = vec3(0.0);",
  "  material.emission = pathColor;",
  "  material.specular = 0.0;",
  "  material.alpha = 1.0;",
  "  return material;",
  "}",
].join("\n");

type PathRibbonFabricJson = {
  type: string;
  uniforms: {
    baseColor: CesiumTypes.Color;
    secondaryColor: CesiumTypes.Color;
    gradientAxis: CesiumTypes.Cartesian2;
    wavelengthPixels: number;
    phase: number;
    colorMode: number;
  };
  source: string;
};

function pathColorModeToUniform(mode: PathColorMode): number {
  return mode === "rolling-gradient" ? 2 : mode === "static-gradient" ? 1 : 0;
}

function buildPathRibbonFabric(
  Cesium: typeof CesiumTypes,
  phase01: number,
): PathRibbonFabricJson {
  const axis = new Cesium.Cartesian2(1, 0);
  Cesium.Cartesian2.normalize(axis, axis);
  return {
    type: PATH_RIBBON_FABRIC_TYPE,
    uniforms: {
      baseColor: Cesium.Color.fromCssColorString(PathConsts.BASE_COLOR),
      secondaryColor: Cesium.Color.fromCssColorString(PathConsts.SECONDARY_COLOR),
      gradientAxis: axis,
      wavelengthPixels: Math.max(1e-6, PathConsts.GRADIENT_SIZE_PIXELS),
      phase: phase01,
      colorMode: pathColorModeToUniform(PathConsts.COLOR_MODE),
    },
    source: PATH_RIBBON_CZM_GET_MATERIAL,
  };
}

function dedupeConsecutive(points: Point[]): Point[] {
  if (points.length < 2) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = out[out.length - 1];
    if (p.latitude !== prev.latitude || p.longitude !== prev.longitude) out.push(p);
  }
  return out;
}

function quadraticBezierCartesian3(
  Cesium: typeof CesiumTypes,
  p0: CesiumTypes.Cartesian3,
  p1: CesiumTypes.Cartesian3,
  p2: CesiumTypes.Cartesian3,
  t: number,
): CesiumTypes.Cartesian3 {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return new Cesium.Cartesian3(
    a * p0.x + b * p1.x + c * p2.x,
    a * p0.y + b * p1.y + c * p2.y,
    a * p0.z + b * p1.z + c * p2.z,
  );
}

function roundPolylineCorners(
  Cesium: typeof CesiumTypes,
  positions: CesiumTypes.Cartesian3[],
): CesiumTypes.Cartesian3[] {
  if (positions.length < 3) return positions;

  const out: CesiumTypes.Cartesian3[] = [positions[0]];
  const minAngle = Cesium.Math.toRadians(6);
  const maxAngle = Cesium.Math.toRadians(174);

  for (let i = 1; i < positions.length - 1; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const next = positions[i + 1];

    const toPrev = Cesium.Cartesian3.subtract(prev, curr, new Cesium.Cartesian3());
    const toNext = Cesium.Cartesian3.subtract(next, curr, new Cesium.Cartesian3());
    const lenPrev = Cesium.Cartesian3.magnitude(toPrev);
    const lenNext = Cesium.Cartesian3.magnitude(toNext);
    if (lenPrev <= 1e-3 || lenNext <= 1e-3) {
      out.push(curr);
      continue;
    }

    Cesium.Cartesian3.divideByScalar(toPrev, lenPrev, toPrev);
    Cesium.Cartesian3.divideByScalar(toNext, lenNext, toNext);
    const inDir = Cesium.Cartesian3.negate(toPrev, new Cesium.Cartesian3());
    const dot = Cesium.Math.clamp(Cesium.Cartesian3.dot(inDir, toNext), -1, 1);
    const angle = Math.acos(dot);
    if (angle < minAngle || angle > maxAngle) {
      out.push(curr);
      continue;
    }

    // World-space fillet approximation of capsule-union joints.
    const cut = Math.min(lenPrev, lenNext) * 0.25;
    if (cut <= 1e-3) {
      out.push(curr);
      continue;
    }

    const enter = Cesium.Cartesian3.add(
      curr,
      Cesium.Cartesian3.multiplyByScalar(toPrev, cut, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    const exit = Cesium.Cartesian3.add(
      curr,
      Cesium.Cartesian3.multiplyByScalar(toNext, cut, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );

    const prevOut = out[out.length - 1];
    if (!Cesium.Cartesian3.equalsEpsilon(prevOut, enter, Cesium.Math.EPSILON9)) {
      out.push(enter);
    }

    const steps = Math.min(
      8,
      Math.max(2, Math.ceil(angle / Cesium.Math.toRadians(10))),
    );
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      out.push(quadraticBezierCartesian3(Cesium, enter, curr, exit, t));
    }
    out.push(exit);
  }

  out.push(positions[positions.length - 1]);
  return out;
}

function buildCapsuleSamples(
  Cesium: typeof CesiumTypes,
  scene: CesiumTypes.Scene,
  ellipsoid: CesiumTypes.Ellipsoid,
  points: Point[],
): CesiumTypes.Cartesian3[] {
  // Match GlobeImage.ts default marker/click-indicator height above ellipsoid.
  const clearance = PathConsts.SURFACE_CLEARANCE_METERS;
  const raw = points.map((p) =>
    Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, clearance, ellipsoid),
  );
  if (raw.length < 3) return raw;
  const scratchA = new Cesium.Cartesian2();
  const scratchB = new Cesium.Cartesian2();
  const lod: CesiumTypes.Cartesian3[] = [raw[0]];
  let lastKept = 0;
  for (let i = 1; i < raw.length - 1; i++) {
    const a = Cesium.SceneTransforms.worldToWindowCoordinates(scene, raw[lastKept], scratchA);
    const b = Cesium.SceneTransforms.worldToWindowCoordinates(scene, raw[i], scratchB);
    if (!a || !b || Cesium.Cartesian2.distance(a, b) >= PathConsts.MIN_VERTEX_SEPARATION_PIXELS) {
      lod.push(raw[i]);
      lastKept = i;
    }
  }
  lod.push(raw[raw.length - 1]);
  if (lod.length < 3) return lod;

  const projected = lod.map((p) => Cesium.SceneTransforms.worldToWindowCoordinates(scene, p, new Cesium.Cartesian2()) ?? null);
  const merged: CesiumTypes.Cartesian3[] = [lod[0]];
  for (let i = 1; i < lod.length - 1; i++) {
    const a = projected[i - 1];
    const b = projected[i];
    const c = projected[i + 1];
    if (!a || !b || !c) {
      merged.push(lod[i]);
      continue;
    }
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const bcx = c.x - b.x;
    const bcy = c.y - b.y;
    const al = Math.hypot(abx, aby);
    const bl = Math.hypot(bcx, bcy);
    const dot = al > 0 && bl > 0 ? (abx * bcx + aby * bcy) / (al * bl) : -1;
    if (dot < 0.999) merged.push(lod[i]);
  }
  merged.push(lod[lod.length - 1]);
  const rounded = roundPolylineCorners(Cesium, merged);
  if (rounded.length <= PathConsts.MAX_POLYLINE_SAMPLES) return rounded;
  const out: CesiumTypes.Cartesian3[] = [];
  const denom = Math.max(1, PathConsts.MAX_POLYLINE_SAMPLES - 1);
  for (let k = 0; k < PathConsts.MAX_POLYLINE_SAMPLES; k++) {
    const t = k / denom;
    out.push(rounded[Math.round(t * (rounded.length - 1))]);
  }
  return out;
}

function buildPathRibbonPrimitive(args: {
  Cesium: typeof CesiumTypes;
  ellipsoid: CesiumTypes.Ellipsoid;
  positions: CesiumTypes.Cartesian3[];
  material: CesiumTypes.Material;
}): CesiumTypes.Primitive | null {
  const { Cesium, ellipsoid, positions, material } = args;
  const geometry = Cesium.PolylineGeometry.createGeometry(
    new Cesium.PolylineGeometry({
      positions,
      width: PathConsts.WIDTH_PIXELS,
      arcType: Cesium.ArcType.GEODESIC,
      granularity: Cesium.Math.toRadians(0.5),
      vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
      ellipsoid,
    }),
  );
  if (!geometry) return null;
  return new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({ geometry }),
    appearance: new Cesium.PolylineMaterialAppearance({
      material,
      translucent: true,
    }),
    asynchronous: false,
  });
}

export function installPath(
  Cesium: typeof CesiumTypes,
  viewer: CesiumTypes.Viewer,
  ellipsoid: CesiumTypes.Ellipsoid,
): PathHandle {
  const scene = viewer.scene;
  let activePoints: Point[] | null = null;
  let primitive: CesiumTypes.Primitive | null = null;
  let material: CesiumTypes.Material | null = null;
  let rollingCancel: (() => void) | null = null;

  const teardown = () => {
    if (rollingCancel) rollingCancel();
    rollingCancel = null;
    if (primitive) {
      try {
        scene.primitives.remove(primitive);
      } catch {
        // Ignore if Cesium already removed/destroyed it during shutdown.
      }
    }
    primitive = null;
    if (material) {
      try {
        material.destroy();
      } catch {
        // Primitive teardown can already destroy appearance/material.
      }
    }
    material = null;
  };

  const startRolling = () => {
    if ((PathConsts.COLOR_MODE as string) !== "rolling-gradient" || !material) return;
    let raf = 0;
    let last = 0;
    const minMs = 1000 / Math.max(1, PathConsts.GRADIENT_ROLL_MAX_FPS);
    const period = Math.max(1, PathConsts.GRADIENT_ROLL_PERIOD_MS);
    const tick = (now: number) => {
      if (!material || (PathConsts.COLOR_MODE as string) !== "rolling-gradient") return;
      raf = requestAnimationFrame(tick);
      if (now - last < minMs) return;
      last = now;
      material.uniforms.phase = (performance.now() % period) / period;
      scene.requestRender();
    };
    raf = requestAnimationFrame(tick);
    rollingCancel = () => cancelAnimationFrame(raf);
  };

  const build = (points: Point[]) => {
    const samples = buildCapsuleSamples(Cesium, scene, ellipsoid, points);
    if (samples.length < 2) return;
    const fabric = buildPathRibbonFabric(
      Cesium,
      (PathConsts.COLOR_MODE as string)  === "rolling-gradient"
        ? (performance.now() % Math.max(1, PathConsts.GRADIENT_ROLL_PERIOD_MS)) /
            Math.max(1, PathConsts.GRADIENT_ROLL_PERIOD_MS)
        : 0,
    );
    material = new Cesium.Material({
      fabric: {
        type: fabric.type,
        uniforms: fabric.uniforms as unknown as Record<string, unknown>,
        source: fabric.source,
      },
    });
    primitive = buildPathRibbonPrimitive({
      Cesium,
      ellipsoid,
      positions: samples,
      material,
    });
    if (!primitive || !material) return;
    scene.primitives.add(primitive);
    startRolling();
    scene.requestRender();
  };

  const setPath = (pointsIn: Point[]) => {
    teardown();
    const points = dedupeConsecutive(pointsIn);
    if (points.length < 2) {
      activePoints = null;
      scene.requestRender();
      return;
    }
    activePoints = points;
    build(points);
  };

  const rebuildActivePath = () => {
    if (!activePoints || activePoints.length < 2) return;
    teardown();
    build(activePoints);
  };

  const clearPath = () => {
    activePoints = null;
    teardown();
    scene.requestRender();
  };

  const destroy = () => {
    activePoints = null;
    teardown();
  };

  return { setPath, clearPath, rebuildActivePath, destroy };
}

export function setPathBetweenTwoPoints(
  pathHandle: PathHandle,
  a: Point,
  b: Point,
) {
  pathHandle.setPath([a, b]);
}

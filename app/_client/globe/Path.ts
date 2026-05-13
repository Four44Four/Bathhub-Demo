import type * as CesiumTypes from "cesium";

import { Path as PathConsts } from "../ComponentConstants";
import { Point } from "../../_shared/Utils";
import {
  dedupeConsecutiveLngLat,
  filletBezierStepCount,
  pathColorModeToUniform,
  pathEdgeStart01,
  pathGeometryWidthPixels,
  pathScreenSegmentCollinearityDot,
  quadraticBezierVector3,
  resamplePolylineUniformIndices,
  shouldKeepPathLodVertexAfterMerge,
} from "../pure/PathGeometry";

export type { PathColorMode } from "../pure/PathGeometry";
export type PathHandle = {
  setPath: (points: Point[]) => void;
  clearPath: () => void;
  rebuildActivePath: () => void;
  destroy: () => void;
};

export const PATH_RIBBON_FABRIC_TYPE = "PathCapsuleChainFabric1";

// Cesium's PolylineGeometry emits `st.t` as 0 on one side of the ribbon and 1 on
// the other (see PolylineGeometry.createGeometry). After perspective-correct
// reconstruction via `czm_readNonPerspective`, `materialInput.st.t` linearly
// interpolates across the geometric width, so `dCenter` below is 0 at the
// centerline and 1 at the geometric edge. We widen the geometry by
// `2 * STROKE_EDGE_SOFT_PIXELS` and use `edgeStart` to mark where the visible
// solid stroke ends; alpha smoothsteps from full to zero across the soft band,
// producing per-pixel anti-aliased stroke edges.
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
  "  float dCenter = abs(materialInput.st.t - 0.5) * 2.0;",
  "  float edgeAlpha = 1.0 - smoothstep(edgeStart, 1.0, dCenter);",
  "  material.diffuse = vec3(0.0);",
  "  material.emission = pathColor;",
  "  material.specular = 0.0;",
  "  material.alpha = edgeAlpha;",
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
    edgeStart: number;
  };
  source: string;
};

/**
 * Geometric ribbon width (in CSS pixels) handed to `PolylineGeometry`. The
 * visible stroke stays at `WIDTH_PIXELS`; the extra padding on each side hosts
 * the smoothstep AA fade so the antialiased pad never eats into the solid core.
 */
const PATH_GEOMETRY_WIDTH_PIXELS = pathGeometryWidthPixels(
  PathConsts.WIDTH_PIXELS,
  PathConsts.STROKE_EDGE_SOFT_PIXELS,
);

/**
 * Threshold in `dCenter = abs(st.t - 0.5) * 2` space (0 = centerline,
 * 1 = geometric edge) at which alpha begins to fall off toward the antialiased
 * outer edge. Equals the ratio of the solid stroke to the padded geometry.
 */
const PATH_EDGE_START = pathEdgeStart01(
  PathConsts.WIDTH_PIXELS,
  PATH_GEOMETRY_WIDTH_PIXELS,
);

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
      edgeStart: PATH_EDGE_START,
    },
    source: PATH_RIBBON_CZM_GET_MATERIAL,
  };
}

function quadraticBezierCartesian3(
  Cesium: typeof CesiumTypes,
  p0: CesiumTypes.Cartesian3,
  p1: CesiumTypes.Cartesian3,
  p2: CesiumTypes.Cartesian3,
  t: number,
): CesiumTypes.Cartesian3 {
  const v = quadraticBezierVector3(
    { x: p0.x, y: p0.y, z: p0.z },
    { x: p1.x, y: p1.y, z: p1.z },
    { x: p2.x, y: p2.y, z: p2.z },
    t,
  );
  return new Cesium.Cartesian3(v.x, v.y, v.z);
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

    const steps = filletBezierStepCount(angle, Cesium.Math.toRadians(10));
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
    const dot = pathScreenSegmentCollinearityDot(a.x, a.y, b.x, b.y, c.x, c.y);
    if (shouldKeepPathLodVertexAfterMerge(dot)) merged.push(lod[i]);
  }
  merged.push(lod[lod.length - 1]);
  const rounded = roundPolylineCorners(Cesium, merged);
  if (rounded.length <= PathConsts.MAX_POLYLINE_SAMPLES) return rounded;
  const out: CesiumTypes.Cartesian3[] = [];
  const idx = resamplePolylineUniformIndices(
    PathConsts.MAX_POLYLINE_SAMPLES,
    rounded.length,
  );
  for (const i of idx) out.push(rounded[i]);
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
      width: PATH_GEOMETRY_WIDTH_PIXELS,
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
    const points = dedupeConsecutiveLngLat(pointsIn);
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

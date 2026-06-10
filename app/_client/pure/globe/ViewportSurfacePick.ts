import {
  type LatLong,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";

export type ViewportSurfacePickDeps = {
  canvasWidth: number;
  canvasHeight: number;
  pickPositionSupported: boolean;
  pickPosition: (x: number, y: number) => unknown | undefined;
  getPickRay: (x: number, y: number) => unknown | null;
  globePick: (ray: unknown) => unknown | undefined;
  pickEllipsoid: (x: number, y: number) => unknown | null;
  cartographicFromCartesian: (
    cartesian: unknown,
  ) => { latitude: number; longitude: number } | undefined;
  toDegrees: (radians: number) => number;
};

export function pickViewportSurfaceLatLon(
  deps: ViewportSurfacePickDeps,
  x: number,
  y: number,
): LatLong | null {
  if (deps.canvasWidth < 1 || deps.canvasHeight < 1) return null;

  let carto: { latitude: number; longitude: number } | undefined;

  if (deps.pickPositionSupported) {
    try {
      const world = deps.pickPosition(x, y);
      if (world != null) {
        carto = deps.cartographicFromCartesian(world);
      }
    } catch {
      // ignore
    }
  }

  if (!carto) {
    try {
      const ray = deps.getPickRay(x, y);
      if (ray) {
        const ground = deps.globePick(ray);
        if (ground != null) {
          carto = deps.cartographicFromCartesian(ground);
        }
      }
    } catch {
      // ignore
    }
  }

  if (!carto) {
    try {
      const world = deps.pickEllipsoid(x, y);
      if (world != null) {
        carto = deps.cartographicFromCartesian(world);
      }
    } catch {
      // ignore
    }
  }

  if (!carto) return null;

  const latitude = deps.toDegrees(carto.latitude);
  const longitude = deps.toDegrees(carto.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function viewportBoundsFromCornerPicks(
  lowerLeftScreen: LatLong,
  upperRightScreen: LatLong,
): ViewportBounds {
  return {
    lowerLeft: {
      latitude: Math.min(lowerLeftScreen.latitude, upperRightScreen.latitude),
      longitude: Math.min(
        lowerLeftScreen.longitude,
        upperRightScreen.longitude,
      ),
    },
    upperRight: {
      latitude: Math.max(lowerLeftScreen.latitude, upperRightScreen.latitude),
      longitude: Math.max(
        lowerLeftScreen.longitude,
        upperRightScreen.longitude,
      ),
    },
  };
}

export function computeViewportBoundsLatLon(
  deps: ViewportSurfacePickDeps,
): ViewportBounds | null {
  const lowerLeft = pickViewportSurfaceLatLon(deps, 0, deps.canvasHeight);
  const upperRight = pickViewportSurfaceLatLon(deps, deps.canvasWidth, 0);
  if (!lowerLeft || !upperRight) return null;
  return viewportBoundsFromCornerPicks(lowerLeft, upperRight);
}
